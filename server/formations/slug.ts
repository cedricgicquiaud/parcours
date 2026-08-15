/** Longueur maximale d'un identifiant (F-R3). */
export const SLUG_LONGUEUR_MAX = 64;

/**
 * Dérive un identifiant valide (F-R3) depuis un titre saisi par l'auteur :
 * « Installer Claude Code » → « installer-claude-code ».
 * Retourne une chaîne vide si le titre ne contient aucun caractère utilisable.
 */
export function slugifier(titre: string): string {
  const sansAccents = titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const tirets = sansAccents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  const tronque = tirets.slice(0, SLUG_LONGUEUR_MAX).replace(/-+$/, "");
  // F-R3 impose une première position alphanumérique.
  return /^[a-z0-9]/.test(tronque) ? tronque : "";
}

/**
 * Rend un identifiant unique dans un ensemble donné, en suffixant : « intro »,
 * « intro-2 », « intro-3 »… Le résultat respecte toujours la longueur maximale.
 */
export function slugUnique(base: string, pris: ReadonlySet<string>): string {
  if (!pris.has(base)) return base;
  for (let suffixe = 2; suffixe < 1000; suffixe++) {
    const marque = `-${suffixe}`;
    const candidat = base.slice(0, SLUG_LONGUEUR_MAX - marque.length) + marque;
    if (!pris.has(candidat)) return candidat;
  }
  throw new Error(`impossible de dériver un identifiant unique depuis « ${base} »`);
}
