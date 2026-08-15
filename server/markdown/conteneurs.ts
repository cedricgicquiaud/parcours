import type { MarkdownIt, StateBlock } from "markdown-it";

/** Types canoniques de conteneurs `:::` (F-R7). */
export type TypeConteneur =
  | "indice"
  | "solution"
  | "astuce"
  | "attention"
  | "prerequis";

/** Alias anglais acceptés en entrée (F-R13, décision P005). */
const ALIAS: Record<string, TypeConteneur> = {
  indice: "indice",
  hint: "indice",
  solution: "solution",
  astuce: "astuce",
  tip: "astuce",
  attention: "attention",
  warning: "attention",
  danger: "attention",
  prerequis: "prerequis",
};

export interface EnteteConteneur {
  /** Type canonique, ou `null` si le type est inconnu (dégradation douce). */
  type: TypeConteneur | null;
  typeBrut: string;
  titre: string;
}

/** Minuscules + suppression des diacritiques (`:::Prérequis` = `:::prerequis`). */
function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function analyserEntete(entete: string): EnteteConteneur {
  const separateur = entete.search(/\s/);
  const typeBrut = separateur === -1 ? entete : entete.slice(0, separateur);
  const titre = separateur === -1 ? "" : entete.slice(separateur + 1).trim();
  return { type: ALIAS[normaliser(typeBrut)] ?? null, typeBrut, titre };
}

const MARQUEUR = ":::";

function ligneDe(state: StateBlock, numero: number): string {
  return state.src.slice(
    state.bMarks[numero]! + state.tShift[numero]!,
    state.eMarks[numero]!,
  );
}

/**
 * Règle de bloc pour les conteneurs `:::type titre` … `:::` (F-R7).
 * Un conteneur non fermé absorbe le reste du fichier : la leçon s'affiche
 * quand même (dégradation douce, jamais de page blanche).
 */
export function pluginConteneurs(md: MarkdownIt): void {
  md.block.ruler.before(
    "fence",
    "conteneur",
    (state, ligneDebut, ligneFinMax, silencieux) => {
      const texte = ligneDe(state, ligneDebut).trim();
      if (!texte.startsWith(MARQUEUR)) return false;
      const entete = texte.slice(MARQUEUR.length).trim();
      if (entete.length === 0) return false; // `:::` seul ne peut qu'être une fermeture
      if (silencieux) return true;

      let ligneFin = ligneFinMax;
      let ferme = false;
      let dansFence = false;
      for (let ligne = ligneDebut + 1; ligne < ligneFinMax; ligne++) {
        const courante = ligneDe(state, ligne).trim();
        if (/^(```|~~~)/.test(courante)) dansFence = !dansFence;
        if (!dansFence && courante === MARQUEUR) {
          ligneFin = ligne;
          ferme = true;
          break;
        }
      }

      const analyse = analyserEntete(entete);
      const ouvrant = state.push("conteneur_open", "div", 1);
      ouvrant.markup = MARQUEUR;
      ouvrant.block = true;
      ouvrant.meta = analyse as unknown as Record<string, unknown>;
      ouvrant.map = [ligneDebut, ligneFin];

      const lineMaxPrecedent = state.lineMax;
      state.lineMax = ligneFin;
      state.md.block.tokenize(state, ligneDebut + 1, ligneFin);
      state.lineMax = lineMaxPrecedent;

      const fermant = state.push("conteneur_close", "div", -1);
      fermant.markup = MARQUEUR;
      fermant.block = true;
      fermant.meta = analyse as unknown as Record<string, unknown>;

      state.line = ferme ? ligneFin + 1 : ligneFin;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );
}
