import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { scannerCatalogue, type FormationValide } from "../formations/scan";
import { MoteurRendu } from "../markdown/rendu";
import { MoteurRecherche } from "./moteur";
import { chercherDansTexte, motsDeRequete, normaliser } from "./requete";
import { texteIndexable } from "./texte";

let rendu: MoteurRendu;
let racine: string;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-recherche-"));
});

afterEach(async () => {
  await fs.rm(racine, { recursive: true, force: true });
});

async function creerFormation(lecons: Record<string, string>) {
  const dossier = path.join(racine, "formation-claude");
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  const entrees = Object.entries(lecons);
  for (const [id, contenu] of entrees) {
    await fs.writeFile(path.join(dossier, "lecons", `${id}.md`), contenu, "utf8");
  }
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    JSON.stringify({
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: entrees.map(([id]) => ({
            id,
            titre: `Leçon ${id}`,
            fichier: `lecons/${id}.md`,
          })),
        },
      ],
    }),
    "utf8",
  );
  const scan = await scannerCatalogue(racine);
  const formation = scan.formations[0];
  if (formation?.statut !== "valide") {
    throw new Error(`formation invalide : ${JSON.stringify(formation)}`);
  }
  return formation as FormationValide;
}

describe("normalisation (S-R4)", () => {
  it("ignore la casse et les accents en gardant les positions d'origine", () => {
    const { normalise, carte } = normaliser("Hébergement");
    expect(normalise).toBe("hebergement");
    expect(carte[1]).toBe(1);
  });

  it("découpe la requête en mots", () => {
    expect(motsDeRequete("  Les  Hooks !! ")).toEqual(["les", "hooks"]);
  });
});

describe("extrait (S-R5, S-R6)", () => {
  it("centre l'extrait sur la première occurrence et le borne à 160 caractères", () => {
    const texte = `${"a ".repeat(200)}hook ${"b ".repeat(200)}`;
    const correspondance = chercherDansTexte(texte, ["hook"]);
    expect(correspondance).not.toBeNull();
    expect(correspondance!.extrait.length).toBeLessThanOrEqual(162);
    expect(correspondance!.extrait).toContain("hook");
    expect(correspondance!.extrait.startsWith("…")).toBe(true);
    expect(correspondance!.extrait.endsWith("…")).toBe(true);
  });

  it("renvoie des positions qui pointent bien sur le mot dans l'extrait", () => {
    const correspondance = chercherDansTexte("Un hébergement local suffit.", ["hebergement"]);
    const { extrait, occurrences } = correspondance!;
    const premiere = occurrences[0]!;
    expect(extrait.slice(premiere.debut, premiere.debut + premiere.longueur)).toBe(
      "hébergement",
    );
  });

  it("exige que tous les mots soient présents (ET)", () => {
    expect(chercherDansTexte("un hook se déclenche", ["hook", "plan"])).toBeNull();
    expect(chercherDansTexte("un hook et le mode plan", ["hook", "plan"])).not.toBeNull();
  });
});

describe("texteIndexable (S-R1, S-R2)", () => {
  it("écarte le balisage markdown", () => {
    const texte = texteIndexable(rendu.analyser("## Titre\n\nUn **mot** en gras."));
    expect(texte).toContain("Titre");
    expect(texte).toContain("Un mot en gras.");
    expect(texte).not.toContain("##");
    expect(texte).not.toContain("**");
  });

  it("exclut le contenu des solutions et des indices", () => {
    const markdown = [
      "Le contenu visible.",
      "",
      ":::indice Un titre d'indice",
      "motsecretindice",
      ":::",
      "",
      ":::solution",
      "motsecretsolution",
      ":::",
    ].join("\n");
    const texte = texteIndexable(rendu.analyser(markdown));
    expect(texte).toContain("Le contenu visible.");
    expect(texte).not.toContain("motsecretsolution");
    expect(texte).not.toContain("motsecretindice");
    expect(texte).not.toContain("Un titre d'indice");
  });
});

