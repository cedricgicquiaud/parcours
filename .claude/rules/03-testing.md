# Strategie de tests

## Approche

- TDD strict : tests ecrits AVANT le code de production
- Cycle RED > GREEN > REFACTOR pour chaque fonctionnalite

## Tests unitaires

- Framework : {{Vitest / Jest / Pytest / ...}}
- Commande : `{{npm test / bun test / pytest}}`
- Convention de nommage : {{fichier.test.ts / test_fichier.py}}
- Couverture cible : {{80% / ... (si applicable)}}

## Tests E2E / Integration

- Framework : {{Playwright / Cypress / ... (si applicable)}}
- Commande : `{{npm run test:e2e}}`
- Scenarios couverts : {{parcours utilisateur critiques}}

## Ce qu'on teste

- Logique metier (toujours)
- Cas limites et cas d'erreur
- Integrations externes (avec mocks si necessaire)
- {{Regles specifiques au projet}}

## Règle — un test d'interface affirme ce que l'utilisateur voit et atteint

*(issue de LEARN après 3 occurrences détectées : phase 05 — décompte de
critères testé par le compteur, pas par l'état réel des cases ; phase 07 —
URL de couverture testée par sous-chaîne, 404 silencieux en production ;
recette du 2026-08-16 — avertissement testé par sa présence, pas par sa place,
invisible là où l'on clique.)*

Un test d'interface ne se contente jamais de « le nœud existe dans le DOM ».
Il affirme ce que l'utilisateur **voit et peut utiliser** :

- **La place**, quand elle porte le sens : le bon conteneur (barre d'actions,
  bandeau…), ou l'ordre du document (`compareDocumentPosition`).
- **L'adresse exacte**, jamais une sous-chaîne : `toBe`, pas `toContain`,
  pour une URL ou un chemin.
- **L'état natif du DOM**, pas seulement l'état React : une case venue du HTML
  serveur se vérifie par `checked`, un repliable par l'absence d'`open`.
- **L'effet d'un geste**, pas la seule existence du contrôle : un lien se
  teste par la navigation qu'il déclenche, un bouton par ce qu'il fait.

## Ce qu'on ne teste PAS

- Getters/setters triviaux
- Code genere (migrations, types auto-generes)
- Styles purement visuels (couverts par UAT)

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns de tests recurrents sont detectes.
