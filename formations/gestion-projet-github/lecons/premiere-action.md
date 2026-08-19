Tout ce que vous avez automatisé jusqu'ici **range** : les workflows du
Project déplacent les cartes après coup. Les **Actions**, elles,
**vérifient** : des contrôles qui tournent tout seuls sur les machines de
GitHub, à chaque changement. C'est le dernier étage de la maison.

## Ce qu'est une Action

Une Action (ou *workflow* GitHub Actions — oui, le mot est le même que pour
les règles du Project, l'usage est hélas ainsi) est un fichier YAML dans
`.github/workflows/` qui dit trois choses :

1. **Quand** (`on:`) : à chaque publication (`push`), à chaque PR
   (`pull_request`)…
2. **Où** : sur une machine que GitHub démarre pour l'occasion (`runs-on:`).
3. **Quoi** (`steps:`) : les étapes — récupérer le contenu du dépôt, puis
   lancer des commandes.

Chaque exécution laisse une trace dans l'onglet **Actions** du dépôt : verte
si tout a passé, rouge sinon, avec le journal détaillé de chaque étape.

## Une vérification réelle pour notre dépôt

Règle du terrain oblige, notre première Action garde quelque chose qui compte
vraiment : la **spec**. Le README doit toujours contenir ses sections `## V1`
et `## V2` — les modules 5 et 6 reposent dessus ; qui les casse casse le
backlog. Le contrôle : à chaque changement, vérifier leur présence.

C'est modeste, et c'est le bon départ : une Action qui protège une règle que
VOUS avez posée. Sur vos vrais projets, les mêmes lignes lanceront des tests.

## À vous

Livrez l'Action par la boucle, comme le formulaire :

1. l'issue « Vérifier le README à chaque changement » (par le formulaire
   « Tâche », désormais !) ;
2. Claude : branche, fichier `.github/workflows/verifier-readme.yml`
   (déclencheurs `push` et `pull_request`), PR avec « Closes » ;
3. relecture — le YAML de la solution vous donne la grille — puis fusion ;
4. onglet **Actions** : l'exécution déclenchée par la fusion elle-même, verte.
   Ouvrez-la : chaque étape a son journal.

:::solution
Le cœur du fichier attendu :

```yaml
name: Vérifier le README
on: [push, pull_request]
jobs:
  verifier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Les sections de la spec sont là
        run: |
          grep -q "^## V1" README.md
          grep -q "^## V2" README.md
```

**Pourquoi ça marche** : `actions/checkout` récupère le contenu du dépôt sur
la machine ; `grep -q` cherche chaque ligne de section et **échoue si elle
manque** — et une étape qui échoue met l'exécution au rouge. C'est toute la
mécanique : une commande qui réussit ou échoue, et GitHub qui l'affiche.

**L'erreur fréquente** : oublier l'étape `checkout` — la machine démarre
vide, `grep` ne trouve pas de README du tout, et le rouge dit « fichier
introuvable » au lieu de « section manquante ». Le journal de l'étape fait la
différence.
:::

## Critères de réussite

- [ ] l'Action est arrivée par une PR fusionnée, son issue fermée toute seule
- [ ] l'onglet Actions montre une exécution verte de « Vérifier le README »
- [ ] j'ai ouvert son détail et lu le journal des étapes
- [ ] la carte de l'issue est dans Done
