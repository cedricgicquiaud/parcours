Deux écrans d'écriture, deux promesses tenues : la structure ne touche jamais au
texte, et le texte ne s'écrase jamais tout seul.

## Modifier la structure

Depuis la fiche d'une formation, édition allumée. Vous renommez les titres,
réordonnez les modules et les leçons avec les flèches, ajoutez, retirez.

Ce que cet écran **ne fait jamais** :

- il ne touche pas au texte de vos leçons ;
- il ne supprime aucun fichier — retirer une leçon du sommaire la sort du
  programme, son markdown reste sur le disque ;
- il ne change pas les identifiants existants, donc les coches suivent les
  renommages.

Ajouter une leçon crée son fichier, et lui seul. Les autres gardent leur contenu
au caractère près — comme les champs de la fiche : couverture, objectifs,
prérequis et durées survivent à toute modification de structure. Même un champ
que vous auriez inventé vous-même dans `formation.json` est conservé.

## Modifier une leçon

Depuis la leçon, édition allumée : « Modifier cette leçon ». Le markdown à
gauche, l'aperçu rendu par le serveur à droite, qui suit après un court instant.

- `Cmd + S` (ou `Ctrl + S`) enregistre sans passer par le bouton.
- « Enregistrer » reste grisé tant que rien n'a changé.
- Fermer avec des modifications non enregistrées demande confirmation. Recharger
  l'onglet aussi : le navigateur vous prévient.
- Dans l'aperçu, les cases à cocher sont grisées : on y regarde le rendu, on n'y
  suit pas sa progression.

:::attention
**Le garde-fou principal.** Si le fichier a changé sur le disque pendant que
vous l'éditiez — un autre éditeur, un autre onglet, un script —, l'enregistrement
est **refusé** plutôt que d'écraser l'autre version. Parcours propose alors de
recharger le fichier depuis le disque.
:::

Un mot ajouté et enregistré devient cherchable aussitôt : l'index se rafraîchit
sans redémarrage.

## Critères de réussite

- [ ] j'ai écrit du texte dans une leçon, puis renommé son titre depuis la structure : le texte est intact
- [ ] j'ai renommé le titre d'une leçon cochée : la coche est conservée, aucun bandeau d'orphelines
- [ ] j'ai retiré une leçon de la structure : elle a quitté le sommaire, son fichier est toujours sur le disque
- [ ] j'ai modifié le fichier dans un éditeur externe pendant l'édition, puis enregistré : conflit signalé, fichier non écrasé
- [ ] j'ai enregistré avec `Cmd + S`, puis fermé : la leçon à jour s'affiche immédiatement
- [ ] j'ai écrit un mot nouveau, enregistré, puis cherché ce mot : il est trouvé
