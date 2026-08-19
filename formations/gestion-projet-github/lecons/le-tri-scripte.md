Étiqueter et jalonner à la main, vous savez. Mais ce sont des gestes
répétitifs par excellence — trois clics par issue, multipliés par tout ce que
le projet contient. C'est exactement le travail à déléguer : **vous décidez de
la taxonomie, Claude l'applique en masse.**

## Les commandes que vous verrez passer

| Commande | Effet |
| --- | --- |
| `gh label create nom` | crée un label (couleur et description en options) |
| `gh issue edit 4 --add-label "amélioration"` | ajoute un label à l'issue nº 4 |
| `gh issue edit 4 --milestone "V2"` | rattache l'issue nº 4 au milestone V2 |
| `gh issue list --milestone "V2"` | liste les issues d'un milestone |

Une seule commande `gh issue edit` peut faire les deux à la fois — et Claude
enchaîne les issues sans se lasser. Le partage des rôles ne change pas : la
décision (quels labels existent, quelle issue vise quelle étape) reste chez
vous ; l'application, chez lui.

## À vous

La V2 de todo-app n'a encore aucune issue. Donnez-lui ses deux premières —
**créées, étiquetées et jalonnées en une seule demande**. L'objectif, le
dossier `todo-app` ouvert dans votre environnement :

- deux issues : **créer un compte**, et **partager une liste avec quelqu'un** —
  au moule habituel (titre-résultat, trois temps, « Terminé quand » en cases) ;
- chacune portant le label `amélioration` et le milestone `V2`, dès la
  création ;
- puis la vérification par vos deux canaux : la liste du milestone V2 demandée
  à Claude, et la même page dans le navigateur.

:::indice
Tout tient dans une demande en français : les deux résultats attendus, le
moule, le label et le milestone à poser. Claude choisira les commandes ; votre
travail est de relire — les descriptions d'abord, l'étiquetage ensuite.
:::

:::indice
Ce que vous verrez passer : deux `gh issue create` (le label et le milestone
peuvent s'y glisser directement en options), ou un `gh issue edit` par issue
juste après. Pour la contre-vérification navigateur : la page Milestones,
puis V2 — les deux issues doivent s'y trouver, avec leur label visible.
:::

:::solution
Une demande qui marche, à adapter :

```
Crée deux issues dans ce dépôt : « Créer un compte » et « Partager une
liste avec quelqu'un ». Même moule que les autres : ## Problème,
## Action, ## Terminé quand en cases à cocher (au moins deux). Applique
à chacune le label "amélioration" et le milestone "V2". Montre-moi les
commandes avant de les lancer, puis donne-moi la liste des issues du
milestone V2.
```

**Pourquoi ça marche** : la demande sépare bien ce qui vous appartient (la
taxonomie : quel label, quel milestone, quel moule) de ce qui lui appartient
(les commandes). Et elle finit par la vérification — demander la liste tout de
suite fait partie du geste, pas d'une réflexion d'après-coup.

**L'erreur fréquente** : demander un label ou un milestone qui n'existe pas
encore (une faute de frappe suffit : « V2 » ≠ « v2 »). Selon les cas, `gh`
refuse ou Claude propose de le créer — et voilà un doublon dans votre
taxonomie. En cas de doute, la page Labels et la page Milestones font foi :
c'est vous qui tenez le registre.
:::

## Critères de réussite

- [ ] j'ai vu passer les commandes de création et d'étiquetage dans la conversation
- [ ] la page du milestone V2 affiche mes deux nouvelles issues dans le navigateur
- [ ] leurs fiches portent le label `amélioration` et le milestone V2 dans la colonne de droite
- [ ] la liste donnée par Claude et la page du milestone V2 racontent la même chose
- [ ] la page Milestones affiche maintenant V1 à trois issues et V2 à deux
