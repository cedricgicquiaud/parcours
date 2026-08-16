# Handoff : Parcours — lecteur de formations (V1)

## Overview

Deux écrans du lecteur de formations décrit dans `.workflow/SPEC.md` : le **catalogue**
(`/`) et la **leçon** (`/formation/:fid/lecon/:lid`), avec le sommaire de formation
comme colonne latérale repliable partagée. L'écran formation de la SPEC (§ 5.2) est
absorbé par cette colonne : le sommaire est visible en permanence pendant la lecture,
et le contenu principal du catalogue remplace la page « formation » quand on n'est pas
dans une leçon.

Nom de travail du produit : **Primer** (le nom « Parcours » a été jugé trop générique ;
non tranché définitivement — ne pas le figer dans du code partagé sans confirmation).

## About the Design Files

Les fichiers de ce dossier sont des **références de design écrites en HTML** : des
prototypes qui montrent l'apparence et le comportement visés, pas du code de production
à copier. Le travail consiste à **recréer ces écrans dans l'environnement existant du
dépôt** — ici React 19 + Vite + CSS pur (`ui/`), selon les conventions de
`.claude/rules/01-conventions.md` et `02-architecture.md` — et non à intégrer le HTML
tel quel. Le rendu du markdown reste côté serveur (A-R5) : l'UI reçoit du HTML assaini.

## Fidelity

- `Primer.dc.html` — **haute fidélité**. Couleurs, typographie, espacements, rayons et
  états sont définitifs : à reproduire au pixel.
- `Wireframes.dc.html` — **basse fidélité**, historique des pistes explorées (tour 1 :
  trois options par écran ; tour 2 : la combinaison retenue 1c + 1f + 1j). À lire pour
  comprendre les intentions et les états secondaires (recherche, états vides, erreurs,
  mobile), pas pour le style.

## Screens / Views

### 1. Colonne latérale (chrome partagé, présente sur les deux écrans)

**Purpose** — porter l'identité, la progression, la recherche et la navigation. Il n'y a
**aucune barre de navigation en haut** : c'est une décision de design, pas un oubli.

**Layout** — `position: sticky; top: 0; height: 100vh`, deux états :

- **Déployée** : `width: 272px`, fond `--rail`, bordure droite 1px `--line`.
  De haut en bas : bloc d'en-tête (`padding: 18px 18px 0`, `gap: 18px`) → nav défilante
  (`flex: 1; overflow: auto; padding: 18px 12px 12px`) → pied (`padding: 12px 18px 16px`,
  bordure haute 1px).
- **Repliée (spine)** : `width: 62px`, centrée, `gap: 16px`, `padding: 18px 0`.
  Contient : la marque (carré 17×17, bordure 1.5px `--accent`, rayon 5px), le bouton de
  dépliage (`ph-sidebar-simple`), l'échelle de points de progression, « 39 % » en
  vertical (`writing-mode: vertical-rl`, 10.5px monospace), la loupe et la bascule
  clair/sombre en bas.

**Bloc d'en-tête déployé**

- Marque : carré 16×16 (bordure 1.5px `--accent`, rayon 5px) + « Primer » 14.5px / 500 /
  `letter-spacing: -.01em`. À droite, bouton de repli `ph-sidebar-simple` 16px `--faint`.
- Écran leçon : titre de formation 14px `--text` + barre de progression (hauteur 3px,
  piste `--line`, remplissage `--accent`, rayon 2px) + « 12/31 » 11.5px `--faint`.
- Écran catalogue : « Mes formations » 13.5px `--text` + « 3 formations · 47 leçons ·
  12 terminées » 11.5px `--faint`.
- Champ de recherche (leçon uniquement, § 3B) : boîte `--pane`, bordure 1px `--line`,
  rayon `--r`, `padding: 8px 10px`, loupe 14px `--faint`, input 13px transparent sans
  bordure, badge `/` 11px encadré à droite. Raccourci `/` = focus du champ ; `Échap` vide
  la requête ; les résultats **remplacent** le sommaire dès 2 caractères (U-R9), avec
  extrait de 160 caractères et surlignage `--accent-soft` posé par l'UI à partir des
  positions renvoyées par l'API (S-R6 : jamais de HTML injecté).

**Nav — sommaire (écran leçon)**

- En-tête de module : « 01 · FONDATIONS » 10.5px, `letter-spacing: .11em`, `--faint`,
  compteur « 4/5 » 11px à droite, `padding: 0 8px 7px`.
- Ligne de leçon : `display: flex; gap: 10px; padding: 6px 8px; border-radius: var(--r-sm)`,
  13.5px `--muted`. Leçon cochée : icône `ph-check` 13px `--accent-text`. Non cochée :
  pastille 5×5 `--line` (marge latérale 4px). Leçon courante : fond `--accent-soft`,
  texte `--text`, pastille `--accent`. Survol : fond `--pane`, texte `--text`.
