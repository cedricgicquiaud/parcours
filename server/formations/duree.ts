import { leconsOrdonnees, type Manifeste } from "./manifeste";

/**
 * Durée d'une formation, en minutes (FI-R5). La durée déclarée par l'auteur
 * l'emporte toujours ; à défaut, la somme des leçons — mais **seulement si
 * toutes** en ont une. Une somme partielle annoncerait une formation deux fois
 * plus courte qu'elle ne l'est : mieux vaut ne rien afficher.
 */
export function dureeFormation(manifeste: Manifeste): number | null {
  if (manifeste.duree !== undefined) return manifeste.duree;
  const lecons = leconsOrdonnees(manifeste).map(({ lecon }) => lecon.duree);
  if (lecons.length === 0 || lecons.some((duree) => duree === undefined)) return null;
  return lecons.reduce<number>((total, duree) => total + (duree ?? 0), 0);
}

/** « 45 min », « 1 h », « 3 h 30 » — jamais « 3 h 0 » ni « 0 h 45 ». */
export function formaterDuree(minutes: number): string {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures === 0) return `${reste} min`;
  if (reste === 0) return `${heures} h`;
  return `${heures} h ${String(reste).padStart(2, "0")}`;
}
