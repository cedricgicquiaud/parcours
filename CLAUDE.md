# Parcours

Plateforme personnelle de formation : un **lecteur de formations** en markdown.
Cédric écrit ses formations avec Claude Code (dossier + manifeste), Parcours les
affiche comme un site de cours — catalogue, sommaire, leçons, progression,
« reprendre où j'en étais ». Références UX : Anthropic Academy (organisation),
The Odin Project (markdown + checkboxes), Total TypeScript (exercices),
Josh Comeau (typographie) — détail dans `docs/references-ux.md`.

**PRD VALIDÉ (2026-08-14)** : `.workflow/PRD.md`. Le PRD posait un usage
mono-utilisateur local ; **P011 (2026-08-15) l'a ouvert au multi-utilisateur**
(comptes, authentification, rôles). Tout reste local : rien ne sort de la
machine.

## Stack

(recette Foreman, installée en BOOTSTRAP le 2026-08-14)
- Runtime : Node 22 LTS épinglé (`.nvmrc` + `engines`), TypeScript partout
- Backend : Hono sur port 4620 (127.0.0.1), better-sqlite3
- UI : React 19 + Vite, CSS pur
- Tests : Vitest (projets `server` en node, `ui` en jsdom + Testing Library)
- Dev : 2 process (Vite proxy `/api` → 4620). Prod : 1 process (backend sert les assets).

## Commandes

- `npm run dev` : serveur (port 4620) + UI Vite en parallèle
- `PARCOURS_SMTP_URL` : active l'envoi réel des courriels (sinon journal)
- `npm test` : tests Vitest — `npm run typecheck` : tsc --noEmit
- `npm run build` : typecheck + build UI — `npm start` : serveur production

## Structure

```
formations/    # Les formations (markdown + formation.json + assets/)
server/        # Backend : scan, rendu, progression, comptes, API
ui/            # React : catalogue, formation, leçon, profil, console
docs/          # Intrants FIND : références UX
.workflow/     # PRD (VALIDATED), SPEC, DECISIONS, sessions/
```

## Phase en cours

**V1 implémentée (2026-08-15)** sur la branche `feature/lecteur-v1` : serveur
complet (scan/validation, rendu markdown assaini, progression SQLite, recherche
plein texte, API locale) et interface complète (catalogue, formation, leçon,
colonne latérale repliable, recherche, mode clair/sombre, responsive).
**Espace d'administration ajouté (2026-08-15, décision P008)** : création d'une
formation et modification de sa structure depuis l'interface.
**Éditeur de leçon ajouté (2026-08-15, décision P009)** : le markdown s'écrit
dans l'application, aperçu rendu par le serveur, écriture refusée si le fichier
a changé sur le disque.
**Administration complète du cycle de vie (2026-08-15, décision P010)** : import
d'un dossier par glisser-déposer (manifeste déduit s'il manque), archivage,
corbeille, restauration — aucune suppression de fichier, jamais. Plan et règles
métier : `.workflow/phases/02-administration/PLAN.md`.
**Comptes et authentification (2026-08-15, décision P011 — remplace P002)** :
Parcours est multi-utilisateur. Installation du premier administrateur au
démarrage, connexion par cookie de session, profil personnel, console
d'administration des comptes, progression rattachée au compte, écriture des
formations réservée aux administrateurs. Règles :
`.workflow/phases/03-comptes/PLAN.md`.
**Adresse e-mail vérifiée (2026-08-15, décision P012)** : l'identifiant est une
adresse e-mail, confirmée par un lien ; inscription libre optionnelle, mot de
passe oublié autonome. Envoi **opt-in** : sans `PARCOURS_SMTP_URL`, rien ne sort
de la machine, les liens s'affichent dans le journal du serveur. Règles :
`.workflow/phases/04-email/PLAN.md`.
**Critères de réussite cochables (2026-08-15, décision P014)** : toute case à
cocher d'une leçon devient un critère mémorisé par compte, avec décompte
« n/N » ; cocher le dernier termine la leçon. Parcours n'exécute jamais de code
et ne corrige jamais : les exercices pratiques se font dans un terminal, avec
Claude Code. Règles : `.workflow/phases/05-criteres/SPEC.md` et son `PLAN.md`.
**Fiche de présentation (2026-08-16, décision P015)** : le manifeste accueille
couverture, présentation, objectifs, prérequis et durées (tous facultatifs) ;
l'écran d'une formation devient une vraie page d'entrée, et une couverture se
dépose depuis la fiche sans jamais écraser l'ancienne. Règles :
`.workflow/phases/07-fiche-formation/SPEC.md`.
570 tests verts, typecheck et build verts. Cahier de recette : `.workflow/UAT.md`.

