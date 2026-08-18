# Le format des formations Parcours

Une formation est un dossier posé dans `formations/`. Le dossier peut être
déplacé ailleurs avec la variable d'environnement `PARCOURS_FORMATIONS_DIR`.

Les gestes d'écriture décrits ci-dessous vivent derrière l'interrupteur
**« Édition »** du pied de colonne (icône crayon), réservé aux administrateurs
et éteint par défaut : en lecture, Parcours n'affiche aucun outil d'auteur.

Trois façons de créer une formation, au choix :

- **Depuis l'application** : « Nouvelle formation » sur le catalogue. Vous
  saisissez le titre, les modules et les leçons ; Parcours crée le dossier, le
  manifeste et les fichiers markdown vides. « Modifier la structure », sur la
  page d'une formation, sert ensuite à renommer, réordonner, ajouter ou retirer.
- **En déposant un dossier** sur le catalogue (glisser-déposer ou « Choisir un
  dossier »). S'il contient un `formation.json`, votre sommaire est repris tel
  quel. Sinon, Parcours en construit un — voir « Import d'un dossier » plus bas.
- **À la main** (ou avec Claude Code) : vous écrivez vous-même le manifeste et
  les fichiers, comme décrit ci-dessous.

Une formation peut ensuite être **archivée** (elle sort du catalogue, revient en
un clic) ou **mise à la corbeille** (son dossier est déplacé dans
`formations/.corbeille/`). Parcours ne supprime jamais un fichier : vider la
corbeille est à vous, depuis le Finder.

Le **texte** d'une leçon s'écrit soit dans l'application (bouton « Modifier
cette leçon », avec aperçu en direct), soit dans votre éditeur habituel — les
deux vont ensemble : si le fichier a changé sur le disque pendant que vous
l'éditiez dans Parcours, l'enregistrement est refusé plutôt que d'écraser
l'autre version. Retirer une leçon du sommaire ne supprime jamais sa prose.

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

## La fiche de présentation

Tous ces champs sont **facultatifs** : sans eux, la formation s'affiche comme
avant.

```json
{
  "couverture": "assets/couverture.png",
  "presentation": "## À propos\n\nUn texte long, en markdown.",
  "objectifs": ["Piloter Claude Code en mode plan", "Écrire un hook"],
  "prerequis": ["Un terminal", "Claude Code installé"],
  "duree": 1200,
  "modules": [
    { "id": "fondations", "titre": "Fondations", "description": "Le socle.",
      "lecons": [{ "id": "…", "titre": "…", "fichier": "…", "duree": 45 }] }
  ]
}
```

- `couverture` : chemin relatif, image `.png` `.jpg` `.jpeg` `.gif` `.webp`.
  Le SVG est refusé. Une image **absente du disque** n'invalide pas la
  formation : la fiche s'affiche sans visuel. Recommandation : 1 200 px de
  large, moins de 500 Ko — rien ne l'impose.
- `presentation` : markdown, 8 000 caractères au plus. Les cases à cocher y sont
  inertes : une fiche n'a pas de progression.
- `objectifs`, `prerequis` : 12 entrées au plus, 200 caractères chacune. Une
  liste vide équivaut à une liste absente.
- `duree` : minutes, entier. Sans elle, Parcours somme les durées des leçons —
  **et seulement si toutes en ont une** : une somme partielle mentirait.
- `duree` d'une leçon, `description` d'un module (500 caractères au plus).

Une couverture peut aussi se déposer depuis la fiche, en tant qu'administrateur.
L'image est datée et l'ancienne reste sur le disque : Parcours ne supprime
jamais un fichier.

## Ce qu'une leçon suppose

Une leçon peut déclarer les leçons qu'elle suppose faites, avec le champ
facultatif `suppose` :

```json
{ "id": "deux-hooks", "titre": "Deux hooks", "fichier": "lecons/deux-hooks.md",
  "suppose": ["installer", "ecrire-claude-md"] }
```

À l'ouverture, si l'une de ces leçons n'est pas terminée pour le compte
connecté, un bandeau la nomme avec un lien. **Il ne verrouille rien** : le
contenu, les critères et « Marquer comme terminé » restent intacts — on
prévient, on ne confisque pas la décision.

Règles :

- Des identifiants de leçons de la **même** formation, 5 au plus. Un tableau
  vide équivaut à un champ absent.
