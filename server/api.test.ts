import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { creerApi } from "./api";
import { NOM_COOKIE } from "./comptes/auth";
import { MoteurRendu } from "./markdown/rendu";
import { MoteurRecherche } from "./recherche/moteur";
import type { BaseProgression } from "./progression/db";
import { creerContexteTest, ecrireFormation, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;
let contexte: ContexteTest;
let racine: string;
let base: BaseProgression;
let utilisateurId: number;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-api-" });
  ({ racine, base, utilisateurId } = contexte);
  await creerFormationDemo();
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerFormationDemo() {
  await ecrireFormation(
    racine,
    {
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      description: "Compagnon pratique",
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: [
            {
              id: "installer",
              titre: "Installer",
              fichier: "lecons/installer.md",
              duree: 45,
            },
            { id: "hooks", titre: "Les hooks", fichier: "lecons/hooks.md" },
          ],
        },
      ],
    },
    {
      "lecons/installer.md":
        "Installer Claude Code, c'est une commande.\n\n:::solution\nmotsecret\n:::",
      "lecons/hooks.md": "Un hook se déclenche à chaque écriture.",
      "assets/schema.png": "png",
      "assets/secret.env": "TOKEN=1",
    },
  );

  await ecrireFormation(racine, {
    formatVersion: 1,
    id: "cassee",
    titre: "T",
    modules: [],
  });
}

const local = { headers: { host: "127.0.0.1:4620" } };

const appeler = (chemin: string, init: RequestInit = {}) =>
  contexte.appeler(chemin, init);

describe("garde locale (A-R1)", () => {
  it("refuse un Host non local", async () => {
    const reponse = await contexte.app.request("http://127.0.0.1:4620/api/health", {
      headers: { host: "evil.example" },
    });
    expect(reponse.status).toBe(403);
  });

  it("accepte le Host du serveur de développement", async () => {
    const reponse = await contexte.app.request("http://127.0.0.1:4620/api/health", {
      headers: { host: "localhost:5173" },
    });
    expect(reponse.status).toBe(200);
  });

  it("refuse une mutation dont l'Origin n'est pas local", async () => {
    const reponse = await appeler("/api/progression/formation-claude/hooks", {
      method: "PUT",
      headers: { origin: "https://evil.example" },
    });
    expect(reponse.status).toBe(403);
  });

  it("accepte une mutation sans Origin (client local non-navigateur)", async () => {
    const reponse = await appeler("/api/progression/formation-claude/hooks", {
      method: "PUT",
    });
    expect(reponse.status).toBe(200);
  });
});

describe("GET /api/formations (C-R2, C-R3)", () => {
  it("liste les formations valides et invalides", async () => {
    const reponse = await appeler("/api/formations");
    const corps = await reponse.json();
    expect(reponse.status).toBe(200);
    expect(corps.formations).toHaveLength(2);
    expect(corps.formations[0]).toMatchObject({
      statut: "invalide",
      id: "cassee",
      erreur: "modules : au moins un module attendu",
    });
    expect(corps.formations[1]).toMatchObject({
      statut: "valide",
      id: "formation-claude",
      lecons: 2,
      faites: 0,
      action: "commencer",
      modules: 1,
      modulesFaits: 0,
    });
  });

  it("compte les modules terminés du compte (modulesFaits)", async () => {
    await appeler("/api/progression/formation-claude/installer", { method: "PUT" });
    // Une leçon sur deux : le module n'est pas terminé.
    let corps = await (await appeler("/api/formations")).json();
    expect(corps.formations[1]).toMatchObject({ modules: 1, modulesFaits: 0 });

    await appeler("/api/progression/formation-claude/hooks", { method: "PUT" });
    corps = await (await appeler("/api/formations")).json();
    expect(corps.formations[1]).toMatchObject({ modules: 1, modulesFaits: 1 });
  });

  it("signale un dossier de formations introuvable (F-R1)", async () => {
    const vide = creerApi({
      dossierFormations: path.join(racine, "nulle-part"),
      base,
      criteres: contexte.criteres,
      comptes: contexte.comptes,
      jetons: contexte.jetons,
      reglages: contexte.reglages,
      expediteur: contexte.courriels,
      rendu,
      recherche: new MoteurRecherche(rendu),
    });
    const reponse = await vide.request("http://127.0.0.1:4620/api/formations", {
      headers: { ...local.headers, cookie: `${NOM_COOKIE}=${contexte.jeton}` },
    });
    const corps = await reponse.json();
    expect(corps.formations).toEqual([]);
    expect(corps.erreurGlobale).toMatch(/dossier introuvable/);
  });
});

describe("GET /api/formations/:fid (A-R3, A-R7)", () => {
  it("renvoie le sommaire et la progression", async () => {
    const corps = await (await appeler("/api/formations/formation-claude")).json();
    expect(corps.titre).toBe("Formation pratique Claude");
    expect(corps.avancement.modules[0].lecons).toHaveLength(2);
  });

  it("répond 404 sur une formation inconnue", async () => {
    expect((await appeler("/api/formations/inexistante")).status).toBe(404);
  });

  it("répond 404 sur une casse différente (A-R7)", async () => {
    expect((await appeler("/api/formations/Formation-Claude")).status).toBe(404);
  });

  it("répond 409 sur une formation invalide", async () => {
    const reponse = await appeler("/api/formations/cassee");
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).erreur).toMatch(/^formation invalide :/);
  });
});

