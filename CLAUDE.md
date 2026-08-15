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

(recette Foreman, installée en BOOTSTRAP le 2026-08-14)
- Runtime : Node 22 LTS épinglé (`.nvmrc` + `engines`), TypeScript partout
- Backend : Hono sur port 4620 (127.0.0.1), better-sqlite3
- UI : React 19 + Vite, CSS pur
- Tests : Vitest (projets `server` en node, `ui` en jsdom + Testing Library)
- Dev : 2 process (Vite proxy `/api` → 4620). Prod : 1 process (backend sert les assets).

## Commandes

- `npm run dev` : serveur (port 4620) + UI Vite en parallèle
- `npm test` : tests Vitest — `npm run typecheck` : tsc --noEmit
- `npm run build` : typecheck + build UI — `npm start` : serveur production

## Structure

```
formations/    # Les formations (markdown + formation.json + assets/) — lecture seule
server/        # Backend : scan des formations, rendu, progression, API
ui/            # React : catalogue, vue formation, vue leçon
docs/          # Intrants FIND : références UX
.workflow/     # PRD (VALIDATED), SPEC, DECISIONS, sessions/
```

## Phase en cours

**V1 implémentée (2026-08-15)** sur la branche `feature/lecteur-v1` : serveur
complet (scan/validation, rendu markdown assaini, progression SQLite, recherche
plein texte, API locale) et interface complète (catalogue, formation, leçon,
colonne latérale repliable, recherche, mode clair/sombre, responsive).
**Espace d'administration ajouté (2026-08-15, décision P008)** : création d'une
formation et modification de sa structure depuis l'interface — Parcours écrit
désormais dans `formations/`, mais jamais le texte des leçons.
207 tests verts, typecheck et build verts. Cahier de recette : `.workflow/UAT.md`.

Design de référence : `design_handoff_parcours_lecteur/` (palette solaire,
colonne latérale de 272 px, aucune ombre). **Écart assumé avec la SPEC § 5.2** :
l'écran formation est absorbé par la colonne latérale, où vit aussi la recherche.

Restent : la recette manuelle (UAT), puis la conversion éditoriale de
FORMATION_CLAUDE au format Parcours (chantier dédié — après conversion,
Parcours = seule référence du contenu, FORMATION_CLAUDE gelé).

Documentation du format pour les auteurs : `docs/FORMAT.md`. API : `docs/API.md`.

## Decisions

Voir .workflow/DECISIONS.md — P001 (lecteur, pas CMS : création = markdown +
Claude Code, aucun outil auteur), P002 (mono-utilisateur local, ouverture future
bornée : rien de multi-user, pas d'impasses), **P008 qui renverse P001 : espace
d'administration de la STRUCTURE (le contenu des leçons reste hors de portée)**, P003 (légal : contenu Academy
jamais intégré, liens sortants + non-affiliation), P004 (ids stables de leçons =
clé de progression ; formatVersion obligatoire), P005 (alias anglais des blocs
`:::`), P006 (manifeste seul, aucun frontmatter), P007 (recherche plein texte
dans la V1, indices et solutions exclus de l'index).

Non négociables du PRD : tout local par défaut ; lecture seule sur le CONTENU
des leçons (P008 : seules la structure et la base de progression sont écrites) ; solutions
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
