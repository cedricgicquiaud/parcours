# API Parcours

Base : `http://127.0.0.1:4620/api` — le serveur n'écoute que sur la boucle locale.

## Garde locale (A-R1)

Toutes les routes vérifient l'en-tête `Host` : un hôte non local répond `403`.
Sur une mutation (`PUT`, `DELETE`, `POST`), un en-tête `Origin` non local répond
`403` ; un `Origin` absent est accepté (curl et scripts locaux n'en envoient pas).

## Routes

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/health` | Sonde de vie |
| GET | `/api/formations` | Catalogue : formations valides et invalides |
| POST | `/api/formations` | Créer une formation (administration) |
| GET | `/api/formations/:fid/structure` | Structure éditable |
| PUT | `/api/formations/:fid/structure` | Enregistrer titres, ordre et composition |
| GET | `/api/formations/:fid` | Sommaire, progression et orphelines |
| GET | `/api/formations/:fid/lecons/:lid` | Leçon rendue en HTML assaini |
| GET | `/api/formations/:fid/lecons/:lid/source` | Markdown d'une leçon (éditeur) |
| PUT | `/api/formations/:fid/lecons/:lid/source` | Enregistrer le markdown d'une leçon |
| POST | `/api/formations/:fid/apercu` | Rendre un markdown non enregistré |
| GET | `/api/formations/:fid/recherche?q=` | Recherche plein texte dans la formation |
| GET | `/api/formations/:fid/assets/*` | Fichier joint d'une formation |
| PUT | `/api/progression/:fid/:lid` | Marquer une leçon terminée |
| DELETE | `/api/progression/:fid/:lid` | Décocher une leçon |
| POST | `/api/progression/:fid/reset` | Réinitialiser une formation |
| POST | `/api/progression/:fid/nettoyer` | Purger les coches orphelines |

Les identifiants sont résolus par correspondance **exacte** dans le résultat du
scan, sensible à la casse : `Formation-Claude` et `formation-claude` sont deux
choses différentes (A-R7).

## GET /api/formations

```json
{
  "formations": [
    {
      "statut": "valide",
      "id": "prise-en-main",
      "titre": "Prise en main de Parcours",
      "description": "…",
      "modules": 2,
      "lecons": 6,
      "faites": 1,
      "pourcentage": 17,
      "action": "reprendre",
      "prochaine": { "id": "anatomie-formation", "titre": "…", "moduleTitre": "Découverte" }
    },
    { "statut": "invalide", "id": "un-dossier-fautif", "erreur": "modules[0].id manquant" }
  ],
  "progressionReinitialisee": false,
  "erreurGlobale": "dossier introuvable : /chemin"
}
```

`action` vaut `commencer` (rien de coché), `reprendre` (en cours) ou `revoir`
(100 %). `erreurGlobale` n'apparaît que si le dossier de formations lui-même est
introuvable, illisible ou n'est pas un dossier. `progressionReinitialisee` passe
à `true` quand la base a été trouvée corrompue au démarrage et sauvegardée.

## GET /api/formations/:fid

```json
{
  "id": "prise-en-main",
  "titre": "Prise en main de Parcours",
  "description": "…",
  "avancement": {
    "faites": 1,
    "total": 6,
    "pourcentage": 17,
    "action": "reprendre",
    "prochaine": { "id": "…", "titre": "…", "moduleTitre": "…" },
    "orphelines": ["ancien-id"],
    "modules": [
      {
        "id": "decouverte",
        "titre": "Découverte",
        "faites": 1,
        "total": 3,
        "lecons": [{ "id": "bienvenue", "titre": "Bienvenue", "faite": true }]
      }
    ]
  }
}
```

Les leçons orphelines (cochées en base mais absentes du manifeste) sont exclues
de tous les calculs et listées à part.

## GET /api/formations/:fid/lecons/:lid

```json
{
  "formationId": "prise-en-main",
  "formationTitre": "Prise en main de Parcours",
  "leconId": "bienvenue",
  "titre": "Bienvenue",
  "moduleId": "decouverte",
  "moduleTitre": "Découverte",
  "html": "<p>…</p>",
  "faite": false,
  "position": 1,
  "total": 6,
  "precedente": null,
  "suivante": { "id": "anatomie-formation", "titre": "Anatomie d'une formation" }
}
```

`html` est **déjà assaini** : le rendu markdown se fait côté serveur, l'interface
n'en fait jamais (A-R5). Le HTML écrit par l'auteur est échappé, pas interprété.

## GET /api/formations/:fid/recherche?q=

```json
{
  "resultats": [
    {
      "leconId": "anatomie-formation",
      "titre": "Anatomie d'une formation",
      "moduleTitre": "Découverte",
      "extrait": "…il contient un manifeste, des fichiers…",
      "occurrences": [{ "debut": 25, "longueur": 9 }]
    }
  ],
  "total": 2,
  "nonIndexees": 0,
  "message": "saisir au moins 2 caractères"
}
```

- L'extrait est du **texte brut** ; le surlignage est appliqué par l'interface à
  partir des positions (`occurrences`) — aucun HTML supplémentaire ne traverse le
  pipeline de rendu.
- Le contenu des blocs `:::indice` et `:::solution` n'est **jamais** indexé.
- Résultats ordonnés selon le manifeste, 50 au maximum ; `total` donne le nombre
  réel de correspondances.
- `message` n'apparaît que pour une requête de moins de 2 caractères utiles.

## Assets

Servi seulement après résolution du chemin réel (`realpath`) confiné au dossier
de la formation : toute sortie (`..`, lien symbolique sortant, chemin absolu)
répond `403`. Extensions servies : `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`,
`pdf`, `zip`, `txt` — les autres répondent `404`. Chaque asset part avec
`Content-Security-Policy: default-src 'none'; sandbox` et `X-Content-Type-Options: nosniff`.

## Progression

`PUT` et `DELETE` sont idempotents et renvoient l'avancement recalculé :

```json
{ "faite": true, "avancement": { "…": "…" } }
```

`reset` et `nettoyer` renvoient le nombre de lignes supprimées, `0` compris :

```json
{ "supprimees": 2, "avancement": { "…": "…" } }
```

Cocher une leçon absente du manifeste répond `404` : l'API ne fabrique jamais
d'orpheline.

## Administration : créer et modifier une formation

Ces deux routes écrivent la structure d'une formation (décision P008) ; le texte
des leçons passe par les routes d'édition décrites plus bas (P009).

`POST /api/formations` — corps :

```json
{
  "id": "ecrire-pour-le-web",
  "titre": "Écrire pour le web",
  "description": "Structure, ton et relecture.",
  "modules": [
    { "titre": "Les bases", "lecons": [{ "titre": "Structurer un texte" }] }
  ]
}
```

`id` est optionnel : sans lui, il est dérivé du titre. Les identifiants des
modules et des leçons sont dérivés de leurs titres, rendus uniques par suffixe
(`introduction`, `introduction-2`). Réponse `201` :

```json
{
  "id": "ecrire-pour-le-web",
  "titre": "Écrire pour le web",
  "fichiersCrees": ["lecons/structurer-un-texte.md"]
}
```

`PUT /api/formations/:fid/structure` — même corps, sans `id` de formation.
Trois règles gouvernent l'écriture :

1. **Une leçon qui porte un `id` le conserve** : c'est la clé de progression
   (P004). Renommer son titre ne crée aucune orpheline. Une leçon **sans** `id`
   est nouvelle : le serveur lui en dérive un et crée son fichier.
2. **Aucun fichier existant n'est réécrit.** `fichiersCrees` ne liste que les
   fichiers créés vides ; les autres ne sont jamais ouverts en écriture.
3. **Retirer une leçon du manifeste ne supprime pas son fichier.** Elle sort du
   sommaire, sa prose reste sur le disque.

Le manifeste est écrit de façon atomique (fichier temporaire puis renommage) et
repasse par la validation du lecteur : l'administration ne peut pas produire une
formation que le scan refuserait. L'index de recherche de la formation est
invalidé après écriture.

Erreurs : `400` pour une saisie invalide (message situé, ex.
`modules[0].lecons : au moins une leçon attendue`), `409` si le dossier existe
déjà, `403` si l'origine n'est pas locale.

## Éditeur de leçon

`GET …/lecons/:lid/source` renvoie le markdown du fichier et un **jeton d'état**
(date de modification + taille) :

```json
{
  "formationId": "prise-en-main",
  "leconId": "bienvenue",
  "titre": "Bienvenue",
  "fichier": "lecons/bienvenue.md",
  "markdown": "Parcours lit des formations…",
  "jeton": "1786785175153-45"
}
```

`PUT …/lecons/:lid/source` prend `{ "markdown": "…", "jeton": "…" }` et renvoie
le nouveau jeton. Si le fichier a changé depuis la lecture — parce qu'il a été
modifié dans un éditeur externe ou par Claude Code — la route répond **409** et
n'écrit rien : aucune version n'est écrasée en silence. Omettre le jeton force
l'écriture (utile en script). Le fichier est écrit de façon atomique, confiné au
dossier de la formation, et plafonné à 2 Mo comme à la lecture.

`POST /api/formations/:fid/apercu` prend `{ "markdown": "…" }` et renvoie
`{ "html": "…" }` : c'est le **même pipeline de rendu** que la leçon (A-R5), donc
le même assainissement. La route n'écrit rien sur le disque.

Ces trois routes sont, avec celles de la structure, les seules qui touchent à
`formations/`.

## Erreurs

| Code | Cas |
|------|-----|
| 403 | Hôte ou origine non locale ; asset hors formation |
| 404 | Formation, leçon, asset ou route inconnue ; fichier de leçon illisible |
| 409 | Formation invalide — le message porte la raison exacte |

Toutes les erreurs ont la même forme : `{ "erreur": "message lisible" }`.
