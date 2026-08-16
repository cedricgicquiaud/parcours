# API Parcours

Base : `http://127.0.0.1:4620/api` — le serveur n'écoute que sur la boucle locale.

## Garde locale (A-R1)

Toutes les routes vérifient l'en-tête `Host` : un hôte non local répond `403`.
Sur une mutation (`PUT`, `DELETE`, `POST`), un en-tête `Origin` non local répond
`403` ; un `Origin` absent est accepté (curl et scripts locaux n'en envoient pas).

## Authentification (P011)

La garde locale passe en premier, l'authentification ensuite.

- Tant qu'**aucun compte n'existe**, toutes les routes répondent `503` avec
  `{ "installation": true }`, sauf `/api/health` et `/api/auth/*`.
- Ensuite, toute route hors `/api/health` et `/api/auth/*` exige une session
  valide : sans cookie, `401`.
- Le cookie `parcours_session` est posé à la connexion :
  `HttpOnly; SameSite=Strict; Path=/`, 30 jours, prolongé à mi-parcours. Pas de
  `Secure` : le serveur n'écoute qu'en clair sur la boucle locale.
- Deux rôles. **`lecteur`** lit les formations, gère sa progression et son
  profil. **`admin`** fait tout cela, plus l'écriture des formations (structure,
  édition, import, archivage, corbeille), les vues `/structure` et `/source`, et
  la console des comptes. Un lecteur sur une de ces routes reçoit `403`.

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/auth/etat` | Installation requise ? compte connecté ? inscription ouverte ? |
| POST | `/api/auth/installer` | Créer le tout premier compte (administrateur) |
| POST | `/api/auth/connexion` | `{ identifiant, motDePasse }` |
| POST | `/api/auth/deconnexion` | Révoque la session et efface le cookie |
| POST | `/api/auth/inscription` | Inscription libre, si le réglage l'autorise |
| POST | `/api/auth/confirmer` | `{ jeton }` reçu par courriel |
| POST | `/api/auth/renvoyer-confirmation` | `{ identifiant }` |
| POST | `/api/auth/motdepasse-oublie` | `{ identifiant }` |
| POST | `/api/auth/motdepasse-reinitialiser` | `{ jeton, motDePasse }` |
| GET | `/api/reglages` | Réglages de l'instance (admin) |
| PUT | `/api/reglages` | Modifier les réglages (admin) |
| GET | `/api/profil` | Compte connecté |
| PUT | `/api/profil` | `{ nom }` |
| PUT | `/api/profil/motdepasse` | `{ actuel, nouveau }` |
| GET | `/api/utilisateurs` | Liste des comptes (admin) |
| POST | `/api/utilisateurs` | Créer un compte (admin) |
| PATCH | `/api/utilisateurs/:id` | Nom, identifiant, rôle, activation (admin) |
| POST | `/api/utilisateurs/:id/motdepasse` | Mot de passe provisoire (admin) |
| POST | `/api/utilisateurs/:id/confirmation` | Renvoyer le lien de confirmation (admin) |
| POST | `/api/utilisateurs/:id/confirmer` | Confirmer l'adresse à la main (admin) |
| DELETE | `/api/utilisateurs/:id` | Supprimer un compte désactivé (admin) |

**Connexion.** Identifiant inconnu, mot de passe faux et compte désactivé
donnent tous `401` avec le même message : rien ne révèle l'existence d'un
compte. Après 10 échecs sur un même identifiant en 15 minutes, `429`.

**Mots de passe.** Hachés avec scrypt (N=16384, r=8, p=1, sel de 16 octets),
10 caractères au minimum. **Aucune réponse ne contient jamais d'empreinte.** Un
mot de passe provisoire créé par un administrateur n'apparaît que dans la
réponse à ce geste, jamais ailleurs.

**Garde-fous de la console.** Un administrateur ne peut ni changer son propre
rôle, ni se désactiver, ni se supprimer (`409`). Le dernier administrateur actif
ne peut être ni rétrogradé ni désactivé (`409`). Un compte ne se supprime que
désactivé (`409` sinon) ; sa suppression efface sa progression et ses sessions.
Désactiver un compte révoque ses sessions immédiatement.

**Progression.** Elle est rattachée au compte : deux personnes ont deux
avancements distincts sur la même formation. Les coches d'une base d'avant les
comptes sont reprises par le premier administrateur créé.

## Adresse e-mail vérifiée (P012)

**L'identifiant est une adresse e-mail.** Validée de format à la création et à
la modification, normalisée en minuscules. Les comptes créés avant cette règle
restent utilisables tels quels.

**Confirmation.** Chaque compte porte `emailVerifie`. Le premier administrateur
l'est d'office ; tout autre compte naît non confirmé et reçoit un lien. Le jeton
fait 32 octets aléatoires, est stocké haché, vaut **une seule fois**, et expire
en 48 h (confirmation) ou 1 h (réinitialisation). Un nouveau lien annule le
précédent, et un envoi au plus par minute et par adresse.

**Connexion d'un compte non confirmé** : le mot de passe est vérifié d'abord ;
s'il est bon mais l'adresse non confirmée, `403` avec `emailNonConfirme: true`.
Un mot de passe faux donne le `401` indiscernable habituel — l'état de
confirmation n'est jamais révélé à qui n'a pas le mot de passe.

**Aucune énumération.** `inscription`, `renvoyer-confirmation` et
`motdepasse-oublie` répondent toujours `200` avec le même message, que l'adresse
existe ou non. Une inscription sur une adresse déjà prise ne crée aucun compte
et envoie un courriel d'alerte à la personne concernée.

**Réinitialisation.** `motdepasse-reinitialiser` change le mot de passe, révoque
**toutes** les sessions du compte et confirme l'adresse au passage. Si le
nouveau mot de passe est refusé, la réponse `400` porte un `jeton` réémis :
inutile de retourner dans sa boîte pour une faute de frappe.

**Envoi.** Sans `PARCOURS_SMTP_URL`, Parcours n'ouvre **aucune connexion
sortante** : le message et son lien s'écrivent dans le journal du serveur. Avec
l'URL configurée, l'envoi part en SMTP. Un échec d'envoi ne change jamais la
réponse rendue : le lien reste réémissible.

**Réglages** (`GET`/`PUT /api/reglages`, admin) :

```json
{
  "reglages": {
    "inscriptionOuverte": false,
    "urlPublique": "http://127.0.0.1:4620",
    "expediteur": "Parcours <parcours@localhost>"
  },
  "envoiCourriel": "journal"
}
```

`urlPublique` sert à construire les liens des courriels ; elle doit être http ou
https. `inscriptionOuverte` est **fermée par défaut**.

## Routes

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/health` | Sonde de vie |
| GET | `/api/formations` | Catalogue : formations, archives et corbeille |
| POST | `/api/formations` | Créer une formation (administration) |
| POST | `/api/formations/import` | Importer un dossier déposé |
| POST | `/api/formations/:fid/archiver` | Archiver une formation |
| DELETE | `/api/formations/:fid` | Mettre à la corbeille |
| POST | `/api/archives/:fid/restaurer` | Restaurer une archive |
| DELETE | `/api/archives/:fid` | Mettre une archive à la corbeille |
| GET | `/api/corbeille` | Contenu de la corbeille |
| POST | `/api/corbeille/:entree/restaurer` | Restaurer depuis la corbeille |
| GET | `/api/formations/:fid/structure` | Structure éditable |
| PUT | `/api/formations/:fid/structure` | Enregistrer titres, ordre et composition |
| GET | `/api/formations/:fid` | Sommaire, progression et orphelines |
| GET | `/api/formations/:fid/lecons/:lid` | Leçon rendue en HTML assaini |
| GET | `/api/formations/:fid/lecons/:lid/source` | Markdown d'une leçon (éditeur) |
| PUT | `/api/formations/:fid/lecons/:lid/source` | Enregistrer le markdown d'une leçon |
| POST | `/api/formations/:fid/apercu` | Rendre un markdown non enregistré |
| GET | `/api/formations/:fid/recherche?q=` | Recherche plein texte dans la formation |
| GET | `/api/formations/:fid/assets/*` | Fichier joint d'une formation |
| PUT | `/api/progression/:fid/:lid` | Marquer une leçon terminée |
| DELETE | `/api/progression/:fid/:lid` | Décocher une leçon |
| POST | `/api/progression/:fid/reset` | Réinitialiser une formation |
| POST | `/api/progression/:fid/nettoyer` | Purger les coches orphelines |