describe("GET leçon (A-R5, A-R3)", () => {
  it("renvoie le HTML rendu et le contexte de navigation", async () => {
    const corps = await (
      await appeler("/api/formations/formation-claude/lecons/installer")
    ).json();
    expect(corps.html).toContain("Installer Claude Code");
    expect(corps.position).toBe(1);
    expect(corps.total).toBe(2);
    expect(corps.precedente).toBeNull();
    expect(corps.suivante).toMatchObject({ id: "hooks" });
    expect(corps.faite).toBe(false);
  });

  it("répond 409 quand le fichier a disparu — la formation devient invalide", async () => {
    await fs.rm(path.join(racine, "formation-claude", "lecons", "hooks.md"));
    const reponse = await appeler("/api/formations/formation-claude/lecons/hooks");
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).erreur).toMatch(
      /formation invalide : fichier introuvable/,
    );
  });

  it("répond 404 quand le fichier existe mais n'est pas lisible (A-R3)", async () => {
    const fichier = path.join(racine, "formation-claude", "lecons", "hooks.md");
    await fs.chmod(fichier, 0o000);
    try {
      const reponse = await appeler("/api/formations/formation-claude/lecons/hooks");
      expect(reponse.status).toBe(404);
      expect((await reponse.json()).erreur).toMatch(/introuvable ou illisible/);
    } finally {
      await fs.chmod(fichier, 0o644);
    }
  });

  it("sert la durée de la leçon quand le manifeste en donne une (FI-R6)", async () => {
    const avec = await (
      await appeler("/api/formations/formation-claude/lecons/installer")
    ).json();
    expect(avec.duree).toBe(45);
    const sans = await (
      await appeler("/api/formations/formation-claude/lecons/hooks")
    ).json();
    expect(sans).not.toHaveProperty("duree");
  });

  it("répond 404 sur une leçon inconnue", async () => {
    expect(
      (await appeler("/api/formations/formation-claude/lecons/jamais")).status,
    ).toBe(404);
  });
});

describe("assets (A-R4)", () => {
  it("sert un asset autorisé avec une CSP stricte", async () => {
    const reponse = await appeler("/api/formations/formation-claude/assets/assets/schema.png");
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("content-type")).toBe("image/png");
    expect(reponse.headers.get("content-security-policy")).toBe(
      "default-src 'none'; sandbox",
    );
  });

  it("refuse une extension hors liste blanche", async () => {
    expect(
      (await appeler("/api/formations/formation-claude/assets/assets/secret.env")).status,
    ).toBe(404);
  });

  it("refuse une sortie du dossier de la formation", async () => {
    const reponse = await appeler(
      "/api/formations/formation-claude/assets/..%2F..%2Fsecret.png",
    );
    expect(reponse.status).toBe(403);
  });

  it("refuse un lien symbolique qui sort de la formation", async () => {
    const cible = path.join(os.tmpdir(), `dehors-${process.pid}.png`);
    await fs.writeFile(cible, "png", "utf8");
    await fs.symlink(
      cible,
      path.join(racine, "formation-claude", "assets", "evade.png"),
    );
    const reponse = await appeler(
      "/api/formations/formation-claude/assets/assets/evade.png",
    );
    expect(reponse.status).toBe(403);
  });
});

describe("progression (A-R2, A-R3)", () => {
  it("coche et décoche de façon idempotente", async () => {
    const premier = await appeler("/api/progression/formation-claude/hooks", {
      method: "PUT",
    });
    expect(premier.status).toBe(200);
    expect((await premier.json()).avancement.faites).toBe(1);

    const second = await appeler("/api/progression/formation-claude/hooks", {
      method: "PUT",
    });
    expect((await second.json()).avancement.faites).toBe(1);

    const suppression = await appeler("/api/progression/formation-claude/hooks", {
      method: "DELETE",
    });
    expect((await suppression.json()).avancement.faites).toBe(0);
  });

  it("refuse de cocher une leçon inexistante (jamais d'orpheline par l'API)", async () => {
    const reponse = await appeler("/api/progression/formation-claude/fantome", {
      method: "PUT",
    });
    expect(reponse.status).toBe(404);
  });

  it("réinitialise et nettoie de façon idempotente", async () => {
    base.cocher(utilisateurId, "formation-claude", "hooks");
    base.cocher(utilisateurId, "formation-claude", "disparue");

    const nettoyage = await appeler("/api/progression/formation-claude/nettoyer", {
      method: "POST",
    });
    expect((await nettoyage.json()).supprimees).toBe(1);

    const reset = await appeler("/api/progression/formation-claude/reset", {
      method: "POST",
    });
    expect((await reset.json()).supprimees).toBe(1);

    const vide = await appeler("/api/progression/formation-claude/reset", {
      method: "POST",
    });
    expect((await vide.json()).supprimees).toBe(0);
  });
});

describe("recherche (§ 3B)", () => {
  it("cherche dans la formation ouverte", async () => {
    const corps = await (
      await appeler("/api/formations/formation-claude/recherche?q=hook")
    ).json();
    expect(corps.resultats.map((r: { leconId: string }) => r.leconId)).toEqual(["hooks"]);
  });

  it("n'expose jamais le contenu d'une solution", async () => {
    const corps = await (
      await appeler("/api/formations/formation-claude/recherche?q=motsecret")
    ).json();
    expect(corps.resultats).toEqual([]);
  });

  it("répond 409 sur une formation invalide (S-R7)", async () => {
    expect((await appeler("/api/formations/cassee/recherche?q=hook")).status).toBe(409);
  });
});
