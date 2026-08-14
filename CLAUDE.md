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

**FIND terminé (2026-08-14)** : PRD validé après critique advisor (14 findings
intégrés). **BOOTSTRAP terminé (2026-08-14)** : stack installée (typecheck vert,
better-sqlite3 et esbuild vérifiés), hooks FORGE actifs, README + docs/API.md.
**SPEC rédigée (2026-08-14, statut DRAFT)** : `.workflow/SPEC.md`, critique
advisor appliquée (22 findings), puis **révisée après benchmark marché**
(`docs/benchmark-marche.md`) : F-R13, F-R14 et § 3B recherche plein texte
(P005/P006/P007). **Prochaine étape : validation de la SPEC par
Cédric**, puis ORIENT léger (lib markdown/sanitisation, Shiki pour la
coloration), REFINE, GENERATE.
Reprendre via `.workflow/sessions/2026-08-14-benchmark-marche-revision-spec.md`. La conversion de FORMATION_CLAUDE
au format Parcours est un chantier éditorial dédié (après conversion : Parcours
= seule référence du contenu, FORMATION_CLAUDE gelé).

## Decisions

Voir .workflow/DECISIONS.md — P001 (lecteur, pas CMS : création = markdown +
Claude Code, aucun outil auteur), P002 (mono-utilisateur local, ouverture future
bornée : rien de multi-user, pas d'impasses), P003 (légal : contenu Academy
jamais intégré, liens sortants + non-affiliation), P004 (ids stables de leçons =
clé de progression ; formatVersion obligatoire), P005 (alias anglais des blocs
`:::`), P006 (manifeste seul, aucun frontmatter), P007 (recherche plein texte
dans la V1, indices et solutions exclus de l'index).

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
