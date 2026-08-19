Trois façons d'obtenir une formation. Toutes demandent l'édition allumée.

## 1. La créer depuis l'application

« Nouvelle formation », sur le catalogue. Vous saisissez un titre, des modules,
des leçons ; Parcours crée le dossier, le manifeste et les fichiers markdown,
chacun avec une amorce « reste à écrire ».

L'identifiant se remplit tout seul à partir du titre. Dès que vous le corrigez à
la main, il cesse de suivre le titre : votre choix l'emporte.

:::attention
Un titre sans lettre ni chiffre — « ??? » — ne permet de dériver aucun
identifiant. Parcours le dit plutôt que d'inventer.
:::

Deux leçons au même titre reçoivent deux identifiants distincts (`intro`,
`intro-2`) : jamais de collision silencieuse. Et un identifiant de formation
déjà pris est refusé — rien n'est écrasé.

## 2. Déposer un dossier

Glissez le **dossier** de la formation sur la zone pointillée du catalogue, ou
passez par « Choisir un dossier ». Son nom donne le titre et l'identifiant.

Déposer des fichiers `.md` en vrac ne marche pas : Parcours demande le dossier
lui-même, parce que c'est lui qui porte le nom.

**S'il contient un `formation.json` valide**, il est repris tel quel : vos
titres, votre ordre, vos identifiants de leçons. Seul le champ `id` est réaligné
sur le nom du dossier d'accueil.

**Sinon**, Parcours construit un sommaire à partir de ce qu'il trouve :

| Ce qu'il trouve | Ce qu'il en fait |
| --- | --- |
| Des `.md` dans plusieurs sous-dossiers | Un module par sous-dossier, nommé d'après lui |
| Des `.md` tous au même endroit | Un module unique, « Contenu » |
| `02-le-feu.md`, `10-le-sel.md` | Ordre numérique : 2 avant 10 |
| Un `# Titre` en tête de fichier | Le titre de la leçon |
| Pas de titre de niveau 1 | Le nom du fichier, nettoyé |

Un `formation.json` présent mais cassé n'est jamais contourné en douce :
Parcours affiche l'erreur exacte et **demande** s'il doit déduire le sommaire à
la place.

Ce qui est refusé : un dépôt sans aucun `.md`, un chemin qui sort du dossier,
plus de 500 fichiers, plus de 25 Mo, un markdown de plus de 2 Mo. Les fichiers
système (`.DS_Store`, `__MACOSX/`) sont écartés et comptés dans le message.

:::astuce
Un import refusé ne laisse rien derrière lui : ni dossier à moitié écrit, ni
`.import-…` résiduel.
:::

## 3. À la main, ou avec Claude Code

Vous écrivez le dossier vous-même. La formation apparaît au rechargement du
catalogue, sans redémarrer le serveur. C'est la voie la plus directe quand vous
générez du contenu avec un assistant.

## Constatez-le sur pièce

Fabriquez d'abord un dossier d'essai, hors de `formations/` — par exemple sur
le Bureau. Dans un terminal, ces trois lignes créent un dossier `essai-import`
avec un sous-dossier et deux leçons, sans manifeste :

```bash
mkdir -p ~/Desktop/essai-import/module-un
echo "# La première leçon" > ~/Desktop/essai-import/module-un/01-premiere.md
echo "# La seconde leçon" > ~/Desktop/essai-import/module-un/02-seconde.md
```

Puis, l'édition allumée, sur le catalogue :

1. **Le dépôt qui marche.** Glissez le dossier `essai-import` entier sur la
   zone pointillée. Sans manifeste, Parcours déduit le sommaire — le message
   vous le dit — et la formation apparaît, un module « Module un », deux
   leçons dans l'ordre des numéros.
2. **Le vrac refusé.** Ouvrez maintenant le dossier et glissez les deux
   fichiers `.md` eux-mêmes (pas le dossier) : Parcours demande le dossier,
   parce que c'est lui qui porte le nom.
3. **Le refus qui ne laisse rien.** Fabriquez un dossier sans aucun `.md`
   (`mkdir ~/Desktop/sans-md` puis `echo bonjour > ~/Desktop/sans-md/notes.txt`)
   et déposez-le : refusé, avec la raison. Vérifiez ensuite dans le terminal
   que `ls formations/` ne montre aucun dossier ni fichier résiduel.

Gardez la formation `essai-import` importée : la leçon suivante s'en servira
pour archiver, jeter et restaurer sans toucher à vos vraies formations.

## Critères de réussite

- [ ] j'ai créé une formation depuis « Nouvelle formation » : elle apparaît au catalogue
- [ ] j'ai vérifié sur le disque que son dossier, son `formation.json` et ses fichiers markdown existent
- [ ] j'ai retenté avec le même identifiant : refusé, message « le dossier existe déjà », rien d'écrasé
- [ ] j'ai déposé un dossier de `.md` sans manifeste : le sommaire a été déduit, et le message me le dit
- [ ] j'ai déposé des fichiers `.md` en vrac : Parcours me demande le dossier lui-même
- [ ] après un import refusé, `ls formations/` ne montre aucun dossier résiduel
