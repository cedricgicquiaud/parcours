/**
 * Extensions de fichiers joints servies par l'API (A-R4) et acceptées à
 * l'import (G-R2) — une seule liste pour les deux, sinon un dépôt pourrait
 * poser un fichier que le lecteur refuserait ensuite de servir.
 */
export const EXTENSIONS_ASSETS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
};

/** Extensions acceptées dans un dépôt : contenu, manifeste et fichiers joints. */
export const EXTENSIONS_IMPORT = new Set([
  ".md",
  ".markdown",
  ".json",
  ...Object.keys(EXTENSIONS_ASSETS),
]);

/** Extensions considérées comme du contenu de leçon (G-R4). */
export const EXTENSIONS_MARKDOWN = new Set([".md", ".markdown"]);

/** Extensions lues en texte à l'import — les autres transitent en base64. */
export const EXTENSIONS_TEXTE = new Set([".md", ".markdown", ".json", ".txt", ".svg"]);
