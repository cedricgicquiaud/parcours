La leçon précédente a réglé la quinzaine ; celle-ci règle les mois.
« Vous pouvez me donner une roadmap sur quatre mois ? » La question finit
toujours par arriver. Cette leçon y répond avec GitHub seul — et sans mentir,
car c'est le vrai danger d'une roadmap : promettre un détail qu'on ne peut pas
connaître.

## Une roadmap honnête promet des destinations, pas un calendrier détaillé

Sur un projet réel, personne ne peut prévoir toutes les tâches à l'avance. Les
cas se découvrent en travaillant — c'est normal, et aucune méthode ne
l'empêche.

Une roadmap honnête accepte cette réalité. Elle promet des **destinations
datées** : « les comptes fin octobre, le partage fin novembre ». Elle ne
détaille en tâches que le palier en cours. Le lointain reste volontairement
flou : le détailler aujourd'hui, c'est du travail jeté, puisque le réel le
contredira.

Retenez l'image d'une longue-vue : **plus c'est proche, plus c'est net.**

## Les trois objets d'une roadmap GitHub

Pour construire cette roadmap, trois objets — deux que vous connaissez, un
nouveau :

1. **Le milestone daté** : le palier. Vous savez déjà tout de lui ; la
   roadmap lui ajoute juste sa date d'échéance (page Milestones → Edit).
2. **L'issue-chantier** : la nouveauté de cette leçon. C'est une issue
   ordinaire, nommée d'après son palier (« Chantier V2 »), avec trois lignes
   de description. Son rôle : **représenter le palier sur la frise**. Pour
   cela, elle porte deux dates — un début et une cible — dans deux champs du
   Project que vous allez créer. **Un chantier par milestone, toujours** : il
   est la barre de son palier.
3. **Les issues de travail** : celles que vous connaissez depuis le module 2.
   Elles n'existent que pour le palier en cours, et n'ont pas de dates.

La règle d'or qui rend tout lisible : **la roadmap ne montre que les
chantiers ; le Board ne montre que le travail.** Une barre par palier sur la
frise — jamais de trou, jamais de détail. Les tâches concrètes, elles, vivent
sur le tableau et dans les sprints, jamais sur la roadmap.

Pour que les écrans respectent cette règle tout seuls, il faut le leur dire :
un label `chantier` sur les issues-chantiers, et un filtre par vue (la barre
« Filter » en haut de chaque vue). Le Board exclut le label
(`-label:chantier`), la vue de la roadmap ne garde que lui
(`label:chantier`). Sans ces filtres, Auto-add poserait les chantiers sur le
Board — des cartes qui ne bougeraient jamais — et la frise listerait toutes
les tâches sans barre, comme des figurants.

## La roadmap au fil du projet

- **Au départ** : vous créez tous les milestones datés et tous leurs
  chantiers. La roadmap complète existe dès le premier jour — trois paliers,
  trois barres — alors qu'aucune tâche n'est encore écrite.
- **À l'ouverture d'un palier** (chaque mois, environ) : vous découpez son
  chantier en tâches — c'est le passage du module 6, rejoué palier par
  palier. La roadmap ne bouge pas d'un pixel : une barre s'est remplie de
  l'intérieur, c'est tout.
- **Quand le réel bouscule** : vous déplacez des dates d'échéance — deux
  clics. Et vous le voyez venir tôt : la barre d'avancement du milestone en
  cours dit des semaines à l'avance qu'un palier sera juste, pas la veille.
- **À la fin d'un palier** : les tâches se ferment toutes seules (leurs PR),
  l'avancement du chantier monte tout seul (« 5 of 5 »)… et là, il vous
  attend. **Fermer un chantier est votre geste** : c'est le moment de relire
  le palier — rien découvert en route ? la spec n'a pas bougé ? — avant de
  déclarer fini. Les conséquences s'automatisent, les décisions se gardent.

## Où se lit la roadmap

Deux affichages, pour deux usages :

- **La page Milestones** : les paliers dans l'ordre, leurs dates, la barre
  d'avancement de celui en cours. C'est la roadmap « texte » — la page à
  montrer à un associé, elle se lit sans explication.
- **La vue Roadmap « Produit »** : la roadmap « dessinée ». **Roadmap** est le
  troisième type de vue d'un Project, après Board et Table : une **frise
  chronologique**, qui place les items sur un calendrier d'après leurs dates.
  Ici, elle montre les chantiers en barres décalées ; en option, son réglage
  **Markers** ajoute des traits verticaux aux échéances des milestones.

## Constatez-le sur pièce

Dans votre bac à sable, dans l'ordre :

1. Datez vos deux milestones : page Milestones → Edit sur V1 puis V2, une
   échéance plausible chacun.
2. Relisez cette page : l'ordre du temps, les dates, les barres — votre
   roadmap texte est déjà là.
3. Créez les deux champs de dates : dans la vue Inventaire, comme au
   module 4 — un champ `Début` et un champ `Cible`, tous deux de type
   **Date**.
4. Créez les chantiers : deux issues, « Chantier V1 » et « Chantier V2 »,
   trois lignes de description chacune, portant un label `chantier` (créez-le
   au passage). Dans l'Inventaire, datez-les en quinconce — V1 sur les
   semaines qui viennent, V2 décalé d'un mois.
5. Créez la vue de la roadmap : un nouvel onglet de type **Roadmap**, nommé
   « Produit », et dans ses options, réglez **Dates** sur la paire
   `Début` / `Cible` — c'est ce réglage qui dit à la frise où lire le temps ;
   sans lui, elle reste vide. Vos deux barres décalées apparaissent.
   (Une vue ne lit qu'une source de temps à la fois ; si un jour vous voulez
   aussi une frise de la quinzaine, créez une seconde vue Roadmap réglée sur
   votre champ d'itérations.)
6. Appliquez la règle d'or aux écrans : dans la vue « Produit », tapez
   `label:chantier` dans la barre Filter ; sur le Board, tapez
   `-label:chantier`. Chaque écran ne montre plus que son monde.
7. La touche finale : dans les options de la vue « Produit », activez les
   **Markers** sur les milestones — leurs échéances se dessinent en traits
   verticaux.

## Critères de réussite

- [ ] mes milestones V1 et V2 portent chacun une date d'échéance
- [ ] la page Milestones se lit comme une roadmap : l'ordre du temps, les dates, les barres
- [ ] les échéances des milestones sont dessinées sur la frise de ma vue Roadmap
- [ ] ma vue « Produit » montre des barres décalées dans le temps, une par chantier
