Une formation terminée encombre le catalogue. Une formation ratée aussi. Deux
façons de la ranger — aucune ne détruit quoi que ce soit.

## Archiver

Depuis le menu « … » de sa carte, ou depuis sa fiche. La carte disparaît du
catalogue et la formation rejoint une section « Archivées », repliée, en bas de
page. Aucune confirmation n'est demandée : le geste se défait en un clic.

Sur le disque, le dossier est déplacé dans `formations/.archives/`, contenu
intact.

## Mettre à la corbeille

Le geste plus fort. Il demande confirmation, en nommant la formation. Le dossier
part dans `formations/.corbeille/`, sous un nom horodaté — `mon-cours--20260816-143607`
—, ce qui permet de jeter deux fois la même formation sans collision.

Une section « Corbeille » apparaît alors au catalogue, avec la date.

:::attention
Parcours ne supprime **aucun fichier**, jamais. « Mettre à la corbeille » veut
dire « déplacer dans un dossier à part ». Vider la corbeille est à vous, depuis
le Finder — c'est le seul endroit où une formation peut réellement disparaître.
:::

## Restaurer

« Restaurer », depuis l'une ou l'autre section. La formation revient au
catalogue **avec sa progression** : les mêmes leçons cochées, les mêmes critères.
La progression vit dans la base, pas dans le dossier, et personne n'y a touché.

Les dossiers `.archives` et `.corbeille` devenus vides disparaissent d'eux-mêmes.

:::astuce
Une formation invalide — manifeste cassé — peut elle aussi être archivée ou
jetée depuis son menu. C'est souvent la façon la plus simple de faire le calme
en attendant de la réparer.
:::

## Critères de réussite

- [ ] j'ai archivé une formation : sa carte a disparu, la section « Archivées » l'affiche
- [ ] j'ai vérifié sur le disque : le dossier est dans `formations/.archives/`, complet
- [ ] je l'ai restaurée : elle est revenue au catalogue avec les mêmes leçons cochées
- [ ] j'ai mis une formation à la corbeille : la confirmation nomme bien la formation
- [ ] j'ai annulé une confirmation : rien ne s'est passé
- [ ] j'ai lu, dans la section Corbeille, que Parcours ne supprime aucun fichier
- [ ] après restauration, les dossiers `.archives` et `.corbeille` vides ont disparu
