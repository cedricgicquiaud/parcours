Une formation honnête finit par les limites : ce que GitHub fait mal, et les
pièges où l'on tombe même avec de bons outils. Savoir où s'arrête l'outil
évite de construire dessus ce qu'il ne portera pas.

## Ce que GitHub ne fait pas bien

- **Les dépendances entre tâches** : pas de vrai « bloqué par » — les
  sous-issues chaînent une mère et ses filles, rien de plus. Si votre projet
  vit de dépendances croisées, GitHub ne les tiendra pas.
- **La charge et le planning fin** : la Roadmap montre des périodes, pas des
  heures ni des disponibilités. Pas de diagramme de Gantt sérieux — et à 1-3
  personnes, c'est rarement une perte.
- **Le tableau n'a pas de mémoire** : les Projects ne gardent pas d'historique
  de leurs vues et champs — qui a déplacé quoi et quand se perd. Les issues,
  elles, gardent tout : la mémoire du projet vit dans leurs fils, c'est là
  qu'il faut écrire ce qui compte.
- **La recherche** : correcte sur les titres, laborieuse dans les fils. Une
  décision importante enterrée dans un commentaire se reperd — d'où l'intérêt
  des issues-décisions, comme celle du module 9.
- **Tout vit chez GitHub** : l'export existe mais brut. Le jour où l'on part,
  on emporte ses fichiers facilement, son outillage de gestion moins.

## Les pièges — l'outil n'y est pour rien

- **Le sur-processus** : dix labels, six champs, cinq vues… à deux personnes.
  Chaque rouage ajouté doit répondre à une douleur ressentie, pas à une
  possibilité offerte. Commencer petit, ajouter quand ça fait mal.
- **Le tableau-vitrine** : monté avec soin, plus regardé après trois semaines.
  Le vaccin est connu depuis le module 4 : le rendez-vous fixe. Pas de rituel,
  pas de tableau.
- **Automatiser ce qu'on ne comprend pas encore** : une automatisation posée
  trop tôt fige une façon de travailler qu'on n'a pas éprouvée. D'abord à la
  main, ensuite la règle — c'est la méthode de toute cette formation.
- **L'issue fourre-tout** : « Améliorer l'app » qui enfle de commentaires en
  commentaires. Dès qu'une issue contient trois sujets, elle se découpe.

## Constatez-le sur pièce : l'audit de votre bac à sable

Votre dépôt a assez vécu pour être audité — en juge, comme toujours. Rien à
corriger : le bac à sable se jette à la prochaine leçon. Juste constater.

1. La page **Labels** : combien n'ont aucune issue ? (le compte s'affiche par
   label — les labels d'origine GitHub jamais employés sont vos premiers
   « rouages morts »)
2. La liste des issues, filtre `no:milestone` (à taper dans la barre de
   recherche des issues) : du travail non rattaché à une étape ?
3. Le Board : des cartes qui n'ont jamais quitté Todo ? C'est le sort normal
   d'un bac à sable — sur un vrai projet, ce serait la question n° 2 du rituel.

## Critères de réussite

- [ ] j'ai compté sur la page Labels ceux qui n'ont aucune issue
- [ ] le filtre `no:milestone` m'a montré ce qui échappe aux étapes
- [ ] j'ai repéré dans mon propre bac à sable au moins un des pièges de la leçon
