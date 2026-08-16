# Benchmark marché — Parcours face aux outils existants

Date : 2026-08-14
Statut : intrant (comme `docs/references-ux.md`), produit à la demande de Cédric
avant validation de la SPEC.
Méthode : quatre recherches web parallèles (plateformes de cours/LMS ; outils
docs-as-code markdown ; sites de cours techniques ; standards d'interopérabilité).
Sources listées en fin de chaque section.

> Réserve de fiabilité : les chiffres d'adoption cités par la presse spécialisée
> e-learning sont promotionnels et se contredisent d'une source à l'autre
> (« SCORM 92 % » ici, « 74 % des organisations » là). Ils sont repris comme
> ordres de grandeur, pas comme mesures.

---

## 1. Conclusion

Parcours n'appartient pas au marché des plateformes de cours (Teachable,
Moodle, Skilljar) : il appartient au marché des outils docs-as-code
(Docusaurus, mdBook, Starlight), dont il reprend le format de contenu, augmenté
des mécaniques d'apprentissage des sites de cours techniques (Odin Project,
Total TypeScript).

Sur ce positionnement, **la SPEC est conforme aux usages** : le benchmark
confirme 8 choix structurants, en corrige 0, et fait apparaître 3 arbitrages
mineurs (§ 5).

---

## 2. Ce que le benchmark confirme

