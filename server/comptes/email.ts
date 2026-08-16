export type Validation<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

/** Longueur maximale d'une adresse, telle que fixée par la RFC 5321. */
export const LONGUEUR_MAX_EMAIL = 254;

/**
 * Format d'adresse accepté (EM-R1). Volontairement plus strict que la RFC :
 * l'objectif n'est pas d'accepter tout ce qui est théoriquement légal, mais de
 * refuser tout de suite ce qui ne recevra jamais de courrier — une adresse sans
 * point dans le domaine, un espace, un `@` en trop. La vraie validation, c'est
 * le lien de confirmation qui la fait.
 */
const FORMAT =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Normalise une adresse : espaces retirés, casse ignorée. */
export function normaliserEmail(valeur: string): string {
  return valeur.trim().toLowerCase().normalize("NFC");
}

export function verifierEmail(valeur: unknown): Validation<string> {
  if (typeof valeur !== "string") {
    return { ok: false, erreur: "adresse e-mail : texte attendu" };
  }
  const normalise = normaliserEmail(valeur);
  if (normalise.length === 0) {
    return { ok: false, erreur: "adresse e-mail : saisie attendue" };
  }
  if (normalise.length > LONGUEUR_MAX_EMAIL) {
    return { ok: false, erreur: "adresse e-mail trop longue" };
  }
  if (!FORMAT.test(normalise)) {
    return {
      ok: false,
      erreur: `adresse e-mail invalide : ${normalise.slice(0, 80)}`,
    };
  }
  return { ok: true, valeur: normalise };
}

/** Vrai si la valeur ressemble à une adresse — sert aux comptes historiques. */
export function estEmail(valeur: string): boolean {
  return verifierEmail(valeur).ok;
}
