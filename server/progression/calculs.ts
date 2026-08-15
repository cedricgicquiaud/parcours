import { leconsOrdonnees, type Manifeste } from "../formations/manifeste";

export interface AvancementModule {
  id: string;
  titre: string;
  faites: number;
  total: number;
  lecons: Array<{ id: string; titre: string; faite: boolean }>;
}

/** Une seule action possible par carte de formation (U-R1). */
export type ActionFormation = "commencer" | "reprendre" | "revoir";

export interface Avancement {
  faites: number;
  total: number;
  pourcentage: number;
  action: ActionFormation;
  /** Première leçon non cochée dans l'ordre du manifeste (P-R3). */
  prochaine: { id: string; titre: string; moduleTitre: string } | null;
  /** Leçons cochées absentes du manifeste (P-R4) — hors calculs. */
  orphelines: string[];
  modules: AvancementModule[];
}

/**
 * Agrège la progression d'une formation (C-R2, P-R3, P-R4).
 * Les orphelines sont exclues de tous les calculs mais restent signalées.
 */
export function calculerAvancement(
  manifeste: Manifeste,
  cochees: ReadonlySet<string>,
): Avancement {
  const toutes = leconsOrdonnees(manifeste);
  const idsConnus = new Set(toutes.map(({ lecon }) => lecon.id));
  const orphelines = [...cochees].filter((id) => !idsConnus.has(id)).sort();

  const modules: AvancementModule[] = manifeste.modules.map((module) => {
    const lecons = module.lecons.map((lecon) => ({
      id: lecon.id,
      titre: lecon.titre,
      faite: cochees.has(lecon.id),
    }));
    return {
      id: module.id,
      titre: module.titre,
      faites: lecons.filter((lecon) => lecon.faite).length,
      total: lecons.length,
      lecons,
    };
  });

  const total = toutes.length;
  const faites = toutes.filter(({ lecon }) => cochees.has(lecon.id)).length;
  const premiereNonFaite = toutes.find(({ lecon }) => !cochees.has(lecon.id));

  const action: ActionFormation =
    faites === 0 ? "commencer" : premiereNonFaite ? "reprendre" : "revoir";

  // Formation 100 % cochée → « Revoir » mène à la première leçon (P-R3).
  const cible = premiereNonFaite ?? toutes[0];

  return {
    faites,
    total,
    pourcentage: total === 0 ? 0 : Math.round((faites / total) * 100),
    action,
    prochaine: cible
      ? { id: cible.lecon.id, titre: cible.lecon.titre, moduleTitre: cible.module.titre }
      : null,
    orphelines,
    modules,
  };
}

/** Leçons précédente et suivante dans l'ordre du manifeste (U-R3). */
export function voisines(manifeste: Manifeste, leconId: string) {
  const toutes = leconsOrdonnees(manifeste);
  const position = toutes.findIndex(({ lecon }) => lecon.id === leconId);
  if (position === -1) return { precedente: null, suivante: null, position: -1 };
  const avant = toutes[position - 1];
  const apres = toutes[position + 1];
  return {
    position,
    precedente: avant ? { id: avant.lecon.id, titre: avant.lecon.titre } : null,
    suivante: apres ? { id: apres.lecon.id, titre: apres.lecon.titre } : null,
  };
}
