import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { creerApi } from "./api";
import { MoteurRendu } from "./markdown/rendu";
import { BaseProgression } from "./progression/db";
import { MoteurRecherche } from "./recherche/moteur";

let rendu: MoteurRendu;
let racine: string;
let dossierDb: string;
let base: BaseProgression;
let app: Hono;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-editeur-"));
  dossierDb = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-editeur-db-"));
  base = BaseProgression.ouvrir(path.join(dossierDb, "parcours.db"));
  app = creerApi({
    dossierFormations: racine,
    base,
    rendu,
    recherche: new MoteurRecherche(rendu),
  });
  await appeler("/api/formations", {
    method: "POST",
    body: JSON.stringify({
      id: "formation-claude",
      titre: "Formation pratique Claude",
      modules: [{ titre: "Fondations", lecons: [{ titre: "Les hooks" }] }],
    }),
  });
});

afterEach(async () => {
  base.fermer();
  await fs.rm(racine, { recursive: true, force: true });
  await fs.rm(dossierDb, { recursive: true, force: true });
});

function appeler(chemin: string, init: RequestInit = {}) {
  return app.request(`http://127.0.0.1:4620${chemin}`, {
    ...init,
    headers: {
      host: "127.0.0.1:4620",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const ROUTE = "/api/formations/formation-claude/lecons/les-hooks/source";
const fichier = () =>
  path.join(racine, "formation-claude", "lecons", "les-hooks.md");

describe("GET source (P009)", () => {
  it("renvoie le markdown et un jeton d'état", async () => {
    const corps = await (await appeler(ROUTE)).json();
    expect(corps).toMatchObject({
      formationId: "formation-claude",
      leconId: "les-hooks",
      titre: "Les hooks",
      fichier: "lecons/les-hooks.md",
    });
    expect(corps.markdown).toMatch(/reste à écrire/);
    expect(corps.jeton).toMatch(/^\d+-\d+$/);
  });

  it("répond 404 sur une leçon inconnue", async () => {
    const reponse = await appeler(
      "/api/formations/formation-claude/lecons/jamais/source",
    );
    expect(reponse.status).toBe(404);
  });
});

describe("PUT source (P009)", () => {
  it("enregistre le markdown et le rend visible dans la leçon", async () => {
    const { jeton } = await (await appeler(ROUTE)).json();
    const reponse = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "# Les hooks\n\nUn hook se déclenche.", jeton }),
    });
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).jeton).toMatch(/^\d+-\d+$/);

    expect(await fs.readFile(fichier(), "utf8")).toBe(
      "# Les hooks\n\nUn hook se déclenche.",
    );
    const lecon = await (
      await appeler("/api/formations/formation-claude/lecons/les-hooks")
    ).json();
    expect(lecon.html).toContain("Un hook se déclenche.");
  });

  it("refuse d'écraser une version modifiée entre-temps", async () => {
    const { jeton } = await (await appeler(ROUTE)).json();

    // Quelqu'un (éditeur externe, Claude Code) écrit pendant l'édition.
    await fs.writeFile(fichier(), "Version écrite ailleurs.", "utf8");
    const futur = new Date(Date.now() + 2000);
    await fs.utimes(fichier(), futur, futur);

    const reponse = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "Ma version.", jeton }),
    });
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).erreur).toMatch(/a changé depuis son ouverture/);
    expect(await fs.readFile(fichier(), "utf8")).toBe("Version écrite ailleurs.");
  });

  it("accepte l'enregistrement suivant avec le jeton rafraîchi", async () => {
    const premier = await (await appeler(ROUTE)).json();
    const apres = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "Première version.", jeton: premier.jeton }),
    });
    const { jeton } = await apres.json();

    const second = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "Seconde version.", jeton }),
    });
    expect(second.status).toBe(200);
    expect(await fs.readFile(fichier(), "utf8")).toBe("Seconde version.");
  });

  it("refuse un markdown qui n'est pas du texte", async () => {
    const reponse = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: 42 }),
    });
    expect(reponse.status).toBe(400);
  });

  it("réindexe la recherche après enregistrement", async () => {
    const { jeton } = await (await appeler(ROUTE)).json();
    await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "Le mot cerfvolant est ici.", jeton }),
    });
    const reponse = await (
      await appeler("/api/formations/formation-claude/recherche?q=cerfvolant")
    ).json();
    expect(reponse.resultats.map((r: { leconId: string }) => r.leconId)).toEqual([
      "les-hooks",
    ]);
  });

  it("reste soumis à la garde locale (A-R1)", async () => {
    const reponse = await appeler(ROUTE, {
      method: "PUT",
      body: JSON.stringify({ markdown: "x" }),
      headers: { origin: "https://evil.example" },
    });
    expect(reponse.status).toBe(403);
  });
});

describe("POST aperçu (A-R5)", () => {
  it("rend le markdown côté serveur", async () => {
    const reponse = await appeler("/api/formations/formation-claude/apercu", {
      method: "POST",
      body: JSON.stringify({ markdown: ":::astuce\nUn conseil.\n:::" }),
    });
    const corps = await reponse.json();
    expect(corps.html).toContain("encadre-astuce");
    expect(corps.html).toContain("Un conseil.");
  });

  it("assainit l'aperçu comme la leçon elle-même (F-R6)", async () => {
    const corps = await (
      await appeler("/api/formations/formation-claude/apercu", {
        method: "POST",
        body: JSON.stringify({ markdown: "<script>alert(1)</script>" }),
      })
    ).json();
    expect(corps.html).not.toContain("<script");
    expect(corps.html).toContain("&lt;script&gt;");
  });

  it("n'écrit rien sur le disque", async () => {
    const avant = await fs.readFile(fichier(), "utf8");
    await appeler("/api/formations/formation-claude/apercu", {
      method: "POST",
      body: JSON.stringify({ markdown: "Texte d'aperçu jamais enregistré." }),
    });
    expect(await fs.readFile(fichier(), "utf8")).toBe(avant);
  });
});
