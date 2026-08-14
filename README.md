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

## Structure

```
formations/    # Les formations (markdown + formation.json + assets/) — lecture seule
server/        # Backend Hono : scan des formations, API, progression (SQLite)
ui/            # React + Vite : catalogue, vue formation, vue leçon
docs/          # Références UX, doc API
.workflow/     # Workflow FORGE : PRD, SPEC, décisions, recettes
```

## Statut

Projet en construction (workflow FORGE). PRD validé le 2026-08-14 —
voir `.workflow/PRD.md`.

## Affiliation

Projet personnel et indépendant. La première formation hébergée accompagne les
cours de l'Anthropic Academy par des liens sortants uniquement ; aucun contenu
Academy n'est reproduit. « Claude » et « Anthropic Academy » sont des marques
d'Anthropic, citées à titre descriptif.
