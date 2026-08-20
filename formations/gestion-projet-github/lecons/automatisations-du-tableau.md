Un tableau qu'on doit tenir à jour à la main finit toujours par mentir :
un jour pressé, on oublie une carte, et plus personne ne lui fait confiance.
Le Project a des **workflows** intégrés — des règles qui déplacent les cartes
à votre place.

## Les règles toutes prêtes

Dans le Project, le menu `⋯` (en haut à droite) → **Workflows** liste les
règles disponibles. Chacune s'active d'un interrupteur. Les quatre qui
comptent :

| Règle | Effet |
| --- | --- |
| Auto-add to project | toute nouvelle issue du dépôt entre seule au tableau |
| Item added to project | une carte qui arrive reçoit un statut (Todo) |
| Item closed | une issue fermée file dans Done |
| Pull request merged | une PR fusionnée file dans Done |

C'est la moitié de la promesse « le tableau dit vrai sans saisie ». L'autre
moitié — *pourquoi* l'issue se ferme toute seule quand le travail est
intégré — arrive au module 5, avec « Closes #N ». Les deux mises bout à bout :
plus personne ne déplace de carte, jamais.

## Constatez-le sur pièce

Votre cobaye : l'issue d'essai du module 2, fermée depuis. Elle va servir une
dernière fois.

1. Ouvrez **Workflows** et activez : **Auto-add to project** (sur votre dépôt,
   filtre `is:issue` proposé par défaut — peut-être déjà actif si vous avez
   importé les issues à la création du projet : constatez, c'est tout),
   **Item added** → statut `Todo`, et **Item closed** → statut `Done`.
2. **Rouvrez** l'issue d'essai (onglet Closed de la liste des issues →
   Reopen). Retournez au tableau : elle est entrée **toute seule**, dans Todo.
3. **Refermez-la**. Sa carte file dans **Done** — sans que vous ayez touché au
   tableau.
4. Vos cinq vraies issues, elles, n'ont pas bougé de Todo : les règles ne
   déplacent que ce qui change d'état.

## Critères de réussite

- [ ] la page Workflows montre Auto-add, Item added et Item closed activés
- [ ] l'issue d'essai rouverte est apparue au tableau sans aucun geste de ma part
- [ ] refermée, sa carte est passée dans Done toute seule
- [ ] mes cinq issues sont toujours dans Todo
