import { describe, expect, it } from "vitest";
import { FORMAT_ID_CRITERE, idCritere, normaliserCritere } from "./criteres";

describe("normaliserCritere (CR-R2)", () => {
  it("ignore la casse, les accents et la ponctuation", () => {
    expect(normaliserCritere("Le Hook Bloque l'édition !")).toBe(
      normaliserCritere("le hook bloque l edition"),
    );
  });

  it("compresse les espaces et retire le balisage résiduel", () => {
    expect(normaliserCritere("`uv run forma list`   affiche  les 7 cours")).toBe(
      normaliserCritere("uv run forma list affiche les 7 cours"),
    );
  });

  it("distingue deux critères qui diffèrent par un chiffre", () => {
    expect(normaliserCritere("affiche les 7 cours")).not.toBe(
      normaliserCritere("affiche les 8 cours"),
    );
  });
});

describe("idCritere (CR-R2)", () => {
  it("respecte le format publié", () => {
    expect(idCritere("un critère", 0)).toMatch(FORMAT_ID_CRITERE);
    expect(idCritere("un critère", 12)).toMatch(FORMAT_ID_CRITERE);
  });

  it("ne dépend pas de la position du critère dans la leçon", () => {
    // Insérer un critère en tête ne doit décaler l'identité d'aucun autre :
    // c'est tout l'intérêt d'un id dérivé du texte.
    expect(idCritere("le second critère", 0)).toBe(idCritere("le second critère", 0));
  });

  it("sépare deux critères au texte identique par leur rang", () => {
    expect(idCritere("les tests passent", 0)).not.toBe(
      idCritere("les tests passent", 1),
    );
  });

  it("survit à une correction de ponctuation ou de casse", () => {
    expect(idCritere("`uv run forma list` affiche les 7 cours", 0)).toBe(
      idCritere("uv run forma list affiche les 7 cours.", 0),
    );
  });

  it("change quand le critère est reformulé (CR-R3)", () => {
    expect(idCritere("la commande affiche les 7 cours", 0)).not.toBe(
      idCritere("la commande liste les 7 cours", 0),
    );
  });
});
