Votre moule — problème, action, « Terminé quand » — vit pour l'instant dans
votre tête et dans vos demandes à Claude. Le jour où quelqu'un d'autre crée
une issue, il n'en sait rien : retour aux fiches d'une ligne. La parade :
inscrire le moule **dans le dépôt lui-même**, avec les formulaires d'issues.

## Le formulaire d'issue

Un dépôt peut définir des **modèles** : au clic sur « New issue », GitHub
propose alors de choisir un type (Bug, Tâche, Question…), et chaque type
ouvre un **formulaire** — des champs guidés, dont certains obligatoires,
à la place de la grande zone de texte libre.

L'effet : plus personne ne PEUT créer une fiche vide. Le moule n'est plus une
bonne pratique qu'on rappelle, c'est le chemin imposé par l'outil. C'est toute
la différence entre une consigne et un garde-fou.

Techniquement, ces formulaires sont des fichiers dans le dépôt, sous
`.github/ISSUE_TEMPLATE/` — un fichier YAML par modèle (YAML : un format de
configuration qui se lit presque comme une liste à puces). Conséquence
importante : le gabarit se livre **comme n'importe quel changement** — issue,
branche, PR. Ce sera la prochaine leçon.

## Constatez-le sur pièce

Retour chez un grand : [github.com/microsoft/vscode](https://github.com/microsoft/vscode),
qui reçoit des centaines d'issues par semaine et ne survivrait pas sans
gabarits.

1. Onglet **Issues** → **New issue** : au lieu d'un formulaire vide, l'écran
   de choix des modèles (bug, demande de fonctionnalité…).
2. Ouvrez-en un : repérez les champs guidés, et les obligatoires (marqués
   d'un astérisque). Ne soumettez rien.
3. Retrouvez la source : onglet **Code** du dépôt, dossier `.github`, puis
   `ISSUE_TEMPLATE` — les fichiers qui fabriquent l'écran que vous venez de
   voir.

## Critères de réussite

- [ ] « New issue » sur vscode m'a montré l'écran de choix des modèles
- [ ] j'ai ouvert un formulaire et repéré ses champs obligatoires
- [ ] j'ai quitté sans rien soumettre
- [ ] j'ai retrouvé le dossier `.github/ISSUE_TEMPLATE` dans les fichiers du dépôt
