import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  archiver,
  DOSSIER_ARCHIVES,
  DOSSIER_CORBEILLE,
  horodater,
  listerArchives,
  listerCorbeille,
  mettreEnCorbeille,
  restaurerArchive,
  restaurerDeCorbeille,
} from "./cycle";
import { scannerCatalogue } from "./scan";

let racine: string;

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-cycle-"));
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

async function poser(id: string, titre = "Une formation"): Promise<void> {
  const dossier = path.join(racine, id);
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  await fs.writeFile(path.join(dossier, "lecons", "intro.md"), "Bonjour.\n", "utf8");
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    JSON.stringify({
      formatVersion: 1,
      id,
      titre,
      modules: [
        {
          id: "module",
          titre: "Module",
          lecons: [{ id: "intro", titre: "Intro", fichier: "lecons/intro.md" }],
        },
      ],
    }),
    "utf8",
  );
}

const ids = async () =>
  (await scannerCatalogue(racine)).formations.map((formation) => formation.id);

describe("horodater", () => {
  it("produit un suffixe triable et sans caractère exotique", () => {
    expect(horodater(new Date(2026, 7, 15, 14, 25, 30))).toBe("20260815-142530");
  });
});

describe("archiver / restaurer (G-R1, G-R7)", () => {
  it("sort la formation du catalogue sans la copier ni la détruire", async () => {
    await poser("mon-cours");
    const resultat = await archiver(racine, "mon-cours");

    expect(resultat.ok).toBe(true);
    expect(await ids()).toEqual([]);
    // Le contenu est intact, simplement déplacé.
    const lecon = path.join(racine, DOSSIER_ARCHIVES, "mon-cours", "lecons", "intro.md");
    expect(await fs.readFile(lecon, "utf8")).toBe("Bonjour.\n");
    // Aucun résidu à l'emplacement d'origine.
    await expect(fs.access(path.join(racine, "mon-cours"))).rejects.toThrow();
  });

  it("liste les archives avec leur titre et leur nombre de leçons", async () => {
    await poser("mon-cours", "Mon cours");
    await archiver(racine, "mon-cours");

    expect(await listerArchives(racine)).toEqual([
      { statut: "valide", id: "mon-cours", titre: "Mon cours", lecons: 1 },
    ]);
  });

  it("signale une archive au manifeste cassé au lieu de la taire (G-R10)", async () => {
    await poser("casse");
    await archiver(racine, "casse");
    await fs.writeFile(
      path.join(racine, DOSSIER_ARCHIVES, "casse", "formation.json"),
      "{",
      "utf8",
    );

    const archives = await listerArchives(racine);
    expect(archives[0]).toMatchObject({ statut: "invalide", id: "casse" });
  });

  it("remet la formation au catalogue à l'identique", async () => {
    await poser("mon-cours");
    await archiver(racine, "mon-cours");
    const resultat = await restaurerArchive(racine, "mon-cours");

    expect(resultat.ok).toBe(true);
    expect(await ids()).toEqual(["mon-cours"]);
    expect(await listerArchives(racine)).toEqual([]);
  });

  it("refuse de restaurer sur un identifiant repris entre-temps", async () => {
    await poser("mon-cours");
    await archiver(racine, "mon-cours");
    await poser("mon-cours", "Une autre formation, même nom");

    const resultat = await restaurerArchive(racine, "mon-cours");
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.erreur).toMatch(/existe déjà/);
  });

  it("refuse d'archiver une formation inconnue", async () => {
    const resultat = await archiver(racine, "fantome");
    expect(resultat).toMatchObject({ ok: false });
  });
});

describe("corbeille (G-R8, G-R9)", () => {
  it("déplace le dossier sous un nom horodaté sans rien supprimer", async () => {
    await poser("mon-cours", "Mon cours");
    const resultat = await mettreEnCorbeille(racine, path.join(racine, "mon-cours"));

    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.valeur.entree).toMatch(/^mon-cours--\d{8}-\d{6}$/);
    expect(await ids()).toEqual([]);

    const fichier = path.join(
      racine,
      DOSSIER_CORBEILLE,
      resultat.valeur.entree,
      "lecons",
      "intro.md",
    );
    expect(await fs.readFile(fichier, "utf8")).toBe("Bonjour.\n");
  });

  it("liste les entrées avec leur identifiant d'origine et leur date", async () => {
    await poser("mon-cours", "Mon cours");
    await mettreEnCorbeille(racine, path.join(racine, "mon-cours"));

    const entrees = await listerCorbeille(racine);
    expect(entrees).toHaveLength(1);
    expect(entrees[0]).toMatchObject({ id: "mon-cours", titre: "Mon cours" });
    expect(entrees[0]!.supprimeeLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("restaure une entrée vers le catalogue", async () => {
    await poser("mon-cours");
    const mise = await mettreEnCorbeille(racine, path.join(racine, "mon-cours"));
    if (!mise.ok) throw new Error("mise en corbeille échouée");

    const resultat = await restaurerDeCorbeille(racine, mise.valeur.entree);
    expect(resultat).toMatchObject({ ok: true });
    expect(await ids()).toEqual(["mon-cours"]);
    expect(await listerCorbeille(racine)).toEqual([]);
  });

  it("refuse une entrée de corbeille hors du dossier corbeille", async () => {
    const resultat = await restaurerDeCorbeille(racine, "../mon-cours");
    expect(resultat).toMatchObject({ ok: false });
  });

  it("garde deux suppressions successives du même identifiant", async () => {
    await poser("mon-cours");
    const premiere = await mettreEnCorbeille(racine, path.join(racine, "mon-cours"));
    await poser("mon-cours");
    const seconde = await mettreEnCorbeille(racine, path.join(racine, "mon-cours"));

    expect(premiere.ok && seconde.ok).toBe(true);
    if (!premiere.ok || !seconde.ok) return;
    expect(premiere.valeur.entree).not.toBe(seconde.valeur.entree);
    expect(await listerCorbeille(racine)).toHaveLength(2);
  });
});
