Parcours tourne chez vous, pour vous. Ce n'est pas un slogan : c'est vérifiable
en quelques gestes, et cette leçon vous en donne la liste.

## Le serveur n'écoute que la machine

Il écoute sur `127.0.0.1`, port 4620. Cette adresse n'est joignable que depuis
votre ordinateur : aucune autre machine du réseau local ne peut s'y connecter.

Une requête qui prétendrait venir d'ailleurs — un autre nom d'hôte, une autre
origine — est refusée.

## L'interface ne parle qu'au serveur

Aucune police, aucun script, aucune image n'est chargé depuis Internet. La
coloration syntaxique et les schémas fonctionnent hors ligne.

Ouvrez l'onglet réseau de votre navigateur et parcourez l'application : toutes
les requêtes vont vers `127.0.0.1:4620`, aucune ailleurs.

La seule exception possible est l'envoi de courriels, et elle est **inactive
tant que vous ne l'avez pas configurée** — voir [L'adresse e-mail et les
envois](lecon:courriel).

## Le contenu est assaini

Le markdown est rendu par le serveur, pas par le navigateur, et le HTML produit
est nettoyé avant d'être envoyé.

- Le HTML écrit à la main dans une leçon est affiché en texte.
- Un lien `javascript:` perd son lien et garde son texte.
- Un chemin de fichier qui tenterait de sortir du dossier de la formation est
  refusé, pas suivi.

## Ce qui est stocké, et où

| Quoi | Où |
| --- | --- |
| Vos formations | `formations/`, en clair, à vous |
| Progression et critères | La base locale, rattachés à votre compte |
| Mots de passe | La base, sous forme d'empreintes — jamais en clair |
| Jetons de session et de courriel | La base, sous forme d'empreintes également |

Un cookie de session `HttpOnly` et `SameSite=Strict` : il ne quitte pas le site
et reste hors de portée du JavaScript de la page.

## Critères de réussite

- [ ] j'ai gardé l'onglet réseau ouvert pendant une session complète : aucune requête vers un domaine externe
- [ ] j'ai écrit `<script>alert(1)</script>` dans une leçon : le texte s'affiche, aucune alerte
- [ ] j'ai écrit un lien `javascript:` : le texte reste, le lien a disparu
- [ ] j'ai lu la table des sessions dans la base : aucun jeton identique à celui de mon cookie
- [ ] j'ai fait une session de **lecture seule** puis lancé `git status` : rien n'a changé dans `formations/`
