import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ouvrirBase } from "../base";
import { BaseCriteres } from "./criteres";
import { BaseProgression } from "./db";

let dossier: string;
let chemin: string;
let base: BaseProgression;
let criteres: BaseCriteres;

const ID_A = "aaaaaaaaaaaa-0";
const ID_B = "bbbbbbbbbbbb-0";

beforeEach(() => {
  dossier = fs.mkdtempSync(path.join(os.tmpdir(), "parcours-criteres-"));
  chemin = path.join(dossier, "parcours.db");
  const ouverte = ouvrirBase(chemin);
  base = new BaseProgression(ouverte.db);
  criteres = new BaseCriteres(ouverte.db);
});

afterEach(() => {
  base.fermer();
  fs.rmSync(dossier, { recursive: true, force: true });
});

describe("BaseCriteres (CR-R5, CR-R7)", () => {
  it("retient l'état d'un critère et sa date de bascule", () => {
    const date = new Date("2026-08-15T10:00:00.000Z");
    criteres.basculer(1, "formation", "lecon", ID_A, true, date);

    expect(criteres.etatsDe(1, "formation", "lecon").get(ID_A)).toBe(true);
    expect(criteres.basculeLe(1, "formation", "lecon", ID_A)).toBe(date.toISOString());
  });

  it("mémorise aussi un décochage explicite (CR-R7)", () => {
    criteres.basculer(1, "formation", "lecon", ID_A, false);
    expect(criteres.etatsDe(1, "formation", "lecon").get(ID_A)).toBe(false);
  });

  it("est idempotent : rebasculer au même état ne change rien", () => {
    const date = new Date("2026-08-15T10:00:00.000Z");
    criteres.basculer(1, "formation", "lecon", ID_A, true, date);
    criteres.basculer(1, "formation", "lecon", ID_A, true, new Date("2026-08-16T10:00:00.000Z"));

    expect(criteres.etatsDe(1, "formation", "lecon").get(ID_A)).toBe(true);
    expect(criteres.basculeLe(1, "formation", "lecon", ID_A)).toBe(
      new Date("2026-08-16T10:00:00.000Z").toISOString(),
    );
  });

  it("cloisonne les comptes", () => {
    criteres.basculer(1, "formation", "lecon", ID_A, true);
    expect(criteres.etatsDe(2, "formation", "lecon").size).toBe(0);
  });

  it("cloisonne les leçons", () => {
    criteres.basculer(1, "formation", "lecon-a", ID_A, true);
    expect(criteres.etatsDe(1, "formation", "lecon-b").size).toBe(0);
  });
});

describe("purges (CR-R3, CR-R8)", () => {
  it("purge les seuls critères absents de la leçon", () => {
    criteres.basculer(1, "formation", "lecon", ID_A, true);
    criteres.basculer(1, "formation", "lecon", ID_B, true);

    expect(criteres.purgerOrphelins(1, "formation", "lecon", new Set([ID_A]))).toBe(1);
    expect([...criteres.etatsDe(1, "formation", "lecon").keys()]).toEqual([ID_A]);
  });

  it("efface les critères d'une formation sans toucher aux autres", () => {
    criteres.basculer(1, "formation-a", "lecon", ID_A, true);
    criteres.basculer(1, "formation-b", "lecon", ID_A, true);

    expect(criteres.reinitialiser(1, "formation-a")).toBe(1);
    expect(criteres.etatsDe(1, "formation-b", "lecon").size).toBe(1);
  });

  it("efface les critères d'un compte supprimé", () => {
    criteres.basculer(1, "formation", "lecon", ID_A, true);
    criteres.basculer(2, "formation", "lecon", ID_A, true);

    expect(criteres.effacerCompte(1)).toBe(1);
    expect(criteres.etatsDe(2, "formation", "lecon").size).toBe(1);
  });
});

describe("cohabitation avec la progression existante (CR-R7b)", () => {
  it("n'altère pas les coches de leçon d'une base déjà remplie", () => {
    base.cocher(1, "formation", "lecon");
    base.fermer();

    const rouverte = ouvrirBase(chemin);
    const progression = new BaseProgression(rouverte.db);
    const nouveaux = new BaseCriteres(rouverte.db);
    nouveaux.basculer(1, "formation", "lecon", ID_A, true);

    expect(progression.leconsCochees(1, "formation").has("lecon")).toBe(true);
    base = progression;
  });
});
