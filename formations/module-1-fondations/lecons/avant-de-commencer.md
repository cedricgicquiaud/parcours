> Cours Academy : [Claude Code 101](https://anthropic.skilljar.com/claude-code-101)
> et [Claude Code in Action](https://anthropic.skilljar.com/claude-code-in-action).
> Suivez-les d'abord ; si c'est déjà fait, ce cahier transforme la théorie en réflexes.

**Objectif du module** : construire la CLI `forma` dans votre espace de travail,
en pilotant Claude Code avec méthode — pas en tapant « fais-moi une CLI » et en
croisant les doigts.

**Prérequis** : le Démarrage du `README.md` racine (votre espace `mon-formacoach`
existe, avec son `data/cours.json` et son dépôt git). Tout se passe dans cet
espace. Ouvrez-y Claude Code.

**Ce que ce module exerce — et n'exige pas** : vous n'écrirez pas une ligne de
Python ici, et vous n'avez pas besoin de savoir en écrire. Claude Code produit le
code ; votre travail, celui que le cours « Claude Code in Action » enseigne, c'est
diriger et vérifier. La règle d'or du pilotage, valable tout le parcours : on ne
valide jamais ce qu'on n'a pas compris — et c'est à Claude de se rendre
compréhensible, en s'expliquant en langage courant, pas à vous de devenir
développeur.

**Trois termes avant de commencer** :

- une **CLI** (command line interface) est un programme qui s'utilise en tapant
  des commandes dans le terminal — `git` et `claude` en sont ; vous allez
  construire la vôtre, `forma` ;
- **`uv`** est l'outil qui gère les projets Python : il installe ce qu'il faut
  et lance vos programmes. `uv run forma list` signifie « lance la commande
  forma list dans ce projet ». Sa présence a été vérifiée au Démarrage ;
- le **plan mode** est le mode de Claude Code où il propose un plan et n'écrit
  rien tant que vous n'avez pas validé (touche Shift+Tab) — c'est le cœur de
  l'exercice 1.1.
