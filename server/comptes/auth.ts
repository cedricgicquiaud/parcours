import type { Context, Hono, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  envoyerSansBloquer,
  type Expediteur,
} from "../courriel/envoi";
import {
  messageConfirmation,
  messageInscriptionExistante,
  messageReinitialisation,
} from "../courriel/messages";
import type { BaseCriteres } from "../progression/criteres";
import type { BaseProgression } from "../progression/db";
import type { BaseReglages } from "../reglages";
import {
  BaseComptes,
  DUREE_SESSION_MS,
  FENETRE_TENTATIVES_MS,
  verifierNom,
  type Compte,
  type Role,
} from "./db";
import { verifierEmail } from "./email";
import { BaseJetons } from "./jetons";
import { hacher, verifier, verifierForce } from "./motdepasse";

export const NOM_COOKIE = "parcours_session";

/** Variables posées par le middleware sur le contexte de chaque requête. */
export interface VariablesParcours {
  compte: Compte;
  jeton: string;
}

export interface DependancesAuth {
  comptes: BaseComptes;
  progression: BaseProgression;
  criteres: BaseCriteres;
  jetons: BaseJetons;
  reglages: BaseReglages;
  expediteur: Expediteur;
}

/**
 * Message unique des échecs de connexion (AU-R4) : identifiant inconnu, mot de
 * passe faux et compte désactivé sont indiscernables de l'extérieur.
 */
const ECHEC_CONNEXION = "identifiant ou mot de passe incorrect";

/**
 * Le cookie de session (AU-R3). `Secure` est délibérément absent : Parcours
 * n'écoute qu'en clair sur la boucle locale (A-R1), et un cookie `Secure` ne
 * serait jamais renvoyé. `SameSite=Strict` couvre le CSRF, en plus de la garde
 * d'origine déjà en place.
 */
function poserCookie(c: Context, jeton: string): void {
  setCookie(c, NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
    maxAge: Math.floor(DUREE_SESSION_MS / 1000),
  });
}

export function jetonDeRequete(c: Context): string | undefined {
  return getCookie(c, NOM_COOKIE);
}

/**
 * Garde d'authentification (AU-R6). Laisse passer la sonde de vie et les routes
 * d'authentification ; tout le reste exige une session valide. Tant qu'aucun
 * compte n'existe, répond `503` : l'installation doit se faire d'abord (AU-R1).
 */
export function gardeSession(deps: DependancesAuth): MiddlewareHandler {
  return async (c, next) => {
    const chemin = c.req.path;
    if (chemin === "/api/health" || chemin.startsWith("/api/auth/")) return next();

    if (deps.comptes.installationRequise()) {
      return c.json(
        { erreur: "installation requise : créez le premier compte", installation: true },
        503,
      );
    }

    const jeton = jetonDeRequete(c);
    const compte = jeton ? deps.comptes.compteDeSession(jeton) : null;
    if (!jeton || !compte) {
      return c.json({ erreur: "authentification requise" }, 401);
    }

    if (deps.comptes.prolongerSiNecessaire(jeton)) poserCookie(c, jeton);
    c.set("compte", compte);
    c.set("jeton", jeton);
    await next();
  };
}

/** Refuse une écriture de formation à un lecteur (CO-R2). */
export function exigerAdmin(c: Context): Response | null {
  const compte = c.get("compte") as Compte | undefined;
  if (!compte || compte.role !== "admin") {
    return c.json({ erreur: "réservé aux administrateurs" }, 403);
  }
  return null;
}

export async function lireCorps(
  c: Context,
): Promise<Record<string, unknown> | Response> {
  try {
    const corps: unknown = await c.req.json();
    if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
      return c.json({ erreur: "objet JSON attendu" }, 400);
    }
    return corps as Record<string, unknown>;
  } catch {
    return c.json({ erreur: "corps JSON illisible" }, 400);
  }
}

