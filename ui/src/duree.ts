/**
 * « 45 min », « 1 h », « 3 h 30 » — jamais « 3 h 0 » ni « 0 h 45 ».
 * Même règle que le serveur (`server/formations/duree.ts`) : l'interface
 * n'invente pas son propre format d'affichage.
 */
export function formaterDuree(minutes: number): string {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures === 0) return `${reste} min`;
  if (reste === 0) return `${heures} h`;
  return `${heures} h ${String(reste).padStart(2, "0")}`;
}
