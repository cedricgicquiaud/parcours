Un bon critère se vérifie sans discuter. Il décrit un fait observable, pas une
compréhension.

## Ce qui distingue un bon critère

| Faible | Solide |
| --- | --- |
| J'ai compris les hooks | `.claude/settings.json` déclare un hook `PostToolUse` |
| Le projet est bien configuré | `npm test` affiche 12 tests verts |
| J'ai lu la documentation | J'ai retrouvé la règle des identifiants dans `docs/FORMAT.md` |

Les deux colonnes disent la même chose. Seule la seconde permet de répondre
« oui » ou « non » sans hésiter — et c'est ce que fait un apprenant seul devant
sa liste.

## Où les placer

N'importe où dans la leçon. La convention de cette formation est de les grouper
sous un titre « Critères de réussite », en fin de leçon, parce que c'est là qu'on
fait le bilan. Rien ne l'impose.

Vous pouvez aussi en glisser un au milieu du texte, quand le geste se fait à cet
endroit précis — c'est ce que fait la leçon [Les critères de
réussite](lecon:criteres).

## Le piège de la reformulation

Parcours identifie un critère par **son texte**, une fois normalisé.

Ce qui ne change **rien** : les majuscules, les accents, la ponctuation, les
backticks, les espaces multiples, la position dans la liste, l'ajout ou la
suppression d'autres critères autour.

Ce qui **casse la coche** : changer les mots. « `npm test` passe » et « les tests
passent » sont deux critères différents. L'ancienne coche est oubliée en
silence, sans message d'erreur — et la case revient vide.

:::attention
Conséquence pratique : relisez vos critères **avant** de publier une leçon.
Après, chaque reformulation coûte la progression de ceux qui l'avaient déjà
cochée.
:::

:::astuce
Deux critères au texte identique dans la même leçon restent distincts : Parcours
les compte dans l'ordre. Vous pouvez écrire « c'est vert » deux fois sans qu'ils
se répondent.
:::

## Combien

Trois à six par leçon. En dessous, la leçon ne se vérifie pas vraiment ; au
dessus, la liste devient une corvée et personne ne la coche jusqu'au bout.

La limite dure est de 300 par leçon. Si vous l'approchez, c'est que la leçon
devrait être coupée en deux.

## Critères de réussite

- [ ] j'ai coché un critère, puis j'ai entouré un de ses mots de backticks dans le fichier : la coche a tenu
- [ ] j'ai ensuite reformulé ce critère : la case est revenue vide, sans message d'erreur
- [ ] j'ai ajouté un critère en tête de liste : les coches des autres sont intactes
- [ ] j'ai relu mes propres critères en me demandant si chacun se répond par oui ou non
