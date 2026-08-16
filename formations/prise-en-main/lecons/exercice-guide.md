À vous. Vous allez créer une formation complète, à la main, et la voir
apparaître au catalogue sans redémarrer le serveur.

## Énoncé

Créez un dossier `formations/carnet-de-cuisine/` contenant :

1. un manifeste avec un titre, une description, deux objectifs et **deux
   modules** ;
2. trois leçons, réparties entre ces deux modules ;
3. dans la première leçon, un encadré `:::astuce`, un lien vers la troisième
   leçon, et **deux critères de réussite**.

Puis rechargez le catalogue. Votre formation doit apparaître avec son titre, sa
description et un bouton « Commencer ».

## Ce qu'on vérifie

- [ ] la formation apparaît au catalogue sans que j'aie redémarré le serveur
- [ ] la fiche affiche mes deux objectifs et mes deux modules
- [ ] la première leçon montre l'encadré, pas les `:::`
- [ ] le lien vers la troisième leçon fonctionne, sans rechargement complet
- [ ] mes deux critères sont cochables, et le décompte les suit
- [ ] j'ai coché les deux : la leçon est passée « Terminé » toute seule

:::indice Par où commencer
Le manifeste. Rien ne s'affiche sans lui. Commencez par le copier depuis
[Anatomie d'une formation](lecon:anatomie-formation) et remplacez les valeurs
une par une.
:::

:::indice Si la carte affiche une erreur
Lisez-la : elle donne le chemin JSON exact du champ fautif, par exemple
`modules[1].lecons[0].fichier manquant`. Corrigez, rechargez.

L'erreur la plus fréquente : le nom du dossier et le champ `id` du manifeste
doivent être identiques, caractère pour caractère.
:::

:::indice Le lien entre leçons
Il ne s'écrit pas comme un lien de fichier. Regardez la table des liens dans
[Le markdown et ses blocs](lecon:blocs-speciaux) : c'est l'identifiant de la
leçon qui compte, pas son chemin.
:::

:::solution
Le dossier :

```
formations/carnet-de-cuisine/
├── formation.json
└── lecons/
    ├── le-feu.md
    ├── le-sel.md
    └── le-repos.md
```

Le manifeste :

```json
{
  "formatVersion": 1,
  "id": "carnet-de-cuisine",
  "titre": "Carnet de cuisine",
  "description": "Trois gestes qui changent tout.",
  "objectifs": ["Maîtriser la chaleur", "Saler au bon moment"],
  "modules": [
    {
      "id": "bases",
      "titre": "Les bases",
      "lecons": [
        { "id": "le-feu", "titre": "Le feu", "fichier": "lecons/le-feu.md" },
        { "id": "le-sel", "titre": "Le sel", "fichier": "lecons/le-sel.md" }
      ]
    },
    {
      "id": "finitions",
      "titre": "Les finitions",
      "lecons": [
        { "id": "le-repos", "titre": "Le repos", "fichier": "lecons/le-repos.md" }
      ]
    }
  ]
}
```

Et `lecons/le-feu.md` :

```markdown
Une poêle froide colle. Une poêle fumante brûle. Entre les deux, tout se joue.

:::astuce
Posez la main à dix centimètres : si vous tenez trois secondes, c'est prêt.
:::

Le repos compte autant que la cuisson — voir [Le repos](lecon:le-repos).

## Critères de réussite

- [ ] j'ai chauffé la poêle avant d'y poser quoi que ce soit
- [ ] j'ai attendu la fin de la cuisson pour saler
```

Les deux autres fichiers peuvent ne contenir qu'une phrase. Rechargez le
catalogue : la carte est là.
:::

## Pour aller plus loin

Refaites l'exercice autrement : créez la même formation depuis « Nouvelle
formation », édition allumée, puis comparez le `formation.json` produit avec le
vôtre. C'est le même format — l'application ne fait que vous éviter de le taper.
