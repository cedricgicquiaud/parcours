# Parcours

Gestionnaire de formation : on écrit un cours en dossier Markdown (à la main ou avec Claude Code), Parcours
l'affiche comme un site de cours — catalogue, sommaire, leçons, critères de réussite à cocher, « reprendre où
j'en étais ». Multi-utilisateur, tout en local : rien ne sort de la machine.
Vue d'ensemble et installation : `README.md`. Format des formations : `docs/FORMAT.md`. API : `docs/API.md`.

## Stack

- Runtime : Node 22 LTS épinglé (`.nvmrc` + `engines`), TypeScript partout
- Backend : Hono sur `127.0.0.1:4620`, better-sqlite3
- UI : React 19 + Vite, CSS pur
- Tests : Vitest (projets `server` en node, `ui` en jsdom + Testing Library)
- Dev : 2 process (Vite proxy `/api` → 4620). Prod : 1 process (le backend sert les assets).

## Commandes

- `npm run dev` : serveur (port 4620) + UI Vite en parallèle
- `npm test` : tests Vitest — `npm run typecheck` : `tsc --noEmit`
- `npm run build` : typecheck + build UI — `npm start` : serveur production
- `PARCOURS_SMTP_URL` : active l'envoi réel des courriels (sinon journal)

La CI (`.github/workflows/`) lance typecheck, tests et build sur chaque PR. Le merge est humain.

## Structure

```
formations/    # Les formations (formation.json + lecons/*.md + assets/)
server/        # Backend : scan, rendu, progression, comptes, API
ui/            # React : catalogue, formation, leçon, éditeur, console
docs/          # Format, API, références UX, captures
```

Design de référence : `design_handoff_parcours_lecteur/` (palette solaire, colonne latérale de 272 px, aucune
ombre). L'écran formation est absorbé par la colonne latérale, où vit aussi la recherche.

## Décisions produit

- **Les fichiers sont la source de vérité.** Manifeste seul, aucun frontmatter ; `formatVersion` obligatoire.
- **Identifiants stables** de leçons : clé de la progression ; renommer un titre ne la perd pas.
- **Un critère de réussite tire son identité de son texte** : insérer ou déplacer garde la coche, reformuler
  la perd. Parcours n'exécute jamais de code et ne corrige jamais.
- **Lire et écrire séparés** : interrupteur « Édition » réservé aux admins, éteint par défaut ;
  `peutEcrire = admin && edition` est la seule notion d'écriture côté interface ; le serveur garde l'autorisation.
- **Jamais de suppression de fichier** : import, archivage, corbeille, restauration ; l'éditeur refuse
  d'enregistrer si le fichier a changé sur le disque.
- **Multi-utilisateur** : comptes, rôles admin / lecteur, identifiant = adresse e-mail vérifiée ; envoi SMTP
  inactif tant qu'il n'est pas configuré (seule requête sortante possible).
- **Une leçon déclare ce qu'elle suppose** (`suppose`, 5 au plus) : bandeau d'avertissement, jamais de verrou ;
  une référence disparue est ignorée en silence.
- **Recherche plein texte**, indices et solutions exclus de l'index ; solutions repliées par défaut ; une
  formation invalide reste visible avec son erreur exacte.
- **Si quelque chose se vend, ce sont les formations, pas le lecteur** : le contenu passe devant les features ;
  code sous MIT, formations sous droits réservés.
- Contenus tiers jamais intégrés : liens sortants et mention de non-affiliation.

## Conventions

Voir `.claude/rules/01-conventions.md`

## Architecture

Voir `.claude/rules/02-architecture.md`

## Tests

Voir `.claude/rules/03-testing.md`
