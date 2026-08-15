import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DOSSIER_ARCHIVES, DOSSIER_CORBEILLE } from "./formations/cycle";
import { MoteurRendu } from "./markdown/rendu";
import type { BaseProgression } from "./progression/db";
import { creerContexteTest, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;
let contexte: ContexteTest;
let racine: string;
let base: BaseProgression;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-cycle-api-" });
  ({ racine, base } = contexte);
});

afterEach(async () => {
  await contexte.fermer();
});

const appeler = (chemin: string, init: RequestInit = {}) =>
  contexte.appeler(chemin, init);

const depot = {
  nom: "Mon cours",
  fichiers: [
    { chemin: "Mon cours/01-intro.md", contenu: "# Introduction\n\nBonjour.\n" },
    { chemin: "Mon cours/02-suite.md", contenu: "# La suite\n" },
  ],
};

const importer = (corps: unknown = depot) =>
  appeler("/api/formations/import", { method: "POST", body: JSON.stringify(corps) });

const catalogue = async () => (await appeler("/api/formations")).json();

describe("POST /api/formations/import (G-R2 à G-R6)", () => {
  it("importe un dossier déposé et le rend lisible immédiatement", async () => {
    const reponse = await importer();
    expect(reponse.status).toBe(201);
    expect(await reponse.json()).toMatchObject({
      id: "mon-cours",
      titre: "Mon cours",
      lecons: 2,
      manifesteGenere: true,
    });

    const lecon = await appeler("/api/formations/mon-cours/lecons/introduction");
    expect(lecon.status).toBe(200);
    expect((await lecon.json()).html).toContain("Bonjour.");
  });

  it("refuse un dépôt fautif avec le message exact", async () => {
    const reponse = await importer({
      nom: "Cours",
      fichiers: [{ chemin: "Cours/../evasion.md", contenu: "# Non\n" }],
    });
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).erreur).toMatch(/hors formation/);
  });

  it("signale un manifeste refusé et propose de déduire le sommaire (G-R5)", async () => {
    const corps = {
      nom: "Cours",
      fichiers: [
        { chemin: "Cours/formation.json", contenu: "{" },
        { chemin: "Cours/a.md", contenu: "# A\n" },
      ],
    };
    const refus = await importer(corps);
    expect(refus.status).toBe(400);
    expect(await refus.json()).toMatchObject({ peutGenerer: true });

    const force = await importer({ ...corps, ignorerManifeste: true });
    expect(force.status).toBe(201);
  });
});

describe("archivage et corbeille (G-R7 à G-R10)", () => {
  beforeEach(async () => {
    await importer();
  });

  it("archive une formation sans perdre sa progression", async () => {
    await appeler("/api/progression/mon-cours/introduction", { method: "PUT" });

    const reponse = await appeler("/api/formations/mon-cours/archiver", {
      method: "POST",
    });
    expect(reponse.status).toBe(200);

    const apres = await catalogue();
    expect(apres.formations).toEqual([]);
    expect(apres.archivees).toEqual([
      { statut: "valide", id: "mon-cours", titre: "Mon cours", lecons: 2 },
    ]);

    const restaure = await appeler("/api/archives/mon-cours/restaurer", {
      method: "POST",
    });
    expect(restaure.status).toBe(200);
    const formation = await (await appeler("/api/formations/mon-cours")).json();
    expect(formation.avancement.faites).toBe(1);
  });

  it("refuse d'archiver une formation inconnue", async () => {
    const reponse = await appeler("/api/formations/fantome/archiver", {
      method: "POST",
    });
    expect(reponse.status).toBe(404);
  });

  it("met à la corbeille sans supprimer le moindre fichier (G-R9)", async () => {
    const reponse = await appeler("/api/formations/mon-cours", { method: "DELETE" });
    expect(reponse.status).toBe(200);
    const { entree } = await reponse.json();

    expect((await catalogue()).formations).toEqual([]);
    const fichier = path.join(racine, DOSSIER_CORBEILLE, entree, "01-intro.md");
    expect(await fs.readFile(fichier, "utf8")).toContain("Bonjour.");

    const corbeille = await (await appeler("/api/corbeille")).json();
    expect(corbeille.entrees).toHaveLength(1);
    expect(corbeille.entrees[0]).toMatchObject({ id: "mon-cours", titre: "Mon cours" });
    expect(corbeille.dossier).toContain(DOSSIER_CORBEILLE);
  });

  it("restaure une entrée de corbeille", async () => {
    const { entree } = await (
      await appeler("/api/formations/mon-cours", { method: "DELETE" })
    ).json();

    const reponse = await appeler(
      `/api/corbeille/${encodeURIComponent(entree)}/restaurer`,
      { method: "POST" },
    );
    expect(reponse.status).toBe(200);
    expect((await catalogue()).formations).toHaveLength(1);
  });

  it("met une archive à la corbeille depuis les archives", async () => {
    await appeler("/api/formations/mon-cours/archiver", { method: "POST" });
    const reponse = await appeler("/api/archives/mon-cours", { method: "DELETE" });

    expect(reponse.status).toBe(200);
    const apres = await catalogue();
    expect(apres.archivees).toEqual([]);
    expect(apres.corbeille).toHaveLength(1);
    await expect(
      fs.access(path.join(racine, DOSSIER_ARCHIVES, "mon-cours")),
    ).rejects.toThrow();
  });

  it("refuse une entrée de corbeille qui tente de remonter d'un dossier", async () => {
    const reponse = await appeler("/api/corbeille/..%2Fmon-cours/restaurer", {
      method: "POST",
    });
    expect(reponse.status).toBe(400);
  });

  it("garde la garde locale sur toutes les routes d'administration (A-R1)", async () => {
    const reponse = await appeler("/api/formations/mon-cours", {
      method: "DELETE",
      headers: { origin: "http://exemple.test" },
    });
    expect(reponse.status).toBe(403);
  });
});
