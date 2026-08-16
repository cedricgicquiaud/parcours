import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { hacherJeton } from "./db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jetons_email (
  jeton_hache    TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('confirmation', 'reinitialisation')),
  cree_le        TEXT NOT NULL,
  expire_le      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jetons_utilisateur
  ON jetons_email (utilisateur_id, type);
`;

export type TypeJeton = "confirmation" | "reinitialisation";

/** Durées de vie (EM-R3) : large pour confirmer, courte pour réinitialiser. */
export const DUREE_CONFIRMATION_MS = 48 * 60 * 60 * 1000;
export const DUREE_REINITIALISATION_MS = 60 * 60 * 1000;

/** Un envoi au plus par minute et par adresse (EM-R5, EM-R8). */
export const DELAI_ENTRE_ENVOIS_MS = 60 * 1000;

const OCTETS_JETON = 32;

/**
 * Jetons à usage unique envoyés par e-mail (EM-R3). Comme les sessions, ils ne
 * sont stockés que hachés : une copie de la base ne permet de confirmer aucune
 * adresse ni de réinitialiser aucun mot de passe.
 */
export class BaseJetons {
  constructor(private readonly db: Database.Database) {
    db.exec(SCHEMA);
    this.purgerExpires();
  }

  /**
   * Crée un jeton et rend sa valeur EN CLAIR — la seule fois où elle existe.
   * Les jetons précédents de même type sont remplacés : un lien renvoyé
   * annule le précédent.
   */
  creer(
    utilisateurId: number,
    type: TypeJeton,
    maintenant = new Date(),
  ): { jeton: string; expireLe: Date } {
    this.revoquer(utilisateurId, type);
    const jeton = crypto.randomBytes(OCTETS_JETON).toString("base64url");
    const duree =
      type === "confirmation" ? DUREE_CONFIRMATION_MS : DUREE_REINITIALISATION_MS;
    const expireLe = new Date(maintenant.getTime() + duree);
    this.db
      .prepare(
        `INSERT INTO jetons_email (jeton_hache, utilisateur_id, type, cree_le, expire_le)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        hacherJeton(jeton),
        utilisateurId,
        type,
        maintenant.toISOString(),
        expireLe.toISOString(),
      );
    return { jeton, expireLe };
  }

  /**
   * Consomme un jeton : il est effacé, qu'il serve ou non ensuite. Rend
   * l'identifiant du compte, ou `null` si le jeton est inconnu, expiré, déjà
   * utilisé, ou d'un autre type que celui attendu.
   */
  consommer(jeton: string, type: TypeJeton, maintenant = new Date()): number | null {
    const hache = hacherJeton(jeton);
    const ligne = this.db
      .prepare<[string, string], { utilisateur_id: number; expire_le: string }>(
        "SELECT utilisateur_id, expire_le FROM jetons_email WHERE jeton_hache = ? AND type = ?",
      )
      .get(hache, type);
    if (!ligne) return null;

    this.db.prepare("DELETE FROM jetons_email WHERE jeton_hache = ?").run(hache);
    if (new Date(ligne.expire_le) <= maintenant) return null;
    return ligne.utilisateur_id;
  }

  /** Date du dernier jeton émis, pour espacer les envois (EM-R5). */
  dernierEnvoi(utilisateurId: number, type: TypeJeton): Date | null {
    const ligne = this.db
      .prepare<[number, string], { cree_le: string }>(
        "SELECT cree_le FROM jetons_email WHERE utilisateur_id = ? AND type = ? ORDER BY cree_le DESC LIMIT 1",
      )
      .get(utilisateurId, type);
    return ligne ? new Date(ligne.cree_le) : null;
  }

  /** Vrai si un envoi a déjà eu lieu il y a moins d'une minute. */
  tropTot(utilisateurId: number, type: TypeJeton, maintenant = new Date()): boolean {
    const dernier = this.dernierEnvoi(utilisateurId, type);
    if (!dernier) return false;
    return maintenant.getTime() - dernier.getTime() < DELAI_ENTRE_ENVOIS_MS;
  }

  revoquer(utilisateurId: number, type: TypeJeton): number {
    return this.db
      .prepare("DELETE FROM jetons_email WHERE utilisateur_id = ? AND type = ?")
      .run(utilisateurId, type).changes;
  }

  revoquerTous(utilisateurId: number): number {
    return this.db
      .prepare("DELETE FROM jetons_email WHERE utilisateur_id = ?")
      .run(utilisateurId).changes;
  }

  purgerExpires(maintenant = new Date()): number {
    return this.db
      .prepare("DELETE FROM jetons_email WHERE expire_le <= ?")
      .run(maintenant.toISOString()).changes;
  }
}
