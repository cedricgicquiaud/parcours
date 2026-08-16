import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importerFormation, type FichierDepose } from "./import";
import { scannerCatalogue, scannerFormation } from "./scan";

let racine: string;

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-import-"));
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

const md = (chemin: string, contenu: string): FichierDepose => ({ chemin, contenu });

const importer = (
  nom: string,
  fichiers: FichierDepose[],
  options: { ignorerManifeste?: boolean } = {},
) => importerFormation(racine, { nom, fichiers, ...options });

async function manifesteDe(id: string) {
  const texte = await fs.readFile(path.join(racine, id, "formation.json"), "utf8");
  return JSON.parse(texte) as {
    id: string;
    titre: string;
    modules: Array<{ titre: string; lecons: Array<{ id: string; titre: string }> }>;
  };
}

describe("import : manifeste déduit (G-R4)", () => {
  it("construit un sommaire depuis des markdown nus", async () => {
    const resultat = await importer("Mon Cours Perso", [
      md("Mon Cours Perso/02-suite.md", "# La suite\n\nDu texte.\n"),
      md("Mon Cours Perso/10-fin.md", "# La fin\n"),
      md("Mon Cours Perso/01-debut.md", "# Le début\n"),
    ]);

    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.valeur).toMatchObject({
      id: "mon-cours-perso",
      titre: "Mon Cours Perso",
      manifesteGenere: true,
      lecons: 3,
    });

    const manifeste = await manifesteDe("mon-cours-perso");
    expect(manifeste.modules).toHaveLength(1);
    expect(manifeste.modules[0]!.titre).toBe("Contenu");
    // Tri numérique : 2 avant 10, et titres tirés du « # » de chaque fichier.
    expect(manifeste.modules[0]!.lecons.map((lecon) => lecon.titre)).toEqual([
      "Le début",
      "La suite",
      "La fin",
    ]);
  });

  it("fait un module par sous-dossier quand il y en a plusieurs", async () => {
    const resultat = await importer("Cours", [
      md("Cours/01-bases/a.md", "# A\n"),
      md("Cours/02-avance/b.md", "# B\n"),
      md("Cours/preface.md", "# Préface\n"),
    ]);

    expect(resultat.ok).toBe(true);
    const manifeste = await manifesteDe("cours");
    expect(manifeste.modules.map((module) => module.titre)).toEqual([
      "Contenu",
      "Bases",
      "Avance",
    ]);
  });

  it("prend le nom du fichier quand la leçon n'a pas de titre de niveau 1", async () => {
    await importer("Cours", [
      md("Cours/03_premiers-pas.md", "Du texte sans titre.\n"),
      md("Cours/autre.md", "```\n# pas un titre\n```\n"),
    ]);

    const manifeste = await manifesteDe("cours");
    expect(manifeste.modules[0]!.lecons.map((lecon) => lecon.titre)).toEqual([
      "Premiers pas",
      "Autre",
    ]);
  });

  it("produit une formation que le scan accepte", async () => {
    await importer("Cours", [md("Cours/a.md", "# A\n")]);
    const formation = await scannerFormation(path.join(racine, "cours"));
    expect(formation).toMatchObject({ statut: "valide", id: "cours" });
  });
});

