import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  construireManifeste,
  creerFormation,
  mettreAJourStructure,
  type StructureSaisie,
} from "./ecriture";
import { scannerCatalogue } from "./scan";
import { slugifier, slugUnique } from "./slug";

let racine: string;

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-ecriture-"));
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

const saisie: StructureSaisie = {
  titre: "Formation pratique Claude",
  description: "Compagnon pratique",
  modules: [
    {
      titre: "Fondations Claude Code",
      lecons: [{ titre: "Installer Claude Code" }, { titre: "Le mode plan" }],
    },
  ],
};

async function lireManifeste(formationId: string) {
  const texte = await fs.readFile(
    path.join(racine, formationId, "formation.json"),
    "utf8",
  );
  return JSON.parse(texte);
}

describe("slugifier (F-R3)", () => {
  it("dérive un identifiant lisible depuis un titre accentué", () => {
    expect(slugifier("Écrire pour le web")).toBe("ecrire-pour-le-web");
    expect(slugifier("Les hooks : à quoi ça sert ?")).toBe("les-hooks-a-quoi-ca-sert");
  });

  it("tronque à 64 caractères sans laisser de tiret final", () => {
    const slug = slugifier("a".repeat(70));
    expect(slug).toHaveLength(64);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("retourne une chaîne vide quand rien n'est utilisable", () => {
    expect(slugifier("!!! ??? ")).toBe("");
    expect(slugifier("")).toBe("");
  });

  it("suffixe pour rester unique", () => {
    expect(slugUnique("intro", new Set(["intro"]))).toBe("intro-2");
    expect(slugUnique("intro", new Set(["intro", "intro-2"]))).toBe("intro-3");
  });
});

describe("construireManifeste (P008)", () => {
  it("dérive les identifiants depuis les titres", () => {
    const resultat = construireManifeste(saisie, "formation-claude");
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(resultat.valeur.modules[0]!.id).toBe("fondations-claude-code");
    expect(resultat.valeur.modules[0]!.lecons[0]).toEqual({
      id: "installer-claude-code",
      titre: "Installer Claude Code",
      fichier: "lecons/installer-claude-code.md",
    });
  });

  it("conserve l'identifiant d'une leçon existante, même si son titre change", () => {
    const resultat = construireManifeste(
      {
        titre: "T",
        modules: [
          {
            id: "fondations",
            titre: "Fondations",
            lecons: [{ id: "installer", titre: "Installer Claude Code (2026)" }],
          },
        ],
      },
      "f",
    );
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(resultat.valeur.modules[0]!.lecons[0]!.id).toBe("installer");
    expect(resultat.valeur.modules[0]!.lecons[0]!.titre).toBe(
      "Installer Claude Code (2026)",
    );
  });

  it("préserve le fichier d'une leçon existante hors convention de nommage", () => {
    const resultat = construireManifeste(
      {
        titre: "T",
        modules: [
          { id: "m", titre: "M", lecons: [{ id: "installer", titre: "Installer" }] },
        ],
      },
      "f",
      new Map([["installer", "contenus/vieux-nom.md"]]),
    );
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(resultat.valeur.modules[0]!.lecons[0]!.fichier).toBe(
      "contenus/vieux-nom.md",
    );
  });

  it("distingue deux leçons de même titre", () => {
    const resultat = construireManifeste(
      {
        titre: "T",
        modules: [
          {
            titre: "M",
            lecons: [{ titre: "Introduction" }, { titre: "Introduction" }],
          },
        ],
      },
      "f",
    );
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(resultat.valeur.modules[0]!.lecons.map((l) => l.id)).toEqual([
      "introduction",
      "introduction-2",
    ]);
  });

  it("ne percute jamais un identifiant déjà attribué", () => {
    const resultat = construireManifeste(
      {
        titre: "T",
        modules: [
          {
            titre: "M",
            lecons: [{ titre: "Nouvelle" }, { id: "nouvelle", titre: "Ancienne" }],
          },
        ],
      },
      "f",
    );
    if (!resultat.ok) throw new Error(resultat.erreur);
    const ids = resultat.valeur.modules[0]!.lecons.map((l) => l.id);
    expect(ids).toEqual(["nouvelle-2", "nouvelle"]);
  });

  it("refuse les saisies incomplètes avec un message situé", () => {
    expect(construireManifeste({ ...saisie, titre: "  " }, "f")).toEqual({
      ok: false,
      erreur: "titre : texte non vide attendu",
    });
    expect(
      construireManifeste({ titre: "T", modules: [] }, "f"),
    ).toEqual({ ok: false, erreur: "modules : au moins un module attendu" });
    expect(
      construireManifeste(
        { titre: "T", modules: [{ titre: "M", lecons: [] }] },
        "f",
      ),
    ).toEqual({ ok: false, erreur: "modules[0].lecons : au moins une leçon attendue" });
  });

  it("refuse un titre dont aucun identifiant ne peut être dérivé", () => {
    const resultat = construireManifeste(
      { titre: "T", modules: [{ titre: "!!!", lecons: [{ titre: "L" }] }] },
      "f",
    );
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.erreur).toMatch(/impossible d'en dériver/);
  });
});

describe("creerFormation (P008)", () => {
  it("crée un dossier lisible par le scan", async () => {
    const resultat = await creerFormation(racine, "formation-claude", saisie);
    expect(resultat.ok).toBe(true);

    const scan = await scannerCatalogue(racine);
    expect(scan.formations).toHaveLength(1);
    expect(scan.formations[0]).toMatchObject({
      statut: "valide",
      id: "formation-claude",
    });
  });

  it("crée les fichiers de leçons avec une amorce", async () => {
    const resultat = await creerFormation(racine, "formation-claude", saisie);
    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(resultat.valeur.fichiersCrees).toEqual([
      "lecons/installer-claude-code.md",
      "lecons/le-mode-plan.md",
    ]);
    const contenu = await fs.readFile(
      path.join(racine, "formation-claude", "lecons", "le-mode-plan.md"),
      "utf8",
    );
    expect(contenu).toMatch(/reste à écrire/);
  });

  it("écrit un manifeste indenté et relisible", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const manifeste = await lireManifeste("formation-claude");
    expect(manifeste).toMatchObject({
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      description: "Compagnon pratique",
    });
  });

  it("refuse d'écraser un dossier existant", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const second = await creerFormation(racine, "formation-claude", saisie);
    expect(second).toEqual({
      ok: false,
      erreur: "le dossier « formation-claude » existe déjà",
    });
  });

  it("ne laisse aucun fichier temporaire derrière elle", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const entrees = await fs.readdir(path.join(racine, "formation-claude"));
    expect(entrees.some((entree) => entree.includes(".tmp"))).toBe(false);
  });
});