/** Routes `/api/auth/*` — les seules accessibles sans session. */
export type AppParcours = Hono<{ Variables: VariablesParcours }>;

export function monterAuthentification(app: AppParcours, deps: DependancesAuth): void {
  app.get("/api/auth/etat", (c) => {
    const inscriptionOuverte = deps.reglages.lire().inscriptionOuverte;
    if (deps.comptes.installationRequise()) {
      return c.json({ installationRequise: true, compte: null, inscriptionOuverte });
    }
    const jeton = jetonDeRequete(c);
    const compte = jeton ? deps.comptes.compteDeSession(jeton) : null;
    return c.json({ installationRequise: false, compte, inscriptionOuverte });
  });

  /** Création du tout premier compte, forcément administrateur (AU-R1). */
  app.post("/api/auth/installer", async (c) => {
    if (!deps.comptes.installationRequise()) {
      return c.json({ erreur: "Parcours est déjà installé" }, 409);
    }
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    // EM-R2 : personne ne pourrait lui envoyer de lien ni le débloquer.
    const cree = await creerCompte(deps, corps, "admin", true);
    if (!cree.ok) return c.json({ erreur: cree.erreur }, 400);

    // Le premier administrateur hérite de la progression d'avant les comptes.
    const heritees = deps.progression.adopterProgressionHeritee(cree.valeur.id);
    const jeton = deps.comptes.ouvrirSession(cree.valeur.id);
    deps.comptes.marquerConnexion(cree.valeur.id);
    poserCookie(c, jeton);
    return c.json({ compte: cree.valeur, progressionHeritee: heritees }, 201);
  });

  app.post("/api/auth/connexion", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const identifiant =
      typeof corps.identifiant === "string" ? corps.identifiant.trim() : "";
    const motDePasse = typeof corps.motDePasse === "string" ? corps.motDePasse : "";
    if (!identifiant || !motDePasse) {
      return c.json({ erreur: ECHEC_CONNEXION }, 401);
    }

    if (deps.comptes.estBloque(identifiant)) {
      return c.json(
        {
          erreur: `trop de tentatives : réessayez dans ${Math.round(FENETRE_TENTATIVES_MS / 60000)} minutes`,
        },
        429,
      );
    }

    const ligne = deps.comptes.ligneParIdentifiant(identifiant);
    // Le mot de passe est vérifié même sans compte correspondant : sans ce
    // travail à vide, le temps de réponse dirait qui existe (AU-R4).
    const empreinte = ligne?.empreinte ?? EMPREINTE_LEURRE;
    const correct = await verifier(motDePasse, empreinte);

    if (!ligne || !correct || ligne.actif !== 1) {
      deps.comptes.enregistrerEchec(identifiant);
      return c.json({ erreur: ECHEC_CONNEXION }, 401);
    }

    deps.comptes.effacerEchecs(identifiant);

    // EM-R4 : l'état de confirmation n'est révélé qu'après un mot de passe
    // correct — un attaquant sans le mot de passe n'apprend rien.
    if (ligne.email_verifie !== 1) {
      return c.json(
        {
          erreur:
            "adresse non confirmée : ouvrez le lien reçu par courriel pour activer ce compte",
          emailNonConfirme: true,
        },
        403,
      );
    }

    deps.comptes.marquerConnexion(ligne.id);
    poserCookie(c, deps.comptes.ouvrirSession(ligne.id));
    return c.json({ compte: deps.comptes.parId(ligne.id) });
  });

  app.post("/api/auth/deconnexion", (c) => {
    const jeton = jetonDeRequete(c);
    if (jeton) deps.comptes.fermerSession(jeton);
    deleteCookie(c, NOM_COOKIE, { path: "/" });
    return c.json({ deconnecte: true });
  });

  /**
   * Inscription libre (EM-R6). La réponse est la même que l'adresse soit libre
   * ou déjà prise (EM-R7) : c'est le courriel envoyé, lui, qui diffère — et
   * seule la personne qui relève cette boîte le voit.
   */
  app.post("/api/auth/inscription", async (c) => {
    if (!deps.reglages.lire().inscriptionOuverte) {
      return c.json({ erreur: "les inscriptions sont fermées" }, 403);
    }
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const adresse = verifierEmail(corps.identifiant);
    if (!adresse.ok) return c.json({ erreur: adresse.erreur }, 400);
    const force = verifierForce(corps.motDePasse, adresse.valeur);
    if (!force.ok) return c.json({ erreur: force.erreur }, 400);

    const existant = deps.comptes.ligneParIdentifiant(adresse.valeur);
    if (existant) {
      const reglages = deps.reglages.lire();
      await envoyerSansBloquer(
        deps.expediteur,
        messageInscriptionExistante(adresse.valeur, reglages.urlPublique),
        reglages.expediteur,
      );
    } else {
      const cree = await creerCompte(deps, corps, "lecteur");
      if (!cree.ok) return c.json({ erreur: cree.erreur }, 400);
      await envoyerConfirmation(deps, cree.valeur);
    }

    return c.json({ envoye: true, message: MESSAGE_VERIFIEZ_BOITE });
  });

  /** Confirmation d'adresse par le lien reçu (EM-R3). */
  app.post("/api/auth/confirmer", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const jeton = typeof corps.jeton === "string" ? corps.jeton : "";
    const utilisateurId = jeton ? deps.jetons.consommer(jeton, "confirmation") : null;
    if (utilisateurId === null) {
      return c.json({ erreur: MESSAGE_LIEN_INVALIDE }, 400);
    }

    deps.comptes.confirmerEmail(utilisateurId);
    const compte = deps.comptes.parId(utilisateurId);
    if (!compte || !compte.actif) {
      return c.json({ erreur: MESSAGE_LIEN_INVALIDE }, 400);
    }

    // Confirmer vaut connexion : la personne vient de prouver son adresse.
    deps.comptes.marquerConnexion(compte.id);
    poserCookie(c, deps.comptes.ouvrirSession(compte.id));
    return c.json({ compte: deps.comptes.parId(compte.id) });
  });

  /** Renvoi du lien de confirmation (EM-R5) — réponse toujours identique. */
  app.post("/api/auth/renvoyer-confirmation", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const adresse = verifierEmail(corps.identifiant);
    if (adresse.ok) {
      const ligne = deps.comptes.ligneParIdentifiant(adresse.valeur);
      const aRenvoyer =
        ligne &&
        ligne.actif === 1 &&
        ligne.email_verifie !== 1 &&
        !deps.jetons.tropTot(ligne.id, "confirmation");
      if (aRenvoyer) {
        const compte = deps.comptes.parId(ligne.id);
        if (compte) await envoyerConfirmation(deps, compte);
      }
    }
    return c.json({ envoye: true, message: MESSAGE_VERIFIEZ_BOITE });
  });

  /** Demande de réinitialisation (EM-R8) — réponse toujours identique. */
  app.post("/api/auth/motdepasse-oublie", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const adresse = verifierEmail(corps.identifiant);
    if (adresse.ok) {
      const ligne = deps.comptes.ligneParIdentifiant(adresse.valeur);
      const aEnvoyer =
        ligne &&
        ligne.actif === 1 &&
        ligne.email_verifie === 1 &&
        !deps.jetons.tropTot(ligne.id, "reinitialisation");
      if (aEnvoyer) {
        const { jeton } = deps.jetons.creer(ligne.id, "reinitialisation");
        const reglages = deps.reglages.lire();
        await envoyerSansBloquer(
          deps.expediteur,
          messageReinitialisation(ligne.identifiant, reglages.urlPublique, jeton),
          reglages.expediteur,
        );
      }
    }
    return c.json({ envoye: true, message: MESSAGE_VERIFIEZ_BOITE });
  });

  /**
   * Réinitialisation par le lien reçu (EM-R9). Toutes les sessions tombent :
   * si quelqu'un d'autre était connecté sur ce compte, il est éjecté.
   */
  app.post("/api/auth/motdepasse-reinitialiser", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const jeton = typeof corps.jeton === "string" ? corps.jeton : "";
    const utilisateurId = jeton
      ? deps.jetons.consommer(jeton, "reinitialisation")
      : null;
    if (utilisateurId === null) {
      return c.json({ erreur: MESSAGE_LIEN_INVALIDE }, 400);
    }

    const compte = deps.comptes.parId(utilisateurId);
    if (!compte || !compte.actif) {
      return c.json({ erreur: MESSAGE_LIEN_INVALIDE }, 400);
    }

    const force = verifierForce(corps.motDePasse, compte.identifiant);
    if (!force.ok) {
      // Le jeton vient d'être consommé : on le réémet pour ne pas obliger à
      // repasser par la boîte mail sur une simple erreur de saisie.
      const { jeton: reemis } = deps.jetons.creer(compte.id, "reinitialisation");
      return c.json({ erreur: force.erreur, jeton: reemis }, 400);
    }

    deps.comptes.changerEmpreinte(compte.id, await hacher(force.valeur));
    // Réinitialiser prouve l'accès à la boîte : l'adresse est confirmée.
    deps.comptes.confirmerEmail(compte.id);
    deps.comptes.revoquerSessionsDe(compte.id);
    deps.comptes.effacerEchecs(compte.identifiant);

    deps.comptes.marquerConnexion(compte.id);
    poserCookie(c, deps.comptes.ouvrirSession(compte.id));
    return c.json({ compte: deps.comptes.parId(compte.id) });
  });
}

