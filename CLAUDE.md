# {{PROJECT_NAME}}

{{One-line description.}}

## Stack

- Runtime : {{Node 22 / Bun 1.x / Python 3.x / ...}}
- Framework : {{Next.js 15 / Express / Django / ...}}
- Base de donnees : {{PostgreSQL / SQLite / ... + ORM}}
- Tests : {{Vitest / Jest / Pytest / ...}}
- Styling : {{Tailwind / CSS Modules / ... (si frontend)}}

## Commandes

- `{{commande dev}}` — serveur de dev
- `{{commande test}}` — tests unitaires
- `{{commande test:e2e}}` — tests E2E
- `{{commande lint}}` — lint + format
- `{{commande build}}` — build production

## Structure

```
{{src/
  app/          # Routes
  lib/          # Utilitaires partages
  components/   # Composants UI
  db/           # Schema + migrations}}
```

## Phase en cours

{{Phase N : Nom (voir .workflow/phases/NN-nom/PLAN.md)}}

## Decisions

Voir .workflow/DECISIONS.md

## Conventions

Voir .claude/rules/01-conventions.md

## Architecture

Voir .claude/rules/02-architecture.md

## Tests

Voir .claude/rules/03-testing.md

## Recette

La phase DELIVER genere le cahier de recette de chaque feature dans une **base
Notion unique** : un test = une ligne.

- Base Notion « Recette <Projet> » — data source ID : `{{collection id, ou "non configure"}}`
- Colonnes : Test (titre), Fonctionnalite (select), Section (texte), N° (number,
  unique par fonctionnalite), Statut (A recetter / Valide / Echec), Responsable, Branche / PR.
- Vue groupee par Fonctionnalite (sous-groupe par Section a activer a la main : l'API ne le permet pas).
- Generer les tests est OBLIGATOIRE a chaque livraison ; les passer (statut par test)
  est manuel, etale, fait par l'equipe. Pas de synchro retour automatique.
- Si pas de base Notion configuree : fallback `.workflow/UAT.md`.
