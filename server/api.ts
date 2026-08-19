import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import {
  exigerAdmin,
  gardeSession,
  monterAuthentification,
  type AppParcours,
  type VariablesParcours,
} from "./comptes/auth";
import type { BaseComptes } from "./comptes/db";
import type { BaseJetons } from "./comptes/jetons";
import { monterComptes } from "./comptes/routes";
import type { Expediteur } from "./courriel/envoi";
import type { BaseReglages } from "./reglages";
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
import { enregistrerCouverture, verifierCouverture } from "./formations/couverture";
import { EXTENSIONS_ASSETS } from "./formations/extensions";
import { importerFormation, type DemandeImport } from "./formations/import";
import { dureeFormation } from "./formations/duree";
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
import { FORMAT_ID_CRITERE } from "./markdown/criteres";
import type { CollecteCriteres, MoteurRendu } from "./markdown/rendu";
import { calculerAvancement, leconsSupposees, voisines } from "./progression/calculs";
import type { BaseCriteres } from "./progression/criteres";
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
  ReponseCritere,
  ReponseLecon,
  ReponseProgression,
  ReponseRechercheApi,
  ReponseSuppression,
} from "./types-api";

export interface DependancesApi {
  dossierFormations: string;
  base: BaseProgression;
  criteres: BaseCriteres;
  comptes: BaseComptes;
  jetons: BaseJetons;
  reglages: BaseReglages;
  expediteur: Expediteur;
  rendu: MoteurRendu;
  recherche: MoteurRecherche;
}

/**
 * Routes ouvertes à toute personne connectée : authentification, profil et
 * progression personnelle. Tout le reste qui écrit — ou qui sert une vue
 * d'administration — exige le rôle `admin` (CO-R2).
 */
const PREFIXES_SANS_ROLE = ["/api/auth/", "/api/profil", "/api/progression/"];

