Jusqu'ici, la gestion et le contenu du dépôt vivaient côte à côte sans se
toucher. Ce module les relie — c'est là que le tableau gagne son titre :
« il se met à jour tout seul ». Deux notions d'abord, juste ce qu'il faut.

## La branche : une copie de travail

Une **branche** est une copie parallèle du contenu du dépôt, où une
modification se prépare sans toucher à la version de référence (la branche
`main`). On y travaille tranquille ; `main` reste propre tant que rien n'est
intégré. C'est tout ce qu'il faut savoir — et c'est Claude qui les manipule.

## La pull request : la demande d'intégration

Une **pull request** (PR) dit : « voilà ce que ma branche change, êtes-vous
d'accord pour l'intégrer ? ». Elle montre :

- le **diff** (onglet *Files changed*) : chaque ligne ajoutée en vert,
  supprimée en rouge — la modification exacte, rien de caché ;
- un fil de discussion, comme une issue ;
- le bouton de fusion (**Merge**), qui intègre la branche dans `main`.

Même seul, la PR vaut le détour : c'est un poste de contrôle. On relit AVANT
d'intégrer — et quand l'exécutant est rapide comme Claude, ce poste de
contrôle, c'est vous.

## Une tâche réelle pour une boucle réelle

Rappel du choix posé en Bienvenue : les tâches confiées à Claude ici sont des
tâches d'**écriture**, réellement exécutées. La nôtre : le README de todo-app
décrit la V2 en deux lignes — trop maigre pour ce qui va suivre au module 6.
Voilà un vrai travail.

## À vous

L'exercice tient en trois étapes : créer la tâche, confier le travail,
relire. Le dossier `todo-app` est ouvert dans votre environnement.

1. **Créez l'issue.** Titre : « Décrire la V2 en détail dans le README ».
   Description en trois temps, comme d'habitude. Posez-lui le label
   `documentation` — un de ceux que GitHub crée d'office — et le milestone V2.
   À la main ou en le demandant à Claude, au choix. Quelques instants plus
   tard, regardez le tableau : la carte est arrivée toute seule dans Todo —
   c'est l'automatisation du module 4, déjà au travail.

2. **Confiez le travail à Claude.** En français, quelque chose comme :
   « prends l'issue [son numéro] : crée une branche, rédige la section V2 du
   README — les comptes, le partage, la synchronisation — et ouvre une pull
   request. Ne fusionne pas. » S'il propose de « finir le travail », refusez :
   la fusion viendra à la leçon suivante, et c'est votre geste.

3. **Relisez la PR, en relecteur.** Ouvrez-la dans le navigateur et passez-la
   en revue : le titre (dit-il ce que ça change ?), la description, puis
   l'onglet **Files changed** — la section nouvelle y apparaît, chaque ligne
   ajoutée en vert. C'est la modification exacte : rien de plus, rien de
   caché.

:::indice
La demande tient en une phrase : « prends l'issue N : branche, rédige la
section V2 du README, ouvre une PR — ne fusionne pas ». Vous verrez passer la
création de branche, l'écriture, puis `gh pr create --title … --body …`.
:::

:::solution
Ce qui doit exister à la fin — peu importe les mots de votre demande :

- une branche au nom parlant (par exemple `decrire-v2`) ;
- une PR ouverte, dont *Files changed* montre la section V2 ajoutée en vert
  dans `README.md`, et rien d'autre ;
- l'issue toujours **ouverte**, le README de `main` toujours **inchangé** —
  rien n'est intégré tant que vous n'avez pas fusionné.

**Pourquoi ça marche** : la branche isole le travail, la PR l'expose à la
relecture. Le pouvoir de dire oui reste entier, et c'est le vôtre.

**L'erreur fréquente** : laisser l'exécutant fusionner dans la foulée —
beaucoup d'assistants proposent de « finir le travail ». Ici, exigez la PR
ouverte : la fusion est VOTRE geste, c'est tout l'objet de la prochaine leçon.
:::

## Critères de réussite

- [ ] mon issue d'écriture existe et le tableau l'a attrapée tout seul
- [ ] une PR est ouverte, avec sa branche, et n'est pas fusionnée
- [ ] l'onglet Files changed montre la section V2 ajoutée en vert dans le README
- [ ] le README affiché sur la page du dépôt (branche main) est encore l'ancien
