import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import type { MarkdownIt as InstanceMd, Token } from "markdown-it";
import { createHighlighter, type Highlighter } from "shiki";
import { cheminConfine } from "../formations/manifeste";
import { pluginConteneurs, type EnteteConteneur } from "./conteneurs";
import { classerImage, classerLien, echapper } from "./urls";

/** Langages colorés hors ligne (F-R9, A-R6 : grammaires embarquées). */
export const LANGAGES = [
  "bash",
  "css",
  "diff",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "python",
  "sql",
  "tsx",
  "typescript",
  "yaml",
];

const THEMES = { light: "github-light", dark: "github-dark" } as const;

/** Nombre d'extraits de code colorés mémorisés par moteur. */
const TAILLE_CACHE_COLORATION = 500;

export interface ContexteRendu {
  /** Id de la formation, pour construire les URL d'assets et de leçons. */
  formationId: string;
  /** Dossier absolu de la formation (vérification des images, F-R8). */
  dossier: string;
  /** Ids de leçons existantes, pour les liens `lecon:` (F-R12). */
  idsLecons: ReadonlySet<string>;
}

interface EtatRendu {
  compteurIndices: number;
  /** Pile des liens ouverts : `false` = lien neutralisé (F-R12). */
  liens: boolean[];
}

const ETIQUETTES: Record<string, string> = {
  astuce: "ASTUCE",
  attention: "ATTENTION",
  prerequis: "AVANT CETTE LEÇON",
};

const ICONES: Record<string, string> = {
  astuce: "ph-lightbulb",
  attention: "ph-warning",
  prerequis: "ph-arrow-square-out",
};

function etat(env: unknown): EtatRendu {
  const sac = (env ?? {}) as Record<string, unknown>;
  if (!sac.__parcours) sac.__parcours = { compteurIndices: 0, liens: [] };
  return sac.__parcours as EtatRendu;
}

function enteteDe(token: Token): EnteteConteneur {
  return token.meta as unknown as EnteteConteneur;
}

function contexteDe(env: unknown): ContexteRendu | undefined {
  return (env as Record<string, unknown> | undefined)?.contexte as
    | ContexteRendu
    | undefined;
}

function attribut(token: Token, nom: string): string {
  const valeur = token.attrGet(nom);
  return valeur === null || valeur === undefined ? "" : String(valeur);
}

/**
 * Moteur de rendu markdown → HTML assaini (A-R5).
 *
 * Sécurité (F-R6) : le HTML brut d'auteur n'est jamais interprété (`html:false`
 * l'échappe en texte), et TOUTES les balises de la sortie sont produites ici —
 * la liste blanche est donc garantie par construction, pas par un filtre
 * a posteriori. Seule exception documentée : les `span[style]` de couleur
 * produits par Shiki dans les blocs de code, dont le contenu est échappé.
 */
export class MoteurRendu {
  private readonly cacheColoration = new Map<string, string>();

  private constructor(
    private readonly md: InstanceMd,
    private readonly coloriste: Highlighter,
  ) {}

