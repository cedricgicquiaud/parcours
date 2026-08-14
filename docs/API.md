# API Parcours — squelette

> Document rempli au fil des phases GENERATE. Contrats définitifs en SPEC.

Base : `http://127.0.0.1:4620/api`

## Routes prévues (indicatif, à confirmer en SPEC)

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/health` | Sonde de vie (existe déjà) |
| GET | `/api/formations` | Catalogue : formations valides + invalides avec erreur |
| GET | `/api/formations/:id` | Sommaire d'une formation (modules, leçons, progression) |
| GET | `/api/formations/:id/lecons/:leconId` | Contenu d'une leçon |
| POST | `/api/progression/...` | Cocher / décocher une leçon |

Contraintes transverses (PRD) : lecture seule sur `formations/`, assets servis
avec validation de chemin, jamais de requête réseau sortante.
