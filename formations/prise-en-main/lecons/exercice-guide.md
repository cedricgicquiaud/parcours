À votre tour : créez une formation minimale et vérifiez qu'elle apparaît au
catalogue sans redémarrer le serveur.

## Énoncé

Créez un dossier `formations/mon-essai/` contenant un manifeste et une leçon.
Rechargez le catalogue : votre formation doit apparaître avec son titre, sa
description et un bouton « Commencer ».

## Critères de réussite

- Le dossier porte exactement le même nom que l'`id` du manifeste
- La formation apparaît sans redémarrage du serveur
- La leçon s'ouvre et peut être marquée comme terminée

:::indice La première chose à vérifier
Le nom du dossier et l'`id` du manifeste sont comparés caractère par caractère,
majuscules comprises. `Mon-Essai` et `mon-essai` sont deux choses différentes.
:::

:::indice Si la carte affiche une erreur
Lisez-la : elle donne le chemin JSON exact du champ fautif, par exemple
`modules[0].lecons[0].fichier manquant`. Corrigez, rechargez, la carte redevient
normale.
:::

:::solution
Le manifeste minimal tient en quelques lignes :

```json
{
  "formatVersion": 1,
  "id": "mon-essai",
  "titre": "Mon essai",
  "modules": [
    {
      "id": "module-1",
      "titre": "Premier module",
      "lecons": [
        { "id": "premiere", "titre": "Première leçon", "fichier": "lecons/premiere.md" }
      ]
    }
  ]
}
```

Et `lecons/premiere.md` peut ne contenir qu'une phrase. Rechargez le catalogue :
la carte est là.
:::