  static async creer(): Promise<MoteurRendu> {
    const coloriste = await createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: LANGAGES,
    });
    const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
    const moteur = new MoteurRendu(md, coloriste);
    md.use(pluginConteneurs);
    md.use((instance) => moteur.installerRenderers(instance));
    return moteur;
  }

  /** Rend une leçon en HTML prêt à insérer dans le DOM. */
  rendre(markdown: string, contexte: ContexteRendu): string {
    return this.md.render(markdown, { contexte });
  }

  /** Tokens de la leçon — base de l'index de recherche (§ 3B). */
  analyser(markdown: string): Token[] {
    return this.md.parse(markdown, {});
  }

  private installerRenderers(md: InstanceMd): void {
    const regles = md.renderer.rules;

    regles.conteneur_open = (tokens, i, _options, env) =>
      this.ouvrirConteneur(enteteDe(tokens[i]!), etat(env));
    regles.conteneur_close = (tokens, i) =>
      fermerConteneur(enteteDe(tokens[i]!));

    regles.link_open = (tokens, i, options, env, self) => {
      const contexte = contexteDe(env);
      const token = tokens[i]!;
      const classe = classerLien(attribut(token, "href"));
      const etatRendu = etat(env);
      switch (classe.genre) {
        case "externe":
          etatRendu.liens.push(true);
          token.attrSet("href", classe.url);
          token.attrSet("target", "_blank");
          token.attrSet("rel", "noopener noreferrer");
          return self.renderToken(tokens, i, options);
        case "ancre":
          etatRendu.liens.push(true);
          token.attrSet("href", classe.cible);
          return self.renderToken(tokens, i, options);
        case "relatif": {
          const confine = cheminConfine(classe.chemin);
          if (!confine.ok || !contexte) {
            etatRendu.liens.push(false);
            return "";
          }
          etatRendu.liens.push(true);
          token.attrSet("href", urlAsset(contexte.formationId, confine.valeur));
          return self.renderToken(tokens, i, options);
        }
        case "lecon": {
          // F-R12 : id inexistant → texte simple, non cliquable.
          if (!contexte || !contexte.idsLecons.has(classe.id)) {
            etatRendu.liens.push(false);
            return "";
          }
          etatRendu.liens.push(true);
          token.attrSet(
            "href",
            `/formation/${encodeURIComponent(contexte.formationId)}/lecon/${encodeURIComponent(classe.id)}`,
          );
          token.attrSet("data-lecon", classe.id);
          return self.renderToken(tokens, i, options);
        }
        default:
          etatRendu.liens.push(false);
          return "";
      }
    };

    regles.link_close = (tokens, i, options, env, self) =>
      etat(env).liens.pop() === false ? "" : self.renderToken(tokens, i, options);

    regles.image = (tokens, i, _options, env) => {
      const token = tokens[i]!;
      const contexte = contexteDe(env);
      const alt = token.content ?? "";
      const classe = classerImage(attribut(token, "src"));
      if (classe.genre !== "relatif" || !contexte) return imageAbsente(alt);
      const confine = cheminConfine(classe.chemin);
      if (!confine.ok) return imageAbsente(alt);
      if (!fs.existsSync(path.join(contexte.dossier, confine.valeur))) {
        return imageAbsente(alt);
      }
      const src = urlAsset(contexte.formationId, confine.valeur);
      const titre = attribut(token, "title");
      const attrTitre = titre ? ` title="${echapper(titre)}"` : "";
      return `<img src="${echapper(src)}" alt="${echapper(alt)}"${attrTitre} loading="lazy">`;
    };

    regles.fence = (tokens, i) => this.rendreFence(tokens[i]!);
    regles.code_block = (tokens, i) => this.rendreFence(tokens[i]!);

    // Filet de sécurité : avec html:false ces tokens ne sont pas produits,
    // mais si une extension en émettait, leur contenu resterait du texte.
    regles.html_block = (tokens, i) => `<p>${echapper(tokens[i]!.content)}</p>`;
    regles.html_inline = (tokens, i) => echapper(tokens[i]!.content);

    // U-R7 : un seul h1 par écran — le titre de la leçon vient du manifeste,
    // les titres du markdown descendent donc d'un niveau.
    regles.heading_open = (tokens, i) => `<${niveauTitre(tokens[i]!.tag)}>`;
    regles.heading_close = (tokens, i) => `</${niveauTitre(tokens[i]!.tag)}>`;

    regles.table_open = () => '<div class="table-defilante"><table>';
    regles.table_close = () => "</table></div>";

    regles.case_a_cocher = (tokens, i) => {
      const { coche } = tokens[i]!.meta as { coche: boolean };
      return `<input type="checkbox" disabled${coche ? " checked" : ""}> `;
    };

    md.core.ruler.push("cases-a-cocher", (state) => {
      transformerCasesACocher(state.tokens);
    });
  }

  private ouvrirConteneur(entete: EnteteConteneur, etatRendu: EtatRendu): string {
    switch (entete.type) {
      case "indice":
      case "solution": {
        const prefixe =
          entete.type === "indice" ? `Indice ${++etatRendu.compteurIndices}` : "Solution";
        const titre = entete.titre ? `${prefixe} — ${echapper(entete.titre)}` : prefixe;
        // U-R4 : `details` natif SANS `open` — rien n'est visible avant clic.
        return (
          `<details class="repliable repliable-${entete.type}">` +
          `<summary><i class="ph ph-caret-right" aria-hidden="true"></i>${titre}</summary>` +
          `<div class="repliable-corps">`
        );
      }
      case "astuce":
      case "attention":
      case "prerequis": {
        const etiquette = entete.titre
          ? echapper(entete.titre)
          : ETIQUETTES[entete.type]!;
        return (
          `<div class="encadre encadre-${entete.type}">` +
          `<i class="ph ${ICONES[entete.type]}" aria-hidden="true"></i>` +
          `<div class="encadre-contenu">` +
          `<span class="encadre-etiquette">${etiquette}</span>` +
          `<div class="encadre-corps">`
        );
      }
      default:
        // F-R13 : type inconnu → contenu rendu tel quel, `:::` invisible.
        return "";
    }
  }

  private rendreFence(token: Token): string {
    const langue = (token.info ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    const code = token.content;

    // F-R10 : le schéma mermaid traverse en TEXTE, le rendu se fait côté client.
    if (langue === "mermaid") {
      return `<div class="mermaid-source" data-source="${echapper(code)}"><pre><code>${echapper(code)}</code></pre></div>`;
    }

    if (langue && LANGAGES.includes(langue)) {
      // La colorisation est le poste le plus coûteux du rendu (A-R5) : un même
      // extrait revient souvent dans une formation, on le mémorise.
      const cle = `${langue}\u0000${code}`;
      const memorise = this.cacheColoration.get(cle);
      if (memorise !== undefined) return memorise;
      const html = this.coloriste.codeToHtml(code, {
        lang: langue,
        themes: THEMES,
        defaultColor: false,
      });
      if (this.cacheColoration.size >= TAILLE_CACHE_COLORATION) {
        this.cacheColoration.clear();
      }
      this.cacheColoration.set(cle, html);
      return html;
    }
    // F-R9 : langage inconnu → monospace neutre, sans erreur.
    return `<pre class="code-neutre"><code>${echapper(code)}</code></pre>`;
  }
}

