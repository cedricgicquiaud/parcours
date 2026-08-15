import { createHash } from "node:crypto";

/**
 * Identité d'un critère de réussite (CR-R2). Elle est dérivée du TEXTE, pas de
 * la position : insérer un critère au milieu d'une leçon ne doit décaler
 * l'identité d'aucun autre, sans quoi toutes les coches sauteraient à la
 * première correction éditoriale.
 */

/** Plafond par leçon (CR-R2b) : garde-fou contre un dossier importé aberrant. */
export const MAX_CRITERES = 300;

/** Format publié de l'identifiant : `<12 hex>-<rang>`. */
export const FORMAT_ID_CRITERE = /^[0-9a-f]{12}-\d{1,3}$/;

/**
 * Texte réduit à ce qui porte le sens : ni casse, ni accents, ni ponctuation.
 * Entourer un mot de backticks ou ajouter un point ne change donc pas l'id ;
 * reformuler la phrase, si.
 */
export function normaliserCritere(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Identifiant d'un critère. Le rang distingue deux critères au texte identique
 * dans une même leçon (« les tests passent » peut revenir).
 */
export function idCritere(texte: string, rang: number): string {
  const empreinte = createHash("sha256")
    .update(normaliserCritere(texte), "utf8")
    .digest("hex")
    .slice(0, 12);
  return `${empreinte}-${rang}`;
}