| Choix SPEC | Ce que fait le marché | Verdict |
|---|---|---|
| Manifeste séparé décrivant l'ordre (`formation.json`, F-R1→F-R4) | mdBook `SUMMARY.md`, Nextra `_meta.json`, Docusaurus `sidebars.js`, MkDocs `nav:` | Conforme |
| Conteneurs `:::` pour astuce/attention (F-R7) | Standard de fait Docusaurus (`:::note`, `:::warning`) ; MkDocs utilise `!!! type` | Conforme |
| Repliables fermés par défaut pour indices/solutions (F-R7, U-R4) | Aucune plateforme n'ouvre les solutions par défaut ; révélation volontaire = consensus pédagogique (Total TypeScript, Epic React, Comeau) | Conforme |
| Repliable = `details` natif sans `open` (U-R4) | `<details>/<summary>` est le mécanisme standard partout (GitHub, GitLab, Obsidian) | Conforme, avec un avantage (cf. § 3) |
| Ids stables explicites, découplés du titre (F-R3, P-R2) | Best practice 2025-2026 : id immuable pour l'état, slug lisible pour l'URL, le titre peut dériver | Conforme |
| Rendu markdown côté serveur, sortie assainie par liste blanche (F-R6, A-R5) | `rehype-sanitize` obligatoire ; XSS documentée en 2026 sur un projet ayant activé `rehype-raw` sans assainir | Conforme, plus strict que le marché |
| Coloration syntaxique produite au serveur (F-R9, A-R5, A-R6) | Shiki (grammaires VS Code) rend le HTML au serveur, zéro JavaScript client — c'est la recommandation 2025-2026, adoptée par VitePress, Astro, Nuxt Content | Conforme — candidat désigné pour ORIENT |
| Mermaid rendu client en mode strict (F-R10) | Pas de standard : chaque outil ajoute son support ; rendu client via la lib officielle = pratique courante | Conforme |
| Progression visible (barres par module et globale, U-R2) | La visibilité de la progression est le levier de rétention le plus cité ; freeCodeCamp est critiqué publiquement pour son absence | Conforme |
| Navigation explicite « leçon suivante » + repère « leçon 3/5 » (U-R3) | Le manque de « next lesson » clair est LA critique historique de navigation (Odin Project l'a corrigé à sa refonte) | Conforme |

Sources : [Docusaurus admonitions](https://docusaurus.io/docs/markdown-features/admonitions) ·
[mdBook SUMMARY.md](https://rust-lang.github.io/mdBook/format/summary.html) ·
[Nextra meta files](https://nextra.site/docs/file-conventions/meta-file) ·
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) ·
[Shiki vs Prism vs highlight.js 2026](https://www.pkgpulse.com/guides/shiki-vs-prismjs-vs-highlightjs-syntax-highlighting-2026) ·
[Odin Project — refonte UX](https://eriktrautman.com/posts/theodinproject-com-redesign-part-i-goals-and-loving-thy-user-experience) ·
[freeCodeCamp #63633 — demande de barre de progression](https://github.com/freeCodeCamp/freeCodeCamp/issues/63633)

---

## 3. Là où Parcours est plus strict que le marché — et pourquoi c'est tenable

**Le HTML brut est inerte (F-R6).** Le marché markdown autorise le HTML inline,
puis l'assainit. Parcours ne l'interprète jamais. Conséquence assumée : un
markdown écrit ailleurs avec des `<details>`, `<br>` ou `<img width>` ne rendra
pas — c'est précisément le cas de FORMATION_CLAUDE, dont la conversion (X-R2)
transforme ces balises en conteneurs `:::`.

Le bénéfice n'est pas seulement sécuritaire, il est architectural : comme les
repliables sont produits par le pipeline (`:::solution` → `<details>`) et non
écrits à la main, U-R4 peut garantir qu'aucun attribut `open` ne fuit. Un
`<details open>` copié-collé dans une leçon ne peut pas révéler une solution par
accident. Le marché n'offre pas cette garantie.

---

## 4. Ce que Parcours ne fait pas, et que le marché fait

Rappel : ces absences sont des décisions de produit (PRD § Won't Have, P001,
P002), pas des oublis. Elles sont listées pour être assumées en connaissance de
cause.

| Fonction | Statut marché | Coût de l'absence pour Cédric |
|---|---|---|
| Éditeur de cours intégré (WYSIWYG) | Socle de tous les LMS | Nul — c'est la décision fondatrice P001. Les griefs récurrents des créateurs portent justement sur la rigidité de ces éditeurs et le rendu imprévisible |
| Certificat de complétion | Socle (« Tier 1 ») | Nul aujourd'hui. Premier manque visible en cas d'ouverture à une communauté |
| Quiz notés, logique adaptative | Socle / différenciation | Nul en V1 (PRD : Could Have) |
| Vidéo | Vecteur par défaut du marché créateurs | Nul — refus explicite du PRD, jamais d'hébergement |
| Reprise à la position exacte (scroll, état) | Standard LMS via `suspend_data` | Faible : P-R3 reprend à la première leçon non cochée. Granularité leçon, pas position dans la page |
| Comptes, paiement, communauté | Socle | Nul — P002 |
| Statistiques d'apprentissage | Socle | Nul en mono-utilisateur |

Sources : [Top 15 must-have LMS features 2026](https://www.eleapsoftware.com/top-15-must-have-lms-features-for-2026/) ·
[2026 Course Platform Satisfaction Report](https://www.ruzuku.com/learn/research/course-platform-satisfaction-2026/) ·
[Resume behavior & suspend data](https://www.elearningindustry.com/resume-behavior-suspend-data-elearning)

### Le cas de la recherche

La SPEC déclasse explicitement la recherche de la V1 (§ 8). Le benchmark
**valide** cet arbitrage, contrairement à ce qu'on pouvait supposer :

- Les outils de **documentation** ont tous une recherche (Pagefind, Lunr,
  Algolia) — parce qu'on y arrive par une question précise.
- Les **sites de cours** — Odin Project, freeCodeCamp, Boot.dev — n'en ont
  pas de visible : on y navigue par le sommaire, dans l'ordre.
- Là où elle existe, la recherche sert à **retrouver** un contenu déjà lu, pas
  à explorer ; elle est intégrée au sommaire, pas en page séparée.

Note technique : Pagefind, le meilleur outil du moment, indexe au build —
inadapté à Parcours qui scanne à chaque requête (C-R1). Le candidat serait
Orama, côté serveur.

> **Décision de Cédric, 2026-08-14 (P007) : la recherche entre en V1 malgré cet
> arbitrage**, et avec un périmètre plus large que le PRD — sur le contenu des
> leçons, pas seulement leurs titres. Motif : utilité quotidienne ressentie.
> Le constat ci-dessus reste vrai et explique pourquoi ce n'était pas
> obligatoire ; il ne le rend pas inutile. Spécifiée en SPEC § 3B, avec une
> conséquence non triviale trouvée à l'écriture des règles : **les indices et
> solutions sont exclus de l'index**, faute de quoi un extrait de résultat
> dévoilerait une solution sans geste volontaire (non négociable du PRD).

Sources : [Static site search 2026 — Pagefind vs Algolia vs Lunr](https://dev.to/morinaga/static-site-search-for-astro-in-2026-why-i-picked-pagefind-over-algolia-and-lunr-6dg) ·
[Open LMS — navigation par sommaire](https://support.openlms.net/hc/en-us/articles/23459555546012-Course-Navigation-with-the-Table-of-Contents-TOC)

---

## 5. Trois arbitrages à trancher — TRANCHÉS le 2026-08-14

Les trois recommandations ci-dessous ont été retenues par Cédric et sont
appliquées : A-1 → SPEC F-R13 (décision P005), A-2 → SPEC F-R14 (décision P006),
A-3 → SPEC § 8 + backlog.

### A-1 — Accepter les noms d'admonitions anglais en alias (recommandé)

Parcours nomme ses conteneurs en français : `:::astuce`, `:::attention`. Le
standard de fait est anglais : `:::tip`, `:::warning`, `:::note`, `:::info`,
`:::danger`. Un extrait copié depuis une documentation Docusaurus ne rendra pas.

Proposition : accepter `tip`→astuce et `warning`/`danger`→attention comme alias,
les noms français restant canoniques. Coût : une table de correspondance de
cinq lignes dans le parseur.

### A-2 — Rester au manifeste seul, sans frontmatter YAML (recommandé)

Le marché majoritaire (Docusaurus, VitePress, Nextra, Quartz) met des métadonnées
en tête de chaque fichier markdown, en plus du manifeste. Parcours met tout dans
`formation.json`.

Proposition : ne rien changer. Ajouter un frontmatter créerait deux sources de
vérité pour le titre d'une leçon, donc une classe entière d'incohérences à
spécifier. mdBook et Nextra montrent que le manifeste seul est un choix tenu.
À noter comme décision explicite, pas comme oubli.

### A-3 — Reprise dans la leçon : laisser hors V1 (recommandé)

Les LMS reprennent à la position exacte. P-R3 reprend à la première leçon non
cochée. L'écart ne devient sensible que sur des leçons très longues.

Proposition : backlog, et le réévaluer après la conversion de FORMATION_CLAUDE,
quand la longueur réelle des leçons sera connue.

---

## 6. Standards d'interopérabilité : rien à faire aujourd'hui

- **SCORM** (1.2 / 2004) reste le format d'échange dominant malgré son âge ;
  il transporte complétion, score, temps passé et un signet de reprise.
- **xAPI** ne l'a pas remplacé : il s'ajoute par-dessus, surtout en entreprise.
  cmi5 et Common Cartridge restent marginaux.
- **LTI 1.3** concerne l'intégration d'un outil dans un LMS, pas le format du
  cours.
- **Il n'existe aucun standard ouvert de « cours en markdown ».** La seule
  initiative sérieuse est LiaScript (projet open source, sans gouvernance
  formelle), qui étend le markdown et sait exporter vers SCORM.

Conséquence pour Parcours : le format propriétaire `markdown + formation.json`
avec `formatVersion` (P004) ne s'écarte d'aucun standard existant — il n'y en a
pas. Le premier standard qui compterait, en cas de vente à des organisations,
serait SCORM en **export** ; LiaScript montre qu'un exporteur se greffe après
coup sur un format markdown, ce qui n'impose rien à la V1.

Sources : [SCORM vs xAPI 2026](https://lmspedia.org/scorm-vs-xapi-guide/) ·
[LiaScript](https://github.com/LiaScript/LiaScript) ·
[LiaScript — article de recherche](https://files.eric.ed.gov/fulltext/ED621589.pdf) ·
[LTI Advantage adoption](https://www.1edtech.org/standards/lti/lti-advantage-adoption)

---

## 7. Retombées pour les phases suivantes

- **ORIENT** : Shiki devient le candidat par défaut pour la coloration
  syntaxique (rendu serveur, aucun JavaScript client, cohérent avec A-R5 et
  A-R6). Point de vigilance à vérifier en ORIENT : le moteur d'expressions
  régulières historique de Shiki (Oniguruma) n'est plus développé depuis avril
  2025 ; vérifier l'état du moteur JavaScript de remplacement.
- **ORIENT** : confirmer que le pipeline n'active jamais `rehype-raw` (F-R6 rend
  la question sans objet, mais l'erreur est documentée et fréquente).
- **BACKLOG** : recherche dans une formation ; reprise à la position dans la
  leçon ; export SCORM si ouverture commerciale.
