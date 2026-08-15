import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ouvrirBase } from "../base";
import { BaseJetons, DUREE_CONFIRMATION_MS, DUREE_REINITIALISATION_MS } from "./jetons";

let dossier: string;
let jetons: BaseJetons;
let fichier: string;
let db: ReturnType<typeof ouvrirBase>["db"];

beforeEach(() => {
  dossier = fs.mkdtempSync(path.join(os.tmpdir(), "parcours-jetons-"));
  fichier = path.join(dossier, "parcours.db");
  const ouverte = ouvrirBase(fichier);
  db = ouverte.db;
  jetons = new BaseJetons(ouverte.db);
});

afterEach(() => {
  db.close();
  fs.rmSync(dossier, { recursive: true, force: true });
});

describe("jetons de courriel (EM-R3)", () => {
  it("ne stocke le jeton que haché", () => {
    const { jeton } = jetons.creer(1, "confirmation");
    const contenu = fs.readFileSync(fichier, "latin1");
    expect(contenu).not.toContain(jeton);
  });

  it("rend le compte une seule fois : le jeton est consommé", () => {
    const { jeton } = jetons.creer(7, "confirmation");
    expect(jetons.consommer(jeton, "confirmation")).toBe(7);
    expect(jetons.consommer(jeton, "confirmation")).toBeNull();
  });

  it("refuse un jeton d'un autre type", () => {
    const { jeton } = jetons.creer(7, "confirmation");
    expect(jetons.consommer(jeton, "reinitialisation")).toBeNull();
    // Il n'a pas été consommé au passage : le bon type marche encore.
    expect(jetons.consommer(jeton, "confirmation")).toBe(7);
  });

  it("refuse un jeton expiré, et l'efface", () => {
    const debut = new Date(2026, 0, 1);
    const { jeton } = jetons.creer(7, "reinitialisation", debut);
    const trop_tard = new Date(debut.getTime() + DUREE_REINITIALISATION_MS + 1000);

    expect(jetons.consommer(jeton, "reinitialisation", trop_tard)).toBeNull();
    expect(jetons.consommer(jeton, "reinitialisation", debut)).toBeNull();
  });

  it("donne 48 h pour confirmer et 1 h pour réinitialiser", () => {
    const debut = new Date(2026, 0, 1);
    const confirmation = jetons.creer(1, "confirmation", debut);
    const reinitialisation = jetons.creer(1, "reinitialisation", debut);

    expect(confirmation.expireLe.getTime() - debut.getTime()).toBe(DUREE_CONFIRMATION_MS);
    expect(reinitialisation.expireLe.getTime() - debut.getTime()).toBe(
      DUREE_REINITIALISATION_MS,
    );
  });

  it("un nouveau jeton annule le précédent du même type", () => {
    const premier = jetons.creer(7, "confirmation").jeton;
    const second = jetons.creer(7, "confirmation").jeton;

    expect(jetons.consommer(premier, "confirmation")).toBeNull();
    expect(jetons.consommer(second, "confirmation")).toBe(7);
  });

  it("refuse un jeton inventé sans lever d'exception", () => {
    expect(jetons.consommer("n'importe quoi", "confirmation")).toBeNull();
    expect(jetons.consommer("", "confirmation")).toBeNull();
  });

  it("espace les envois d'une minute (EM-R5)", () => {
    const debut = new Date(2026, 0, 1, 10, 0, 0);
    jetons.creer(7, "confirmation", debut);

    expect(jetons.tropTot(7, "confirmation", new Date(debut.getTime() + 30_000))).toBe(true);
    expect(jetons.tropTot(7, "confirmation", new Date(debut.getTime() + 61_000))).toBe(false);
    // Un autre compte, ou un autre type, n'est pas concerné.
    expect(jetons.tropTot(8, "confirmation", debut)).toBe(false);
    expect(jetons.tropTot(7, "reinitialisation", debut)).toBe(false);
  });

  it("efface tous les jetons d'un compte supprimé", () => {
    const confirmation = jetons.creer(7, "confirmation").jeton;
    const reinitialisation = jetons.creer(7, "reinitialisation").jeton;

    expect(jetons.revoquerTous(7)).toBe(2);
    expect(jetons.consommer(confirmation, "confirmation")).toBeNull();
    expect(jetons.consommer(reinitialisation, "reinitialisation")).toBeNull();
  });
});
