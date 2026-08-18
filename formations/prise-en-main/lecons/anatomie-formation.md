Une formation est un dossier posé dans `formations/`. Il contient un manifeste,
des fichiers de leçons, et éventuellement des fichiers joints.

```
formations/
└── prise-en-main/
    ├── formation.json      # le manifeste, obligatoire
    ├── lecons/             # les fichiers markdown
    │   └── bienvenue.md
    └── assets/             # images, PDF, archives (facultatif)
```

## Le manifeste est la seule source de vérité

C'est lui qui donne les titres, l'ordre et les identifiants. Les fichiers
markdown ne contiennent que du contenu.

```json
{
  "formatVersion": 1,
  "id": "prise-en-main",
  "titre": "Prise en main de Parcours",
  "description": "Résumé affiché sur la carte du catalogue.",
  "modules": [
    {
      "id": "decouvrir",
      "titre": "Découvrir",
      "lecons": [
        { "id": "bienvenue", "titre": "Bienvenue", "fichier": "lecons/bienvenue.md" }
      ]
    }
  ]
}
```

| Champ | Rôle | Obligatoire |
| --- | --- | --- |
| `formatVersion` | Version du format, `1` aujourd'hui | oui |
| `id` | Doit être exactement le nom du dossier | oui |
| `titre` | Ce que voit le lecteur | oui |
| `description` | Résumé affiché sur la carte du catalogue | non |
| `modules` | Au moins un module, chacun avec ses leçons | oui |

:::attention
**Aucun en-tête de métadonnées dans les fichiers markdown.** Un bloc `---` en
tête de fichier n'a aucun statut particulier : il est rendu comme un simple
trait horizontal. Tout ce qui décrit une leçon vit dans le manifeste.
:::

## Les identifiants

Un identifiant est un slug : minuscules, chiffres et tirets, 64 caractères au
plus. Ceux des leçons sont uniques dans toute la formation — ce sont les clés de
votre progression.

Le `id` de la formation doit correspondre **exactement** au nom du dossier,
majuscules comprises. `Mon-Essai` et `mon-essai` sont deux choses différentes.

## Une leçon peut dire ce qu'elle suppose

Dans une formation fil rouge, chaque leçon construit sur la précédente. Une
leçon peut le déclarer avec le champ facultatif `suppose` :

```json
{ "id": "deux-hooks", "titre": "Deux hooks", "fichier": "lecons/deux-hooks.md",
  "suppose": ["installer", "ecrire-claude-md"] }
```

À l'ouverture, si une de ces leçons n'est pas terminée pour le compte connecté,
un bandeau la nomme avec un lien. **Il ne verrouille rien** : on prévient, on ne
confisque pas la décision du lecteur.

Les règles : des identifiants de leçons de la même formation, 5 au plus, un
tableau vide vaut un champ absent. Une entrée qui ne correspond plus à aucune
leçon est **ignorée en silence** — retirer une leçon du sommaire ne casse jamais
votre formation. Cette leçon-ci en est un exemple vivant : elle déclare supposer
« L'interrupteur Édition ».

## Quand quelque chose cloche

Une formation dont le manifeste est refusé reste visible au catalogue, avec le
chemin JSON exact du champ fautif — par exemple `modules[0].id manquant`. Sa
carte n'est pas cliquable. Corrigez le fichier, rechargez : elle redevient
normale, sans redémarrer le serveur.

L'ordre des vérifications est toujours le même, pour que le message affiché soit
prévisible : le JSON, puis `formatVersion`, puis les champs obligatoires dans
l'ordre du document, puis les slugs et la correspondance dossier/`id`, puis
l'unicité des identifiants, puis l'existence des fichiers.

## Critères de réussite

- [ ] j'ai ouvert `formations/prise-en-main/formation.json` et retrouvé la structure décrite ici
- [ ] j'ai retiré une virgule du manifeste : le catalogue affiche la carte en erreur, avec le message
- [ ] j'ai remis la virgule et rechargé : la carte est redevenue normale, sans redémarrer le serveur
- [ ] j'ai vérifié qu'un titre de leçon vient du manifeste, pas du fichier markdown
- [ ] j'ai ajouté `"suppose": ["bienvenue"]` à une leçon de ce manifeste, rechargé sans l'avoir terminée : le bandeau la nomme (puis j'ai retiré le champ)
- [ ] j'ai mis un identifiant inconnu dans `suppose` : la formation est restée valide, aucun bandeau pour cette entrée