- Espacement entre modules : `gap: 20px`; entre lignes : `gap: 2px`.

**Nav — liste de formations (écran catalogue)** — mêmes lignes, deux niveaux :
titre 13.5px + micro-barre de progression (hauteur 3px) et fraction 11px. La formation
en cours porte le fond `--accent-soft`. Une formation invalide apparaît en ligne inerte
avec `ph-warning` et son id de dossier en monospace 12.5px.

**Pied** — liens « Catalogue » et « Réinitialiser » 12px `--faint` (survol `--text`),
puis bouton de bascule clair/sombre (`ph-sun` en mode sombre, `ph-moon` en clair).

### 2. Catalogue

**Purpose** — reprendre la formation en cours en un geste, voir l'état des autres.

**Layout** — `max-width: 940px; margin: 0 auto; padding: 56px 40px 44px; gap: 26px`.

1. **Titre** : `h1` « Mes formations » 32px / 500 / `line-height: 1.15` /
   `letter-spacing: -.025em`, suivi de « 3 formations · 47 leçons » 12.5px `--faint`.
2. **Carte « en cours »** : fond `--pane`, bordure 1px `--line`, rayon `--r-lg`,
   `padding: 24px 26px`, deux colonnes `gap: 32px`.
   - Gauche : kicker « EN COURS » 11px `letter-spacing: .11em` `--accent-text` ; titre
     lien 22px / 500 / `-.018em` (survol `--accent-text`) ; description 14.5px
     `line-height: 1.6` `--muted`, `max-width: 60ch`, `text-wrap: pretty` ; barre de
     progression 4px (`max-width: 300px`) + « 12 leçons sur 31 — 39 % » 12.5px `--faint`.
   - Droite : séparateur `border-left: 1px solid var(--line)`, `padding-left: 32px` ;
     « PROCHAINE LEÇON » 11px `--faint` ; « Module 01 · Les hooks » 14.5px ; bouton
     « Reprendre » + `ph-arrow-right`.
3. **Grille** : `grid-template-columns: repeat(auto-fill, minmax(244px, 1fr)); gap: 14px`,
   précédée de « TOUTES MES FORMATIONS » 11px `letter-spacing: .11em` `--faint`.
   - Carte valide : fond `--pane`, bordure 1px `--line`, rayon `--r-lg`, `padding: 17px`,
     `gap: 10px` ; titre 16px / 500 ; description 13px `--muted` coupée à 2 lignes
     (`-webkit-line-clamp: 2`) ; barre 4px ; pied « 0/12 leçons » 12px `--faint` +
     UN SEUL bouton d'action (« Commencer » / « Reprendre » / « Revoir », U-R1) —
     « Revoir » en variante neutre (bordure `--line`, texte `--muted`).
   - Carte invalide (C-R3) : même carte + `border-left: 2px solid var(--faint)`,
     `ph-warning`, id de dossier en monospace 13px, message d'erreur exact 13px
     `--muted`, note « Corrigez le manifeste, puis rechargez. » 12px `--faint`.
     Non cliquable.
   - Emplacement vide : bordure 1px **dashed** `--line`, `min-height: 132px`, texte
     centré 13px `--faint` « Déposez un dossier dans `formations/` ».
4. **Pied de page** : bordure haute 1px `--line`, `padding-top: 16px`, « Projet
   indépendant, non affilié à Anthropic. » 12px `--faint` (U-R8, présent sur tous les
   écrans).

### 3. Leçon

**Purpose** — lire, faire l'exercice, cocher, avancer.

**Layout** — `article` `max-width: 700px; margin: 0 auto; padding: 56px 40px 44px;
gap: 20px`, puis barre d'actions `position: sticky; bottom: 0`.

- **Fil d'Ariane** : 12px `--faint`, `letter-spacing: .02em` — « Formation pratique
  Claude / MODULE 01 · LEÇON 4 SUR 5 » (le premier segment ramène au catalogue).
- **Titre** : `h1` 34px / 500 / `1.15` / `-.025em`.
- **Encadré prérequis (F-R7 `:::prerequis`)** : `--pane`, bordure 1px `--line`, rayon
  `--r`, `padding: 13px 16px`, icône `ph-arrow-square-out` `--accent-text`, étiquette
  « AVANT CETTE LEÇON » 12px `letter-spacing: .09em` `--muted`, lien 14px ouvert dans un
  nouvel onglet (`target="_blank" rel="noopener"`).
- **Prose** : 16.5px / `line-height: 1.65` / couleur `--prose` / `text-wrap: pretty`.
  `h2` 21px / 500 / `-.012em`, `margin-top: 16px`.
