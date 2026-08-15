import type { Token } from "markdown-it";
import type { EnteteConteneur } from "../markdown/conteneurs";

/** Conteneurs jamais indexés (S-R2, non négociable du PRD). */
const TYPES_EXCLUS = new Set(["indice", "solution"]);

/**
 * Texte indexable d'une leçon (S-R1) : le contenu, balisage exclu.
 * Les conteneurs `:::indice` et `:::solution` — titres compris — sont écartés :
 * aucune solution ne doit pouvoir apparaître dans un extrait de recherche.
 */
export function texteIndexable(tokens: Token[]): string {
  const morceaux: string[] = [];
  let profondeurExclue = 0;

  for (const token of tokens) {
    if (token.type === "conteneur_open") {
      const entete = token.meta as EnteteConteneur;
      if (profondeurExclue > 0 || (entete.type && TYPES_EXCLUS.has(entete.type))) {
        profondeurExclue += 1;
      }
      continue;
    }
    if (token.type === "conteneur_close") {
      if (profondeurExclue > 0) profondeurExclue -= 1;
      continue;
    }
    if (profondeurExclue > 0) continue;

    if (token.type === "inline") {
      morceaux.push(texteInline(token));
    } else if (token.type === "fence" || token.type === "code_block") {
      morceaux.push(token.content);
    }
  }

  return morceaux
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0)
    .join("\n");
}

function texteInline(token: Token): string {
  if (!token.children) return token.content;
  let texte = "";
  for (const enfant of token.children) {
    // Le texte des liens est indexé, jamais leurs attributs (S-R1).
    if (enfant.type === "text" || enfant.type === "code_inline") {
      texte += enfant.content;
    } else if (enfant.type === "softbreak" || enfant.type === "hardbreak") {
      texte += " ";
    } else if (enfant.type === "image") {
      texte += enfant.content;
    }
  }
  return texte;
}
