import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import { creerContexteTest, ecrireFormation, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;
let contexte: ContexteTest;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-suppose-" });
  await creerFormationDemo();
});

afterEach(async () => {
  await contexte.fermer();
});

/**
 * Une formation dont chaque leçon couvre un cas de SU-R4 à SU-R7 : deux
 * suppositions, aucune, une référence disparue du sommaire, une
 * auto-référence, un doublon.
 */
async function creerFormationDemo() {
  const lecons = [
    { id: "installer", titre: "Installer Claude Code" },
    { id: "claudemd", titre: "Écrire un CLAUDE.md" },
    { id: "deux", titre: "Deux hooks", suppose: ["claudemd", "installer"] },
    { id: "sans", titre: "Sans supposition" },
    { id: "morte", titre: "Référence morte", suppose: ["disparue"] },
    { id: "auto", titre: "Auto-référence", suppose: ["auto", "installer"] },
    { id: "doublon", titre: "Doublon", suppose: ["installer", "installer"] },
  ];
  await ecrireFormation(
    contexte.racine,
    {
      formatVersion: 1,
      id: "fil-rouge",
      titre: "Formation fil rouge",
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: lecons.map((lecon) => ({
            ...lecon,
            fichier: `lecons/${lecon.id}.md`,
          })),
        },
      ],
    },
    Object.fromEntries(
      lecons.map((lecon) => [`lecons/${lecon.id}.md`, `Contenu de ${lecon.titre}.`]),
    ),
  );
}

const lire = async (lid: string, appeler = contexte.appeler) =>
  (await appeler(`/api/formations/fil-rouge/lecons/${lid}`)).json();

const terminer = (lid: string, appeler = contexte.appeler) =>
  appeler(`/api/progression/fil-rouge/${lid}`, { method: "PUT" });

describe("GET leçon — suppose (SU-R4 à SU-R7, SU-R12)", () => {
  it("nomme les leçons supposées non faites, dans l'ordre du champ (SU-R6)", async () => {
    const corps = await lire("deux");
    expect(corps.suppose).toEqual([
      { id: "claudemd", titre: "Écrire un CLAUDE.md" },
      { id: "installer", titre: "Installer Claude Code" },
    ]);
  });

  it("ne renvoie plus une leçon supposée une fois terminée (SU-R7)", async () => {
    await terminer("claudemd");
    const corps = await lire("deux");
    expect(corps.suppose).toEqual([
      { id: "installer", titre: "Installer Claude Code" },
    ]);
  });

  it("omet le champ quand toutes les suppositions sont faites (SU-R12)", async () => {
    await terminer("claudemd");
    await terminer("installer");
    const corps = await lire("deux");
    expect(corps).not.toHaveProperty("suppose");
  });

  it("omet le champ quand la leçon ne suppose rien", async () => {
    const corps = await lire("sans");
    expect(corps).not.toHaveProperty("suppose");
  });

  it("ignore une référence qui n'existe plus au sommaire (SU-R4)", async () => {
    const reponse = await contexte.appeler("/api/formations/fil-rouge/lecons/morte");
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).not.toHaveProperty("suppose");
  });

  it("ignore l'auto-référence (SU-R5)", async () => {
    const corps = await lire("auto");
    expect(corps.suppose).toEqual([
      { id: "installer", titre: "Installer Claude Code" },
    ]);
  });

  it("fusionne les doublons : un titre n'est nommé qu'une fois", async () => {
    const corps = await lire("doublon");
    expect(corps.suppose).toEqual([
      { id: "installer", titre: "Installer Claude Code" },
    ]);
  });

  it("filtre sur la progression du compte connecté, pas d'un autre (SU-R7)", async () => {
    await terminer("claudemd");
    await terminer("installer");
    const lecteur = await contexte.connecter("eleve");
    const corps = await lire("deux", lecteur);
    expect(corps.suppose).toEqual([
      { id: "claudemd", titre: "Écrire un CLAUDE.md" },
      { id: "installer", titre: "Installer Claude Code" },
    ]);
  });
});
