import { describe, expect, it } from "vitest";
import { dureeFormation, formaterDuree } from "./duree";
import type { Manifeste } from "./manifeste";

function formation(
  durees: Array<number | undefined>,
  dureeDeclaree?: number,
): Manifeste {
  const manifeste: Manifeste = {
    formatVersion: 1,
    id: "f",
    titre: "F",
    modules: [
      {
        id: "m",
        titre: "M",
        lecons: durees.map((duree, i) => ({
          id: `l${i}`,
          titre: `L${i}`,
          fichier: `lecons/l${i}.md`,
          ...(duree === undefined ? {} : { duree }),
        })),
      },
    ],
  };
  if (dureeDeclaree !== undefined) manifeste.duree = dureeDeclaree;
  return manifeste;
}

describe("durée d'une formation (FI-R5)", () => {
  it("somme les durées quand toutes les leçons en ont une", () => {
    expect(dureeFormation(formation([45, 30, 15]))).toBe(90);
  });

  it("n'annonce rien si une seule leçon n'a pas de durée", () => {
    // Une somme partielle annoncerait « 1 h 15 » là où la formation en demande
    // bien plus : mieux vaut se taire.
    expect(dureeFormation(formation([45, undefined, 30]))).toBeNull();
  });

  it("n'annonce rien quand aucune leçon n'a de durée", () => {
    expect(dureeFormation(formation([undefined, undefined]))).toBeNull();
  });

  it("laisse la durée déclarée l'emporter sur la somme", () => {
    expect(dureeFormation(formation([45, 30], 1200))).toBe(1200);
  });

  it("laisse la durée déclarée l'emporter même sur des leçons non datées", () => {
    expect(dureeFormation(formation([undefined, undefined], 600))).toBe(600);
  });
});

describe("affichage d'une durée (FI-R10)", () => {
  it("écrit les minutes seules sous une heure", () => {
    expect(formaterDuree(45)).toBe("45 min");
    expect(formaterDuree(1)).toBe("1 min");
  });

  it("écrit les heures rondes sans minutes", () => {
    expect(formaterDuree(60)).toBe("1 h");
    expect(formaterDuree(120)).toBe("2 h");
  });

  it("écrit heures et minutes, sans zéro inutile", () => {
    expect(formaterDuree(210)).toBe("3 h 30");
    expect(formaterDuree(65)).toBe("1 h 05");
  });
});