Les identifiants sont résolus par correspondance **exacte** dans le résultat du
scan, sensible à la casse : `Formation-Claude` et `formation-claude` sont deux
choses différentes (A-R7).

## GET /api/formations

```json
{
  "formations": [
    {
      "statut": "valide",
      "id": "prise-en-main",
      "titre": "Prise en main de Parcours",
      "description": "…",
      "modules": 2,
      "lecons": 6,
      "faites": 1,
      "pourcentage": 17,
      "action": "reprendre",
      "prochaine": { "id": "anatomie-formation", "titre": "…", "moduleTitre": "Découverte" }
    },
    { "statut": "invalide", "id": "un-dossier-fautif", "erreur": "modules[0].id manquant" }
  ],
  "archivees": [
    { "statut": "valide", "id": "vieux-cours", "titre": "Vieux cours", "lecons": 4 }
  ],
  "corbeille": [
    {
      "entree": "vieux-cours--20260815-142530",
      "id": "vieux-cours",
      "titre": "Vieux cours",
      "supprimeeLe": "2026-08-15T12:25:30.000Z"
    }
  ],
  "progressionReinitialisee": false,
  "erreurGlobale": "dossier introuvable : /chemin"
}
```

`action` vaut `commencer` (rien de coché), `reprendre` (en cours) ou `revoir`
(100 %). `erreurGlobale` n'apparaît que si le dossier de formations lui-même est
introuvable, illisible ou n'est pas un dossier. `progressionReinitialisee` passe
à `true` quand la base a été trouvée corrompue au démarrage et sauvegardée.

