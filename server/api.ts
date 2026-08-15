import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import {
  archiver,
  cheminArchives,
  cheminCorbeille,
  listerArchives,
  listerCorbeille,
  mettreEnCorbeille,
  restaurerArchive,
  restaurerDeCorbeille,
} from "./formations/cycle";
import {
  creerFormation,
  ecrireSource,
  lireSource,
  mettreAJourStructure,
  type StructureSaisie,
} from "./formations/ecriture";
import { EXTENSIONS_ASSETS } from "./formations/extensions";
import { importerFormation, type DemandeImport } from "./formations/import";
import { cheminConfine, leconsOrdonnees } from "./formations/manifeste";
import { slugifier } from "./formations/slug";
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
  ReponseApercu,
  ReponseCorbeille,
  ReponseCorbeilleAjout,
  ReponseEcriture,
  ReponseEnregistrementSource,
  ReponseImport,
  ReponseSourceLecon,
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

  /** Corps JSON d'une requête d'administration, ou la réponse d'erreur. */
  async function lireCorps(c: Context): Promise<unknown | Response> {
    try {
      const corps: unknown = await c.req.json();
      if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
        return c.json({ erreur: "objet JSON attendu" }, 400);
      }
      return corps;
    } catch {
      return c.json({ erreur: "corps JSON illisible" }, 400);
    }
  }

  app.get("/api/health", (c) => c.json({ status: "ok", app: "parcours" }));

  // --- Espace d'administration (P008) : écriture de la STRUCTURE seulement ---

  app.post("/api/formations", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const demande = corps as { id?: unknown } & StructureSaisie;
    const identifiant =
      typeof demande.id === "string" && demande.id.trim().length > 0
        ? demande.id.trim()
        : slugifier(typeof demande.titre === "string" ? demande.titre : "");
    if (!identifiant) {
      return c.json({ erreur: "identifiant : impossible de le dériver du titre" }, 400);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(identifiant) || identifiant.length > 64) {
      return c.json({ erreur: `identifiant invalide : ${identifiant}` }, 400);
    }

    const ecrit = await creerFormation(deps.dossierFormations, identifiant, demande);
    if (!ecrit.ok) {
      const conflit = ecrit.erreur.includes("existe déjà");
      return c.json({ erreur: ecrit.erreur }, conflit ? 409 : 400);
    }
    return c.json(
      {
        id: identifiant,
        titre: ecrit.valeur.manifeste.titre,
        fichiersCrees: ecrit.valeur.fichiersCrees,
      } satisfies ReponseEcriture,
      201,
    );
  });

  // --- Cycle de vie : import, archivage, corbeille (P010) ---

  /**
   * Import d'un dossier déposé (G-R2). Le refus d'un `formation.json` invalide
   * remonte `peutGenerer` : l'interface propose alors d'importer avec un
   * sommaire déduit, plutôt que d'écraser le choix de l'auteur en silence.
   */
  app.post("/api/formations/import", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const importe = await importerFormation(
      deps.dossierFormations,
      corps as DemandeImport,
    );
    if (!importe.ok) {
      const conflit = importe.erreur.includes("existe déjà");
      return c.json(
        importe.peutGenerer
          ? { erreur: importe.erreur, peutGenerer: true }
          : { erreur: importe.erreur },
        conflit ? 409 : 400,
      );
    }
    return c.json(importe.valeur satisfies ReponseImport, 201);
  });

  /** Résout une formation quel que soit son état de validité (G-R7). */
  async function resoudreDossier(c: Context, fid: string) {
    const scan = await scanner();
    const formation = trouverFormation(scan, fid);
    if (!formation) return c.json({ erreur: `formation inconnue : ${fid}` }, 404);
    return formation;
  }

  app.post("/api/formations/:fid/archiver", async (c) => {
    const fid = c.req.param("fid");
    const formation = await resoudreDossier(c, fid);
    if (formation instanceof Response) return formation;

    const resultat = await archiver(deps.dossierFormations, formation.id);
    if (!resultat.ok) return c.json({ erreur: resultat.erreur }, 409);
    deps.recherche.oublier(formation.id);
    return c.json({ id: formation.id, archivee: true });
  });

  app.post("/api/archives/:fid/restaurer", async (c) => {
    const resultat = await restaurerArchive(deps.dossierFormations, c.req.param("fid"));
    if (!resultat.ok) {
      const introuvable = resultat.erreur.includes("introuvable");
      return c.json({ erreur: resultat.erreur }, introuvable ? 404 : 409);
    }
    return c.json({ id: c.req.param("fid"), archivee: false });
  });

  /**
   * Mise à la corbeille (G-R8) : un DÉPLACEMENT, jamais une suppression. La
   * progression reste en base pour qu'une restauration retrouve les coches.
   */
  async function versCorbeille(c: Context, source: string, id: string) {
    const resultat = await mettreEnCorbeille(deps.dossierFormations, source);
    if (!resultat.ok) {
      const introuvable = resultat.erreur.includes("introuvable");
      return c.json({ erreur: resultat.erreur }, introuvable ? 404 : 409);
    }
    deps.recherche.oublier(id);
    return c.json(resultat.valeur satisfies ReponseCorbeilleAjout);
  }

  app.delete("/api/formations/:fid", async (c) => {
    const formation = await resoudreDossier(c, c.req.param("fid"));
    if (formation instanceof Response) return formation;
    return versCorbeille(c, formation.dossier, formation.id);
  });

  app.delete("/api/archives/:fid", async (c) => {
    const fid = c.req.param("fid");
    const archives = await listerArchives(deps.dossierFormations);
    if (!archives.some((archive) => archive.id === fid)) {
      return c.json({ erreur: `archive inconnue : ${fid}` }, 404);
    }
    return versCorbeille(c, path.join(cheminArchives(deps.dossierFormations), fid), fid);
  });

  app.get("/api/corbeille", async (c) => {
    return c.json({
      entrees: await listerCorbeille(deps.dossierFormations),
      dossier: cheminCorbeille(deps.dossierFormations),
    } satisfies ReponseCorbeille);
  });

  app.post("/api/corbeille/:entree/restaurer", async (c) => {
    const entree = c.req.param("entree");
    const resultat = await restaurerDeCorbeille(deps.dossierFormations, entree);
    if (!resultat.ok) {
      // Une entrée mal formée est une erreur de saisie (400) ; un identifiant
      // déjà repris au catalogue est un conflit (409).
      const conflit = resultat.erreur.includes("existe déjà");
      return c.json({ erreur: resultat.erreur }, conflit ? 409 : 400);
    }
    return c.json(resultat.valeur);
  });

  app.get("/api/formations/:fid/structure", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { manifeste } = resolu.formation;
    const reponse: StructureSaisie & { id: string } = {
      id: manifeste.id,
      titre: manifeste.titre,
      modules: manifeste.modules.map((module) => ({
        id: module.id,
        titre: module.titre,
        lecons: module.lecons.map((lecon) => ({ id: lecon.id, titre: lecon.titre })),
      })),
    };
    if (manifeste.description) reponse.description = manifeste.description;
    return c.json(reponse);
  });

  app.put("/api/formations/:fid/structure", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;
    const { formation } = resolu;

    // Les leçons déjà présentes gardent leur fichier : leur contenu ne doit
    // jamais être orphelin d'un renommage automatique (P008).
    const fichiersExistants = new Map(
      leconsOrdonnees(formation.manifeste).map(({ lecon }) => [
        lecon.id,
        lecon.fichier,
      ]),
    );
    const ecrit = await mettreAJourStructure(
      formation.dossier,
      formation.id,
      corps as StructureSaisie,
      fichiersExistants,
    );
    if (!ecrit.ok) return c.json({ erreur: ecrit.erreur }, 400);

    deps.recherche.oublier(formation.id);
    return c.json({
      id: formation.id,
      titre: ecrit.valeur.manifeste.titre,
      fichiersCrees: ecrit.valeur.fichiersCrees,
    } satisfies ReponseEcriture);
  });

  // --- Édition du contenu d'une leçon (P009) ---

  /** Résout la leçon demandée et son chemin de fichier, ou l'erreur. */
  async function resoudreLecon(c: Context, fid: string, lid: string) {
    const resolu = await resoudre(c, fid);
    if (resolu instanceof Response) return resolu;
    const entree = trouverLecon(resolu.formation, lid);
    if (!entree) return c.json({ erreur: `leçon inconnue : ${lid}` }, 404);
    return { formation: resolu.formation, entree };
  }

  app.get("/api/formations/:fid/lecons/:lid/source", async (c) => {
    const resolu = await resoudreLecon(c, c.req.param("fid"), c.req.param("lid"));
    if (resolu instanceof Response) return resolu;
    const { formation, entree } = resolu;
    const source = await lireSource(formation.dossier, entree.lecon.fichier);
    if (!source.ok) return c.json({ erreur: source.erreur }, 404);
    return c.json({
      formationId: formation.id,
      leconId: entree.lecon.id,
      titre: entree.lecon.titre,
      fichier: entree.lecon.fichier,
      markdown: source.valeur.markdown,
      jeton: source.valeur.jeton,
    } satisfies ReponseSourceLecon);
  });

  app.put("/api/formations/:fid/lecons/:lid/source", async (c) => {
    const resolu = await resoudreLecon(c, c.req.param("fid"), c.req.param("lid"));
    if (resolu instanceof Response) return resolu;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;
    const { formation, entree } = resolu;
    const { markdown, jeton } = corps as { markdown?: unknown; jeton?: unknown };

    const ecrit = await ecrireSource(
      formation.dossier,
      entree.lecon.fichier,
      markdown as string,
      typeof jeton === "string" ? jeton : undefined,
    );
    if (!ecrit.ok) return c.json({ erreur: ecrit.erreur }, ecrit.conflit ? 409 : 400);

    deps.recherche.oublier(formation.id);
    return c.json({ jeton: ecrit.valeur.jeton } satisfies ReponseEnregistrementSource);
  });

  /**
   * Aperçu d'un markdown non encore enregistré. Le rendu reste CÔTÉ SERVEUR
   * (A-R5) : l'interface ne rend jamais de markdown elle-même, il n'y a qu'un
   * seul pipeline d'assainissement à sécuriser.
   */
  app.post("/api/formations/:fid/apercu", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;
    const { markdown } = corps as { markdown?: unknown };
    if (typeof markdown !== "string") {
      return c.json({ erreur: "markdown : texte attendu" }, 400);
    }
    const { formation } = resolu;
    const html = deps.rendu.rendre(markdown, {
      formationId: formation.id,
      dossier: formation.dossier,
      idsLecons: new Set(
        leconsOrdonnees(formation.manifeste).map(({ lecon }) => lecon.id),
      ),
    });
    return c.json({ html } satisfies ReponseApercu);
  });

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
      archivees: await listerArchives(deps.dossierFormations),
      corbeille: await listerCorbeille(deps.dossierFormations),
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
