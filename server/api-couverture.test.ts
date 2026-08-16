import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MoteurRendu } from "./markdown/rendu";
import { creerContexteTest, type ContexteTest } from "./test-utils";
import type { ReponseFormation } from "./types-api";

let rendu: MoteurRendu;
let contexte: ContexteTest;
let dossier: string;

/** Un PNG minimal : signature + un octet. Assez pour la validation. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("contenu"),
]).toString("base64");

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.from("contenu"),
]).toString("base64");

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-couv-" });
  dossier = path.join(contexte.racine, "formation-claude");
  await fs.mkdir(path.join(dossier, "lecons"), { recursive: true });
  await fs.writeFile(path.join(dossier, "lecons", "installer.md"), "Un texte.", "utf8");
  await fs.writeFile(
    path.join(dossier, "formation.json"),
    JSON.stringify({
      formatVersion: 1,
      id: "formation-claude",
      titre: "Formation pratique Claude",
      objectifs: ["Piloter Claude Code"],
      modules: [
        {
          id: "fondations",
          titre: "Fondations",
          lecons: [
            { id: "installer", titre: "Installer", fichier: "lecons/installer.md" },
          ],
        },
      ],
    }),
    "utf8",
  );
});

afterEach(async () => {
  await contexte.fermer();
});

function envoyer(corps: unknown, appeler = contexte.appeler) {
  return appeler("/api/formations/formation-claude/couverture", {
    method: "POST",
    body: JSON.stringify(corps),
  });
}

async function manifeste(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await fs.readFile(path.join(dossier, "formation.json"), "utf8"),
  ) as Record<string, unknown>;
}

async function assets(): Promise<string[]> {
  return (await fs.readdir(path.join(dossier, "assets"))).sort();
}

describe("téléverser une couverture (FI-R14)", () => {
  it("écrit le fichier, le date, et fait pointer le manifeste dessus", async () => {
    const reponse = await envoyer({ nom: "ma-couv.png", contenu: PNG });
    expect(reponse.status).toBe(201);

    const fichiers = await assets();
    expect(fichiers).toHaveLength(1);
    expect(fichiers[0]).toMatch(/^couverture-\d{8}-\d{6}\.png$/);
    expect((await manifeste()).couverture).toBe(`assets/${fichiers[0]}`);
  });

  it("accepte aussi un JPEG", async () => {
    expect((await envoyer({ nom: "photo.jpg", contenu: JPEG })).status).toBe(201);
    expect((await assets())[0]).toMatch(/\.jpg$/);
  });

  it("rend la formation à jour, prête à afficher", async () => {
    const reponse = await envoyer({ nom: "ma-couv.png", contenu: PNG });
    const corps = (await reponse.json()) as { formation: ReponseFormation };
    expect(corps.formation.couverture).toMatch(/^assets\/couverture-/);
  });
});

describe("l'image déposée est ensuite SERVIE (FI-R14)", () => {
  it("répond 200 sur l'adresse construite à partir du manifeste", async () => {
    await envoyer({ nom: "ma-couv.png", contenu: PNG });
    const couverture = (await manifeste()).couverture as string;

    // Exactement l'URL que construit l'interface : le chemin du manifeste se
    // place DERRIÈRE le segment de route « /assets/ », sans être raccourci.
    const reponse = await contexte.appeler(
      `/api/formations/formation-claude/assets/${couverture}`,
    );
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("content-type")).toBe("image/png");
  });
});

describe("refus (FI-R14)", () => {
  it("refuse un SVG : un document actif n'a pas sa place en couverture", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64");
    const reponse = await envoyer({ nom: "vecteur.svg", contenu: svg });
    expect(reponse.status).toBe(400);
    await expect(assets()).rejects.toThrow();
  });

  it("refuse un contenu qui ment sur son extension", async () => {
    const pdf = Buffer.from("%PDF-1.7 faux png").toString("base64");
    const reponse = await envoyer({ nom: "piege.png", contenu: pdf });
    expect(reponse.status).toBe(400);
    expect((await manifeste()).couverture).toBeUndefined();
  });

  it("refuse au-delà de 2 Mo sans rien écrire", async () => {
    const gros = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(2_000_001),
    ]).toString("base64");
    const reponse = await envoyer({ nom: "gros.png", contenu: gros });
    expect(reponse.status).toBe(413);
    await expect(assets()).rejects.toThrow();
  });

  it("refuse un corps incomplet", async () => {
    expect((await envoyer({ nom: "x.png" })).status).toBe(400);
    expect((await envoyer({ contenu: PNG })).status).toBe(400);
  });

  it("refuse une formation inconnue", async () => {
    const reponse = await contexte.appeler("/api/formations/fantome/couverture", {
      method: "POST",
      body: JSON.stringify({ nom: "x.png", contenu: PNG }),
    });
    expect(reponse.status).toBe(404);
  });

  it("refuse un lecteur", async () => {
    const lecteur = await contexte.connecter("eleve");
    expect((await envoyer({ nom: "x.png", contenu: PNG }, lecteur)).status).toBe(403);
  });
});

describe("jamais d'écrasement (FI-R15)", () => {
  it("garde l'ancienne couverture sur le disque après remplacement", async () => {
    await envoyer({ nom: "premiere.png", contenu: PNG });
    const premiere = (await manifeste()).couverture as string;

    await envoyer({ nom: "seconde.png", contenu: PNG });
    const seconde = (await manifeste()).couverture as string;

    expect(seconde).not.toBe(premiere);
    // Les DEUX fichiers sont là : Parcours ne supprime jamais rien (P010).
    expect(await assets()).toHaveLength(2);
    await expect(
      fs.stat(path.join(contexte.racine, "formation-claude", premiere)),
    ).resolves.toBeTruthy();
  });

  it("conserve les autres champs du manifeste (FI-R9)", async () => {
    await envoyer({ nom: "ma-couv.png", contenu: PNG });
    expect((await manifeste()).objectifs).toEqual(["Piloter Claude Code"]);
  });
});
