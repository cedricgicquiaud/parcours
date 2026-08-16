/**
 * Adresse d'un fichier joint d'une formation.
 *
 * Attention au piège : le `/assets/` de l'URL est un segment de ROUTE, pas le
 * dossier. Le chemin déclaré dans le manifeste (`assets/couverture.png`) se
 * place derrière **tel quel** — le retirer donne un 404. Même construction que
 * `urlAsset` côté serveur (`server/markdown/rendu.ts`).
 */
export function urlAsset(formationId: string, chemin: string): string {
  const segments = chemin.split("/").map(encodeURIComponent).join("/");
  return `/api/formations/${encodeURIComponent(formationId)}/assets/${segments}`;
}