/**
 * Deux messages volontairement identiques quelle que soit la situation : ils ne
 * doivent jamais laisser deviner si une adresse est connue (EM-R7, EM-R8).
 */
const MESSAGE_VERIFIEZ_BOITE =
  "Si cette adresse correspond à un compte, un courriel vient d'y être envoyé.";
const MESSAGE_LIEN_INVALIDE =
  "ce lien est invalide, expiré ou a déjà été utilisé — demandez-en un nouveau";

/**
 * Empreinte d'un mot de passe qui n'est celui de personne. Elle sert à faire
 * travailler scrypt même quand l'identifiant est inconnu (AU-R4).
 */
const EMPREINTE_LEURRE =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAA==";

/**
 * Validation et création complètes d'un compte, mot de passe compris.
 * `emailVerifie` n'est vrai que pour le premier administrateur (EM-R2).
 */
export async function creerCompte(
  deps: DependancesAuth,
  saisie: Record<string, unknown>,
  role: Role,
  emailVerifie = false,
): Promise<{ ok: true; valeur: Compte } | { ok: false; erreur: string }> {
  const identifiant = verifierEmail(saisie.identifiant);
  if (!identifiant.ok) return identifiant;

  const nom = verifierNom(
    typeof saisie.nom === "string" && saisie.nom.trim() ? saisie.nom : identifiant.valeur,
  );
  if (!nom.ok) return nom;

  const force = verifierForce(saisie.motDePasse, identifiant.valeur);
  if (!force.ok) return force;

  return deps.comptes.creer({
    identifiant: identifiant.valeur,
    nom: nom.valeur,
    empreinte: await hacher(force.valeur),
    role,
    emailVerifie,
  });
}

/**
 * Crée un jeton de confirmation et envoie le lien (EM-R3). Rendue publique :
 * la console d'administration s'en sert aussi à la création d'un compte.
 */
export async function envoyerConfirmation(
  deps: DependancesAuth,
  compte: Compte,
): Promise<void> {
  const { jeton } = deps.jetons.creer(compte.id, "confirmation");
  const reglages = deps.reglages.lire();
  await envoyerSansBloquer(
    deps.expediteur,
    messageConfirmation(compte.identifiant, reglages.urlPublique, jeton),
    reglages.expediteur,
  );
}

export { hacher, verifier, verifierForce };
