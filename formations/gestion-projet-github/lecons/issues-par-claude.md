Vous savez maintenant écrire une issue et la faire vivre. Voici le deuxième
temps de la méthode : la même chose, pilotée par Claude Code — et votre rôle
qui change : vous ne tapez plus, vous jugez.

## `gh` côté issues

L'outil `gh` sait tout faire sur les issues depuis le terminal :

| Commande | Effet |
| --- | --- |
| `gh issue create` | crée une issue (titre et description en options) |
| `gh issue list` | liste les issues ouvertes |
| `gh issue view 3` | affiche l'issue nº 3 dans le terminal |
| `gh issue view 3 --web` | l'ouvre dans le navigateur |

Un détail compte pour nous : votre dépôt `todo-app` n'est pas téléchargé sur
votre machine (et n'a pas besoin de l'être). L'option `-R votre-compte/todo-app`
(R comme *repository*) dit à `gh` quel dépôt viser à distance. Sans elle, `gh`
cherche un dépôt dans le dossier courant, et n'en trouve pas.

## Le contrat : Claude écrit, vous jugez

Ce que vous avez appris aux trois leçons précédentes n'était pas que pour vos
mains — c'était pour vos yeux. C'est votre grille de jugement : un titre qui
nomme un résultat, trois temps, un « Terminé quand » vérifiable. Claude Code
peut produire dix issues à la minute ; ce qui garde la qualité, c'est que
quelqu'un qui SAIT relise. Au module 6, ce contrat passera à l'échelle : un
backlog entier généré, et vous en juge.

## À vous

La V1 de todo-app mérite deux issues de plus : **ajouter une tâche à la
liste**, et **supprimer une tâche de la liste**. Faites-les créer par Claude
Code. L'objectif :

- demandez à Claude Code, en français, depuis l'environnement où vous
  travaillez avec lui (Visual Studio Code, CMux, un terminal…), de créer ces
  deux issues dans votre dépôt `todo-app` — en exigeant le moule de la
  formation : titre-résultat, description en trois temps, « Terminé quand »
  en cases à cocher ;
- puis vérifiez son travail, par une commande `gh` ET dans le navigateur,
  avant de l'accepter.

:::indice
Formulez la demande comme à un collègue : le dépôt visé, les deux résultats
attendus, le moule à respecter. Vous n'avez pas à connaître les commandes —
c'est le travail de Claude ; votre travail est derrière : relire les deux
descriptions comme vous reliriez celles d'un collègue pressé.
:::

:::indice
Pour vérifier : `gh issue list -R votre-compte/todo-app` — dans le terminal
intégré de votre environnement — doit montrer les nouvelles issues (remplacez
`votre-compte` par votre nom d'utilisateur GitHub, celui que `gh auth status`
affiche). Et dans le navigateur, l'onglet Issues du
dépôt doit les afficher, identiques en forme à celle que vous avez écrite à la
main.
:::

:::solution
Une demande qui marche, à adapter à vos mots :

```
Dans mon dépôt GitHub votre-compte/todo-app (à distance, il n'est pas
cloné ici), crée deux issues : « Ajouter une tâche à la liste » et
« Supprimer une tâche de la liste ». Chaque description suit trois
temps : ## Problème, ## Action, ## Terminé quand — ce dernier en cases
à cocher (au moins deux). Montre-moi les commandes avant de les lancer.
```

**Pourquoi ça marche** : la demande donne le dépôt exact, le résultat attendu
et le moule — les trois choses qu'un exécutant, humain ou Claude, ne doit pas
avoir à deviner. « Montre-moi les commandes avant » vous garde la main : vous
voyez le `gh issue create -R … --title … --body …` avant qu'il parte.

**L'erreur fréquente** : oublier de préciser le dépôt. Claude cherche alors un
dépôt git dans le dossier courant, n'en trouve pas (ou pire, en trouve un
autre), et la demande déraille. Le `-R votre-compte/todo-app` — ou sa mention
claire dans la demande — est ce qui vise juste.
:::

## Critères de réussite

- [ ] `gh issue list -R votre-compte/todo-app` affiche au moins trois issues ouvertes
- [ ] les deux issues créées par Claude s'affichent dans l'onglet Issues du navigateur
- [ ] j'ai relu leurs descriptions : trois temps et cases « Terminé quand », comme la mienne
- [ ] `gh issue view` avec `--web` a ouvert l'une d'elles dans mon navigateur
