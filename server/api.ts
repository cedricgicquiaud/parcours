import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import { cheminConfine, leconsOrdonnees } from "./formations/manifeste";
import {
  scannerCatalogue,
  trouverFormation,
  trouverLecon,
  TAILLE_MAX_LECON,
  type FormationValide,
  type ResultatScan,
} from "./formations/scan";
import type { MoteurRendu } from "./markdown/rendu";
import { calculerAvancement, voisines } from "./progression/calculs";
import type { BaseProgression } from "./progression/db";
import type { MoteurRecherche } from "./recherche/moteur";
import type {
  CarteFormation,
  ReponseCatalogue,
  ReponseFormation,
  ReponseLecon,
  ReponseProgression,
  ReponseRechercheApi,
  ReponseSuppression,
} from "./types-api";

export interface DependancesApi {
  dossierFormations: string;
  base: BaseProgression;
  rendu: MoteurRendu;
  recherche: MoteurRecherche;
}

/** Extensions d'assets servies (A-R4) — tout le reste répond 404. */
const EXTENSIONS_ASSETS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
};

const HOTES_LOCAUX = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function hoteLocal(valeur: string | undefined): boolean {
  if (!valeur) return false;
  try {
    const url = new URL(valeur.includes("://") ? valeur : `http://${valeur}`);
    return HOTES_LOCAUX.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Garde locale sur toutes les routes (A-R1) : `Host` non local → 403 ;
 * `Origin` non local sur une mutation → 403 ; `Origin` absent → autorisé
 * (curl et scripts locaux n'en envoient pas).
 */
export function gardeLocale(c: Context): Response | null {
  if (!hoteLocal(c.req.header("host"))) {
    return c.json({ erreur: "hôte non local refusé" }, 403);
  }
  const mutation = ["POST", "PUT", "DELETE", "PATCH"].includes(c.req.method);
  const origine = c.req.header("origin");
  if (mutation && origine !== undefined && !hoteLocal(origine)) {
    return c.json({ erreur: "origine non locale refusée" }, 403);
  }
  return null;
}

export function creerApi(deps: DependancesApi): Hono {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const refus = gardeLocale(c);
    if (refus) return refus;
    await next();
  });

  const scanner = () => scannerCatalogue(deps.dossierFormations);

  /** Résout la formation demandée, ou construit la réponse d'erreur (A-R3). */
  async function resoudre(
    c: Context,
    fid: string,
  ): Promise<{ scan: ResultatScan; formation: FormationValide } | Response> {
    const scan = await scanner();
    const formation = trouverFormation(scan, fid);
    if (!formation) {
      return c.json({ erreur: `formation inconnue : ${fid}` }, 404);
    }
    if (formation.statut === "invalide") {
      return c.json({ erreur: `formation invalide : ${formation.erreur}` }, 409);
    }
    return { scan, formation };
  }

  app.get("/api/health", (c) => c.json({ status: "ok", app: "parcours" }));

  app.get("/api/formations", async (c) => {
    const scan = await scanner();
    const coches = deps.base.toutesLesCoches();

    const formations: CarteFormation[] = scan.formations.map((formation) => {
      if (formation.statut === "invalide") {
        return { statut: "invalide", id: formation.id, erreur: formation.erreur };
      }
      const avancement = calculerAvancement(
        formation.manifeste,
        coches.get(formation.id) ?? new Set(),
      );
      const carte: CarteFormation = {
        statut: "valide",
        id: formation.id,
        titre: formation.manifeste.titre,
        modules: formation.manifeste.modules.length,
        lecons: avancement.total,
        faites: avancement.faites,
        pourcentage: avancement.pourcentage,
        action: avancement.action,
        prochaine: avancement.prochaine,
      };
      if (formation.manifeste.description) {
        carte.description = formation.manifeste.description;
      }
      return carte;
    });

    const reponse: ReponseCatalogue = {
      formations,
      progressionReinitialisee: deps.base.reinitialisee,
    };
    if (scan.erreurGlobale) reponse.erreurGlobale = scan.erreurGlobale;
    return c.json(reponse);
  });

  app.get("/api/formations/:fid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const avancement = calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(formation.id),
    );
    const reponse: ReponseFormation = {
      id: formation.id,
      titre: formation.manifeste.titre,
      avancement,
    };
    if (formation.manifeste.description) {
      reponse.description = formation.manifeste.description;
    }
    return c.json(reponse);
  });

  app.get("/api/formations/:fid/lecons/:lid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const lid = c.req.param("lid");
    const entree = trouverLecon(formation, lid);
    if (!entree) return c.json({ erreur: `leçon inconnue : ${lid}` }, 404);

    const confine = cheminConfine(entree.lecon.fichier);
    if (!confine.ok) return c.json({ erreur: confine.erreur }, 409);
    const complet = path.join(formation.dossier, confine.valeur);

    let markdown: string;
    try {
      const infos = await fs.stat(complet);
      if (!infos.isFile() || infos.size > TAILLE_MAX_LECON) throw new Error("illisible");
      markdown = await fs.readFile(complet, "utf8");
    } catch {
      // A-R3 : fichier disparu entre le scan et la lecture.
      return c.json(
        {
          erreur: `fichier de leçon introuvable ou illisible : ${entree.lecon.fichier}`,
        },
        404,
      );
    }

    const idsLecons = new Set(
      leconsOrdonnees(formation.manifeste).map(({ lecon }) => lecon.id),
    );
    const html = deps.rendu.rendre(markdown, {
      formationId: formation.id,
      dossier: formation.dossier,
      idsLecons,
    });
    const { precedente, suivante, position } = voisines(formation.manifeste, lid);

    const reponse: ReponseLecon = {
      formationId: formation.id,
      formationTitre: formation.manifeste.titre,
      leconId: lid,
      titre: entree.lecon.titre,
      moduleId: entree.module.id,
      moduleTitre: entree.module.titre,
      html,
      faite: deps.base.leconsCochees(formation.id).has(lid),
      position: position + 1,
      total: idsLecons.size,
      precedente,
      suivante,
    };
    return c.json(reponse);
  });

  app.get("/api/formations/:fid/recherche", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const reponse = (await deps.recherche.rechercher(
      resolu.formation,
      c.req.query("q") ?? "",
    )) satisfies ReponseRechercheApi;
    return c.json(reponse);
  });

  app.get("/api/formations/:fid/assets/*", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;

    const prefixe = `/api/formations/${encodeURIComponent(formation.id)}/assets/`;
    const brut = decodeURIComponent(new URL(c.req.url).pathname.slice(prefixe.length));
    const confine = cheminConfine(brut);
    if (!confine.ok) return c.json({ erreur: confine.erreur }, 403);

    const extension = path.extname(confine.valeur).toLowerCase();
    const type = EXTENSIONS_ASSETS[extension];
    if (!type) return c.json({ erreur: `type d'asset non servi : ${extension}` }, 404);

    // A-R4 : le chemin RÉEL doit rester dans la formation (liens symboliques).
    let reel: string;
    let racineReelle: string;
    try {
      reel = await fs.realpath(path.join(formation.dossier, confine.valeur));
      racineReelle = await fs.realpath(formation.dossier);
    } catch {
      return c.json({ erreur: `asset introuvable : ${brut}` }, 404);
    }
    if (reel !== racineReelle && !reel.startsWith(racineReelle + path.sep)) {
      return c.json({ erreur: "asset hors formation" }, 403);
    }

    let contenu: Buffer;
    try {
      contenu = await fs.readFile(reel);
    } catch {
      return c.json({ erreur: `asset introuvable : ${brut}` }, 404);
    }
    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": type,
        // Un SVG servi en navigation directe reste inerte (A-R4).
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  app.put("/api/progression/:fid/:lid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const lid = c.req.param("lid");
    // A-R3 : jamais de création d'orpheline par l'API.
    if (!trouverLecon(formation, lid)) {
      return c.json({ erreur: `leçon inconnue : ${lid}` }, 404);
    }
    deps.base.cocher(formation.id, lid);
    return c.json(reponseProgression(deps, formation, true));
  });

  app.delete("/api/progression/:fid/:lid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const lid = c.req.param("lid");
    if (!trouverLecon(formation, lid)) {
      return c.json({ erreur: `leçon inconnue : ${lid}` }, 404);
    }
    deps.base.decocher(formation.id, lid);
    return c.json(reponseProgression(deps, formation, false));
  });

  app.post("/api/progression/:fid/reset", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const supprimees = deps.base.reinitialiser(formation.id);
    return c.json(reponseSuppression(deps, formation, supprimees));
  });

  app.post("/api/progression/:fid/nettoyer", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const idsConnus = new Set(
      leconsOrdonnees(formation.manifeste).map(({ lecon }) => lecon.id),
    );
    const supprimees = deps.base.nettoyerOrphelines(formation.id, idsConnus);
    return c.json(reponseSuppression(deps, formation, supprimees));
  });

  app.notFound((c) =>
    c.req.path.startsWith("/api/")
      ? c.json({ erreur: `route inconnue : ${c.req.path}` }, 404)
      : c.text("Not found", 404),
  );

  return app;
}

function reponseProgression(
  deps: DependancesApi,
  formation: FormationValide,
  faite: boolean,
): ReponseProgression {
  return {
    faite,
    avancement: calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(formation.id),
    ),
  };
}

function reponseSuppression(
  deps: DependancesApi,
  formation: FormationValide,
  supprimees: number,
): ReponseSuppression {
  return {
    supprimees,
    avancement: calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(formation.id),
    ),
  };
}