describe("import : manifeste fourni (G-R5)", () => {
  const manifesteValide = JSON.stringify({
    formatVersion: 1,
    id: "peu-importe",
    titre: "Titre de l'auteur",
    modules: [
      {
        id: "m1",
        titre: "Module de l'auteur",
        lecons: [{ id: "l1", titre: "Leçon de l'auteur", fichier: "lecons/a.md" }],
      },
    ],
  });

  it("respecte le sommaire de l'auteur et réaligne l'identifiant", async () => {
    const resultat = await importer("Mon dépôt", [
      md("Mon dépôt/formation.json", manifesteValide),
      md("Mon dépôt/lecons/a.md", "# Ignoré\n"),
    ]);

    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.valeur).toMatchObject({
      id: "mon-depot",
      titre: "Titre de l'auteur",
      manifesteGenere: false,
    });

    const manifeste = await manifesteDe("mon-depot");
    expect(manifeste.id).toBe("mon-depot");
    expect(manifeste.modules[0]!.lecons[0]!.titre).toBe("Leçon de l'auteur");
  });

  it("refuse un manifeste cassé au lieu de l'ignorer, et propose de déduire", async () => {
    const resultat = await importer("Cours", [
      md("Cours/formation.json", '{ "formatVersion": 1 }'),
      md("Cours/a.md", "# A\n"),
    ]);

    expect(resultat).toMatchObject({ ok: false, peutGenerer: true });
    if (resultat.ok) return;
    expect(resultat.erreur).toMatch(/titre manquant/);
  });

  it("refuse un manifeste qui référence un fichier absent du dépôt", async () => {
    const resultat = await importer("Cours", [
      md("Cours/formation.json", manifesteValide),
      md("Cours/autre.md", "# Autre\n"),
    ]);
    expect(resultat).toMatchObject({ ok: false, peutGenerer: true });
    if (resultat.ok) return;
    expect(resultat.erreur).toMatch(/lecons\/a\.md/);
  });

  it("importe avec un sommaire déduit quand on le demande explicitement", async () => {
    const resultat = await importer(
      "Cours",
      [md("Cours/formation.json", "{"), md("Cours/a.md", "# A\n")],
      { ignorerManifeste: true },
    );

    expect(resultat).toMatchObject({ ok: true });
    if (!resultat.ok) return;
    expect(resultat.valeur.manifesteGenere).toBe(true);
  });
});

describe("import : validation du dépôt (G-R2, G-R6)", () => {
  it("refuse un dépôt sans aucun markdown", async () => {
    const resultat = await importer("Cours", [md("Cours/notes.txt", "rien")]);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.erreur).toMatch(/aucun fichier markdown/);
  });

  it("refuse un chemin qui sort du dossier", async () => {
    const resultat = await importer("Cours", [
      md("Cours/../../evasion.md", "# Non\n"),
    ]);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.erreur).toMatch(/hors formation/);
  });

  it("refuse une extension non prévue", async () => {
    const resultat = await importer("Cours", [
      md("Cours/a.md", "# A\n"),
      md("Cours/script.sh", "rm -rf /"),
    ]);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.erreur).toMatch(/\.sh/);
  });

  it("refuse un markdown de plus de 2 Mo", async () => {
    const resultat = await importer("Cours", [
      md("Cours/enorme.md", "a".repeat(2_000_001)),
    ]);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.erreur).toMatch(/trop volumineux/);
  });

  it("ignore les fichiers système sans faire échouer l'import", async () => {
    const resultat = await importer("Cours", [
      md("Cours/a.md", "# A\n"),
      md("Cours/.DS_Store", "binaire"),
      md("__MACOSX/Cours/._a.md", "binaire"),
    ]);

    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.valeur.ignores).toContain("Cours/.DS_Store");
    expect(resultat.valeur.lecons).toBe(1);
  });

  it("ne laisse aucun résidu quand l'import échoue", async () => {
    await importer("Cours", [md("Cours/script.sh", "rm")]);
    expect(await fs.readdir(racine)).toEqual([]);
  });

  it("écrit les fichiers joints binaires transmis en base64", async () => {
    const resultat = await importer("Cours", [
      md("Cours/a.md", "# A\n"),
      {
        chemin: "Cours/assets/logo.png",
        contenu: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"),
        encodage: "base64",
      },
    ]);

    expect(resultat.ok).toBe(true);
    const octets = await fs.readFile(path.join(racine, "cours", "assets", "logo.png"));
    expect([...octets]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("import : identifiants (G-R3)", () => {
  it("suffixe l'identifiant quand le nom est déjà pris", async () => {
    await importer("Mon cours", [md("Mon cours/a.md", "# A\n")]);
    const second = await importer("Mon cours", [md("Mon cours/a.md", "# A\n")]);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.valeur.id).toBe("mon-cours-2");
    expect((await scannerCatalogue(racine)).formations.map((f) => f.id)).toEqual([
      "mon-cours",
      "mon-cours-2",
    ]);
  });

  it("refuse un nom dont on ne peut dériver aucun identifiant", async () => {
    const resultat = await importer("!!!", [md("!!!/a.md", "# A\n")]);
    expect(resultat).toMatchObject({ ok: false });
  });
});
