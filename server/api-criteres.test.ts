import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import { creerContexteTest, ecrireFormation, type ContexteTest } from "./test-utils";
import type { EtatCritere, ReponseCritere, ReponseLecon } from "./types-api";

let rendu: MoteurRendu;
let contexte: ContexteTest;

const EXERCICE = [
  "Un exercice pratique.",
  "",
  "- [ ] `uv run forma list` affiche les 7 cours",
  "- [ ] `uv run forma next` affiche le bon cours",
  "- [x] le dépôt git est initialisé",
].join("\n");

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-criteres-api-" });
  await creerFormation(EXERCICE);
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerFormation(exercice: string) {
  await ecrireFormation(
    contexte.racine,
    {
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: [
            { id: "exercice", titre: "Exercice 1.1", fichier: "lecons/exercice.md" },
            { id: "theorie", titre: "Théorie", fichier: "lecons/theorie.md" },
          ],
        },
      ],
    },
    {
      "lecons/exercice.md": exercice,
      "lecons/theorie.md": "Une leçon sans exercice.",
    },
  );
}

async function lecon(id = "exercice"): Promise<ReponseLecon> {
  const reponse = await contexte.appeler(`/api/formations/formation-claude/lecons/${id}`);
  expect(reponse.status).toBe(200);
  return (await reponse.json()) as ReponseLecon;
}

async function criteres(): Promise<EtatCritere[]> {
  return (await lecon()).criteres;
}

function basculer(id: string, methode: "PUT" | "DELETE") {
  return contexte.appeler(
    `/api/progression/formation-claude/exercice/criteres/${id}`,
    { method: methode },
  );
}

describe("leçon enrichie (CR-R15)", () => {
  it("renvoie les critères en tableau ordonné avec leur état", async () => {
    const reponse = await lecon();

    expect(reponse.criteres.map((critere) => critere.texte)).toEqual([
      "uv run forma list affiche les 7 cours",
      "uv run forma next affiche le bon cours",
      "le dépôt git est initialisé",
    ]);
    // `- [x]` est l'état de départ (CR-R7).
    expect(reponse.criteres.map((critere) => critere.coche)).toEqual([
      false,
      false,
      true,
    ]);
    expect(reponse.html).toContain(`data-critere="${reponse.criteres[0]!.id}"`);
  });

  it("renvoie un tableau vide pour une leçon sans case", async () => {
    const reponse = await contexte.appeler(
      "/api/formations/formation-claude/lecons/theorie",
    );
    expect(((await reponse.json()) as ReponseLecon).criteres).toEqual([]);
  });
});

describe("aperçu de l'éditeur (CR-R15b)", () => {
  it("garde les cases inertes", async () => {
    const reponse = await contexte.appeler("/api/formations/formation-claude/apercu", {
      method: "POST",
      body: JSON.stringify({ markdown: "- [ ] à faire" }),
    });
    const { html } = (await reponse.json()) as { html: string };

    expect(html).toContain("disabled");
    expect(html).not.toContain("data-critere");
  });
});

