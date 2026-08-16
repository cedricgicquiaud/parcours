/**
 * Variables de thème mermaid, dérivées de la palette de l'application.
 *
 * Sans ça, mermaid applique son thème clair par défaut : des boîtes lavande et
 * du texte gris, illisibles sur le fond sombre de Parcours. On lui donne les
 * mêmes couleurs qu'au reste du contenu, lues sur la racine du document — donc
 * justes dans les deux modes, sans les redéclarer nulle part.
 */
export function variablesMermaid(racine: Element): Record<string, string> {
  const styles = getComputedStyle(racine);
  const jeton = (nom: string, secours: string): string =>
    styles.getPropertyValue(nom).trim() || secours;

  const fond = jeton("--pane", "#faf9f7");
  const texte = jeton("--text", "#302a22");
  const trait = jeton("--line", "#eae4dc");
  const accent = jeton("--accent", "#f2701f");

  // Ni `fontFamily` ni `fontSize` ici, volontairement : mermaid mesure les
  // libellés avec sa police par défaut pour dimensionner les boîtes. Lui en
  // imposer une autre décale la mesure du dessin, et le texte déborde
  // (« parcours.db » tronqué en « parcours.c »). On ne lui donne que des
  // couleurs.
  return {
    background: jeton("--bg", "#ffffff"),
    // Nœuds
    primaryColor: fond,
    mainBkg: fond,
    secondaryColor: jeton("--rail", fond),
    tertiaryColor: jeton("--rail", fond),
    clusterBkg: jeton("--rail", fond),
    // Textes
    primaryTextColor: texte,
    secondaryTextColor: texte,
    tertiaryTextColor: texte,
    textColor: texte,
    nodeTextColor: texte,
    // Traits
    primaryBorderColor: trait,
    secondaryBorderColor: trait,
    tertiaryBorderColor: trait,
    nodeBorder: trait,
    clusterBorder: trait,
    lineColor: accent,
    edgeLabelBackground: jeton("--bg", "#ffffff"),
  };
}