## GET /api/formations/:fid

```json
{
  "id": "prise-en-main",
  "titre": "Prise en main de Parcours",
  "description": "…",
  "avancement": {
    "faites": 1,
    "total": 6,
    "pourcentage": 17,
    "action": "reprendre",
    "prochaine": { "id": "…", "titre": "…", "moduleTitre": "…" },
    "orphelines": ["ancien-id"],
    "modules": [
      {
        "id": "decouverte",
        "titre": "Découverte",
        "faites": 1,
        "total": 3,
        "lecons": [{ "id": "bienvenue", "titre": "Bienvenue", "faite": true }]
      }
    ]
  }
}
```

Les leçons orphelines (cochées en base mais absentes du manifeste) sont exclues
de tous les calculs et listées à part.

## POST /api/formations/:fid/couverture

Administrateur seulement. Corps : `{ "nom": "ma-couv.png", "contenu": "<base64>" }`.

Réponse `201` : `{ "formation": { … } }`, la formation à jour.

- `400` — extension refusée (le SVG l'est), base64 illisible, ou contenu qui ne
  correspond pas à sa signature de format : un PDF renommé en `.png` est rejeté.
- `413` — au-delà de 2 Mo.

L'image est écrite sous `assets/couverture-<AAAAMMJJ-hhmmss>.<ext>` et le
manifeste mis à jour. **L'ancienne couverture reste sur le disque.**

## GET /api/formations/:fid/lecons/:lid

```json
{
  "formationId": "prise-en-main",
  "formationTitre": "Prise en main de Parcours",
  "leconId": "bienvenue",
  "titre": "Bienvenue",
  "moduleId": "decouverte",
  "moduleTitre": "Découverte",
  "html": "<p>…</p>",
  "faite": false,
  "criteres": [
    { "id": "2da6f8e1567a-0", "texte": "la commande affiche les 7 cours", "coche": false }
  ],
  "criteresTronques": false,
  "position": 1,
  "total": 6,
  "precedente": null,
  "suivante": { "id": "anatomie-formation", "titre": "Anatomie d'une formation" }
}
```

`html` est **déjà assaini** : le rendu markdown se fait côté serveur, l'interface
n'en fait jamais (A-R5). Le HTML écrit par l'auteur est échappé, pas interprété.

## GET /api/formations/:fid/recherche?q=

```json
{
  "resultats": [
    {
      "leconId": "anatomie-formation",
      "titre": "Anatomie d'une formation",
      "moduleTitre": "Découverte",
      "extrait": "…il contient un manifeste, des fichiers…",
      "occurrences": [{ "debut": 25, "longueur": 9 }]
    }
  ],
  "total": 2,
  "nonIndexees": 0,
  "message": "saisir au moins 2 caractères"
}
```

- L'extrait est du **texte brut** ; le surlignage est appliqué par l'interface à
  partir des positions (`occurrences`) — aucun HTML supplémentaire ne traverse le
  pipeline de rendu.
- Le contenu des blocs `:::indice` et `:::solution` n'est **jamais** indexé.
- Résultats ordonnés selon le manifeste, 50 au maximum ; `total` donne le nombre
  réel de correspondances.
- `message` n'apparaît que pour une requête de moins de 2 caractères utiles.

## Assets

Servi seulement après résolution du chemin réel (`realpath`) confiné au dossier
de la formation : toute sortie (`..`, lien symbolique sortant, chemin absolu)
répond `403`. Extensions servies : `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`,
`pdf`, `zip`, `txt` — les autres répondent `404`. Chaque asset part avec
`Content-Security-Policy: default-src 'none'; sandbox` et `X-Content-Type-Options: nosniff`.

## Progression

`PUT` et `DELETE` sont idempotents et renvoient l'avancement recalculé :

```json
{ "faite": true, "avancement": { "…": "…" } }
```

`reset` et `nettoyer` renvoient le nombre de lignes supprimées, `0` compris :

```json
{ "supprimees": 2, "avancement": { "…": "…" } }
```

Cocher une leçon absente du manifeste répond `404` : l'API ne fabrique jamais
d'orpheline.

### Critères de réussite

```
PUT    /api/progression/:fid/:lid/criteres/:cid
DELETE /api/progression/:fid/:lid/criteres/:cid
```

`:cid` est l'identifiant rendu par `GET .../lecons/:lid` — format
`<12 hexadécimaux>-<rang>`, dérivé du texte du critère. Les deux méthodes sont
idempotentes et renvoient l'état complet de la leçon :

```json
{
  "faite": false,
  "avancement": { "…": "…" },
  "criteres": [{ "id": "2da6f8e1567a-0", "texte": "…", "coche": true }]
}
```

- `400` — identifiant hors format, sans écriture.
- `404` — identifiant absent de la leçon : comme pour les leçons, l'API ne
  fabrique jamais d'orpheline. C'est le signe que la leçon a changé sur le
  disque ; rechargez-la.

Cocher le dernier critère ouvert marque la leçon terminée. Décocher ensuite ne
la défait pas. L'avancement d'une formation reste calculé sur les leçons.

Réinitialiser la progression d'une formation efface aussi ses critères.

## Administration : créer et modifier une formation

Ces deux routes écrivent la structure d'une formation (décision P008) ; le texte
des leçons passe par les routes d'édition décrites plus bas (P009).

`POST /api/formations` — corps :

```json
{
  "id": "ecrire-pour-le-web",
  "titre": "Écrire pour le web",
  "description": "Structure, ton et relecture.",
  "modules": [
    { "titre": "Les bases", "lecons": [{ "titre": "Structurer un texte" }] }
  ]
}
```

`id` est optionnel : sans lui, il est dérivé du titre. Les identifiants des
modules et des leçons sont dérivés de leurs titres, rendus uniques par suffixe
(`introduction`, `introduction-2`). Réponse `201` :

```json
{
  "id": "ecrire-pour-le-web",
  "titre": "Écrire pour le web",
  "fichiersCrees": ["lecons/structurer-un-texte.md"]
}
```

`PUT /api/formations/:fid/structure` — même corps, sans `id` de formation.
Trois règles gouvernent l'écriture :

1. **Une leçon qui porte un `id` le conserve** : c'est la clé de progression
   (P004). Renommer son titre ne crée aucune orpheline. Une leçon **sans** `id`
   est nouvelle : le serveur lui en dérive un et crée son fichier.
2. **Aucun fichier existant n'est réécrit.** `fichiersCrees` ne liste que les
   fichiers créés vides ; les autres ne sont jamais ouverts en écriture.
3. **Retirer une leçon du manifeste ne supprime pas son fichier.** Elle sort du
   sommaire, sa prose reste sur le disque.

Le manifeste est écrit de façon atomique (fichier temporaire puis renommage) et
repasse par la validation du lecteur : l'administration ne peut pas produire une
formation que le scan refuserait. L'index de recherche de la formation est
invalidé après écriture.

Erreurs : `400` pour une saisie invalide (message situé, ex.
`modules[0].lecons : au moins une leçon attendue`), `409` si le dossier existe
déjà, `403` si l'origine n'est pas locale.

## Éditeur de leçon

`GET …/lecons/:lid/source` renvoie le markdown du fichier et un **jeton d'état**
(date de modification + taille) :

```json
{
  "formationId": "prise-en-main",
  "leconId": "bienvenue",
  "titre": "Bienvenue",
  "fichier": "lecons/bienvenue.md",
  "markdown": "Parcours lit des formations…",
  "jeton": "1786785175153-45"
}
```

`PUT …/lecons/:lid/source` prend `{ "markdown": "…", "jeton": "…" }` et renvoie
le nouveau jeton. Si le fichier a changé depuis la lecture — parce qu'il a été
modifié dans un éditeur externe ou par Claude Code — la route répond **409** et
n'écrit rien : aucune version n'est écrasée en silence. Omettre le jeton force
l'écriture (utile en script). Le fichier est écrit de façon atomique, confiné au
dossier de la formation, et plafonné à 2 Mo comme à la lecture.

`POST /api/formations/:fid/apercu` prend `{ "markdown": "…" }` et renvoie
`{ "html": "…" }` : c'est le **même pipeline de rendu** que la leçon (A-R5), donc
le même assainissement. La route n'écrit rien sur le disque.

Ces trois routes sont, avec celles de la structure, les seules qui touchent à
`formations/`.

## Import d'un dossier déposé

`POST /api/formations/import` — corps :

```json
{
  "nom": "Cuisine du dimanche",
  "fichiers": [
    { "chemin": "Cuisine du dimanche/01-bases/le-feu.md", "contenu": "# Maîtriser le feu\n" },
    { "chemin": "Cuisine du dimanche/assets/photo.png", "contenu": "iVBORw0…", "encodage": "base64" }
  ],
  "ignorerManifeste": false
}
```

Réponse `201` :

```json
{
  "id": "cuisine-du-dimanche",
  "titre": "Cuisine du dimanche",
  "lecons": 3,
  "manifesteGenere": true,
  "ignores": ["Cuisine du dimanche/.DS_Store"]
}
```

- L'identifiant est le slug du `nom`, suffixé s'il est déjà pris par une
  formation active ou archivée (`cuisine-du-dimanche-2`).
- **Sans `formation.json`**, le sommaire est déduit : un module par sous-dossier
  de premier niveau (un seul groupe → module « Contenu »), leçons triées par nom
  en ordre numérique, titre pris au premier `#` du fichier hors bloc de code.
- **Avec un `formation.json` valide**, l'ordre et les titres de l'auteur sont
  conservés ; seul son `id` est réaligné sur le dossier d'accueil.
- **Avec un `formation.json` refusé**, la réponse est `400` avec l'erreur exacte
  et `"peutGenerer": true`. Renvoyer la requête avec `ignorerManifeste: true`
  importe alors avec un sommaire déduit. Rien n'est jamais importé en silence.
- Limites : 500 fichiers, 25 Mo cumulés, 2 Mo par markdown. Extensions acceptées :
  `.md`, `.markdown`, `.json`, plus celles des assets. Les entrées système
  (`__MACOSX/`, tout nom commençant par `.`) sont écartées et listées dans
  `ignores`.
- Écriture atomique : dossier temporaire caché puis renommage. Un import refusé
  ne laisse rien dans `formations/`.

## Cycle de vie : archives et corbeille

Trois emplacements, un seul à la fois — le passage de l'un à l'autre est
toujours un **déplacement de dossier**, jamais une copie ni une suppression :

| État | Emplacement |
|---|---|
| active | `formations/<id>/` |
| archivée | `formations/.archives/<id>/` |
| en corbeille | `formations/.corbeille/<id>--<AAAAMMJJ-hhmmss>/` |

- **Aucune route ne supprime de fichier.** `DELETE` déplace en corbeille ;
  vider la corbeille reste un geste manuel de l'utilisateur, hors application.
- La progression n'est jamais touchée : archiver puis restaurer, ou jeter puis
  restaurer, rend la formation avec ses coches.
- Restaurer sur un identifiant repris entre-temps répond `409`.
- Une entrée de corbeille mal formée (ou qui tente de sortir du dossier) répond
  `400`.
- Les dossiers `.archives` et `.corbeille` sont retirés dès qu'ils sont vides —
  jamais autrement.

## Erreurs

| Code | Cas |
|------|-----|
| 401 | Aucune session valide |
| 403 | Hôte ou origine non locale ; rôle insuffisant ; asset hors formation |
| 404 | Formation, leçon, asset, compte ou route inconnue |
| 409 | Formation invalide ; identifiant déjà pris ; garde-fou de la console |
| 429 | Trop de tentatives de connexion sur cet identifiant |
| 503 | Aucun compte : installation requise |

Toutes les erreurs ont la même forme : `{ "erreur": "message lisible" }`.