Design de référence : `design_handoff_parcours_lecteur/` (palette solaire,
colonne latérale de 272 px, aucune ombre). **Écart assumé avec la SPEC § 5.2** :
l'écran formation est absorbé par la colonne latérale, où vit aussi la recherche.

**Lire et écrire séparés (2026-08-16, décision P016)** : les gestes d'écriture
vivent derrière un interrupteur « Édition » au pied de la colonne, réservé aux
administrateurs et éteint par défaut ; en lecture, Parcours n'affiche aucun
outil d'auteur. Les routes d'écriture et la console des comptes sont gardées
côté interface (refus expliqué), l'autorisation restant celle du serveur.
Règles : `.workflow/phases/08-mode-edition/SPEC.md`.

**Orientation produit (2026-08-15, décision P013)** : si Parcours donne lieu un
jour à une activité commerciale, ce sont les **formations** qui se vendent, pas
le lecteur. Conséquence sur les priorités : le contenu passe devant les features
de l'outil. Aucun chantier de commercialisation n'est ouvert (hébergement,
paiement, RGPD : rien n'est tranché).

La phase 05 « Critères de réussite cochables » (`.workflow/phases/05-criteres/`)
est **terminée** : SPEC, PLAN, 12 tâches en TDD, gate verte. Elle sert
directement le contenu (les 107 critères déjà écrits deviennent utilisables),
donc elle ne contredit pas la priorité posée par P013.

Suite envisagée, non cadrée : la **révision espacée** — ramener les critères
restés ouverts au bout de quelques jours. Chaque bascule est déjà datée en base ;
le rythme se décidera après usage réel.

Restent : la recette manuelle (UAT), puis la conversion éditoriale de
FORMATION_CLAUDE au format Parcours (chantier dédié — après conversion,
Parcours = seule référence du contenu, FORMATION_CLAUDE gelé). **C'est ce
chantier que P013 met en tête.**

## Mode de travail

**Mode autonome ACTIVÉ sur ce projet (2026-08-15, demande explicite de Cédric).**
Les PAUSE de FORGE (fin de FIND, SPEC, REFINE) deviennent des points
d'information : poster le PRD / SPEC / PLAN et enchaîner sans attendre. Fin de
DELIVER → merge de la PR si et seulement si la gate est verte (tests + typecheck,
sortie réelle collée) → LEARN → phase suivante du backlog. Seuls arrêts : blocage
réel (3 échecs, `blocked.md`) ou décision hors plan. Jamais de push direct sur
`main`.

Documentation du format pour les auteurs : `docs/FORMAT.md`. API : `docs/API.md`.

## Decisions

Voir .workflow/DECISIONS.md — P001 (lecteur, pas CMS : création = markdown +
Claude Code, aucun outil auteur), P002 (mono-utilisateur local, ouverture future
bornée : rien de multi-user, pas d'impasses — **remplacée par P011**), **P008 qui
renverse P001 (espace d'administration de la structure), P009 qui lève son
dernier garde-fou (édition du contenu des leçons, protégée contre l'écrasement),
P010 qui ouvre le cycle de vie complet (import par dépôt, archivage, corbeille —
jamais de suppression de fichier), P011 qui rend Parcours multi-utilisateur
(comptes, authentification, rôles admin/lecteur, console) et P012 qui fait de
l'identifiant une adresse e-mail vérifiée (envoi SMTP opt-in)**,
P003 (légal : contenu Academy
jamais intégré, liens sortants + non-affiliation), P004 (ids stables de leçons =
clé de progression ; formatVersion obligatoire), P005 (alias anglais des blocs
`:::`), P006 (manifeste seul, aucun frontmatter), P007 (recherche plein texte
dans la V1, indices et solutions exclus de l'index), **P013 (orientation
produit : si quelque chose se vend, ce sont les formations, pas le lecteur —
le contenu passe devant les features ; aucun chantier de commercialisation
ouvert), P014 (les critères de réussite sont l'unité fine de progression ;
identité dérivée du texte, donc reformuler un critère perd sa coche ; Parcours
n'exécute jamais de code et ne corrige jamais), P016 (lire et écrire ne sont
plus le même écran : interrupteur « Édition » réservé aux admins, éteint par
défaut ; `peutEcrire = admin && edition` est la seule notion d'écriture côté
interface)**.

Non négociables du PRD : tout local par défaut (serveur sur 127.0.0.1, aucune
requête sortante depuis l'interface ; **seule exception, P012 : l'envoi SMTP,
inactif tant qu'il n'est pas configuré**) ; écriture des formations limitée aux gestes explicites d'un
administrateur (P008, P009, P010, P011 — jamais de suppression de fichier,
jamais d'écrasement silencieux) ; solutions
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