- Une entrée qui n'est pas un slug rend la formation invalide, avec le chemin
  JSON exact.
- Une entrée qui ne correspond plus à aucune leçon est **ignorée en silence** :
  retirer une leçon du sommaire ne casse jamais la formation. L'auto-référence
  est ignorée de la même façon.
- Parcours ne remonte jamais au-delà des leçons déclarées : pas de chaîne de
  prérequis, pas de cycle possible.

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
- Les cases à cocher du contenu sont des **critères de réussite** cochables et
  mémorisés par compte — voir « Les critères de réussite » plus bas.
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

## Les critères de réussite

Toute case à cocher markdown d'une leçon est un **critère** : l'apprenant peut la
cocher, et Parcours retient son état.

```markdown
**Critères de réussite**
- [ ] `uv run forma list` affiche les 7 cours
- [ ] `uv run forma next` affiche le bon cours
- [x] le dépôt git est initialisé
```

Il n'y a pas de syntaxe particulière à apprendre : n'importe quelle case compte,
où qu'elle soit dans la leçon — y compris dans un bloc `:::solution`.

`- [x]` est l'**état de départ**, pas un verrou : l'apprenant peut décocher, et
c'est son choix qui est retenu.

Quand tous les critères d'une leçon sont cochés, la leçon passe terminée d'elle-
même. Décocher ensuite ne la fait pas repasser en cours : revenir vérifier un
détail ne doit pas coûter son avancement.

**Ce qu'il faut savoir en écrivant** : l'identité d'un critère vient de son
texte. Insérer, déplacer ou supprimer des critères ne dérange rien ; corriger la
ponctuation, la casse ou des backticks non plus. En revanche, **reformuler un
critère fait perdre sa coche** — c'est un critère neuf. La coche devenue
orpheline est oubliée silencieusement, sans message d'erreur.

Une leçon suit au plus 300 critères. Au-delà, les cases restent affichées mais
ne sont plus cochables, et la leçon le signale.

## La recherche

Elle porte sur les leçons de la formation ouverte : leur titre et leur contenu,
balisage exclu. Insensible à la casse et aux accents ; plusieurs mots = tous
présents dans la leçon.

**Les indices et les solutions ne sont jamais indexés** — titres compris. Un mot
présent seulement dans une solution ne produit aucun résultat : une solution ne
peut pas apparaître sans un geste volontaire.

## Import d'un dossier

Déposez le **dossier** de la formation, pas ses fichiers en vrac : son nom donne
le titre et l'identifiant de la formation.

Si le dossier contient un `formation.json` valide, il est repris tel quel — vos
titres, votre ordre, vos identifiants de leçons. Seul le champ `id` est réaligné
sur le nom du dossier d'accueil.

Sinon, Parcours construit le sommaire à partir des fichiers markdown trouvés :

| Ce qu'il trouve | Ce qu'il en fait |
|---|---|
| Des `.md` dans plusieurs sous-dossiers | Un module par sous-dossier, nommé d'après lui |
| Des `.md` tous au même endroit | Un module unique, « Contenu » |
| `02-le-feu.md`, `10-le-sel.md` | Ordre numérique : 2 avant 10 |
| Un `# Titre` en tête de fichier | Le titre de la leçon |
| Pas de titre de niveau 1 | Le nom du fichier, nettoyé (`03_premiers-pas` → « Premiers pas ») |

Le sommaire déduit est un point de départ : « Modifier la structure » sert à le
corriger, sans jamais toucher au texte des leçons.

Ce qui est refusé : un dépôt sans aucun `.md`, un chemin qui sort du dossier, une
extension hors liste (markdown, `json`, et les fichiers joints servis), plus de
500 fichiers, plus de 25 Mo, un markdown de plus de 2 Mo. Un `formation.json`
présent mais invalide n'est jamais contourné en douce : Parcours affiche
l'erreur et demande s'il doit déduire le sommaire à la place. Les fichiers
système (`.DS_Store`, `__MACOSX/`) sont écartés et comptés.

## Quand une formation est invalide

Elle reste au catalogue, avec son identifiant de dossier et la première erreur
rencontrée. Elle n'est pas cliquable, ses sous-routes répondent `409`. Un dossier
non vide sans `formation.json` est signalé ; un dossier vide, un dossier caché ou
un fichier isolé sont ignorés sans bruit.
