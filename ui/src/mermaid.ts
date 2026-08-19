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

  // La police de la page s'applique au SVG par héritage CSS, que mermaid le
  // veuille ou non : s'il mesure ses boîtes avec sa police par défaut
  // (Trebuchet MS, plus étroite qu'Open Sans), le dernier mot des libellés
  // déborde de la zone mesurée et disparaît. La seule option cohérente est de
  // lui donner exactement la police et la taille affichées.
  // Le jeton `--font` est la vérité : c'est lui que `body` applique. La taille
  // vient du calcul (le test en px écarte les valeurs symboliques de jsdom).
  const police = jeton("--font", '"Open Sans", system-ui, sans-serif');
  const taille = /px$/.test(styles.fontSize) ? styles.fontSize : "15px";

  return {
    fontFamily: police,
    fontSize: taille,
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
