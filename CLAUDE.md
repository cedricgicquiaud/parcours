# Parcours

Plateforme personnelle de formation : un **lecteur de formations** en markdown.
Cédric écrit ses formations avec Claude Code (dossier + manifeste), Parcours les
affiche comme un site de cours — catalogue, sommaire, leçons, progression,
« reprendre où j'en étais ». Références UX : Anthropic Academy (organisation),
The Odin Project (markdown + checkboxes), Total TypeScript (exercices),
Josh Comeau (typographie) — détail dans `docs/references-ux.md`.

**PRD VALIDÉ (2026-08-14)** : `.workflow/PRD.md`. Mono-utilisateur local ;
ouverture future (communauté/paiement) non construite mais non interdite.

## Stack

(recette Foreman, à confirmer en BOOTSTRAP/ORIENT)
- Runtime : Node 22 LTS épinglé, TypeScript partout
- Backend : Hono (sert le contenu + progression), better-sqlite3 (WAL)
- UI : React 19 + Vite, CSS pur
- Tests : Vitest
- Dev : 2 process (Vite proxy → backend). Prod : 1 process (backend sert les assets).

## Commandes

(à remplir en BOOTSTRAP)

## Structure

```
formations/    # Les formations (markdown + formation.json + assets/) — lecture seule
server/        # Backend : scan des formations, rendu, progression, API
ui/            # React : catalogue, vue formation, vue leçon
docs/          # Intrants FIND : références UX
.workflow/     # PRD (VALIDATED), SPEC, DECISIONS, sessions/
```

## Phase en cours

**FIND terminé (2026-08-14)** : PRD validé après critique advisor (14 findings
intégrés). **Prochaine étape : BOOTSTRAP** (greenfield), puis SPEC (format de
contenu + SPEC visuelle), REFINE, GENERATE. La conversion de FORMATION_CLAUDE
au format Parcours est un chantier éditorial dédié (après conversion : Parcours
= seule référence du contenu, FORMATION_CLAUDE gelé).

## Decisions

Voir .workflow/DECISIONS.md — P001 (lecteur, pas CMS : création = markdown +
Claude Code, aucun outil auteur), P002 (mono-utilisateur local, ouverture future
bornée : rien de multi-user, pas d'impasses), P003 (légal : contenu Academy
jamais intégré, liens sortants + non-affiliation), P004 (ids stables de leçons =
clé de progression ; formatVersion obligatoire).

Non négociables du PRD : tout local par défaut ; plateforme en lecture seule sur
les dossiers de formation (seule la base de progression est écrite) ; solutions
d'exercices repliées par défaut ; formation invalide toujours signalée avec son
erreur.

## Conventions

Voir .claude/rules/01-conventions.md

## Architecture

Voir .claude/rules/02-architecture.md

## Tests

Voir .claude/rules/03-testing.md

## Recette

La phase DELIVER genere un cahier de recette par feature (`.workflow/UAT.md`).

- Base Notion « Recette Parcours » — data source ID : non configure
- Generer les tests est OBLIGATOIRE a chaque livraison ; les passer est manuel.
- Si pas de base Notion configuree : fallback `.workflow/UAT.md`.
