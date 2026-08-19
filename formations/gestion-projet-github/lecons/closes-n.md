Votre PR est ouverte, votre issue attend. Pour l'instant, rien ne les relie —
si vous fusionniez maintenant, il faudrait fermer l'issue à la main, et
déplacer sa carte. La formule qui soude tout : **« Closes #N »**.

## La formule magique

Écrite dans la **description d'une PR**, la phrase `Closes #7` (ou `Fixes`,
ou `Resolves` — trois mots pour le même effet) déclare : « cette PR réalise
l'issue nº 7 ». GitHub la lit et fait deux choses :

1. **Tout de suite** : il relie l'issue et la PR — chacune affiche l'autre
   dans son encart **Development** (colonne de droite). Qui ouvre l'issue voit
   que le travail est en route, et où.
2. **À la fusion** : il **ferme l'issue automatiquement**, en citant la PR
   dans son fil. Et comme votre workflow « Item closed » veille depuis le
   module 4, la carte file dans Done. Personne n'a rien touché.

Une PR peut en fermer plusieurs : `Closes #7, closes #12` — un `closes` par
numéro. Et la formule ne vaut que dans la **description** de la PR, pas dans
un commentaire.

## À vous

Ajoutez la formule à votre PR de la leçon précédente :

- demandez à Claude d'ajouter « Closes #N » (votre numéro d'issue) à la
  description de la PR — ou faites-le à la main : le crayon en haut de la
  description, comme sur une issue ;
- puis allez constater le lien : l'encart **Development** de l'issue pointe
  vers la PR, celui de la PR pointe vers l'issue.

Ne fusionnez toujours pas — le moment de vérité a sa propre leçon, la
prochaine.

:::astuce
Le réflexe à prendre pour la suite : exiger la formule dès l'ouverture de
chaque PR (« ouvre une PR qui ferme l'issue N »). Une PR sans `Closes` laisse
une issue orpheline, qu'il faudra fermer à la main — le début d'un tableau qui
ment.
:::

## Critères de réussite

- [ ] la description de ma PR contient « Closes » suivi du numéro de mon issue
- [ ] l'encart Development de l'issue pointe vers la PR
- [ ] l'encart Development de la PR pointe vers l'issue
- [ ] rien n'est fusionné : l'issue est ouverte, le README de main inchangé
