Une formation est un dossier posé dans `formations/`. Il contient un manifeste,
des fichiers de leçons, et éventuellement des fichiers joints.

```
formations/
└── prise-en-main/
    ├── formation.json      # le manifeste, obligatoire
    ├── lecons/             # les fichiers markdown
    │   └── bienvenue.md
    └── assets/             # images, archives, PDF (optionnel)
```

## Le manifeste

Le manifeste est la seule source de vérité : c'est lui qui donne les titres,
l'ordre et les identifiants. Les fichiers markdown ne contiennent que du contenu,
jamais d'en-tête de métadonnées.

```json
{
  "formatVersion": 1,
  "id": "prise-en-main",
  "titre": "Prise en main de Parcours",
  "modules": [
    {
      "id": "decouverte",
      "titre": "Découverte",
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

## Les identifiants

Un identifiant est un slug : minuscules, chiffres et tirets. Celui d'une leçon
est la clé de votre progression — vous pouvez renommer son titre ou la déplacer
dans un autre module, la coche suit.

:::attention
Changer l'`id` d'une leçon, en revanche, revient à créer une nouvelle leçon :
l'ancienne coche devient orpheline. Parcours vous le signale et propose de faire
le ménage, il ne le fait jamais dans votre dos.
:::

## Quand quelque chose cloche

Une formation dont le manifeste est invalide reste visible au catalogue, avec le
message d'erreur exact et le chemin JSON fautif — par exemple
`modules[0].id manquant`. Rien n'échoue en silence : corrigez le manifeste,
rechargez, la carte redevient normale.
