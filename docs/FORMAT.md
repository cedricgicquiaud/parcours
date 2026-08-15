# Le format des formations Parcours

Une formation est un dossier posé dans `formations/`. Le dossier peut être
déplacé ailleurs avec la variable d'environnement `PARCOURS_FORMATIONS_DIR`.

Deux façons de créer une formation, au choix :

- **Depuis l'application** : « Nouvelle formation » sur le catalogue. Vous
  saisissez le titre, les modules et les leçons ; Parcours crée le dossier, le
  manifeste et les fichiers markdown vides. « Modifier la structure », sur la
  page d'une formation, sert ensuite à renommer, réordonner, ajouter ou retirer.
- **À la main** (ou avec Claude Code) : vous écrivez vous-même le manifeste et
  les fichiers, comme décrit ci-dessous.

Le **texte** des leçons s'écrit toujours dans votre éditeur : l'administration
ne touche jamais au contenu d'un fichier existant, et retirer une leçon du
sommaire ne supprime pas sa prose.

```
formations/
└── prise-en-main/
    ├── formation.json      # le manifeste, obligatoire
    ├── lecons/             # les fichiers markdown
    │   └── bienvenue.md
    └── assets/             # images, archives, PDF (optionnel)
```

## Le manifeste

```json
{
  "formatVersion": 1,
  "id": "prise-en-main",
  "titre": "Prise en main de Parcours",
  "description": "Résumé affiché sur la carte du catalogue.",
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

Règles :

- `formatVersion` vaut `1`. Toute autre valeur rend la formation invalide — la
  version n'est jamais devinée.
- `id` doit être **exactement** le nom du dossier, majuscules comprises.
- Les identifiants sont des slugs : `^[a-z0-9][a-z0-9-]*$`, 64 caractères au plus.
- Les identifiants de leçons sont uniques dans **toute** la formation : ce sont
  les clés de la progression.
- `fichier` est un chemin relatif au dossier de la formation. Ni chemin absolu,
  ni `..`, ni antislash.
- Un champ inconnu est ignoré ; un champ obligatoire manquant rend la formation
  invalide, avec le chemin JSON exact (`modules[2].lecons[0].id manquant`).
- Le manifeste pèse au plus 1 Mo, un fichier de leçon au plus 2 Mo.

**Aucun frontmatter dans les fichiers markdown.** Le manifeste est la seule
source de vérité des métadonnées. Un bloc `---` en tête de fichier n'a aucun
statut particulier : il est rendu comme une ligne horizontale.

## Ordre de validation

Déterministe, pour que le message d'erreur affiché soit toujours le même :

1. Analyse du JSON
2. `formatVersion`
3. Champs obligatoires, dans l'ordre du document
4. Slugs et correspondance `id` ↔ nom du dossier
5. Unicité des identifiants
6. Confinement puis existence des fichiers

## Le markdown des leçons

CommonMark, plus les tableaux et les cases à cocher GitHub.

- Le HTML écrit à la main est **affiché en texte**, jamais interprété.
- Les cases à cocher du contenu sont décoratives : désactivées, jamais
  enregistrées. La progression est à la leçon, pas à la case.
- Les titres du contenu descendent d'un niveau au rendu (`#` devient `<h2>`) :
  le seul `<h1>` de l'écran est le titre de la leçon, pris dans le manifeste.

### Les blocs `:::`

```markdown
:::astuce
Toujours ouvert, fond teinté.
:::

:::attention
Toujours ouvert, pour ce qui peut casser.
:::

:::indice Le titre est optionnel
Replié. Numéroté automatiquement : Indice 1, Indice 2…
:::

:::solution
Replié, et jamais indexé par la recherche.
:::

:::prerequis
[Un lien vers l'extérieur](https://exemple.test) — ouvert dans un nouvel onglet.
:::
```

- Alias anglais acceptés : `tip` → astuce, `warning` et `danger` → attention,
  `hint` → indice.
- La comparaison du type ignore la casse et les accents : `:::Astuce`,
  `:::Prérequis` fonctionnent.
- Un type inconnu (`:::note`) n'est pas une erreur : le contenu est rendu tel
  quel, sans encadré, et les lignes `:::` disparaissent.
- Un conteneur non fermé absorbe la fin du fichier : la leçon s'affiche quand même.
- Les blocs acceptent du markdown complet, blocs de code compris.
- Les indices et solutions sont des `<details>` **sans attribut `open`** : rien
  n'est visible avant clic, même avec JavaScript désactivé.

### Liens

| Écriture | Effet |
|----------|-------|
| `[texte](https://exemple.test)` | Lien externe, nouvel onglet |
| `[texte](lecon:identifiant)` | Va à une leçon de la même formation |
| `[texte](assets/fichier.pdf)` | Fichier joint de la formation |
| `[texte](#ancre)` | Ancre dans la page |

Un `lecon:` dont l'identifiant n'existe pas est rendu en texte simple, non
cliquable. Tout autre schéma (`javascript:`, `data:`, `mailto:`, chemin absolu)
est refusé : le texte du lien reste, le lien disparaît. Les liens vers des
fichiers markdown (`[…](../autre.md)`) ne sont pas supportés.

### Images

```markdown
![Texte alternatif](assets/schema.png)
```

Chemins relatifs uniquement, confinés au dossier de la formation. Une image
absente affiche son texte alternatif encadré — la leçon ne casse pas.

### Code et schémas

Le langage déclaré sur la barrière active la coloration syntaxique, hors ligne :
`bash`, `css`, `diff`, `html`, `javascript`, `json`, `jsx`, `markdown`,
`python`, `sql`, `tsx`, `typescript`, `yaml`. Un langage inconnu reste lisible en
monospace neutre.

Une barrière ` ```mermaid ` produit un schéma, rendu côté navigateur en mode
sécurité strict. Une syntaxe invalide affiche le source avec la mention
« schéma non rendu ».

## La recherche

Elle porte sur les leçons de la formation ouverte : leur titre et leur contenu,
balisage exclu. Insensible à la casse et aux accents ; plusieurs mots = tous
présents dans la leçon.

**Les indices et les solutions ne sont jamais indexés** — titres compris. Un mot
présent seulement dans une solution ne produit aucun résultat : une solution ne
peut pas apparaître sans un geste volontaire.

## Quand une formation est invalide

Elle reste au catalogue, avec son identifiant de dossier et la première erreur
rencontrée. Elle n'est pas cliquable, ses sous-routes répondent `409`. Un dossier
non vide sans `formation.json` est signalé ; un dossier vide, un dossier caché ou
un fichier isolé sont ignorés sans bruit.
