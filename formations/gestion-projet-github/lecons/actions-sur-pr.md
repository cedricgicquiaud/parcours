Une vérification qui tourne après coup constate les dégâts. La vraie valeur
des Actions est AVANT : sur la **pull request**, là où l'on décide d'intégrer
ou pas. Cette leçon casse quelque chose exprès, pour voir le filet
fonctionner.

## Le check sur la PR

Votre Action se déclenche aussi sur `pull_request` : à chaque PR ouverte ou
mise à jour, elle tourne sur le contenu **proposé** — et son verdict s'affiche
en bas de la PR, à côté du bouton de fusion : le **check**, vert ou rouge.

Le rouge ne bloque pas la fusion par défaut : il informe, à vous de décider.
(On PEUT l'exiger — régler la branche `main` pour refuser toute fusion sans
check vert, dans Settings → Branches ; à 2-3 avec un exécutant rapide, c'est
une bonne assurance. Sachez que ça existe, on n'en a pas besoin dans le bac à
sable.)

Pour vous, le check change le métier de relecteur : la machine vérifie ce qui
est vérifiable, vous jugez ce qui demande un jugement. Et quand l'exécutant
est Claude, c'est un filet qui ne dort jamais : même une modification générée
en une seconde passe au contrôle.

## À vous : casser pour voir

1. Demandez à Claude une PR **volontairement fautive** : renommer la section
   `## V2` du README en `## Version 2`, sur une branche, PR ouverte — et
   **sans** « Closes » : cette PR ne réalise aucune issue, c'est un essai.
2. Sur la page de la PR, regardez le check tourner puis passer au **rouge**.
   Ouvrez son détail : le journal dit quelle vérification a échoué.
3. Demandez la correction **sur la même branche** (remettre `## V2`) : la PR
   se met à jour, le check retourne, et repasse au **vert** — même contrôle,
   nouveau contenu.
4. **Fermez la PR sans fusionner** (bouton « Close pull request »), et
   supprimez sa branche : l'essai est terminé, `main` n'a jamais été menacé.

## Critères de réussite

- [ ] la PR fautive a affiché un check rouge avant toute fusion
- [ ] le journal du check dit précisément ce qui manquait
- [ ] corrigée sur la même branche, la PR a retrouvé un check vert
- [ ] j'ai fermé la PR sans fusionner : le README de main n'a jamais changé
