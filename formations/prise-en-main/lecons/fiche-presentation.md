La fiche est la porte d'entrée d'une formation : ce qu'elle promet, à qui elle
s'adresse, combien de temps elle demande. Tous ses champs sont **facultatifs** —
sans eux, la formation s'affiche comme avant.

```json
{
  "couverture": "assets/couverture.png",
  "presentation": "Un texte long, en markdown.",
  "objectifs": ["Écrire un manifeste valide", "Importer un dossier"],
  "prerequis": ["Parcours démarré", "Un éditeur de texte"],
  "duree": 160,
  "modules": [
    { "id": "decouvrir", "titre": "Découvrir", "description": "Le socle.",
      "lecons": [{ "id": "bienvenue", "titre": "Bienvenue",
                   "fichier": "lecons/bienvenue.md", "duree": 5 }] }
  ]
}
```

## Chaque champ

**`couverture`** : un chemin relatif au dossier de la formation, vers un `.png`,
`.jpg`, `.jpeg`, `.gif` ou `.webp`. Le SVG est refusé — c'est un document actif,
une image suffit. Une couverture absente du disque n'invalide pas la formation :
la fiche s'affiche sans visuel, sans laisser de trou. Visez 1 200 pixels de
large et moins de 500 Ko.

**`presentation`** : du markdown, 8 000 caractères au plus, blocs `:::` compris.
Les cases à cocher y sont inertes : une fiche n'a pas de progression.

**`objectifs`** et **`prerequis`** : 12 entrées au plus, 200 caractères chacune.
Une liste vide équivaut à une liste absente.

**`duree`** : des minutes, en nombre entier. Sans elle, Parcours additionne les
durées des leçons — et seulement si **toutes** en ont une. Une somme partielle
mentirait, alors Parcours n'affiche rien plutôt que d'annoncer un chiffre faux.

**`description`** d'un module : 500 caractères au plus, affichée sous son titre
dans le sommaire.

## Déposer une couverture depuis l'application

Édition allumée, la fiche propose « Ajouter une couverture ». L'image est écrite
dans `assets/`, sous un nom horodaté.

:::attention
Remplacer une couverture n'écrase pas l'ancienne : le nouveau fichier porte une
autre date, et les deux restent sur le disque. Parcours ne supprime jamais un
fichier — à vous de faire le ménage depuis le Finder si vous le souhaitez.
:::

Un fichier de plus de 2 Mo est refusé. Un PDF renommé en `.png` aussi : Parcours
regarde le contenu réel, pas l'extension.

## Critères de réussite

- [ ] j'ai lu la fiche de cette formation : objectifs, prérequis et durée y figurent
- [ ] j'ai déposé une image en couverture, et elle s'est affichée sans que je recharge
- [ ] j'ai déposé une seconde image : `ls formations/prise-en-main/assets/` montre les DEUX fichiers
- [ ] j'ai essayé de déposer un fichier de plus de 2 Mo : refusé, avec un message clair
- [ ] j'ai supprimé l'image du disque et rechargé : la fiche s'affiche sans visuel, sans trou
- [ ] j'ai vérifié qu'une formation sans aucun de ces champs s'affiche quand même
