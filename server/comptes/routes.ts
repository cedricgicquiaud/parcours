import type { Reglages } from "../reglages";
import {
  creerCompte,
  envoyerConfirmation,
  exigerAdmin,
  lireCorps,
  type AppParcours,
  type DependancesAuth,
} from "./auth";
import { verifierNom, type Compte, type Role } from "./db";
import { verifierEmail } from "./email";
import { hacher, motDePasseProvisoire, verifier, verifierForce } from "./motdepasse";

/**
 * Profil personnel (CO-R4, CO-R5) et console d'administration des comptes
 * (CO-R6 à CO-R10). Aucune de ces routes ne renvoie jamais d'empreinte.
 */
export function monterComptes(app: AppParcours, deps: DependancesAuth): void {
  // --- Profil de la personne connectée ---

  app.get("/api/profil", (c) => c.json({ compte: c.get("compte") }));

  app.put("/api/profil", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const nom = verifierNom(corps.nom);
    if (!nom.ok) return c.json({ erreur: nom.erreur }, 400);

    const compte = c.get("compte");
    deps.comptes.renommer(compte.id, nom.valeur);
    return c.json({ compte: deps.comptes.parId(compte.id) });
  });

  /**
   * Changement de mot de passe : l'actuel est exigé, et toutes les AUTRES
   * sessions tombent (CO-R4) — celle en cours survit pour ne pas déconnecter
   * la personne qui vient d'agir.
   */
  app.put("/api/profil/motdepasse", async (c) => {
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const compte = c.get("compte");
    const ligne = deps.comptes.ligneParId(compte.id);
    if (!ligne) return c.json({ erreur: "compte introuvable" }, 404);

    const actuel = typeof corps.actuel === "string" ? corps.actuel : "";
    if (!(await verifier(actuel, ligne.empreinte))) {
      return c.json({ erreur: "mot de passe actuel incorrect" }, 403);
    }

    const nouveau = verifierForce(corps.nouveau, compte.identifiant);
    if (!nouveau.ok) return c.json({ erreur: nouveau.erreur }, 400);

    deps.comptes.changerEmpreinte(compte.id, await hacher(nouveau.valeur));
    const revoquees = deps.comptes.revoquerAutresSessions(compte.id, c.get("jeton"));
    return c.json({ change: true, sessionsRevoquees: revoquees });
  });

  // --- Console d'administration ---

  app.get("/api/utilisateurs", (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    return c.json({ utilisateurs: deps.comptes.lister() });
  });

  app.post("/api/utilisateurs", async (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const role = lireRole(corps.role);
    if (!role.ok) return c.json({ erreur: role.erreur }, 400);

    const cree = await creerCompte(deps, corps, role.valeur);
    if (!cree.ok) {
      const conflit = cree.erreur.includes("déjà pris");
      return c.json({ erreur: cree.erreur }, conflit ? 409 : 400);
    }
    // EM-R2 : un compte créé par un administrateur naît non confirmé ; le lien
    // part à l'adresse saisie, ce qui la valide au passage.
    await envoyerConfirmation(deps, cree.valeur);
    return c.json({ compte: cree.valeur }, 201);
  });

  /** Renvoi manuel du lien de confirmation par un administrateur (EM-R5). */
  app.post("/api/utilisateurs/:id/confirmation", async (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const cible = resoudreCible(c, deps);
    if (cible instanceof Response) return cible;

    if (cible.emailVerifie) {
      return c.json({ erreur: "cette adresse est déjà confirmée" }, 409);
    }
    await envoyerConfirmation(deps, cible);
    return c.json({ envoye: true });
  });

  /** Confirmation manuelle, quand l'envoi de courriel n'est pas en place. */
  app.post("/api/utilisateurs/:id/confirmer", (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const cible = resoudreCible(c, deps);
    if (cible instanceof Response) return cible;

    deps.comptes.confirmerEmail(cible.id);
    return c.json({ compte: deps.comptes.parId(cible.id) });
  });

  // --- Réglages de l'instance (EM-R12) ---

  app.get("/api/reglages", (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    return c.json({
      reglages: deps.reglages.lire(),
      envoiCourriel: deps.expediteur.mode,
    });
  });

  app.put("/api/reglages", async (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const ecrit = deps.reglages.ecrire(corps as Partial<Reglages>);
    if (!ecrit.ok) return c.json({ erreur: ecrit.erreur }, 400);
    return c.json({ reglages: ecrit.valeur, envoiCourriel: deps.expediteur.mode });
  });

  app.patch("/api/utilisateurs/:id", async (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const cible = resoudreCible(c, deps);
    if (cible instanceof Response) return cible;
    const corps = await lireCorps(c);
    if (corps instanceof Response) return corps;

    const moi = c.get("compte");
    const soiMeme = cible.id === moi.id;

    if (corps.nom !== undefined) {
      const nom = verifierNom(corps.nom);
      if (!nom.ok) return c.json({ erreur: nom.erreur }, 400);
      deps.comptes.renommer(cible.id, nom.valeur);
    }

    if (corps.identifiant !== undefined) {
      const identifiant = verifierEmail(corps.identifiant);
      if (!identifiant.ok) return c.json({ erreur: identifiant.erreur }, 400);
      const change = deps.comptes.changerIdentifiant(cible.id, identifiant.valeur);
      if (!change.ok) return c.json({ erreur: change.erreur }, 409);
    }

    if (corps.role !== undefined) {
      const role = lireRole(corps.role);
      if (!role.ok) return c.json({ erreur: role.erreur }, 400);
      if (role.valeur !== cible.role) {
        // CO-R7 : personne ne se retire son propre rôle, et il reste toujours
        // au moins un administrateur actif.
        if (soiMeme) {
          return c.json({ erreur: "vous ne pouvez pas changer votre propre rôle" }, 409);
        }
        const refusDernier = verifierDernierAdmin(c, deps, cible, role.valeur, cible.actif);
        if (refusDernier) return refusDernier;
        deps.comptes.changerRole(cible.id, role.valeur);
      }
    }

    if (corps.actif !== undefined) {
      if (typeof corps.actif !== "boolean") {
        return c.json({ erreur: "actif : booléen attendu" }, 400);
      }
      if (corps.actif !== cible.actif) {
        if (soiMeme) {
          return c.json({ erreur: "vous ne pouvez pas désactiver votre compte" }, 409);
        }
        const role = lireRole(corps.role ?? cible.role);
        const refusDernier = verifierDernierAdmin(
          c,
          deps,
          cible,
          role.ok ? role.valeur : cible.role,
          corps.actif,
        );
        if (refusDernier) return refusDernier;
        deps.comptes.changerActivation(cible.id, corps.actif);
      }
    }

    return c.json({ compte: deps.comptes.parId(cible.id) });
  });

  /** Réinitialisation par un admin : le mot de passe provisoire n'est montré qu'ici. */
  app.post("/api/utilisateurs/:id/motdepasse", async (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const cible = resoudreCible(c, deps);
    if (cible instanceof Response) return cible;

    const provisoire = motDePasseProvisoire();
    deps.comptes.changerEmpreinte(cible.id, await hacher(provisoire));
    deps.comptes.revoquerSessionsDe(cible.id);
    return c.json({ motDePasseProvisoire: provisoire, compte: cible });
  });

  /** Suppression définitive : seulement un compte déjà désactivé (CO-R8). */
  app.delete("/api/utilisateurs/:id", (c) => {
    const refus = exigerAdmin(c);
    if (refus) return refus;
    const cible = resoudreCible(c, deps);
    if (cible instanceof Response) return cible;

    if (cible.id === c.get("compte").id) {
      return c.json({ erreur: "vous ne pouvez pas supprimer votre compte" }, 409);
    }
    if (cible.actif) {
      return c.json(
        { erreur: "désactivez le compte avant de le supprimer" },
        409,
      );
    }

    const progressionEffacee = deps.progression.effacerCompte(cible.id);
    deps.jetons.revoquerTous(cible.id);
    deps.comptes.supprimer(cible.id);
    return c.json({ supprime: true, progressionEffacee });
  });
}

