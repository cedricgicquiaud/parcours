Les labels disent *de quoi parle* une tâche. Le **milestone** — le jalon — dit
*vers quoi elle avance* : c'est un paquet d'issues qui, ensemble, constituent
une étape de livraison. Pour todo-app, les étapes sont toutes trouvées : V1 et
V2.

## Ce qu'est un milestone

Un milestone regroupe des issues sous un nom (« V1 — la liste qui marche »),
avec deux options : une description et une **date d'échéance**. Sa force est
sa **barre d'avancement** : GitHub compte les issues fermées sur le total, et
le pourcentage avance tout seul à mesure que le travail se termine. C'est la
réponse à « où en est la V1 ? » — sans réunion, sans tableur.

Deux règles à retenir :

- une issue appartient à **au plus un** milestone — contrairement aux labels,
  qui se cumulent. Le label classe, le milestone destine : une tâche peut être
  « amélioration » ET « priorité haute », mais elle vise UNE étape.
- un milestone n'est pas une obligation : une issue sans milestone est
  simplement du travail pas encore rattaché à une étape.

Au passage : quand un milestone se termine, les projets publient souvent une
*release* — la version empaquetée. C'est hors du périmètre de cette
formation ; sachez seulement que le milestone en est l'antichambre.

## Où ça se passe

Sous l'onglet Issues, le bouton **Milestones** : la liste des jalons, leur
barre d'avancement, et le bouton **New milestone**. Sur une issue, la rubrique
**Milestone** de la colonne de droite fait le rattachement.

## Constatez-le sur pièce

Toujours à la main, dans votre dépôt `todo-app` :

1. Créez deux milestones : `V1 — la liste qui marche` et `V2 — les listes
   partagées` (description libre, pas de date — rien ne presse dans un bac à
   sable).
2. Rattachez vos trois issues ouvertes au milestone V1, depuis la colonne de
   droite de chacune.
3. Ouvrez la page **Milestones** : V1 affiche ses trois issues ouvertes et une
   barre à 0 % ; V2 est vide, il attend la prochaine leçon.
4. Ouvrez le milestone V1 : c'est une liste d'issues comme les autres, filtrée
   sur l'étape — le tableau de bord du pauvre, avant le vrai Project du
   module 4.

## Critères de réussite

- [ ] mes milestones V1 et V2 existent sur la page Milestones
- [ ] mes trois issues ouvertes sont rattachées à V1, visible dans leur colonne de droite
- [ ] la page Milestones affiche trois issues ouvertes et 0 % pour V1
- [ ] la page du milestone V1 liste exactement mes trois issues
