Vos cinq issues sont écrites, triées, jalonnées — mais pour les voir, il faut
encore ouvrir des listes. Le **Project** les met sur un mur : le tableau
Kanban, où chaque tâche est une carte dans une colonne, et où l'état du projet
se lit en une seconde.

## Ce qu'est un Project

Un Project est un tableau de bord **transversal** : il vit au niveau de votre
compte, pas dans un dépôt — il peut donc agréger les issues de plusieurs
dépôts. On le **lie** à un dépôt pour le retrouver dans son onglet
**Projects**.

Ses cartes sont des « items » : le plus souvent des issues (la carte et
l'issue sont la même chose, vues de deux endroits), parfois des brouillons de
texte. Chaque item porte un champ **Status** — les colonnes du tableau :
`Todo`, `In Progress`, `Done` par défaut.

Le tableau ne remplace ni les labels ni les milestones : il les **affiche**.
Le label classe, le milestone date, le Project montre — chacun son verbe.

## Constatez-le sur pièce

À la main — le tableau se comprend avec les doigts :

1. Dans votre dépôt `todo-app`, ouvrez l'onglet **Projects**, puis créez un
   nouveau projet (selon l'écran, le bouton propose de lier un projet existant
   ou d'en créer un : créez). Choisissez le modèle **Board** et nommez-le
   `todo-app`.
2. Ajoutez vos issues : en bas d'une colonne, le bouton **+ Add item** ouvre
   une recherche — tapez `#` pour voir les issues du dépôt, et ajoutez les
   **cinq** ouvertes.
3. Posez toutes les cartes dans la colonne **Todo** (une carte ajoutée arrive
   parfois sans statut : glissez-la, ou choisissez le statut sur la carte).
4. Retournez dans l'onglet Projects du dépôt : votre tableau y est listé —
   c'est le lien dépôt ↔ projet.

Au passage : `gh` sait aussi piloter les Projects (`gh project`), mais cela
demande une autorisation supplémentaire (`gh auth refresh -s project`). Le
navigateur suffit pour tout ce module ; on ne délègue que ce qu'on a compris.

## Critères de réussite

- [ ] mon Project `todo-app` existe, en vue Board
- [ ] il apparaît dans l'onglet Projects de mon dépôt
- [ ] mes cinq issues ouvertes y sont, toutes dans la colonne Todo
- [ ] l'issue d'essai fermée du module 2 n'y figure pas
