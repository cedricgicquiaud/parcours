import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mettreAJourStructure } from "./ecriture";

let racine: string;
let dossier: string;

/** Manifeste garni de tout ce que l'administration ne sait PAS gérer. */
const GARNI = {
  formatVersion: 1,
  id: "formation-claude",
  titre: "Formation pratique Claude",
  description: "Le compagnon pratique.",
  couverture: "assets/couverture.png",
  presentation: "# À propos\n\nUn texte long.",
  objectifs: ["Piloter Claude Code", "Écrire un hook"],
  prerequis: ["Un terminal"],
  duree: 1200,
  parametreInvente: { garde: "moi" },
  modules: [
    {
      id: "fondations",
      titre: "Fondations",
      description: "Le socle.",
      lecons: [
        { id: "installer", titre: "Installer", fichier: "lecons/installer.md", duree: 45 },
        { id: "hooks", titre: "Les hooks", fichier: "lecons/hooks.md", duree: 30 },
      ],
    },
  ],
};

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-preservation-"));
  dossier = path.join(racine, "formation-claude");
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  await fs.writeFile(path.join(dossier, "lecons", "installer.md"), "Un texte.", "utf8");
  await fs.writeFile(path.join(dossier, "lecons", "hooks.md"), "Un texte.", "utf8");
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    `${JSON.stringify(GARNI, null, 2)}\n`,
    "utf8",
  );
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

async function relire(): Promise<Record<string, unknown>> {
  const texte = await fs.readFile(path.join(dossier, "formation.json"), "utf8");
  return JSON.parse(texte) as Record<string, unknown>;
}

/** La saisie que l'interface d'administration envoie : titre + structure. */
function saisieRenommee() {
  return {
    titre: "Formation pratique Claude",
    description: "Le compagnon pratique.",
    modules: [
      {
        id: "fondations",
        titre: "Fondations, revu",
        lecons: [
          { id: "installer", titre: "Installer" },
          { id: "hooks", titre: "Les hooks" },
        ],
      },
    ],
  };
}

describe("l'administration ne perd aucun champ (FI-R9)", () => {
  it("conserve couverture, présentation, objectifs, prérequis et durée", async () => {
    const resultat = await mettreAJourStructure(dossier, "formation-claude", saisieRenommee());
    expect(resultat.ok).toBe(true);

    const apres = await relire();
    expect(apres.couverture).toBe(GARNI.couverture);
    expect(apres.presentation).toBe(GARNI.presentation);
    expect(apres.objectifs).toEqual(GARNI.objectifs);
    expect(apres.prerequis).toEqual(GARNI.prerequis);
    expect(apres.duree).toBe(GARNI.duree);
  });

  it("applique tout de même la modification demandée", async () => {
    await mettreAJourStructure(dossier, "formation-claude", saisieRenommee());
    const apres = await relire();
    const modules = apres.modules as Array<Record<string, unknown>>;
    expect(modules[0]!.titre).toBe("Fondations, revu");
  });

  it("conserve la description d'un module et les durées de leçons", async () => {
    await mettreAJourStructure(dossier, "formation-claude", saisieRenommee());
    const modules = (await relire()).modules as Array<Record<string, unknown>>;
    expect(modules[0]!.description).toBe("Le socle.");
    const lecons = modules[0]!.lecons as Array<Record<string, unknown>>;
    expect(lecons.map((lecon) => lecon.duree)).toEqual([45, 30]);
  });

  it("conserve un champ que Parcours ne connaît pas du tout", async () => {
    await mettreAJourStructure(dossier, "formation-claude", saisieRenommee());
    expect((await relire()).parametreInvente).toEqual({ garde: "moi" });
  });

  it("n'invente rien quand le manifeste d'origine est nu", async () => {
    await fs.writeFile(
      path.join(dossier, "formation.json"),
      JSON.stringify({
        formatVersion: 1,
        id: "formation-claude",
        titre: "Nue",
        modules: [
          { id: "fondations", titre: "F", lecons: [{ id: "installer", titre: "I", fichier: "lecons/installer.md" }] },
        ],
      }),
      "utf8",
    );
    await mettreAJourStructure(dossier, "formation-claude", {
      titre: "Nue",
      modules: [{ id: "fondations", titre: "F", lecons: [{ id: "installer", titre: "I" }] }],
    });

    const apres = await relire();
    expect(Object.keys(apres).sort()).toEqual(["formatVersion", "id", "modules", "titre"]);
  });

  it("laisse partir une leçon retirée du manifeste, avec sa durée", async () => {
    await mettreAJourStructure(dossier, "formation-claude", {
      titre: "Formation pratique Claude",
      modules: [
        { id: "fondations", titre: "Fondations", lecons: [{ id: "installer", titre: "Installer" }] },
      ],
    });
    const modules = (await relire()).modules as Array<Record<string, unknown>>;
    const lecons = modules[0]!.lecons as Array<Record<string, unknown>>;
    expect(lecons).toHaveLength(1);
    expect(lecons[0]!.duree).toBe(45);
  });
});
