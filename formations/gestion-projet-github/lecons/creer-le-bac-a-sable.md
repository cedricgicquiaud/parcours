Un bac à sable est un projet jetable, fait pour essayer sans conséquence. Dans
cette leçon, vous créez le vôtre : le dépôt `todo-app`, qui servira à tous les
exercices de la formation.

## Pourquoi un bac à sable

Vous allez créer des tâches, des étiquettes, des jalons, un tableau — puis
laisser Claude Code en générer en masse. Faire ça sur un vrai projet en
polluerait l'historique pour toujours. Le bac à sable donne le droit à
l'erreur : tout ce qui s'y passe est sans importance, et il sera jeté à la
dernière leçon.

Il sera **privé** : sur GitHub, un dépôt privé n'est visible que de son
propriétaire (et des personnes qu'il invite — ce sera le module 9). Personne ne
verra vos essais.

## Ce que sera todo-app — sur le papier seulement

Le dépôt a besoin d'une page d'accueil qui dise où va le projet : c'est le rôle
du fichier `README.md`, que GitHub affiche automatiquement sur la page du
dépôt. Le nôtre décrira les deux versions imaginées :

- **V1 — la liste qui marche** : ajouter une tâche, la cocher, la supprimer,
  retrouver sa liste en revenant.
- **V2 — les listes partagées** : des comptes, le partage d'une liste à
  plusieurs, la synchronisation.

Ces deux versions ne seront jamais programmées — mais elles vont nourrir tous
les modules : les tâches de la V1 deviendront des issues, « V1 » et « V2 »
deviendront des milestones, et la V2 fournira le backlog du module 6.

## Le dépôt vit en deux exemplaires

Un dépôt a une version de référence sur github.com — le dépôt **distant** — et
peut avoir une copie sur votre machine : le **clone**. C'est cette copie
locale que votre environnement de travail ouvre (Visual Studio Code, CMux…),
et c'est dedans que Claude Code travaille. Les deux exemplaires se
synchronisent ; les allers-retours, c'est Claude qui les gérera.

C'est la façon normale de travailler avec un IDE : le dossier du projet
ouvert, Claude dedans, et github.com comme référence que le navigateur permet
de consulter.

## À vous

Créez le dépôt du bac à sable, en deux exemplaires. L'objectif :

- un dépôt nommé `todo-app`, sur votre compte ;
- **privé** ;
- avec un `README.md` qui décrit la V1 et la V2 ;
- et sa copie locale (le clone) ouverte dans votre environnement de travail.

Le texte du README, à reprendre tel quel :

```markdown
# todo-app

Bac à sable de la formation « Gestion de projet avec GitHub ».
Application fictive : elle ne sera jamais développée.

## V1 — la liste qui marche
Ajouter une tâche, la cocher, la supprimer, retrouver sa liste en revenant.

## V2 — les listes partagées
Des comptes, le partage d'une liste à plusieurs, la synchronisation.
```

:::indice
Le chemin le plus direct : placez-vous (ou ouvrez votre environnement) dans le
dossier où vous rangez vos projets, et décrivez à Claude Code le dépôt voulu —
son nom, privé, un README avec le texte ci-dessus, et une copie locale ici.
Laissez-le faire, regardez passer les commandes, puis ouvrez le dossier
`todo-app` dans votre environnement. Le chemin manuel existe aussi : le bouton
**New** sur github.com, puis un clone — mais c'est plus de gestes pour le même
résultat.
:::

:::indice
Ce que vous verrez passer :
`gh repo create todo-app --private --add-readme --clone` — `--private` rend le
dépôt privé, `--add-readme` y met un README de départ, `--clone` en télécharge
aussitôt la copie locale, dans un dossier `todo-app` créé là où la commande
tourne. Pour le texte du README, demandez à Claude de l'y écrire et de le
publier — c'est lui qui gère les allers-retours entre la copie locale et
github.com.
:::

:::solution
Ce que Claude lance (ou que vous pouvez taper vous-même), depuis le dossier de
vos projets :

```bash
# créer le dépôt distant privé, avec un README, et sa copie locale
gh repo create todo-app --private --add-readme --clone

# ouvrir la page du dépôt distant dans le navigateur
gh repo view todo-app --web
```

Puis : « écris ce texte dans le README et publie-le » (avec le texte donné plus
haut) — Claude modifie le fichier local et pousse la modification vers
github.com. Rechargez la page du dépôt : le README affiche la V1 et la V2.
Enfin, ouvrez le dossier `todo-app` dans votre environnement de travail.

**Pourquoi ça marche** : `gh` parle à GitHub avec votre compte déjà connecté
(vérifié à la leçon Bienvenue). Une commande crée le dépôt de référence chez
GitHub et sa copie locale d'un coup ; ensuite, tout ce qui s'écrit localement
se publie vers github.com — et le navigateur reste votre poste d'observation.

**L'erreur fréquente** : « Name already exists on this account » — un dépôt
`todo-app` existe déjà, par exemple créé lors d'un essai précédent. S'il est
vide ou quasi vide, réutilisez-le : demandez alors juste son clone
(`gh repo clone votre-compte/todo-app`) au lieu d'en créer un deuxième, et
vérifiez qu'il est bien privé (badge « Private » à côté du nom).
:::

## Critères de réussite

- [ ] mon dépôt `todo-app` existe et porte le badge « Private » à côté de son nom
- [ ] son `README.md` décrit la V1 et la V2 sur la page d'accueil du dépôt
- [ ] le dossier `todo-app` (la copie locale) est ouvert dans mon environnement de travail
- [ ] l'onglet Issues de mon dépôt est vide — le bac à sable est prêt pour le module suivant
