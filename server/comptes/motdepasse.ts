import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (
  motDePasse: string | Buffer,
  sel: Buffer,
  longueur: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

/**
 * Paramètres scrypt (AU-R2). N=16384 coûte ~100 ms sur une machine de bureau :
 * assez pour rendre une attaque hors ligne pénible, assez peu pour ne pas
 * suspendre le serveur à chaque connexion.
 */
const N = 16_384;
const R = 8;
const P = 1;
const OCTETS_SEL = 16;
const OCTETS_EMPREINTE = 64;
const MEMOIRE_MAX = 64 * 1024 * 1024;

export const LONGUEUR_MIN = 10;
export const LONGUEUR_MAX = 200;

export type Validation<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

/**
 * Refuse les mots de passe qu'aucun stockage ne rattrape (AU-R2). Volontairement
 * court : la longueur est la seule règle qui protège vraiment, les règles de
 * composition poussent surtout à écrire le mot de passe sur un papier.
 */
export function verifierForce(
  motDePasse: unknown,
  identifiant = "",
): Validation<string> {
  if (typeof motDePasse !== "string") {
    return { ok: false, erreur: "mot de passe : texte attendu" };
  }
  if (motDePasse.length < LONGUEUR_MIN) {
    return {
      ok: false,
      erreur: `mot de passe trop court : ${LONGUEUR_MIN} caractères au minimum`,
    };
  }
  if (motDePasse.length > LONGUEUR_MAX) {
    return {
      ok: false,
      erreur: `mot de passe trop long : ${LONGUEUR_MAX} caractères au maximum`,
    };
  }
  if (identifiant && motDePasse.toLowerCase() === identifiant.toLowerCase()) {
    return { ok: false, erreur: "mot de passe identique à l'identifiant" };
  }
  return { ok: true, valeur: motDePasse };
}

/** Empreinte auto-descriptive : `scrypt$N$r$p$sel$empreinte`, tout en base64. */
export async function hacher(motDePasse: string): Promise<string> {
  const sel = crypto.randomBytes(OCTETS_SEL);
  const empreinte = await scrypt(motDePasse.normalize("NFC"), sel, OCTETS_EMPREINTE, {
    N,
    r: R,
    p: P,
    maxmem: MEMOIRE_MAX,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    sel.toString("base64"),
    empreinte.toString("base64"),
  ].join("$");
}

/**
 * Vérifie un mot de passe contre son empreinte. Les paramètres sont relus depuis
 * l'empreinte : d'anciennes empreintes restent vérifiables si N change un jour.
 * La comparaison est en temps constant (AU-R2).
 */
export async function verifier(
  motDePasse: string,
  empreinteStockee: string,
): Promise<boolean> {
  const parties = empreinteStockee.split("$");
  if (parties.length !== 6 || parties[0] !== "scrypt") return false;

  const [n, r, p] = [parties[1], parties[2], parties[3]].map(Number);
  if (!estParametreValide(n) || !estParametreValide(r) || !estParametreValide(p)) {
    return false;
  }

  const sel = Buffer.from(parties[4]!, "base64");
  const attendue = Buffer.from(parties[5]!, "base64");
  if (sel.byteLength === 0 || attendue.byteLength === 0) return false;

  let calculee: Buffer;
  try {
    calculee = await scrypt(motDePasse.normalize("NFC"), sel, attendue.byteLength, {
      N: n,
      r,
      p,
      maxmem: MEMOIRE_MAX,
    });
  } catch {
    // Paramètres hors bornes acceptables : empreinte inexploitable.
    return false;
  }
  return crypto.timingSafeEqual(calculee, attendue);
}

function estParametreValide(valeur: number | undefined): valeur is number {
  return typeof valeur === "number" && Number.isInteger(valeur) && valeur > 0;
}

/** Mot de passe provisoire lisible, pour une réinitialisation par un admin (CO-R10). */
export function motDePasseProvisoire(): string {
  // Alphabet sans caractères ambigus (0/O, 1/l/I) : il sera lu puis retapé.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const octets = crypto.randomBytes(16);
  return Array.from(octets, (octet) => alphabet[octet % alphabet.length]).join("");
}
