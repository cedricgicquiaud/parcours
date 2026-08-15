import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import type { BaseProgression } from "./progression/db";
import { creerContexteTest, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;
let contexte: ContexteTest;
let racine: string;
let base: BaseProgression;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-admin-" });
  ({ racine, base } = contexte);
});

afterEach(async () => {
  await contexte.fermer();
});

const appeler = (chemin: string, init: RequestInit = {}) =>
  contexte.appeler(chemin, init);

const nouvelle = {
  titre: "Formation pratique Claude",
  description: "Compagnon pratique",
  modules: [
    {
      titre: "Fondations",
      lecons: [{ titre: "Installer Claude Code" }, { titre: "Le mode plan" }],
    },
  ],
};

const creer = (corps: unknown = nouvelle) =>
  appeler("/api/formations", { method: "POST", body: JSON.stringify(corps) });

describe("POST /api/formations (P008)", () => {
  it("crée la formation et la rend visible au catalogue", async () => {
    const reponse = await creer();
    expect(reponse.status).toBe(201);
    const corps = await reponse.json();
    expect(corps).toMatchObject({ id: "formation-pratique-claude" });
    expect(corps.fichiersCrees).toHaveLength(2);

    const catalogue = await (await appeler("/api/formations")).json();
    expect(catalogue.formations[0]).toMatchObject({
      statut: "valide",
      id: "formation-pratique-claude",
      lecons: 2,
      action: "commencer",
    });
  });

  it("accepte un identifiant explicite", async () => {
    const reponse = await creer({ ...nouvelle, id: "formation-claude" });
    expect((await reponse.json()).id).toBe("formation-claude");
  });

  it("refuse un identifiant invalide ou hors du dossier", async () => {
    for (const id of ["../evade", "Majuscules", "avec espace", "/absolu"]) {
      const reponse = await creer({ ...nouvelle, id });
      expect(reponse.status).toBe(400);
      expect((await reponse.json()).erreur).toMatch(/identifiant invalide/);
    }
  });

  it("répond 409 si la formation existe déjà", async () => {
    await creer({ ...nouvelle, id: "formation-claude" });
    const seconde = await creer({ ...nouvelle, id: "formation-claude" });
    expect(seconde.status).toBe(409);
    expect((await seconde.json()).erreur).toMatch(/existe déjà/);
  });

  it("refuse une saisie incomplète avec un message situé", async () => {
    const reponse = await creer({ titre: "T", modules: [] });
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).erreur).toBe("modules : au moins un module attendu");
  });

  it("refuse un corps illisible", async () => {
    const reponse = await appeler("/api/formations", {
      method: "POST",
      body: "pas du json",
    });
    expect(reponse.status).toBe(400);
  });

  it("reste soumis à la garde locale (A-R1)", async () => {
    const reponse = await appeler("/api/formations", {
      method: "POST",
      body: JSON.stringify(nouvelle),
      headers: { origin: "https://evil.example" },
    });
    expect(reponse.status).toBe(403);
  });
});

describe("GET /api/formations/:fid/structure", () => {
  it("renvoie la structure éditable avec les identifiants existants", async () => {
    await creer({ ...nouvelle, id: "formation-claude" });
    const corps = await (
      await appeler("/api/formations/formation-claude/structure")
    ).json();
    expect(corps).toMatchObject({
      id: "formation-claude",
      titre: "Formation pratique Claude",
      description: "Compagnon pratique",
    });
    expect(corps.modules[0].lecons[0]).toEqual({
      id: "installer-claude-code",
      titre: "Installer Claude Code",
    });
  });

  it("répond 404 sur une formation inconnue", async () => {
    expect((await appeler("/api/formations/jamais/structure")).status).toBe(404);
  });
});