export function exigeRoleAdmin(methode: string, chemin: string): boolean {
  if (chemin === "/api/health") return false;
  if (PREFIXES_SANS_ROLE.some((prefixe) => chemin.startsWith(prefixe))) return false;
  if (chemin.startsWith("/api/archives") || chemin.startsWith("/api/corbeille")) {
    return true;
  }
  if (chemin.startsWith("/api/utilisateurs")) return true;
  if (chemin.startsWith("/api/reglages")) return true;
  if (methode !== "GET") return true;
  // Les deux vues qui n'existent que pour éditer.
  return chemin.endsWith("/structure") || chemin.endsWith("/source");
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

export function creerApi(deps: DependancesApi): AppParcours {
  const app = new Hono<{ Variables: VariablesParcours }>();
  const auth = {
    comptes: deps.comptes,
    progression: deps.base,
    criteres: deps.criteres,
    jetons: deps.jetons,
    reglages: deps.reglages,
    expediteur: deps.expediteur,
  };

  // A-R1 : la garde locale passe en premier, avant toute lecture de session.
  app.use("*", async (c, next) => {
    const refus = gardeLocale(c);
    if (refus) return refus;
    await next();
  });

  monterAuthentification(app, auth);

  // AU-R6 : session obligatoire hors `/api/auth/*` et sonde de vie.
  app.use("*", gardeSession(auth));

  // CO-R2 : rôle administrateur sur tout ce qui écrit une formation ou sert
  // une vue d'administration. Les routes de comptes le revérifient chacune.
  app.use("*", async (c, next) => {
    if (exigeRoleAdmin(c.req.method, c.req.path)) {
      const refus = exigerAdmin(c);
      if (refus) return refus;
    }
    await next();
  });

  monterComptes(app, auth);

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
    const coches = deps.base.toutesLesCoches(c.get("compte").id);

    const formations: CarteFormation[] = scan.formations.map((formation) => {
      if (formation.statut === "invalide") {
        return { statut: "invalide", id: formation.id, erreur: formation.erreur };
      }
      const avancement = calculerAvancement(
        formation.manifeste,
        coches.get(formation.id) ?? new Set(),
      );
      const dureeCarte = dureeFormation(formation.manifeste);
      const carte: CarteFormation = {
        statut: "valide",
        id: formation.id,
        titre: formation.manifeste.titre,
        // La carte porte le visuel (FI-R13), jamais la présentation longue.
        ...(formation.manifeste.couverture
          ? { couverture: formation.manifeste.couverture }
          : {}),
        ...(dureeCarte === null ? {} : { duree: dureeCarte }),
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
      deps.base.leconsCochees(c.get("compte").id, formation.id),
    );
    const reponse: ReponseFormation = {
      id: formation.id,
      titre: formation.manifeste.titre,
      avancement,
    };
    if (formation.manifeste.description) {
      reponse.description = formation.manifeste.description;
    }
    const { couverture, presentation, objectifs, prerequis } = formation.manifeste;
    if (couverture) reponse.couverture = couverture;
    if (objectifs) reponse.objectifs = objectifs;
    if (prerequis) reponse.prerequis = prerequis;
    const duree = dureeFormation(formation.manifeste);
    if (duree !== null) reponse.duree = duree;
    if (presentation) {
      // Rendu SANS collecteur de critères : les cases d'une fiche sont inertes
      // (FI-R2), une présentation n'a pas de progression.
      reponse.presentationHtml = deps.rendu.rendre(presentation, {
        formationId: formation.id,
        dossier: formation.dossier,
        idsLecons: new Set(
          leconsOrdonnees(formation.manifeste).map(({ lecon }) => lecon.id),
        ),
      });
    }
    return c.json(reponse);
  });

  /**
   * Charge et rend une leçon pour le compte courant, critères compris. Partagé
   * par la lecture et par les bascules de critères : les deux doivent voir
   * exactement la même liste, sinon un critère valide deviendrait un 404.
   */
  async function rendreLeconDe(
    c: Context<{ Variables: VariablesParcours }>,
    formation: FormationValide,
    lid: string,
  ): Promise<
    | Response
    | {
        entree: NonNullable<ReturnType<typeof trouverLecon>>;
        html: string;
        criteres: CollecteCriteres;
        idsLecons: Set<string>;
      }
  > {
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
      // A-R3 : fichier disparu entre le scan et la lecture. Aucune purge de
      // critères ici (CR-R3) : une leçon illisible n'est pas une leçon vide.
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
    const criteres: CollecteCriteres = {
      etats: deps.criteres.etatsDe(c.get("compte").id, formation.id, lid),
      liste: [],
      tronquee: false,
    };
    const html = deps.rendu.rendre(markdown, {
      formationId: formation.id,
      dossier: formation.dossier,
      idsLecons,
      criteres,
    });
    // CR-R3 : le rendu a réussi, la liste fait foi — ce qui n'y est plus part.
    deps.criteres.purgerOrphelins(
      c.get("compte").id,
      formation.id,
      lid,
      new Set(criteres.liste.map((critere) => critere.id)),
    );
    return { entree, html, criteres, idsLecons };
  }

  /**
   * Téléverse une couverture (FI-R14). Réservée à un administrateur par la
   * garde de rôle : elle écrit dans le dossier d'une formation.
   */
  app.post("/api/formations/:fid/couverture", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const verifie = verifierCouverture(corps);
    if (!verifie.ok) return c.json({ erreur: verifie.erreur }, verifie.statut);

    const { formation } = resolu;
    const ecrit = await enregistrerCouverture(
      formation.dossier,
      formation.manifeste,
      verifie.extension,
      verifie.octets,
    );
    if (!ecrit.ok) return c.json({ erreur: ecrit.erreur }, 409);

    const avancement = calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(c.get("compte").id, formation.id),
    );
    const reponseFormation: ReponseFormation = {
      id: formation.id,
      titre: formation.manifeste.titre,
      couverture: ecrit.valeur.couverture,
      avancement,
    };
    if (formation.manifeste.description) {
      reponseFormation.description = formation.manifeste.description;
    }
    return c.json({ formation: reponseFormation }, 201);
  });

  app.get("/api/formations/:fid/lecons/:lid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const lid = c.req.param("lid");
    const rendue = await rendreLeconDe(c, formation, lid);
    if (rendue instanceof Response) return rendue;
    const { entree, html, criteres, idsLecons } = rendue;
    const { precedente, suivante, position } = voisines(formation.manifeste, lid);
    const cochees = deps.base.leconsCochees(c.get("compte").id, formation.id);

    const reponse: ReponseLecon = {
      formationId: formation.id,
      formationTitre: formation.manifeste.titre,
      leconId: lid,
      titre: entree.lecon.titre,
      moduleId: entree.module.id,
      moduleTitre: entree.module.titre,
      html,
      faite: cochees.has(lid),
      criteres: criteres.liste,
      criteresTronques: criteres.tronquee,
      position: position + 1,
      total: idsLecons.size,
      precedente,
      suivante,
    };
    if (entree.lecon.duree !== undefined) reponse.duree = entree.lecon.duree;
    const suppose = leconsSupposees(formation.manifeste, entree.lecon, cochees);
    if (suppose.length > 0) reponse.suppose = suppose;
    return c.json(reponse);
  });

  /**
   * Bascule d'un critère (CR-R14). La leçon est re-rendue pour connaître ses
   * critères : c'est ce qui garantit qu'aucune coche orpheline ne peut naître
   * d'un id inventé (CR-R4, A-R3).
   */
  async function basculerCritere(
    c: Context<{ Variables: VariablesParcours }>,
    cible: { fid: string; lid: string; cid: string },
    coche: boolean,
  ): Promise<Response> {
    const resolu = await resoudre(c, cible.fid);
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const { lid, cid } = cible;
    if (!FORMAT_ID_CRITERE.test(cid)) {
      // Valeur d'URL bornée avant d'être reflétée : un message d'erreur ne
      // renvoie jamais une entrée arbitraire de longueur libre.
      return c.json(
        { erreur: `identifiant de critère invalide : ${cid.slice(0, 40)}` },
        400,
      );
    }

    const rendue = await rendreLeconDe(c, formation, lid);
    if (rendue instanceof Response) return rendue;
    const liste = rendue.criteres.liste;
    if (!liste.some((critere) => critere.id === cid)) {
      return c.json({ erreur: `critère inconnu : ${cid}` }, 404);
    }

    const compteId = c.get("compte").id;
    deps.criteres.basculer(compteId, formation.id, lid, cid, coche);
    const etats = deps.criteres.etatsDe(compteId, formation.id, lid);
    const criteres = liste.map((critere) => ({
      ...critere,
      coche: etats.get(critere.id) ?? critere.coche,
    }));

    // CR-R10 : cocher le dernier critère termine la leçon. CR-R12 : décocher
    // ensuite ne la défait pas — revenir sur un détail ne doit pas coûter son
    // avancement.
    if (criteres.length > 0 && criteres.every((critere) => critere.coche)) {
      deps.base.cocher(compteId, formation.id, lid);
    }
    const cochees = deps.base.leconsCochees(compteId, formation.id);
    const reponse: ReponseCritere = {
      faite: cochees.has(lid),
      avancement: calculerAvancement(formation.manifeste, cochees),
      criteres,
    };
    return c.json(reponse);
  }

  app.put("/api/progression/:fid/:lid/criteres/:cid", (c) =>
    basculerCritere(c, c.req.param(), true),
  );
  app.delete("/api/progression/:fid/:lid/criteres/:cid", (c) =>
    basculerCritere(c, c.req.param(), false),
  );

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
    deps.base.cocher(c.get("compte").id, formation.id, lid);
    return c.json(reponseProgression(deps, c.get("compte").id, formation, true));
  });

  app.delete("/api/progression/:fid/:lid", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const lid = c.req.param("lid");
    if (!trouverLecon(formation, lid)) {
      return c.json({ erreur: `leçon inconnue : ${lid}` }, 404);
    }
    deps.base.decocher(c.get("compte").id, formation.id, lid);
    return c.json(reponseProgression(deps, c.get("compte").id, formation, false));
  });

  app.post("/api/progression/:fid/reset", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const supprimees = deps.base.reinitialiser(c.get("compte").id, formation.id);
    // CR-R8 : repartir de zéro efface aussi le détail, sinon une leçon
    // décochée garderait ses critères cochés.
    deps.criteres.reinitialiser(c.get("compte").id, formation.id);
    return c.json(reponseSuppression(deps, c.get("compte").id, formation, supprimees));
  });

  app.post("/api/progression/:fid/nettoyer", async (c) => {
    const resolu = await resoudre(c, c.req.param("fid"));
    if (resolu instanceof Response) return resolu;
    const { formation } = resolu;
    const idsConnus = new Set(
      leconsOrdonnees(formation.manifeste).map(({ lecon }) => lecon.id),
    );
    const supprimees = deps.base.nettoyerOrphelines(
      c.get("compte").id,
      formation.id,
      idsConnus,
    );
    return c.json(reponseSuppression(deps, c.get("compte").id, formation, supprimees));
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
  utilisateurId: number,
  formation: FormationValide,
  faite: boolean,
): ReponseProgression {
  return {
    faite,
    avancement: calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(utilisateurId, formation.id),
    ),
  };
}

function reponseSuppression(
  deps: DependancesApi,
  utilisateurId: number,
  formation: FormationValide,
  supprimees: number,
): ReponseSuppression {
  return {
    supprimees,
    avancement: calculerAvancement(
      formation.manifeste,
      deps.base.leconsCochees(utilisateurId, formation.id),
    ),
  };
}
