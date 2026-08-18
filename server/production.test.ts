import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import { servirInterface } from "./production";
import { creerContexteTest, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;
let contexte: ContexteTest;
let dossierUi: string;
let app: Hono;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-prod-" });
  dossierUi = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-prod-ui-"));
  await fs.writeFile(
    path.join(dossierUi, "index.html"),
    '<!doctype html><div id="racine">Parcours</div>',
    "utf8",
  );
  await fs.mkdir(path.join(dossierUi, "assets"));
  await fs.writeFile(path.join(dossierUi, "assets", "app.js"), "console.log(1);", "utf8");

  // Le même assemblage que `main.ts` : l'API d'abord, l'interface ensuite.
  app = new Hono();
  app.route("/", contexte.app);
  servirInterface(app, dossierUi);
});

afterEach(async () => {
  await contexte.fermer();
  await fs.rm(dossierUi, { recursive: true, force: true });
});

/** Requête SANS session : le mode production sert l'interface à tout venant. */
const demander = (chemin: string) =>
  app.request(`http://127.0.0.1:4620${chemin}`, {
    headers: { host: "127.0.0.1:4620" },
  });

describe("mode production — un seul process sert l'API et l'interface", () => {
  it("sert la page d'accueil sans session — jamais de page blanche (AU-R6)", async () => {
    const reponse = await demander("/");
    expect(reponse.status).toBe(200);
    expect(await reponse.text()).toContain('id="racine"');
  });

  it("sert la même page sur une adresse profonde (rechargement en cours de lecture)", async () => {
    const reponse = await demander("/formation/prise-en-main/lecon/bienvenue");
    expect(reponse.status).toBe(200);
    expect(await reponse.text()).toContain('id="racine"');
  });

  it("sert les fichiers construits de l'interface", async () => {
    const reponse = await demander("/assets/app.js");
    expect(reponse.status).toBe(200);
    expect(await reponse.text()).toBe("console.log(1);");
  });

  it("laisse l'API gardée : sans session, une route de données répond 401", async () => {
    const reponse = await demander("/api/formations");
    expect(reponse.status).toBe(401);
  });

  it("reste gardé par la garde locale : un Host non local est refusé", async () => {
    const reponse = await app.request("http://127.0.0.1:4620/", {
      headers: { host: "evil.example" },
    });
    expect(reponse.status).toBe(403);
  });

  it("ne s'installe pas sans dossier construit (en développement, Vite sert l'UI)", async () => {
    const developpement = new Hono();
    developpement.route("/", contexte.app);
    servirInterface(developpement, path.join(dossierUi, "nulle-part"));
    const reponse = await developpement.request("http://127.0.0.1:4620/", {
      headers: { host: "127.0.0.1:4620" },
    });
    expect(reponse.status).toBe(404);
  });
});