describe("PUT /api/formations/:fid/structure (P008)", () => {
  async function creerPuisModifier(structure: unknown) {
    await creer({ ...nouvelle, id: "formation-claude" });
    return appeler("/api/formations/formation-claude/structure", {
      method: "PUT",
      body: JSON.stringify(structure),
    });
  }

  it("renomme un titre de leçon sans perdre la progression", async () => {
    await creer({ ...nouvelle, id: "formation-claude" });
    await appeler("/api/progression/formation-claude/installer-claude-code", {
      method: "PUT",
    });

    const reponse = await appeler("/api/formations/formation-claude/structure", {
      method: "PUT",
      body: JSON.stringify({
        titre: "Formation pratique Claude",
        modules: [
          {
            id: "fondations",
            titre: "Fondations",
            lecons: [
              { id: "installer-claude-code", titre: "Installer Claude Code (2026)" },
              { id: "le-mode-plan", titre: "Le mode plan" },
            ],
          },
        ],
      }),
    });
    expect(reponse.status).toBe(200);

    const formation = await (await appeler("/api/formations/formation-claude")).json();
    expect(formation.avancement.faites).toBe(1);
    expect(formation.avancement.orphelines).toEqual([]);
    expect(formation.avancement.modules[0].lecons[0].titre).toBe(
      "Installer Claude Code (2026)",
    );
  });

  it("ajoute une leçon et crée son fichier, sans toucher aux autres", async () => {
    await creer({ ...nouvelle, id: "formation-claude" });
    const fichier = path.join(
      racine,
      "formation-claude",
      "lecons",
      "installer-claude-code.md",
    );
    await fs.writeFile(fichier, "Ma prose.", "utf8");

    const reponse = await appeler("/api/formations/formation-claude/structure", {
      method: "PUT",
      body: JSON.stringify({
        titre: "Formation pratique Claude",
        modules: [
          {
            id: "fondations",
            titre: "Fondations",
            lecons: [
              { id: "installer-claude-code", titre: "Installer Claude Code" },
              { id: "le-mode-plan", titre: "Le mode plan" },
              { titre: "Les hooks" },
            ],
          },
        ],
      }),
    });

    expect((await reponse.json()).fichiersCrees).toEqual(["lecons/les-hooks.md"]);
    expect(await fs.readFile(fichier, "utf8")).toBe("Ma prose.");
  });

  it("laisse le fichier d'une leçon retirée sur le disque", async () => {
    const reponse = await creerPuisModifier({
      titre: "Formation pratique Claude",
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: [{ id: "installer-claude-code", titre: "Installer Claude Code" }],
        },
      ],
    });
    expect(reponse.status).toBe(200);
    const restant = path.join(racine, "formation-claude", "lecons", "le-mode-plan.md");
    await expect(fs.access(restant)).resolves.toBeUndefined();
  });

  it("refuse une structure vide sans écrire", async () => {
    const reponse = await creerPuisModifier({ titre: "T", modules: [] });
    expect(reponse.status).toBe(400);
    const formation = await (await appeler("/api/formations/formation-claude")).json();
    expect(formation.avancement.total).toBe(2);
  });

  it("réindexe la recherche après modification", async () => {
    await creer({ ...nouvelle, id: "formation-claude" });
    const avant = await (
      await appeler("/api/formations/formation-claude/recherche?q=hooks")
    ).json();
    expect(avant.resultats).toHaveLength(0);

    await appeler("/api/formations/formation-claude/structure", {
      method: "PUT",
      body: JSON.stringify({
        titre: "Formation pratique Claude",
        modules: [
          {
            id: "fondations",
            titre: "Fondations",
            lecons: [
              { id: "installer-claude-code", titre: "Installer Claude Code" },
              { id: "le-mode-plan", titre: "Le mode plan" },
              { titre: "Les hooks" },
            ],
          },
        ],
      }),
    });

    const apres = await (
      await appeler("/api/formations/formation-claude/recherche?q=hooks")
    ).json();
    expect(apres.resultats.map((r: { leconId: string }) => r.leconId)).toEqual([
      "les-hooks",
    ]);
  });
});
