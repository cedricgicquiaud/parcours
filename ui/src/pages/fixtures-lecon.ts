import type { ReponseLecon } from "../api";

/**
 * Fabrique partagée des tests de `PageLecon`. Un champ obligatoire ajouté à
 * `ReponseLecon` ne se répare qu'ici ; chaque suite surcharge ce qui varie.
 */
export function lecon(surcharge: Partial<ReponseLecon> = {}): ReponseLecon {
  return {
    formationId: "formation-claude",
    formationTitre: "Formation pratique Claude",
    leconId: "les-hooks",
    titre: "Les hooks",
    moduleId: "fondations",
    moduleTitre: "Fondations",
    html:
      "<p>Un hook se déclenche à chaque écriture.</p>" +
      '<details class="repliable repliable-solution"><summary>Solution</summary>' +
      '<div class="repliable-corps">Le contenu de la solution.</div></details>',
    faite: false,
    criteres: [],
    criteresTronques: false,
    position: 4,
    total: 5,
    precedente: { id: "sous-agents", titre: "Les sous-agents" },
    suivante: { id: "cloture", titre: "Clôture du module" },
    ...surcharge,
  };
}

/**
 * Propriétés par défaut de `PageLecon`. Les tests historiques décrivent un
 * auteur au travail (ED-R8) : `peutEcrire` est vrai, surcharger pour un
 * lecteur.
 */
export const proprietesLecon = {
  chargement: false,
  erreur: null as string | null,
  erreurCoche: null as string | null,
  naviguer: () => undefined,
  surBasculerFaite: () => undefined,
  surBasculerCritere: () => Promise.resolve(true),
  peutEcrire: true,
};
