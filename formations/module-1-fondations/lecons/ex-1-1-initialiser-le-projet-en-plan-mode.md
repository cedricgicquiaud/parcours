> Durée indicative : 45 min

**Objectif** : à la fin de cet exercice, trois nouvelles commandes fonctionneront
dans votre terminal. C'est Claude Code qui aura écrit tout le programme ; vous,
vous aurez validé son plan avant la première ligne de code.

**Le résultat à obtenir** — votre outil s'appelle `forma` et sait faire trois choses :

| Vous tapez | Ce qui se passe |
|------------|-----------------|
| `uv run forma list` | le tableau de vos 7 cours s'affiche : ordre, titre, statut, certificat |
| `uv run forma done subagents` | le cours dont l'id est `subagents` passe au statut `termine` dans `data/cours.json` |
| `uv run forma next` | le prochain cours à faire s'affiche (le premier en statut `a_faire`, dans l'ordre) |

(Le mot `subagents` de la deuxième ligne est un « id » : le petit nom court que
chaque cours porte dans `data/cours.json`. C'est ce petit nom qu'on tape après
`forma done`, pas le titre complet du cours.)

Contrainte, en deux temps :

1. **Faites-vous expliquer le plan avant de le juger.** Demandez : « explique-moi
   ce plan comme à un non-développeur, et justifie chaque fichier et chaque
   installation en une phrase ». Vous n'avez pas à comprendre le Python — vous
   avez à obtenir des justifications compréhensibles.
2. **Amendez le plan au moins une fois**, sur ce que VOUS pouvez juger : un
   élément dont la justification reste obscure → retiré ; une installation dont
   le besoin n'est pas clair → refusée ; l'affichage du tableau, les noms des
   commandes, la langue des messages → à votre goût.

C'est l'exercice : apprendre à faire parler un plan puis à le négocier — pas à
l'accepter, ni à le comprendre techniquement.

**Critères de réussite**
- [ ] `uv run forma list` affiche les 7 cours de votre `data/cours.json`
- [ ] `uv run forma done subagents` modifie `data/cours.json` et est visible dans `git diff`
- [ ] `uv run forma next` affiche le bon cours (le premier `a_faire` par `ordre` croissant)
- [ ] Claude vous a expliqué le plan en langage courant, justification par
      justification, AVANT votre validation
- [ ] Vous avez amendé le plan initial et savez dire ce que vous avez changé

:::indice la direction
Le premier geste : dans votre espace de travail, lancez `claude`, puis appuyez
sur Shift+Tab jusqu'à voir « plan mode ». Décrivez alors le résultat voulu avec
vos mots — par exemple : « je veux un petit programme Python, géré avec uv, qui
me donne ces trois commandes ; les données sont dans data/cours.json ;
propose-moi un plan, n'écris rien pour l'instant ». Claude proposera un plan.

Lisez-le ensuite avec deux questions en tête : y a-t-il des fichiers dont je ne
comprends pas l'utilité ? y a-t-il des installations dont je ne vois pas le
besoin ? Chaque « oui » est un amendement à demander.
:::

:::indice le comment
L'amendement le plus simple : refuser une bibliothèque externe. Une bibliothèque
est du code écrit par d'autres, qu'il faudrait installer en plus. Or pour lire des
commandes tapées au clavier, Python sait déjà faire tout seul, avec `argparse`,
son module intégré.

Donc si le plan propose d'installer `click` ou `typer` (deux bibliothèques
courantes pour les CLI), répondez : « utilise argparse, sans dépendance externe ».
Voilà, vous avez amendé le plan.
:::

:::solution
**Le résultat attendu**, dossier par dossier :

```
mon-formacoach/
├── pyproject.toml        # la fiche d'identité du projet (voir ci-dessous)
├── forma/                # le code de la CLI
│   ├── __init__.py       # fichier vide qui marque le dossier comme module Python
│   ├── cli.py            # comprend la commande tapée, affiche le résultat
│   └── store.py          # le SEUL fichier qui lit et écrit data/cours.json
└── data/cours.json       # vos données
```

**Pourquoi ça marche** :

- `pyproject.toml` décrit le projet, avec une ligne clé —
  `[project.scripts] forma = "forma.cli:main"` — qui signifie : « quand on tape
  `forma`, lance la fonction main du fichier cli.py ».
- `store.py` regroupe toute la lecture/écriture du fichier de données. Si le
  format change un jour, il n'y a qu'un seul endroit à corriger.
- `forma next` trie les cours par leur champ `ordre` et affiche le premier
  dont le statut est `a_faire`.

**L'erreur fréquente** : accepter un plan trop gros. Un bon plan pour cet
exercice tient en 5 fichiers environ. S'il en propose 10, ou une installation
de bibliothèque, c'est le moment de négocier — c'est tout l'objet de l'exercice.
:::
