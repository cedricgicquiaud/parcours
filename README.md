# Parcours

Plateforme personnelle de formation : un **lecteur de formations** en markdown.

Vous écrivez une formation en fichiers markdown (avec Claude Code ou n'importe
quel éditeur), vous déposez le dossier dans `formations/`, et Parcours l'affiche
comme un site de cours : catalogue, sommaire par modules, leçons agréables à
lire (code coloré, images, schémas, blocs repliables), progression cochable et
« reprendre où j'en étais ».

Mono-utilisateur, tout local : aucune donnée ne quitte la machine.

## Installation

Prérequis : Node 22 (voir `.nvmrc`).

```bash
npm install
```

## Commandes

- `npm run dev` — serveur (port 4620) + UI Vite en parallèle
- `npm test` — tests Vitest
- `npm run typecheck` — tsc --noEmit
- `npm run build` — typecheck + build UI
- `npm start` — serveur seul (production : sert aussi les assets UI)

En développement, ouvrez `http://localhost:5173`. En production, `npm run build`
puis `npm start` : un seul process sert l'API et l'interface sur
`http://127.0.0.1:4620`.

## Créer une formation

Deux voies, au choix :

- **Depuis l'application** : bouton « Nouvelle formation » sur le catalogue.
  Vous saisissez le titre, les modules et les leçons ; Parcours crée le dossier,
  le manifeste et les fichiers markdown. « Modifier la structure » permet
  ensuite de renommer, réordonner, ajouter ou retirer des leçons.
- **À la main** : déposez un dossier dans `formations/` avec un `formation.json`
  et des fichiers markdown. La formation apparaît au rechargement du catalogue,
  sans redémarrer le serveur. Une formation invalide reste visible avec son
  erreur exacte.

Dans les deux cas, le **texte** des leçons s'écrit dans votre éditeur (ou avec
Claude Code) : l'administration gère la structure, jamais le contenu. Elle ne
réécrit aucun fichier existant et ne supprime jamais de prose.

Le format complet est décrit dans **`docs/FORMAT.md`**, et la formation
« Prise en main de Parcours » (livrée dans `formations/`) le montre en pratique.

Pour ranger vos formations ailleurs :

```bash
PARCOURS_FORMATIONS_DIR=~/mes-formations npm start
```

## Ce que Parcours écrit

La progression, dans
`~/Library/Application Support/Parcours/parcours.db` (SQLite, mode WAL). Les
dossiers de formation ne sont modifiés que par l'espace d'administration, et
seulement leur structure (manifeste et création de fichiers vides). Si la base
de progression est trouvée corrompue
au démarrage, elle est mise de côté, une base neuve est créée et l'interface
l'annonce — jamais de plantage silencieux.

Aucune requête réseau sortante : polices, icônes, coloration syntaxique et
schémas sont embarqués.

## Structure

```
formations/    # Les formations (markdown + formation.json + assets/) — lecture seule
server/        # Backend Hono : scan, rendu markdown, progression, recherche, API
ui/            # React + Vite : catalogue, vue formation, vue leçon
docs/          # Format des formations, doc API, références UX
.workflow/     # Workflow FORGE : PRD, SPEC, décisions, recettes
```

## Statut

V1 livrée : catalogue, sommaire, lecture, progression, recherche plein texte,
mode clair/sombre. PRD validé le 2026-08-14 (`.workflow/PRD.md`), SPEC dans
`.workflow/SPEC.md`, design dans `design_handoff_parcours_lecteur/`.

Hors V1 : outil d'écriture intégré, comptes, communauté, vidéo, recherche
multi-formations, reprise à la position exacte dans une leçon.

## Affiliation

Projet personnel et indépendant. La première formation hébergée accompagne les
cours de l'Anthropic Academy par des liens sortants uniquement ; aucun contenu
Academy n'est reproduit. « Claude » et « Anthropic Academy » sont des marques
d'Anthropic, citées à titre descriptif.