function fermerConteneur(entete: EnteteConteneur): string {
  switch (entete.type) {
    case "indice":
    case "solution":
      return "</div></details>";
    case "astuce":
    case "attention":
    case "prerequis":
      return "</div></div></div>";
    default:
      return "";
  }
}

function urlAsset(formationId: string, chemin: string): string {
  const segments = chemin.split(path.sep).map(encodeURIComponent).join("/");
  return `/api/formations/${encodeURIComponent(formationId)}/assets/${segments}`;
}

/** F-R8 : image manquante → texte alternatif encadré, la leçon ne casse pas. */
function imageAbsente(alt: string): string {
  return `<span class="image-absente">${echapper(alt || "image indisponible")}</span>`;
}

function niveauTitre(tag: string): string {
  const niveau = Number(tag.slice(1));
  return `h${Math.min(niveau + 1, 6)}`;
}

/**
 * Cases à cocher GFM (F-R6) : purement visuelles, désactivées, jamais
 * persistées — la progression V1 est à la leçon, pas à la case.
 */
function transformerCasesACocher(tokens: Token[]): void {
  for (const [i, token] of tokens.entries()) {
    if (token.type !== "inline") continue;
    // Premier contenu d'un élément de liste, que la liste soit serrée
    // (paragraphe masqué) ou lâche (paragraphe rendu).
    const precedent = tokens[i - 1];
    const avantPrecedent = tokens[i - 2];
    if (!precedent || precedent.type !== "paragraph_open") continue;
    if (!avantPrecedent || avantPrecedent.type !== "list_item_open") continue;
    const premier = token.children?.[0];
    if (!premier || premier.type !== "text") continue;
    const correspondance = /^\[([ xX])\]\s+/.exec(premier.content);
    if (!correspondance) continue;
    premier.content = premier.content.slice(correspondance[0].length);
    const coche = correspondance[1]!.toLowerCase() === "x";
    const boite = new MarkdownIt.Token("case_a_cocher", "input", 0);
    boite.meta = { coche };
    token.children!.unshift(boite);
  }
}