- **Bloc de code (F-R9)** : `pre` fond `--code`, bordure 1px `--line`, rayon `--r`,
  `padding: 17px 19px`, `font: 400 13.5px/1.7 ui-monospace, SFMono-Regular, Menlo,
  monospace`, `overflow-x: auto`. Commentaires en `--muted`, clés en `--accent-text`
  (la coloration réelle viendra de Shiki côté serveur). Légende 12.5px `--faint`.
- **Encadré astuce (`:::astuce`)** : fond `--accent-soft`, **sans bordure**, rayon `--r`,
  `padding: 15px 17px`, icône `ph-lightbulb` 17px `--accent-text`, étiquette « ASTUCE »
  11.5px `letter-spacing: .07em` `--accent-text`, texte 15px / 1.58.
- **Code inline** : fond `--code`, rayon 4px, `padding: 2px 5px`, 14px monospace.
- **Critères** : `ul` `padding-left: 20px; gap: 8px`, 16px `--prose`.
- **Indice / solution (U-R4)** : `<details>` natif **sans `open`**, bordure 1px `--line`,
  rayon `--r`, fond `--pane` ; `summary` `padding: 13px 16px`, 14.5px, chevron
  `ph-caret-right` 12px `--faint`, marqueur natif masqué
  (`list-style: none` + `::-webkit-details-marker { display: none }`) ; corps
  `padding: 0 16px 15px 40px`, 15px / 1.6 `--muted`. L'ouverture n'est jamais persistée.
- **Barre d'actions (U-R3)** : `sticky bottom`, fond `--bar` + `backdrop-filter: blur(8px)`,
  bordure haute 1px `--line`, `padding: 13px 40px`, contenu centré sur 700px, `gap: 10px`.
  Précédent / suivant : boutons 13.5px `--muted`, bordure 1px `--line`, rayon `--r`,
  libellés = titres réels des leçons voisines. Bouton central `flex: 1`, bordure 1px
  `--accent`, texte `--accent-text` : « Marquer comme terminé » (`ph-check`) ↔ « Terminé »
  (`ph-check-circle`, fond `--accent-soft`).

## Interactions & Behavior

- **Repli du latéral** : bouton `ph-sidebar-simple` (déployé) et son symétrique dans le
  spine. État à mémoriser (localStorage ou préférence serveur). Le spine ne disparaît
  jamais : la position dans le module reste lisible.
