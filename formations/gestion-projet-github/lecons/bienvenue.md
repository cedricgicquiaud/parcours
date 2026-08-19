À la fin de cette formation, vous saurez piloter un projet avec GitHub :
décrire le travail en tâches, les trier, les afficher sur un tableau de bord
qui se met à jour tout seul, relier chaque tâche au code qui la réalise, et
automatiser les vérifications.

Et vous saurez le faire deux fois. À la main d'abord, pour comprendre ce qui se
passe et pouvoir juger le résultat. Puis en le faisant faire par Claude Code,
pour aller vite sans perdre la main.

GitHub — le site web où les développeurs hébergent leur code et organisent leur
travail — sert ici de bureau de projet. Nul besoin d'être développeur : la
formation vise une équipe de 1 à 3 personnes, et chaque notion est expliquée au
moment où elle sert.

## La méthode

Chaque brique passe par le même rythme, en deux temps :

1. **À la main.** Vous faites le geste vous-même, dans votre navigateur, pour
   voir ce que GitHub fait — et savoir reconnaître un résultat correct.
2. **Par Claude Code.** Vous demandez le même geste à Claude Code, qui pilote
   GitHub avec `gh` — l'outil en ligne de commande officiel de GitHub, qui fait
   depuis le terminal tout ce que le site fait à la souris.

Le point d'orgue arrive au module 6 : partir d'un projet vide et obtenir un
backlog — la liste structurée de tout le travail à faire — généré par Claude
Code depuis une simple description du projet.

Une leçon se termine toujours par ses critères de réussite : des faits que vous
constatez vous-même, jamais des questions de quiz. Parcours n'exécute rien et
ne corrige rien — c'est vous qui observez le résultat, et qui cochez.

## Le fil rouge : une todo-list qu'on n'écrira jamais

Tous les exercices se font sur un projet fictif : **todo-app**, une petite
application de liste de tâches. Sa version 1 : une liste qui marche (ajouter,
cocher, supprimer, sauvegarder). Sa version 2 : des listes partagées à
plusieurs, avec des comptes. Un ami développeur rejoindra le projet vers la fin
de la formation.

:::attention
La todo-app est un prétexte : **l'application ne sera jamais développée**. Le
dépôt, lui, sera bien créé et très vivant — mais comme un classeur de
chantier : rempli de tâches, d'étiquettes, de jalons et d'un tableau, pas de
programme. Décrire un travail et le suivre, c'est la compétence qu'on apprend
ici ; le réaliser serait de la programmation, une autre formation.

Quand une modification du dépôt sera nécessaire pour voir la boucle complète
tourner — à partir du module 5 —, ce sera une tâche d'écriture (compléter la
page de présentation, par exemple), réellement réalisée de bout en bout :
l'issue créée, le texte écrit, la fermeture automatique constatée. Jamais du
code applicatif. Et à la dernière leçon, le bac à sable sera jeté.
:::

Cette formation n'enseigne pas non plus git en profondeur (l'outil d'historique
du code) : on utilisera une branche et une pull request au module 5, en
expliquant juste ce qu'il faut. La raison est simple : dans le mode de travail
visé, c'est Claude Code qui manipule git — nous, on juge le résultat sur
GitHub, et c'est exactement ce que la formation entraîne.

## Vérifiez votre équipement

Le terrain de toute la formation : votre navigateur et votre terminal. Trois
vérifications, à faire maintenant.

1. **Le compte** : ouvrez [github.com](https://github.com) et connectez-vous.
2. **L'outil `gh`** : dans un terminal, tapez `gh --version`. Une ligne avec un
   numéro de version doit s'afficher.
3. **La connexion de `gh`** : tapez `gh auth status`. Votre nom de compte doit
   apparaître, avec la mention « Logged in ».

:::indice Si `gh` manque ou n'est pas connecté
Sur Mac, `gh` s'installe avec `brew install gh` (Homebrew est le gestionnaire
qui installe les outils du terminal sur Mac). La connexion se fait avec
`gh auth login` : répondez « GitHub.com », puis « Login with a web browser »,
et recopiez le code affiché. En cas de doute, demandez à Claude Code de vous
guider — c'est exactement son rôle dans cette formation.
:::

## Critères de réussite

- [ ] je me suis connecté à github.com dans mon navigateur
- [ ] `gh --version` a affiché un numéro de version dans mon terminal
- [ ] `gh auth status` a affiché mon compte, connecté
- [ ] j'ai retrouvé dans cette leçon pourquoi le dépôt peut vivre sans que l'application existe
