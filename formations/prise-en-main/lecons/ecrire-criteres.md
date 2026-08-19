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

## Constatez-le sur pièce

Le terrain d'essai : la leçon [Bienvenue](lecon:bienvenue), que vous avez déjà
terminée. Ouvrez son fichier `formations/prise-en-main/lecons/bienvenue.md`
dans un éditeur de texte, et gardez Parcours ouvert à côté, sur cette leçon
« Bienvenue ». Après chaque modification du fichier, rechargez la page : le
serveur relit le disque à chaque affichage.

1. **La normalisation protège.** Dans le fichier, entourez de backticks un mot
   d'un critère déjà coché. Rechargez : la coche a tenu — backticks, casse,
   accents et ponctuation ne comptent pas.
2. **La reformulation casse.** Remplacez maintenant un mot de ce même critère
   par un synonyme. Rechargez : la case est revenue vide, sans message.
3. **La position ne compte pas.** Ajoutez une ligne `- [ ] critère d'essai` en
   tête de la liste. Rechargez : les coches des autres critères sont intactes.

Remettez ensuite le fichier comme avant : retirez le critère d'essai, restaurez
la formulation d'origine. La coche perdue à l'étape 2 ne revient pas — c'est la
leçon à retenir — recochez-la simplement.

## Critères de réussite

- [ ] j'ai coché un critère, puis j'ai entouré un de ses mots de backticks dans le fichier : la coche a tenu
- [ ] j'ai ensuite reformulé ce critère : la case est revenue vide, sans message d'erreur
- [ ] j'ai ajouté un critère en tête de liste : les coches des autres sont intactes
- [ ] j'ai relu une liste de critères — celle de cette leçon, par exemple — en vérifiant que chacun se répond par oui ou par non
