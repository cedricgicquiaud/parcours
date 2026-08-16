import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import { creerContexteTest, type ContexteTest } from "./test-utils";
import type { CarteFormationValide, ReponseCatalogue, ReponseFormation } from "./types-api";

let rendu: MoteurRendu;
let contexte: ContexteTest;

const FICHE = {
  couverture: "assets/couverture.png",
  presentation: "## À propos\n\nUn texte de présentation.\n\n- [ ] une case inerte",
  objectifs: ["Piloter Claude Code", "Écrire un hook"],
  prerequis: ["Un terminal"],
};

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-fiche-" });
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerFormation(fiche: Record<string, unknown> = {}) {
  const dossier = path.join(contexte.racine, "formation-claude");
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  await fs.mkdir(path.join(dossier, "assets"), { recursive: true });
  await fs.writeFile(path.join(dossier, "assets", "couverture.png"), "png", "utf8");
  await fs.writeFile(path.join(dossier, "lecons", "installer.md"), "Un texte.", "utf8");
  await fs.writeFile(path.join(dossier, "lecons", "hooks.md"), "Un texte.", "utf8");
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    JSON.stringify({
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      description: "Le compagnon pratique.",
      ...fiche,
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
    }),
    "utf8",
  );
}

async function fiche(): Promise<ReponseFormation> {
  const reponse = await contexte.appeler("/api/formations/formation-claude");
  expect(reponse.status).toBe(200);
  return (await reponse.json()) as ReponseFormation;
}

describe("la formation sert les champs de fiche (FI-R10)", () => {
  it("renvoie couverture, présentation rendue, objectifs, prérequis et durée", async () => {
    await creerFormation(FICHE);
    const corps = await fiche();

    expect(corps.couverture).toBe("assets/couverture.png");
    expect(corps.objectifs).toEqual(FICHE.objectifs);
    expect(corps.prerequis).toEqual(FICHE.prerequis);
    // 45 + 30 : toutes les leçons sont datées (FI-R5).
    expect(corps.duree).toBe(75);
    expect(corps.presentationHtml).toContain("<h3>À propos</h3>");
  });

  it("rend les cases de la présentation INERTES — une fiche n'a pas de progression (FI-R2)", async () => {
    await creerFormation(FICHE);
    const corps = await fiche();
    expect(corps.presentationHtml).toContain("disabled");
    expect(corps.presentationHtml).not.toContain("data-critere");
  });

  it("porte la description et la durée de chaque module", async () => {
    await creerFormation(FICHE);
    const module = (await fiche()).avancement.modules[0]!;
    expect(module.description).toBe("Le socle.");
    expect(module.duree).toBe(75);
    expect(module.lecons[0]!.duree).toBe(45);
  });

  it("omet ce qui est absent plutôt que de renvoyer du vide", async () => {
    await creerFormation();
    const corps = await fiche();

    expect(corps.couverture).toBeUndefined();
    expect(corps.presentationHtml).toBeUndefined();
    expect(corps.objectifs).toBeUndefined();
    expect(corps.prerequis).toBeUndefined();
  });
});

describe("le catalogue (FI-R13)", () => {
  it("porte la couverture, mais pas la présentation dont la carte n'a que faire", async () => {
    await creerFormation(FICHE);
    const reponse = await contexte.appeler("/api/formations");
    const corps = (await reponse.json()) as ReponseCatalogue;
    const carte = corps.formations[0] as CarteFormationValide;

    expect(carte.couverture).toBe("assets/couverture.png");
    expect(carte.duree).toBe(75);
    expect(JSON.stringify(carte)).not.toContain("présentation");
    expect(JSON.stringify(carte)).not.toContain("Un texte de présentation");
  });

  it("laisse la carte d'une formation nue inchangée", async () => {
    await creerFormation();
    const reponse = await contexte.appeler("/api/formations");
    const corps = (await reponse.json()) as ReponseCatalogue;
    const carte = corps.formations[0] as CarteFormationValide;

    expect(carte.couverture).toBeUndefined();
    expect(carte.titre).toBe("Formation pratique Claude");
  });
});
