import { describe, expect, it } from "vitest";
import { analyserJson, validerManifeste, type Manifeste, type Validation } from "./manifeste";

function analyserManifeste(texte: string): Validation<Manifeste> {
  const json = analyserJson(texte);
  if (!json.ok) return json;
  return validerManifeste(json.valeur, "formation-claude");
}

/** Deux leçons : la seconde peut déclarer ce qu'elle suppose. */
function manifeste(suppose?: unknown): string {
  const seconde: Record<string, unknown> = {
    id: "les-hooks",
    titre: "Les hooks",
    fichier: "lecons/les-hooks.md",
  };
  if (suppose !== undefined) seconde.suppose = suppose;
  return JSON.stringify({
    formatVersion: 1,
    id: "formation-claude",
    titre: "Formation pratique Claude",
    modules: [
      {
        id: "fondations",
        titre: "Fondations",
        lecons: [
          { id: "installer", titre: "Installer", fichier: "lecons/installer.md" },
          seconde,
        ],
      },
    ],
  });
}

function refus(suppose: unknown): string {
  const resultat = analyserManifeste(manifeste(suppose));
  if (resultat.ok) throw new Error("manifeste accepté alors qu'il devait être refusé");
  return resultat.erreur;
}

function accepte(suppose?: unknown): Manifeste {
  const resultat = analyserManifeste(manifeste(suppose));
  if (!resultat.ok) throw new Error(`manifeste refusé : ${resultat.erreur}`);
  return resultat.valeur;
}

function seconde(manifesteValide: Manifeste) {
  return manifesteValide.modules[0]!.lecons[1]!;
}

describe("le champ `suppose` (SU-R1)", () => {
  it("reste facultatif", () => {
    expect(seconde(accepte()).suppose).toBeUndefined();
  });

  it("conserve les identifiants dans l'ordre écrit", () => {
    expect(seconde(accepte(["installer", "les-hooks"])).suppose).toEqual([
      "installer",
      "les-hooks",
    ]);
  });

  it("accepte un identifiant qui ne correspond à aucune leçon (SU-R4)", () => {
    // Retirer une leçon du sommaire est un geste légitime (P010) : il ne doit
    // pas rendre toute la formation invalide par ricochet.
    expect(seconde(accepte(["disparue"])).suppose).toEqual(["disparue"]);
  });
});

describe("refus (SU-R2, SU-R3)", () => {
  it("refuse une chaîne au lieu d'un tableau", () => {
    expect(refus("installer")).toBe(
      "modules[0].lecons[1].suppose : tableau d'identifiants attendu",
    );
  });

  it("refuse une entrée qui n'est pas une chaîne", () => {
    expect(refus(["installer", 3])).toBe(
      "modules[0].lecons[1].suppose[1] : slug invalide",
    );
  });

  it("refuse un identifiant qui n'est pas un slug", () => {
    expect(refus(["EX-1"])).toBe("modules[0].lecons[1].suppose[0] : slug invalide");
  });

  it("refuse plus de cinq identifiants", () => {
    expect(refus(["a", "b", "c", "d", "e", "f"])).toBe(
      "modules[0].lecons[1].suppose : 5 identifiants au plus",
    );
  });
});

describe("tableau vide (SU-R3)", () => {
  it("équivaut à un champ absent", () => {
    expect(seconde(accepte([])).suppose).toBeUndefined();
  });
});