describe("MoteurRecherche (S-R1 à S-R7)", () => {
  it("trouve une leçon par son contenu et par son titre", async () => {
    const formation = await creerFormation({
      hooks: "Un hook se déclenche à chaque écriture de fichier.",
      plan: "Le mode plan n'écrit rien.",
    });
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "hook");
    expect(reponse.resultats.map((r) => r.leconId)).toEqual(["hooks"]);
    expect(reponse.resultats[0]!.extrait).toContain("hook");
    expect(reponse.resultats[0]!.moduleTitre).toBe("Fondations");

    const parTitre = await moteur.rechercher(formation, "plan");
    expect(parTitre.resultats.map((r) => r.leconId)).toEqual(["plan"]);
  });

  it("ne remonte jamais un mot présent seulement dans une solution (S-R2)", async () => {
    const formation = await creerFormation({
      hooks: "Un énoncé.\n\n:::solution\nLe mot revelateur est ici.\n:::",
    });
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "revelateur");
    expect(reponse.resultats).toEqual([]);
  });

  it("ignore la casse et les accents (S-R4)", async () => {
    const formation = await creerFormation({
      heberger: "L'hébergement se fait en local.",
    });
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "HEBERGEMENT");
    expect(reponse.resultats).toHaveLength(1);
  });

  it("refuse une requête de moins de 2 caractères sans erreur (S-R4)", async () => {
    const formation = await creerFormation({ a: "Un texte." });
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "a");
    expect(reponse.resultats).toEqual([]);
    expect(reponse.message).toBe("saisir au moins 2 caractères");
  });

  it("respecte l'ordre du manifeste (S-R5)", async () => {
    const formation = await creerFormation({
      "a-premiere": "hook un",
      "b-seconde": "hook deux",
      "c-troisieme": "hook trois",
    });
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "hook");
    expect(reponse.resultats.map((r) => r.leconId)).toEqual([
      "a-premiere",
      "b-seconde",
      "c-troisieme",
    ]);
  });

  it("plafonne à 50 résultats en annonçant le total (S-R5)", async () => {
    const lecons: Record<string, string> = {};
    for (let i = 0; i < 60; i++) {
      lecons[`lecon-${String(i).padStart(2, "0")}`] = "Un hook par leçon.";
    }
    const formation = await creerFormation(lecons);
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "hook");
    expect(reponse.resultats).toHaveLength(50);
    expect(reponse.total).toBe(60);
  });

  it("signale les leçons non indexées sans les faire disparaître du reste (S-R7)", async () => {
    const formation = await creerFormation({
      lisible: "Un hook lisible.",
      illisible: "Un hook illisible.",
    });
    await fs.rm(path.join(formation.dossier, "lecons", "illisible.md"));
    const moteur = new MoteurRecherche(rendu);
    const reponse = await moteur.rechercher(formation, "hook");
    expect(reponse.resultats.map((r) => r.leconId)).toEqual(["lisible"]);
    expect(reponse.nonIndexees).toBe(1);
  });

  it("réindexe dès qu'un fichier change (S-R3)", async () => {
    const formation = await creerFormation({ hooks: "Premier contenu." });
    const moteur = new MoteurRecherche(rendu);
    expect((await moteur.rechercher(formation, "premier")).resultats).toHaveLength(1);

    const fichier = path.join(formation.dossier, "lecons", "hooks.md");
    await fs.writeFile(fichier, "Contenu remplace par autre chose.", "utf8");
    const futur = new Date(Date.now() + 2000);
    await fs.utimes(fichier, futur, futur);

    expect((await moteur.rechercher(formation, "premier")).resultats).toHaveLength(0);
    expect((await moteur.rechercher(formation, "remplace")).resultats).toHaveLength(1);
  });

  it("répond sous 50 ms sur index chaud (S-R3)", async () => {
    const lecons: Record<string, string> = {};
    for (let i = 0; i < 200; i++) {
      lecons[`lecon-${String(i).padStart(3, "0")}`] =
        `Contenu de la leçon ${i}. ${"texte de remplissage ".repeat(40)} hook`;
    }
    const formation = await creerFormation(lecons);
    const moteur = new MoteurRecherche(rendu);
    await moteur.rechercher(formation, "hook");
    const debut = performance.now();
    await moteur.rechercher(formation, "hook");
    expect(performance.now() - debut).toBeLessThan(50);
  });
});
