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

## À vous

Créez le dépôt du bac à sable. L'objectif :

- un dépôt nommé `todo-app`, sur votre compte ;
- **privé** ;
- avec un `README.md` qui décrit la V1 et la V2.

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
Deux chemins mènent au même dépôt : le bouton **New** (en haut à gauche sur
github.com, à côté de la liste de vos dépôts), ou une demande à Claude Code —
décrivez le dépôt voulu (son nom, privé, avec un README) et laissez-le faire.
Dans les deux cas, le plus simple est de créer le README en même temps que le
dépôt, puis de le modifier depuis la page du dépôt — l'icône crayon, en haut à
droite du README.
:::

:::indice
Ce que vous verrez passer si Claude s'en charge (ou ce que vous pouvez taper
vous-même) : `gh repo create todo-app --private --add-readme` — l'option
`--private` rend le dépôt privé, `--add-readme` y met un README de départ.
Puis `gh repo view todo-app --web` ouvre la page du dépôt dans votre
navigateur ; l'icône crayon sur le README permet d'y coller le texte, et le
bouton vert **Commit changes** enregistre.
:::

:::solution
Que vous les tapiez ou que Claude les lance pour vous, les commandes sont :

```bash
# créer le dépôt privé, avec un README de départ
gh repo create todo-app --private --add-readme

# ouvrir sa page dans le navigateur
gh repo view todo-app --web
```

Sur la page du dépôt : cliquer l'icône crayon du README, remplacer son contenu
par le texte donné plus haut, puis **Commit changes** (deux fois : le bouton
ouvre un petit panneau de confirmation).

**Pourquoi ça marche** : `gh` parle à GitHub avec votre compte déjà connecté
(vérifié à la leçon Bienvenue). Une seule commande crée donc le dépôt à
distance, exactement comme le formulaire « New » du site — les deux chemins
produisent le même résultat, et c'est le fil conducteur de toute la formation.

**L'erreur fréquente** : « Name already exists on this account » — un dépôt
`todo-app` existe déjà, par exemple créé lors d'un essai précédent. S'il est
vide ou quasi vide, réutilisez-le tel quel (vérifiez juste qu'il est bien
privé, badge « Private » à côté du nom) ; inutile d'en créer un deuxième.
:::

## Critères de réussite

- [ ] mon dépôt `todo-app` existe et porte le badge « Private » à côté de son nom
- [ ] son `README.md` décrit la V1 et la V2 sur la page d'accueil du dépôt
- [ ] j'ai vu `gh repo view todo-app` confirmer l'existence du dépôt
- [ ] l'onglet Issues de mon dépôt est vide — le bac à sable est prêt pour le module suivant
