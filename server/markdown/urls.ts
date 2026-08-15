/**
 * Classement des URL rencontrées dans le markdown (F-R6, F-R8, F-R12).
 * Tout ce qui n'est pas explicitement reconnu est refusé : `javascript:`,
 * `data:`, `file:`, les URL protocol-relative (`//ailleurs`), etc.
 */
export type UrlClassee =
  | { genre: "externe"; url: string }
  | { genre: "lecon"; id: string }
  | { genre: "relatif"; chemin: string }
  | { genre: "ancre"; cible: string }
  | { genre: "refuse" };

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Caractères de contrôle utilisés pour masquer un schéma (`java\nscript:`). */
function nettoyer(brut: string): string {
  return brut.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").trim();
}

export function classerLien(brut: string): UrlClassee {
  const valeur = nettoyer(brut);
  if (valeur.length === 0) return { genre: "refuse" };

  if (valeur.startsWith("#")) return { genre: "ancre", cible: valeur };

  const minuscule = valeur.toLowerCase();
  if (minuscule.startsWith("lecon:")) {
    const id = valeur.slice("lecon:".length);
    return SLUG.test(id) ? { genre: "lecon", id } : { genre: "refuse" };
  }
  if (minuscule.startsWith("http://") || minuscule.startsWith("https://")) {
    try {
      const url = new URL(valeur);
      return { genre: "externe", url: url.href };
    } catch {
      return { genre: "refuse" };
    }
  }
  // Protocol-relative ou chemin absolu : hors formation.
  if (valeur.startsWith("//") || valeur.startsWith("/")) return { genre: "refuse" };
  // Tout autre schéma explicite (javascript:, data:, mailto:, file:…) est refusé,
  // y compris masqué : un chemin de fichier légitime ne contient jamais « : ».
  if (valeur.includes(":")) return { genre: "refuse" };

  return { genre: "relatif", chemin: valeur };
}

/** Une image ne peut être qu'un chemin relatif confiné (F-R8). */
export function classerImage(brut: string): UrlClassee {
  const classe = classerLien(brut);
  return classe.genre === "relatif" ? classe : { genre: "refuse" };
}

/** Échappement HTML utilisé partout où du texte d'auteur atteint la sortie. */
export function echapper(texte: string): string {
  return texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
