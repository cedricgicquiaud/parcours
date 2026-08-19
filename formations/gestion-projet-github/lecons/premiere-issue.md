La V1 de todo-app imagine une liste où l'on coche les tâches faites. Première
amélioration venue à l'esprit : qu'une tâche cochée se barre visuellement, pour
que l'œil distingue le fait du restant. C'est un travail parfait pour votre
première issue — petit, clair, vérifiable.

Rappel du moule, vu à la leçon précédente : un titre qui nomme le résultat, une
description en trois temps (le problème, l'action, « Terminé quand » en cases à
cocher).

## À vous

Créez, dans votre dépôt `todo-app`, l'issue de cette amélioration. L'objectif :

- le titre nomme le résultat attendu ;
- la description suit les trois temps, avec un sous-titre par temps ;
- « Terminé quand » contient au moins deux cases à cocher.

Peu importe que l'application n'existe pas : on décrit le travail comme s'il
allait être fait — c'est tout l'exercice du chef de projet.

:::indice
Le point de départ est le bouton vert **New issue** de l'onglet Issues.
Écrivez les trois temps comme trois petits sous-titres suivis de leur contenu,
et gardez l'onglet **Preview** ouvert dans un coin de votre tête : vérifiez le
rendu avant de valider. Le bouton de création est en bas du formulaire.
:::

:::indice
La syntaxe Markdown utile : `## Problème` fait un sous-titre, une ligne vide
sépare les blocs, `- [ ]` (tiret, espace, crochets avec un espace dedans)
dessine une case à cocher. Le bouton **Create** (ou « Submit new issue »)
enregistre l'issue et lui attribue son numéro.
:::

:::solution
Un exemple complet — le vôtre peut différer, seuls le moule et la vérifiabilité
comptent :

Titre : `Barrer visuellement les tâches cochées`

```markdown
## Problème
Une tâche cochée reste affichée comme les autres : l'œil ne distingue pas
ce qui est fait de ce qui reste à faire.

## Action
Barrer le texte des tâches cochées, et l'atténuer légèrement.

## Terminé quand
- [ ] une tâche cochée s'affiche barrée
- [ ] décocher la tâche retire le barré
```

**Pourquoi ça marche** : le titre seul permet de répondre « fait / pas fait » ;
les trois temps donnent au lecteur le contexte (pourquoi), la décision (quoi)
et le contrat de sortie (comment on saura). N'importe qui — un collègue, ou
Claude Code au module 5 — peut prendre cette fiche et travailler sans poser de
question.

**L'erreur fréquente** : mettre les critères dans le titre (« Barrer les
tâches cochées et atténuer et gérer le décochage ») ou écrire un titre-thème
(« Améliorer l'affichage des tâches »). Un seul résultat au titre ; le détail
vérifiable vit dans « Terminé quand ».
:::

## Après la création : regardez ce que GitHub a fabriqué

L'issue a reçu un **numéro** (#1 si c'est la première) : c'est son nom court,
on la citera partout ainsi. Sous la description commence le **fil
d'activité** : chaque événement — création, commentaire, fermeture — s'y
empilera, horodaté. Et les cases de « Terminé quand » sont cliquables
directement dans la page : GitHub retient leur état.

## Critères de réussite

- [ ] mon issue existe, avec son numéro et le badge vert « Open »
- [ ] sa description affiche mes deux cases à cocher, cliquables
- [ ] j'ai coché puis décoché une case : GitHub a retenu l'état à chaque fois
- [ ] la liste des issues affiche « 0 of 2 » (ou l'état de mes cases) sous le titre
