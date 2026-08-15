import type { Context, Hono, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { BaseProgression } from "../progression/db";
import {
  BaseComptes,
  DUREE_SESSION_MS,
  FENETRE_TENTATIVES_MS,
  verifierIdentifiant,
  verifierNom,
  type Compte,
  type Role,
} from "./db";
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
    if (deps.comptes.installationRequise()) {
      return c.json({ installationRequise: true, compte: null });
    }
    const jeton = jetonDeRequete(c);
    const compte = jeton ? deps.comptes.compteDeSession(jeton) : null;
    return c.json({ installationRequise: false, compte });
  });

  /** Création du tout premier compte, forcément administrateur (AU-R1). */
  app.post("/api/auth/installer", async (c) => {
    if (!deps.comptes.installationRequise()) {
      return c.json({ erreur: "Parcours est déjà installé" }, 409);
    }
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const cree = await creerCompte(deps, corps, "admin");
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
}

/**
 * Empreinte d'un mot de passe qui n'est celui de personne. Elle sert à faire
 * travailler scrypt même quand l'identifiant est inconnu (AU-R4).
 */
const EMPREINTE_LEURRE =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAA==";

/** Validation et création complètes d'un compte, mot de passe compris. */
export async function creerCompte(
  deps: DependancesAuth,
  saisie: Record<string, unknown>,
  role: Role,
): Promise<{ ok: true; valeur: Compte } | { ok: false; erreur: string }> {
  const identifiant = verifierIdentifiant(saisie.identifiant);
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
  });
}

export { hacher, verifier, verifierForce };