function lireRole(valeur: unknown): { ok: true; valeur: Role } | { ok: false; erreur: string } {
  if (valeur === "admin" || valeur === "lecteur") return { ok: true, valeur };
  return { ok: false, erreur: "role : « admin » ou « lecteur » attendu" };
}

function resoudreCible(
  c: Parameters<typeof exigerAdmin>[0],
  deps: DependancesAuth,
): Compte | Response {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ erreur: "identifiant de compte invalide" }, 400);
  }
  const compte = deps.comptes.parId(id);
  if (!compte) return c.json({ erreur: `compte inconnu : ${id}` }, 404);
  return compte;
}

/**
 * Empêche de laisser Parcours sans administrateur actif (CO-R7) : un compte
 * admin actif ne peut être ni rétrogradé ni désactivé s'il est le dernier.
 */
function verifierDernierAdmin(
  c: Parameters<typeof exigerAdmin>[0],
  deps: DependancesAuth,
  cible: Compte,
  roleVise: Role,
  actifVise: boolean,
): Response | null {
  const perdSonAdmin = cible.role === "admin" && cible.actif;
  const resteAdmin = roleVise === "admin" && actifVise;
  if (!perdSonAdmin || resteAdmin) return null;
  if (deps.comptes.nombreAdminsActifs() > 1) return null;
  return c.json(
    { erreur: "c'est le dernier administrateur actif : nommez-en un autre d'abord" },
    409,
  );
}
