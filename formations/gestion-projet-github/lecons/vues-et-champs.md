Un tableau, ce n'est qu'une façon de regarder. Le Project en propose
plusieurs : la même liste d'items, vue en colonnes, en tableau, ou en frise.
Et pour trier ce qu'on regarde, il a ses propres **champs**.

## Les vues : une liste, plusieurs regards

En haut du Project, chaque onglet est une **vue** enregistrée :

- **Board** : les colonnes par statut — le regard « qu'est-ce qui est où ? » ;
- **Table** : une ligne par item, une colonne par champ — le regard
  inventaire, pratique pour éditer en série ;
- **Roadmap** : la frise dans le temps — on la garde pour la prochaine leçon.

Une vue retient son réglage : groupement, tri, filtres. On crée une vue par
question qu'on se pose souvent, et on lui donne le nom de la question.

## Les champs : les colonnes de VOTRE tableau

**Status** est un champ fourni. Vous pouvez en créer d'autres — le plus utile
au quotidien : une **Priorité** (champ à choix unique : `Haute`, `Normale`).

Nuance qui évite une confusion : un champ de Project n'existe **que dans le
Project** ; un label vit **dans le dépôt**. Le label `priorité haute` du
module 3 et un champ Priorité peuvent coexister — dans un petit projet,
choisissez UN des deux et tenez-vous-y ; ici, on essaie le champ, pour
apprendre les deux mécanismes.

## Constatez-le sur pièce

Dans votre Project `todo-app` :

1. Ajoutez une vue **Table** (le `+` à côté des onglets de vues) et
   renommez-la « Inventaire ».
2. Dans cette table, créez le champ **Priorité** (bouton `+` en bout de
   colonnes → New field → choix unique, options `Haute` et `Normale`).
3. Donnez une priorité à chaque item : `Haute` pour « Barrer visuellement… »
   et « Créer un compte », `Normale` pour le reste.
4. Revenez au Board : groupez-le par Priorité (le menu de la vue → Group by).
   Deux rangées apparaissent. Puis remettez le groupement sur Status — le
   tableau redevient le Kanban.

## Critères de réussite

- [ ] ma vue « Inventaire » existe à côté du Board
- [ ] le champ Priorité propose Haute et Normale
- [ ] chacun des cinq items a une priorité
- [ ] j'ai groupé le Board par Priorité, puis suis revenu au groupement par Status
