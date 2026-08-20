Le Board dit ce qui est en cours ; il ne dit pas **quand**. Pour piloter dans
le temps — cette semaine, la suivante, le mois prochain — le Project offre les
itérations, la vue Roadmap… et surtout un rituel qui ne coûte que dix minutes.

## L'itération : découper le temps

Une **itération** est un champ d'un type spécial : au lieu d'options fixes, il
découpe le calendrier en périodes égales (une ou deux semaines). Chaque item
posé sur une itération dit : « prévu pour cette période-là ». C'est le
« sprint » des méthodes agiles, sans la liturgie : juste des cases de
calendrier.

À 1-3 personnes, la question de la semaine n'est pas « tout ce qu'il reste »
mais « qu'est-ce qu'on prend MAINTENANT ? ». L'itération y répond, et impose
sa discipline : peu d'items par période — mieux vaut finir trois tâches que
commencer huit.

## Itération ou milestone ? Les deux, ce n'est pas pareil

Ils se ressemblent assez pour qu'on les confonde — la différence tient en une
question chacun :

- le **milestone** répond à « **vers quoi** ce travail avance-t-il ? ». C'est
  une destination : la V1 est finie quand son contenu est fini, qu'importe le
  temps que ça prend. Si le travail déborde, le milestone attend.
- l'**itération** répond à « **quand** s'en occupe-t-on ? ». C'est une case de
  calendrier : la quinzaine se termine à sa date, quoi qu'il arrive. Si le
  travail déborde, il glisse à la case suivante.

Une même issue porte donc les deux sans doublon : elle **vise** la V1 et elle
est **prise** cette quinzaine. La redondance n'apparaît que si l'on détourne
l'un des deux — des milestones nommés « Sprint 1 », « Sprint 2 » sont des
itérations déguisées : là, choisissez. Et si le rythme d'itérations ne prend
pas chez vous, les milestones seuls font une vie très honorable.

## La roadmap : la frise

La vue **Roadmap** étale les items sur une frise chronologique, alignés sur
leurs itérations (ou des champs de dates). D'un regard : ce qui est prévu tôt,
tard, pas encore placé. C'est la vue à montrer quand quelqu'un demande « où va
le projet ? ».

## Le rituel : le tableau ne sert que si on le regarde

Le meilleur outillage meurt sans rendez-vous. Le vaccin tient en une ligne :
**un créneau fixe, court, chaque semaine** (lundi, 10 minutes), devant le
tableau, avec trois questions :

1. Qu'est-ce qui s'est terminé ? (vider Done du regard, apprécier)
2. Qu'est-ce qui est bloqué ? (une carte qui n'a pas bougé en deux revues a un
   problème à nommer)
3. Qu'est-ce qu'on prend cette itération ? (et qu'est-ce qu'on ne prend PAS)

## Constatez-le sur pièce

Dans votre Project :

1. Dans la vue « Inventaire », créez un champ de type **Iteration** (New
   field, périodes de 2 semaines — GitHub crée les premières automatiquement).
   Le nom est libre : « Itération », « Sprint »… c'est le TYPE qui donne la
   mécanique de calendrier, pas le nom. L'erreur à éviter : un champ à choix
   unique avec des options « Sprint 1 », « Sprint 2 » tapées à la main — il en
   aurait l'air, sans les périodes qui s'enchaînent ni la frise.
2. Posez « Barrer visuellement… » et « Ajouter une tâche… » sur l'itération
   courante ; laissez le reste sans itération (pas encore décidé — c'est un
   état honnête).
3. Créez une vue **Roadmap** (le `+` des vues → Roadmap) : vos deux items
   apparaissent sur la frise, alignés sur l'itération courante ; les autres
   attendent en dehors.

## Critères de réussite

- [ ] mon champ de type Iteration existe — quel que soit son nom — avec ses périodes de deux semaines
- [ ] deux items sont posés sur l'itération courante, les autres restent sans itération
- [ ] ma vue Roadmap affiche les deux items sur la frise
