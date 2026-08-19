Vous savez maintenant écrire une issue et la faire vivre. Voici le deuxième
temps de la méthode : la même chose, pilotée par Claude Code — et votre rôle
qui change : vous ne tapez plus, vous jugez.

## Les commandes que vous verrez passer

L'outil `gh` sait tout faire sur les issues. Vous ne les taperez pas : vous
décrivez, Claude les lance, et elles défilent dans la conversation. Ce tableau
sert à reconnaître ce qui passe — c'est ainsi qu'on garde un œil sur ce que
fait son exécutant :

| Commande | Effet |
| --- | --- |
| `gh issue create` | crée une issue (titre et description en options) |
| `gh issue list` | liste les issues ouvertes |
| `gh issue view 3` | affiche l'issue nº 3 dans le terminal |
| `gh issue view 3 --web` | l'ouvre dans le navigateur |

Un détail qui simplifie tout : lancées depuis le dossier `todo-app` — la copie
locale ouverte dans votre environnement depuis la leçon du bac à sable — ces
commandes savent d'elles-mêmes quel dépôt viser. Depuis n'importe où ailleurs,
l'option `-R votre-compte/todo-app` (R comme *repository*) le précise.

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

- le dossier `todo-app` ouvert dans votre environnement, demandez à Claude
  Code, en français, de créer ces deux issues — en exigeant le moule de la
  formation : titre-résultat, description en trois temps, « Terminé quand »
  en cases à cocher ;
- puis vérifiez son travail par deux canaux : demandez-lui la liste des issues
  ouvertes, ET regardez l'onglet Issues dans le navigateur — c'est votre canal
  à vous, indépendant de ce que Claude raconte.

:::indice
Formulez la demande comme à un collègue : le dépôt visé, les deux résultats
attendus, le moule à respecter. Vous n'avez pas à connaître les commandes —
c'est le travail de Claude ; votre travail est derrière : relire les deux
descriptions comme vous reliriez celles d'un collègue pressé.
:::

:::indice
Pour vérifier : demandez « liste les issues ouvertes » — vous verrez passer
`gh issue list`, qui sait quel dépôt viser puisqu'il tourne dans le dossier
`todo-app`. Puis, dans le navigateur, l'onglet Issues du dépôt doit montrer la
même chose : les nouvelles issues, identiques en forme à celle que vous avez
écrite à la main.
:::

:::solution
Une demande qui marche, à adapter à vos mots — le dossier `todo-app` ouvert :

```
Crée deux issues dans ce dépôt : « Ajouter une tâche à la liste » et
« Supprimer une tâche de la liste ». Chaque description suit trois
temps : ## Problème, ## Action, ## Terminé quand — ce dernier en cases
à cocher (au moins deux). Montre-moi les commandes avant de les lancer.
```

**Pourquoi ça marche** : la demande donne le résultat attendu et le moule, et
le dépôt visé va de soi — c'est celui du dossier ouvert. « Montre-moi les
commandes avant » vous garde la main : vous voyez le
`gh issue create --title … --body …` avant qu'il parte.

**L'erreur fréquente** : lancer la demande depuis un autre dossier. Claude vise
alors un autre dépôt — ou n'en trouve pas — et la demande déraille. Travaillez
depuis le dossier `todo-app` ; et hors de lui, précisez la cible avec
`-R votre-compte/todo-app`.
:::

## Critères de réussite

- [ ] j'ai vu passer les commandes `gh issue create` de Claude dans la conversation
- [ ] les deux issues créées par Claude s'affichent dans l'onglet Issues du navigateur
- [ ] j'ai relu leurs descriptions : trois temps et cases « Terminé quand », comme la mienne
- [ ] la liste donnée par Claude et l'onglet Issues du navigateur racontent la même chose
