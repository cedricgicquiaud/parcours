import fs from "node:fs/promises";
import path from "node:path";
import { leconsOrdonnees } from "../formations/manifeste";
import type { FormationValide } from "../formations/scan";
import { TAILLE_MAX_LECON } from "../formations/scan";
import type { MoteurRendu } from "../markdown/rendu";
import {
  chercherDansTexte,
  motsDeRequete,
  MAX_RESULTATS,
  type Occurrence,
} from "./requete";
import { texteIndexable } from "./texte";

export interface ResultatRecherche {
  leconId: string;
  titre: string;
  moduleTitre: string;
  extrait: string;
  occurrences: Occurrence[];
}

export interface ReponseRecherche {
  resultats: ResultatRecherche[];
  /** Nombre total de correspondances avant plafonnement (S-R5). */
  total: number;
  /** Leçons écartées de l'index parce qu'illisibles (S-R7). */
  nonIndexees: number;
  /** Message à afficher tel quel quand la requête est trop courte (S-R4). */
  message?: string;
}

interface EntreeIndex {
  leconId: string;
  titre: string;
  moduleTitre: string;
  texte: string;
}

interface IndexFormation {
  signature: string;
  entrees: EntreeIndex[];
  nonIndexees: number;
}

/**
 * Index plein texte par formation (§ 3B), gardé en mémoire et jamais écrit sur
 * disque : les dossiers de formation restent en lecture seule (P-R1).
 */
export class MoteurRecherche {
  private readonly index = new Map<string, IndexFormation>();

  constructor(private readonly rendu: MoteurRendu) {}

  async rechercher(
    formation: FormationValide,
    requete: string,
  ): Promise<ReponseRecherche> {
    const mots = motsDeRequete(requete);
    const index = await this.indexDe(formation);

    if (mots.join("").length < 2) {
      return {
        resultats: [],
        total: 0,
        nonIndexees: index.nonIndexees,
        message: "saisir au moins 2 caractères",
      };
    }

    const trouves: ResultatRecherche[] = [];
    for (const entree of index.entrees) {
      // Le titre de la leçon est indexé comme son contenu (S-R1).
      const correspondance = chercherDansTexte(`${entree.titre}\n${entree.texte}`, mots);
      if (!correspondance) continue;
      trouves.push({
        leconId: entree.leconId,
        titre: entree.titre,
        moduleTitre: entree.moduleTitre,
        extrait: correspondance.extrait,
        occurrences: correspondance.occurrences,
      });
    }

    return {
      // S-R5 : ordre du manifeste, jamais de score de pertinence en V1.
      resultats: trouves.slice(0, MAX_RESULTATS),
      total: trouves.length,
      nonIndexees: index.nonIndexees,
    };
  }

  /** Vide l'index d'une formation (utile aux tests et au rechargement). */
  oublier(formationId: string): void {
    this.index.delete(formationId);
  }

  private async indexDe(formation: FormationValide): Promise<IndexFormation> {
    const signature = await this.signature(formation);
    const memorise = this.index.get(formation.id);
    if (memorise && memorise.signature === signature) return memorise;

    const construit = await this.construire(formation, signature);
    this.index.set(formation.id, construit);
    return construit;
  }

  /** Chemin + date de modification + taille de chaque fichier (S-R3). */
  private async signature(formation: FormationValide): Promise<string> {
    const entrees = leconsOrdonnees(formation.manifeste);
    const parties = await Promise.all(
      entrees.map(async ({ lecon }) => {
        const complet = path.join(formation.dossier, lecon.fichier);
        try {
          const infos = await fs.stat(complet);
          return `${lecon.fichier}:${infos.mtimeMs}:${infos.size}`;
        } catch {
          return `${lecon.fichier}:absent`;
        }
      }),
    );
    return parties.join("|");
  }

  private async construire(
    formation: FormationValide,
    signature: string,
  ): Promise<IndexFormation> {
    const entrees: EntreeIndex[] = [];
    let nonIndexees = 0;

    for (const { module, lecon } of leconsOrdonnees(formation.manifeste)) {
      const complet = path.join(formation.dossier, lecon.fichier);
      let markdown: string;
      try {
        const infos = await fs.stat(complet);
        if (infos.size > TAILLE_MAX_LECON) throw new Error("leçon trop volumineuse");
        markdown = await fs.readFile(complet, "utf8");
      } catch {
        // S-R7 : leçon illisible → exclue de l'index, jamais silencieusement.
        nonIndexees += 1;
        continue;
      }
      entrees.push({
        leconId: lecon.id,
        titre: lecon.titre,
        moduleTitre: module.titre,
        texte: texteIndexable(this.rendu.analyser(markdown)),
      });
    }

    return { signature, entrees, nonIndexees };
  }
}
