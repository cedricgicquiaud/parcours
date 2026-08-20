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

1. Ouvrez **Workflows** et activez : **Auto-add to project** (sur votre dépôt,
   filtre `is:issue` proposé par défaut — peut-être déjà actif si vous avez
   importé les issues à la création du projet : constatez, c'est tout),
   **Item added** → statut `Todo`, et **Item closed** → statut `Done`.
2. Le déclencheur fiable est la **création**. Créez une issue jetable,
   « Essai des automatisations » (une ligne de description suffit), et suivez
   son arrivée : d'abord la rubrique **Projects** de sa colonne de droite (dès
   qu'elle nomme votre projet, c'est fait), puis la carte au tableau. Patience
   possible : ces règles tournent en tâche de fond chez GitHub, l'effet suit
   le geste de quelques minutes parfois — et une carte arrivée sans statut se
   cache dans la colonne **No Status**, en bout de tableau.
3. **Fermez-la**. Sa carte file dans **Done** — sans que vous ayez touché au
   tableau (même délai possible).
4. Vos issues de travail, elles, n'ont pas bougé de Todo : les règles ne
   déplacent que ce qui change d'état.

:::attention
Constat de recette réelle : **rouvrir** une issue fermée ne déclenche pas
« Auto-add » — la règle guette les créations et les modifications, pas la
réouverture. Si une issue rouverte manque un jour au tableau, ajoutez-la à la
main : la rubrique Projects de sa colonne de droite fait très bien le geste.
:::

## Critères de réussite

- [ ] la page Workflows montre Auto-add, Item added et Item closed activés
- [ ] ma nouvelle issue d'essai est apparue au tableau sans aucun geste de ma part
- [ ] fermée, sa carte est passée dans Done toute seule
- [ ] mes issues de travail n'ont pas bougé de Todo
