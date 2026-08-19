Trois issues, ça se lit d'un coup d'œil. Trente, plus du tout. Le premier outil
de tri est le **label** : une étiquette colorée qu'on colle sur les issues pour
les classer — et surtout pour les retrouver.

## À quoi sert un label

Un label répond à une question qu'on se pose devant la liste : *qu'est-ce qui
est cassé ?* (bug), *qu'est-ce qui est urgent ?* (priorité haute), *de quoi
parle cette tâche ?* (interface, données…). Une issue peut porter plusieurs
labels — c'est la grande différence avec le milestone, qu'on verra à la
prochaine leçon.

GitHub crée d'office quelques labels dans chaque dépôt (`bug`, `enhancement`,
`documentation`…). Ils sont en anglais et pensés pour de gros projets : dans un
petit projet, mieux vaut les vôtres, peu nombreux et dans votre langue.

La règle d'or : **un label ne sert que si on filtre par lui un jour**. Trois ou
quatre labels vivants valent mieux que quinze décoratifs. Deux familles
suffisent souvent : le type (bug / amélioration) et la priorité (priorité
haute).

## Où ça se passe

- **Créer et gérer** : sous l'onglet Issues, le bouton **Labels** — la liste
  des labels du dépôt, avec pour chacun son nom, sa couleur, sa description.
- **Appliquer** : sur la page d'une issue, la rubrique **Labels** de la
  colonne de droite.
- **Filtrer** : sur la liste des issues, cliquer un label — ou le bouton
  Labels au-dessus de la liste — n'affiche plus que les issues qui le portent.

## Constatez-le sur pièce

Dans votre dépôt `todo-app`, à la main — c'est le premier temps de la
méthode :

1. Ouvrez la page **Labels** et créez deux labels : `amélioration` (choisissez
   sa couleur) et `priorité haute`. Une description courte aide : « ajout ou
   changement visible », « à faire avant le reste ».
2. Ouvrez votre issue « Barrer visuellement… » et appliquez-lui
   `amélioration` ; faites de même sur les deux issues créées par Claude au
   module précédent.
3. Revenez à la liste des issues et filtrez par `amélioration` : vos trois
   issues restent, l'essai du cycle de vie (fermé, sans label) a disparu de la
   vue. Retirez le filtre : tout revient.

## Critères de réussite

- [ ] mes labels `amélioration` et `priorité haute` existent, chacun avec sa couleur
- [ ] mes trois issues ouvertes portent `amélioration` dans la colonne de droite
- [ ] la liste filtrée par `amélioration` n'affiche que ces trois issues
- [ ] le filtre retiré, la liste complète est revenue
