> Durée indicative : 45 min

**Objectif** : obtenir une nouvelle commande `forma stats` en imposant à Claude
la méthode TDD — les tests avant le code — et en gardant vous-même le contrôle
du rythme.

**Le résultat à obtenir** :

| Vous tapez | Ce qui se passe |
|------------|-----------------|
| `uv run forma stats` | un récapitulatif s'affiche : nombre de cours par statut (`termine`, `a_faire`) et nombre de certificats obtenus |
| `uv run pytest` | tous les tests passent, y compris les nouveaux tests de `stats` |

**La méthode imposée — le TDD** (test-driven development, « développement dirigé
par les tests ») : on écrit d'abord le test, un petit programme qui décrit le
comportement attendu ; on le lance, il échoue — normal, le code n'existe pas
encore (on dit qu'il est « rouge ») ; puis on écrit juste le code nécessaire
pour le faire passer (« vert »).

**Le déroulé, en 4 temps — un commit à la fin de chacun des temps 2, 3 et 4** :

1. **Tests d'abord.** Demandez à Claude d'écrire uniquement les tests de
   `forma stats`, sans toucher au dossier `forma/`, puis de s'arrêter.
2. **Constatez le rouge.** Lancez `uv run pytest` : les nouveaux tests doivent
   échouer. C'est la preuve qu'ils testent quelque chose qui n'existe pas encore.
   Commit.
3. **Le minimum pour le vert.** Demandez à Claude d'implémenter juste ce qu'il
   faut pour faire passer les tests. Relancez `uv run pytest` : tout est vert.
   Commit.
4. **Refactor.** Demandez à Claude s'il peut améliorer le code sans changer le
   comportement (un « refactor »). Les tests doivent rester verts. Commit.

Claude va spontanément vouloir tout faire d'un coup — tests et code dans la même
réponse. Si ça arrive, interrompez-le (Échap) et rappelez l'étape en cours :
garder ce contrôle est précisément l'exercice.

**Critères de réussite**
- [ ] L'historique git montre 3 commits distincts : tests (rouges), implémentation (verts), refactor
- [ ] `uv run pytest` passe ; les tests fabriquent leur propre petit `cours.json` de test et ne lisent jamais votre vrai fichier `data/`
- [ ] À aucune étape Claude n'a écrit tests et code dans la même réponse — soit il a respecté le rythme, soit vous l'avez interrompu

:::indice la direction
Toute la difficulté est de faire respecter le rythme. Dictez l'étape 1 mot pour
mot : « écris uniquement les tests de forma stats, ne touche pas au dossier
forma/, puis arrête-toi ». La consigne « puis arrête-toi » n'est pas décorative —
sans elle, Claude enchaîne sur l'implémentation.

Au moment de vérifier le rouge, lisez le message d'échec de `uv run pytest` :
il doit dire que la commande ou la fonction `stats` n'existe pas. Si les tests
échouent pour une autre raison (erreur de syntaxe, mauvais import), c'est un
test cassé, pas un test rouge — faites-le corriger avant de committer.
:::

:::solution
**Le résultat attendu** — un test `tests/test_stats.py` qui fonctionne ainsi :
il fabrique un petit cours.json de test dans un dossier temporaire (avec
pytest, le paramètre `tmp_path` fournit ce dossier jetable), contenant 2 cours
terminés dont 1 avec certificat, et 1 à faire. Il vérifie ensuite que la
fonction `stats` répond exactement
`{"termine": 2, "a_faire": 1, "certificats": 1}`, et que la commande
`forma stats` affiche ces nombres. Côté code : une fonction de calcul d'une
dizaine de lignes dans `store.py`, l'affichage dans `cli.py`.

**Pourquoi un fichier de test et pas vos vraies données** : vos vraies données
changent — chaque `forma done` les modifie. Un test branché dessus casserait au
fil de votre progression, sans qu'aucun bug n'existe. Un test doit fabriquer
lui-même les conditions qu'il vérifie.

**L'erreur fréquente** : laisser Claude écrire tests et code d'un seul élan.
Si c'est arrivé, l'historique git ne montrera pas le commit « tests rouges » —
et le critère 1 est raté. Recommencez l'étape en l'interrompant à temps.
:::

---

## Validation du module

Dans Claude Code, demandez :

> Joue le rôle de correcteur. Lis le cahier `modules/01-fondations-claude-code/README.md`
> dans le dossier de la formation (donne son chemin), vérifie chaque critère de réussite
> en exécutant les commandes correspondantes dans ce projet, et rends un verdict par
> exercice : VALIDÉ ou À REPRENDRE avec la raison.

**Pour aller plus loin** : ajoutez un hook `Stop` qui affiche la sortie de
`uv run forma next` à la fin de chaque session — votre prochain cours vous rappelle
toujours à l'ordre.
