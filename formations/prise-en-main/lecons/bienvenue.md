Parcours affiche des formations écrites en markdown comme un site de cours :
un catalogue, une fiche de présentation, un sommaire, des leçons, et une
progression qui se souvient d'où vous en étiez.

Vous êtes en train de lire une formation Parcours. Ses fichiers sont dans
`formations/prise-en-main/` : à tout moment, vous pouvez les ouvrir dans un
éditeur pour voir ce qui produit ce que vous lisez.

## Ce que Parcours fait

- Il **lit** les dossiers de `formations/` et les rend consultables.
- Il **rend** le markdown côté serveur, assaini, et sert le résultat à l'écran.
- Il **retient** votre progression dans une base locale, à part de vos contenus.
- Il **écrit** vos formations quand vous le lui demandez explicitement — jamais
  autrement, et jamais sans que le geste vienne de vous.

## Ce que Parcours ne fait pas

- Il n'exécute **jamais** de code, et ne corrige jamais un exercice. Les
  exercices pratiques se font dehors, dans un vrai terminal.
- Il ne supprime **jamais** un fichier. Ce qu'on jette est déplacé, pas effacé.
- Il n'envoie rien sur Internet. Une seule exception, désactivée par défaut :
  l'envoi de courriels, si vous le configurez — voir [L'adresse e-mail et les
  envois](lecon:courriel).

## Comment cette formation fonctionne

Chaque leçon se termine par des **critères de réussite** : des cases à cocher.
Ce ne sont pas des questions de cours, ce sont des gestes à faire dans
l'application. Cocher tous les critères de cette formation, c'est avoir vérifié
Parcours de bout en bout — c'est sa recette.

:::astuce
Rien n'est verrouillé : aucune leçon n'attend que la précédente soit terminée.
Vous pouvez sauter, revenir, relire.
:::

## Critères de réussite

- [ ] j'ai ouvert cette leçon depuis le bouton « Commencer » ou « Reprendre » de la fiche
- [ ] j'ai coché ce critère, et le décompte sous le titre est passé à 1
- [ ] j'ai rechargé la page : le décompte est toujours là
- [ ] j'ai ouvert `formations/prise-en-main/lecons/bienvenue.md` dans un éditeur et retrouvé ce texte

Continuez avec [Se repérer dans l'écran](lecon:se-reperer).
