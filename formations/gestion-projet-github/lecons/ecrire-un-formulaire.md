À votre tour : todo-app va recevoir son formulaire « Tâche », qui impose le
moule de la formation. Et comme un gabarit est un fichier du dépôt, il se
livre par la boucle complète — que vous connaissez par cœur.

## L'anatomie d'un formulaire

Un formulaire d'issue est un fichier YAML avec :

- un en-tête : `name` (le nom affiché dans l'écran de choix), `description`,
  et d'éventuels `labels` posés d'office sur l'issue créée ;
- un corps (`body`) : la liste des champs, dans l'ordre. Les types utiles :
  `textarea` (zone de texte, avec `label`, `description`, et
  `validations: required: true` pour l'obliger) et `markdown` (un texte
  d'aide, non saisi).

Notre gabarit « Tâche » : trois `textarea` obligatoires — Problème, Action,
« Terminé quand » (avec, en texte d'aide, le rappel : des cases à cocher, des
constats). Trois champs, pas plus : un formulaire trop long fait fuir.

## À vous

Livrez le formulaire par la boucle, de bout en bout :

1. l'issue « Ajouter le formulaire de tâche » (moule, label `documentation`) ;
2. Claude : branche, fichier `.github/ISSUE_TEMPLATE/tache.yml`, PR avec
   « Closes » ;
3. votre relecture dans *Files changed* — le YAML se lit : vérifiez les trois
   champs et leurs `required` ;
4. fusion, et le tour des constats habituel (issue fermée, carte dans Done) ;
5. la preuve finale : **New issue** sur votre dépôt propose maintenant
   « Tâche ». Créez-en une d'essai PAR le formulaire — constatez les champs
   imposés — puis fermez-la aussitôt (c'était un essai).

:::indice
La demande peut tout porter : « ajoute un formulaire d'issue "Tâche"
(.github/ISSUE_TEMPLATE/tache.yml) avec trois champs textarea obligatoires —
Problème, Action, Terminé quand — livré par une issue et une PR qui la ferme ;
je relis avant fusion. »
:::

:::solution
Le cœur du fichier que vous devriez voir dans la PR :

```yaml
name: Tâche
description: Décrire un travail à faire, au moule du projet
body:
  - type: textarea
    attributes:
      label: Problème
    validations:
      required: true
  - type: textarea
    attributes:
      label: Action
    validations:
      required: true
  - type: textarea
    attributes:
      label: Terminé quand
      description: Des constats vérifiables, en cases à cocher (- [ ] …)
    validations:
      required: true
```

**Pourquoi ça marche** : GitHub lit tout fichier YAML de
`.github/ISSUE_TEMPLATE/` et en fait un choix dans « New issue ». Les
`required: true` empêchent de soumettre sans remplir — le moule devient un
garde-fou.

**L'erreur fréquente** : le YAML est pointilleux sur l'indentation — un champ
décalé d'une espace et le formulaire n'apparaît pas, sans message clair. Si
« Tâche » manque à l'appel après la fusion, c'est le premier suspect ; la page
du fichier sur GitHub affiche l'erreur de syntaxe le cas échéant.
:::

## Critères de réussite

- [ ] la PR du formulaire est fusionnée et son issue s'est fermée toute seule
- [ ] « New issue » sur mon dépôt propose désormais le modèle « Tâche »
- [ ] j'ai créé une issue d'essai par le formulaire : les trois champs étaient imposés
- [ ] je l'ai refermée aussitôt, et sa carte est dans Done