describe("bascule d'un critère (CR-R14)", () => {
  it("coche, renvoie l'état complet, et tient après rechargement", async () => {
    const [premier] = await criteres();
    const reponse = await basculer(premier!.id, "PUT");
    expect(reponse.status).toBe(200);

    const corps = (await reponse.json()) as ReponseCritere;
    expect(corps.criteres).toHaveLength(3);
    expect(corps.criteres[0]!.coche).toBe(true);
    expect(corps.faite).toBe(false);

    expect((await criteres())[0]!.coche).toBe(true);
  });

  it("décoche un critère coché par défaut dans le markdown (CR-R7)", async () => {
    const parDefaut = (await criteres())[2]!;
    await basculer(parDefaut.id, "DELETE");
    expect((await criteres())[2]!.coche).toBe(false);
  });

  it("est idempotent (CR-R5)", async () => {
    const [premier] = await criteres();
    await basculer(premier!.id, "PUT");
    const seconde = await basculer(premier!.id, "PUT");

    expect(seconde.status).toBe(200);
    expect(((await seconde.json()) as ReponseCritere).criteres[0]!.coche).toBe(true);
  });

  it("refuse un id hors format sans rien écrire (400)", async () => {
    const reponse = await basculer("pas-un-id", "PUT");
    expect(reponse.status).toBe(400);
    expect((await criteres()).some((critere) => critere.coche === true)).toBe(true);
  });

  it("refuse un id absent de la leçon (404, CR-R4)", async () => {
    const reponse = await basculer("abcdef012345-0", "PUT");
    expect(reponse.status).toBe(404);
  });

  it("refuse une leçon ou une formation inconnue (404)", async () => {
    const [premier] = await criteres();
    const inconnue = await contexte.appeler(
      `/api/progression/formation-claude/fantome/criteres/${premier!.id}`,
      { method: "PUT" },
    );
    expect(inconnue.status).toBe(404);
  });

  it("ne laisse pas un compte toucher les critères d'un autre", async () => {
    const [premier] = await criteres();
    await basculer(premier!.id, "PUT");

    const autre = await contexte.connecter("eleve");
    const reponse = await autre(
      "/api/formations/formation-claude/lecons/exercice",
      {},
    );
    const vus = ((await reponse.json()) as ReponseLecon).criteres;
    expect(vus[0]!.coche).toBe(false);
  });
});

describe("effet sur la leçon (CR-R10, CR-R12, CR-R13)", () => {
  it("marque la leçon terminée quand le dernier critère est coché", async () => {
    const liste = await criteres();
    await basculer(liste[0]!.id, "PUT");
    const derniere = await basculer(liste[1]!.id, "PUT");

    const corps = (await derniere.json()) as ReponseCritere;
    expect(corps.faite).toBe(true);
    expect(corps.avancement.faites).toBe(1);
  });

  it("laisse la leçon terminée quand on décoche ensuite (CR-R12)", async () => {
    const liste = await criteres();
    await basculer(liste[0]!.id, "PUT");
    await basculer(liste[1]!.id, "PUT");
    const retour = await basculer(liste[0]!.id, "DELETE");

    expect(((await retour.json()) as ReponseCritere).faite).toBe(true);
  });

  it("compte l'avancement sur les leçons, pas sur les critères (CR-R13)", async () => {
    const liste = await criteres();
    const reponse = await basculer(liste[0]!.id, "PUT");

    // Un critère sur trois coché ne fait pas avancer la formation.
    expect(((await reponse.json()) as ReponseCritere).avancement.faites).toBe(0);
  });
});

describe("purge des critères orphelins (CR-R3)", () => {
  it("oublie un critère reformulé, sans message d'erreur", async () => {
    const [premier] = await criteres();
    await basculer(premier!.id, "PUT");

    await creerFormation(EXERCICE.replace("affiche les 7 cours", "liste les 7 modules"));
    const apres = await criteres();

    expect(apres.some((critere) => critere.id === premier!.id)).toBe(false);
    expect(apres[0]!.coche).toBe(false);
  });

  it("ne purge rien quand la leçon est illisible", async () => {
    const [premier] = await criteres();
    await basculer(premier!.id, "PUT");
    await fs.rm(path.join(contexte.racine, "formation-claude", "lecons", "exercice.md"));

    // Fichier manquant → la formation entière est signalée invalide (F-R2).
    const reponse = await contexte.appeler(
      "/api/formations/formation-claude/lecons/exercice",
    );
    expect(reponse.status).toBe(409);

    await creerFormation(EXERCICE);
    expect((await criteres())[0]!.coche).toBe(true);
  });
});

describe("effacements (CR-R8)", () => {
  it("réinitialiser une formation efface ses critères", async () => {
    const [premier] = await criteres();
    await basculer(premier!.id, "PUT");

    await contexte.appeler("/api/progression/formation-claude/reset", {
      method: "POST",
    });
    expect((await criteres())[0]!.coche).toBe(false);
  });
});
