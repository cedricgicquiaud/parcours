import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scannerCatalogue, trouverFormation, trouverLecon } from "./scan";

let racine: string;

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-scan-"));
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

interface OptionsFormation {
  manifeste?: unknown;
  fichiers?: Record<string, string>;
  brut?: string;
}

async function creerFormation(nom: string, options: OptionsFormation = {}) {
  const dossier = path.join(racine, nom);
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  const manifeste = options.manifeste ?? {
    formatVersion: 1,
    id: nom,
    titre: `Titre de ${nom}`,
    description: "Description",
    modules: [
      {
        id: "fondations",
        titre: "Fondations",
        lecons: [{ id: "installer", titre: "Installer", fichier: "lecons/installer.md" }],
      },
    ],
  };
  const fichiers = options.fichiers ?? { "lecons/installer.md": "# Installer" };
  for (const [relatif, contenu] of Object.entries(fichiers)) {
    const complet = path.join(dossier, relatif);
    await fs.mkdir(path.dirname(complet), { recursive: true });
    await fs.writeFile(complet, contenu, "utf8");
  }
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    options.brut ?? JSON.stringify(manifeste),
    "utf8",
  );
  return dossier;
}

describe("scannerCatalogue — cas nominal (C-R1, C-R2)", () => {
  it("retourne les formations valides triées par nom de dossier", async () => {
    await creerFormation("zebre");
    await creerFormation("alpha");
    const scan = await scannerCatalogue(racine);
    expect(scan.erreurGlobale).toBeUndefined();
    expect(scan.formations.map((f) => f.id)).toEqual(["alpha", "zebre"]);
    expect(scan.formations.every((f) => f.statut === "valide")).toBe(true);
  });
});

describe("scannerCatalogue — dossier de formations (F-R1)", () => {
  it("signale un dossier inexistant sans crasher", async () => {
    const scan = await scannerCatalogue(path.join(racine, "nulle-part"));
    expect(scan.formations).toEqual([]);
    expect(scan.erreurGlobale).toMatch(/dossier introuvable/);
  });

  it("signale un chemin qui pointe vers un fichier", async () => {
    const fichier = path.join(racine, "un-fichier.txt");
    await fs.writeFile(fichier, "coucou", "utf8");
    const scan = await scannerCatalogue(fichier);
    expect(scan.formations).toEqual([]);
    expect(scan.erreurGlobale).toMatch(/n'est pas un dossier/);
  });
});

describe("scannerCatalogue — entrées ignorées (C-R4)", () => {
  it("ignore fichiers isolés, dossiers cachés et dossiers vides", async () => {
    await fs.writeFile(path.join(racine, "notes.md"), "hop", "utf8");
    await fs.mkdir(path.join(racine, ".cache"));
    await fs.writeFile(path.join(racine, ".cache", "x"), "y", "utf8");
    await fs.mkdir(path.join(racine, "dossier-vide"));
    await creerFormation("vraie");
    const scan = await scannerCatalogue(racine);
    expect(scan.formations.map((f) => f.id)).toEqual(["vraie"]);
  });

  it("signale un dossier non vide sans formation.json", async () => {
    await fs.mkdir(path.join(racine, "oubli"));
    await fs.writeFile(path.join(racine, "oubli", "lecon.md"), "# Hop", "utf8");
    const scan = await scannerCatalogue(racine);
    expect(scan.formations[0]).toMatchObject({
      statut: "invalide",
      id: "oubli",
      erreur: "formation.json manquant",
    });
  });
});

describe("scannerCatalogue — formations invalides (C-R3, C-R5, F-R5)", () => {
  it("expose la première erreur de validation du manifeste", async () => {
    await creerFormation("cassee", {
      manifeste: { formatVersion: 3, id: "cassee", titre: "T", modules: [] },
    });
    const scan = await scannerCatalogue(racine);
    expect(scan.formations[0]).toMatchObject({
      statut: "invalide",
      erreur: "version de format 3 inconnue (versions supportées : 1)",
    });
  });

  it("expose une erreur de parse JSON", async () => {
    await creerFormation("mauvais-json", { brut: "{ oups }" });
    const scan = await scannerCatalogue(racine);
    expect(scan.formations[0]).toMatchObject({ statut: "invalide" });
    if (scan.formations[0]?.statut === "invalide") {
      expect(scan.formations[0].erreur).toMatch(/formation\.json illisible/);
    }
  });

  it("signale un fichier de leçon référencé mais absent", async () => {
    await creerFormation("fichier-absent", { fichiers: {} });
    const scan = await scannerCatalogue(racine);
    expect(scan.formations[0]).toMatchObject({
      statut: "invalide",
      erreur: "fichier introuvable : lecons/installer.md",
    });
  });

  it("garde les formations valides à côté des invalides", async () => {
    await creerFormation("bonne");
    await creerFormation("mauvaise", { fichiers: {} });
    const scan = await scannerCatalogue(racine);
    expect(scan.formations.map((f) => f.statut)).toEqual(["valide", "invalide"]);
  });
});

describe("résolution des ids (A-R7)", () => {
  it("résout par correspondance exacte, sensible à la casse", async () => {
    await creerFormation("formation-claude");
    const scan = await scannerCatalogue(racine);
    expect(trouverFormation(scan, "formation-claude")?.id).toBe("formation-claude");
    expect(trouverFormation(scan, "Formation-Claude")).toBeUndefined();
  });

  it("résout une leçon par son id dans le manifeste", async () => {
    await creerFormation("formation-claude");
    const scan = await scannerCatalogue(racine);
    const formation = trouverFormation(scan, "formation-claude");
    if (formation?.statut !== "valide") throw new Error("formation invalide");
    expect(trouverLecon(formation, "installer")?.lecon.titre).toBe("Installer");
    expect(trouverLecon(formation, "Installer")).toBeUndefined();
  });
});

describe("performance du scan (C-R1)", () => {
  it("scanne 20 formations de 25 leçons en moins de 200 ms", async () => {
    for (let f = 0; f < 20; f++) {
      const lecons = Array.from({ length: 25 }, (_, i) => ({
        id: `lecon-${i}`,
        titre: `Leçon ${i}`,
        fichier: `lecons/lecon-${i}.md`,
      }));
      const fichiers = Object.fromEntries(
        lecons.map((lecon) => [lecon.fichier, `# ${lecon.titre}`]),
      );
      await creerFormation(`formation-${f}`, {
        manifeste: {
          formatVersion: 1,
          id: `formation-${f}`,
          titre: `Formation ${f}`,
          modules: [{ id: "m1", titre: "Module 1", lecons }],
        },
        fichiers,
      });
    }
    const debut = performance.now();
    const scan = await scannerCatalogue(racine);
    const duree = performance.now() - debut;
    expect(scan.formations).toHaveLength(20);
    expect(duree).toBeLessThan(200);
  });
});