- **Bascule clair/sombre** : bouton en pied de latéral et de spine ; la classe de palette
  est posée sur la racine **et sur `document.body`** (sinon l'overscroll laisse voir
  l'autre fond).
- **Recherche** : anti-rebond 200 ms, réponse plus ancienne que la requête courante
  ignorée, `role="search"`, champ étiqueté, nombre de résultats en `aria-live="polite"`,
  raccourci `/`, `Échap` pour revenir au sommaire, bouton « × » d'effacement.
  Ordre = ordre du manifeste, 50 résultats max, indices et solutions jamais indexés (S-R2).
- **Coche** : optimiste, retour arrière visible si l'API échoue (U-R3). `PUT`/`DELETE`
  idempotents.
- **Navigation** : « Suivante » depuis la dernière leçon → sommaire. Aucune leçon
  verrouillée.
- **Refetch** : à chaque navigation et au focus de la fenêtre (P-R7).
- **États à implémenter** (dessinés dans `Wireframes.dc.html`, option `1h`) : catalogue
  vide / erreur serveur / squelettes, leçon en chargement (squelette de prose), leçon
  illisible (A-R3), bandeau « progression réinitialisée (base corrompue sauvegardée) »
  (P-R1), bandeau orphelines + « Nettoyer » (P-R4), confirmations de « Réinitialiser »
  et « Nettoyer ».
- **Responsive (U-R6)** : sous 720 px le latéral devient un tiroir superposé appelé
  par un bouton, les actions de pied passent pleine largeur, aucune fonction perdue.

## State Management

| État | Type | Notes |
| --- | --- | --- |
| `screen` | `'catalogue' \| 'lecon'` | remplacé par le routeur réel |
| `railCollapsed` | booléen | persistant |
| `mode` | `'clair' \| 'sombre'` | persistant ; classe posée sur la racine et `body` |
| `query` | chaîne | vidée par `Échap` et par la navigation (la requête n'est pas mémorisée, § 6.5) |
| `done` | booléen par leçon | miroir optimiste de `(formationId, leconId)` |

Données : `GET /api/formations` (catalogue), `GET /api/formations/:fid` (sommaire +
progression + orphelines), `GET /api/formations/:fid/lecons/:lid` (HTML assaini),
`GET /api/formations/:fid/recherche?q=`, `PUT`/`DELETE /api/progression/:fid/:lid`,
`POST /api/progression/:fid/reset|nettoyer`.

## Design Tokens

Palette **solaire**, transposée du thème fourni par le client (orange `#f2701f`,
Open Sans, rayon 1.3rem, aucune ombre).

| Token | Clair | Sombre |
| --- | --- | --- |
| `--bg` | `#ffffff` | `#0b0a09` |
| `--pane` (cartes, encadrés) | `#faf9f7` | `#211f1c` |
| `--rail` (latéral) | `#f6f4f1` | `#141311` |
| `--text` | `#302a22` | `#eae7e4` |
| `--prose` (corps de texte) | `#3c352c` | `#dcd8d4` |
| `--muted` | `#5f574d` | `#9a938c` |
| `--faint` (micro-étiquettes) | `#655d53` | `#968f88` |
| `--line` | `#eae4dc` | `#37342f` |
| `--accent` (traits, marques, bordures) | `#f2701f` | `#f2701f` |
| `--accent-text` (texte accentué) | `#a8480a` | `#f59a5f` |
| `--accent-soft` (fonds teintés) | `rgba(242,112,31,.10)` | `rgba(242,112,31,.14)` |
| `--code` | `#f6f4f1` | `#161412` |
| `--bar` (barre d'actions translucide) | `rgba(255,255,255,.94)` | `rgba(11,10,9,.93)` |

Deux écarts assumés par rapport au CSS fourni, tous deux imposés par U-R7
(contraste ≥ 4.5:1) : en mode clair le **texte** accentué est `#a8480a` et non l'orange
pur (2.9:1) ; le fond sombre est `#0b0a09` et non le noir pur, pour que les cartes
`--pane` restent lisibles. `--faint` a été assombri jusqu'à passer le seuil sur `--rail`,
qui est le pire cas.

**Rayons** : `--r: 14px` (boutons, champs, encadrés, `details`), `--r-lg: 20px` (cartes),
`--r-sm: 12px` (lignes de sommaire). Petits éléments (badges, pastilles) : 2 à 6 px.

**Aucune ombre** — l'élévation est une bordure 1px `--line` plus un changement de fond
(`--shadow-opacity: 0` du thème fourni).

**Typographie** : Open Sans 400/500/600. Échelle : 34 (h1 leçon), 32 (h1 catalogue),
22 (titre de carte en cours), 21 (h2), 16.5 (prose), 16 (listes), 14.5–13.5 (interface),
12.5–12 (méta), 11.5–10.5 (micro-étiquettes, `letter-spacing` .07–.11em).
`line-height` : 1.65 pour la prose (≥ 1.5 exigé), 1.15–1.3 pour les titres.
Largeur de prose : 700px de colonne, descriptions plafonnées à 60–66ch (≤ 72ch exigé).

**Espacements** : 56/40 (marges de page), 26 (blocs du catalogue), 24/26 (intérieur de la
carte en cours), 20 (rythme de la prose), 17–18 (intérieur des cartes), 14 (grille),
10–13 (contrôles), 2–8 (listes).

**États** : survol des lignes de sommaire = fond `--pane` ; survol des boutons neutres =
bordure `--accent` + texte `--text` ; survol des boutons accentués = fond `--accent-soft` ;
focus clavier = `outline: 2px solid var(--accent); outline-offset: 2px` (jamais l'anneau
bleu par défaut) ; `::selection` = `--accent-soft`.

## Assets

- **Icônes** : Phosphor Icons (regular), chargées par CDN dans le prototype
  (`@phosphor-icons/web@2.1.1`). Glyphes utilisés : `sidebar-simple`,
  `magnifying-glass`, `check`, `check-circle`, `caret-right`, `arrow-left`,
  `arrow-right`, `arrow-square-out`, `lightbulb`, `warning`, `x`, `sun`, `moon`.
  Contrainte A-R6 : aucune requête sortante en production — **vendorer** la police
  d'icônes (ou n'importer que les SVG utilisés) dans `ui/`.
- **Police** : Open Sans, à vendorer également (`@font-face` local).
- Aucune image : le prototype n'utilise aucune photographie ni illustration.

## Files

- `Primer.dc.html` — les deux écrans en haute fidélité, avec le latéral repliable, la
  recherche, la bascule clair/sombre et la bascule « terminé ». Réglages exposés en haut
  du fichier : `mode`, `screen`, `railCollapsed`, `lessonDone`.
- `Wireframes.dc.html` — l'exploration basse fidélité : tour 1 (trois pistes par écran,
  plus les états et les pistes de nom), tour 2 (la combinaison retenue et ses états
  latéral déployé / masqué / recherche / mobile).

Les deux fichiers s'ouvrent directement dans un navigateur.