describe("mettreAJourStructure — garde-fous (P008)", () => {
  it("n'écrase JAMAIS le contenu d'une leçon existante", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const dossier = path.join(racine, "formation-claude");
    const fichier = path.join(dossier, "lecons", "installer-claude-code.md");
    await fs.writeFile(fichier, "Ma prose précieuse.", "utf8");

    const resultat = await mettreAJourStructure(
      dossier,
      "formation-claude",
      {
        titre: "Formation pratique Claude",
        modules: [
          {
            id: "fondations-claude-code",
            titre: "Fondations Claude Code",
            lecons: [
              { id: "installer-claude-code", titre: "Installer Claude Code" },
              { id: "le-mode-plan", titre: "Le mode plan" },
              { titre: "Les hooks" },
            ],
          },
        ],
      },
      new Map([
        ["installer-claude-code", "lecons/installer-claude-code.md"],
        ["le-mode-plan", "lecons/le-mode-plan.md"],
      ]),
    );

    if (!resultat.ok) throw new Error(resultat.erreur);
    expect(await fs.readFile(fichier, "utf8")).toBe("Ma prose précieuse.");
    expect(resultat.valeur.fichiersCrees).toEqual(["lecons/les-hooks.md"]);
  });

  it("laisse sur le disque le fichier d'une leçon retirée du manifeste", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const dossier = path.join(racine, "formation-claude");
    const orpheline = path.join(dossier, "lecons", "le-mode-plan.md");
    await fs.writeFile(orpheline, "Contenu à ne pas perdre.", "utf8");

    await mettreAJourStructure(dossier, "formation-claude", {
      titre: "Formation pratique Claude",
      modules: [
        {
          id: "fondations-claude-code",
          titre: "Fondations Claude Code",
          lecons: [{ id: "installer-claude-code", titre: "Installer Claude Code" }],
        },
      ],
    });

    expect(await fs.readFile(orpheline, "utf8")).toBe("Contenu à ne pas perdre.");
    const manifeste = await lireManifeste("formation-claude");
    expect(manifeste.modules[0].lecons).toHaveLength(1);
  });

  it("réordonne les leçons sans toucher aux identifiants", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const dossier = path.join(racine, "formation-claude");
    await mettreAJourStructure(dossier, "formation-claude", {
      titre: "Formation pratique Claude",
      modules: [
        {
          id: "fondations-claude-code",
          titre: "Fondations Claude Code",
          lecons: [
            { id: "le-mode-plan", titre: "Le mode plan" },
            { id: "installer-claude-code", titre: "Installer Claude Code" },
          ],
        },
      ],
    });
    const manifeste = await lireManifeste("formation-claude");
    expect(manifeste.modules[0].lecons.map((l: { id: string }) => l.id)).toEqual([
      "le-mode-plan",
      "installer-claude-code",
    ]);
  });

  it("laisse la formation valide pour le scan après mise à jour", async () => {
    await creerFormation(racine, "formation-claude", saisie);
    const dossier = path.join(racine, "formation-claude");
    await mettreAJourStructure(dossier, "formation-claude", {
      titre: "Nouveau titre",
      description: "Nouvelle description",
      modules: [
        {
          id: "fondations-claude-code",
          titre: "Fondations",
          lecons: [{ id: "installer-claude-code", titre: "Installer" }],
        },
      ],
    });
    const scan = await scannerCatalogue(racine);
    expect(scan.formations[0]).toMatchObject({ statut: "valide" });
  });
});
