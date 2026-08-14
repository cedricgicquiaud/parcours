# Phase DELIVER — Livraison

## Etape 1 : Verification finale du diff
/diff > verifier l'etat final avant push.

## Etape 2 : Documentation
Si la phase a modifie une API publique ou un comportement utilisateur visible :
- Mettre a jour le README, la doc API ou un changelog selon le projet
- /commit "docs: update <section>"

## Etape 3 : Recette fonctionnelle — generer les tests dans la base de recette
Genere le cahier de recette de la feature : la liste complete des scenarios a
verifier (un scenario = un test). C'est OBLIGATOIRE a chaque livraison. Generer
les tests ne les PASSE pas : derouler la recette (passer chaque test a « Valide »)
est manuel, etale dans le temps, et fait par un humain. La generation ne bloque
pas la livraison.

**Support : une base Notion unique « Recette <Projet> »** (data source ID indique
dans le CLAUDE.md projet, section « Recette »). Chaque test = une ligne, avec :
- `Test` (titre) : le scenario, formule « action → resultat attendu ».
- `Fonctionnalite` (select) : le domaine de la feature (ex. Connecteurs, Chat,
  Auth…). Reutiliser une valeur existante ou en ajouter une au schema si besoin.
- `Section` (texte) : sous-theme au sein de la fonctionnalite (ex. un connecteur,
  Routage, Steps, Securite…).
- `N°` (number) : ordre de recette, **unique au sein d'une meme fonctionnalite**.
- `Statut` : « A recetter ».
- `Branche / PR` : la PR de la feature.
- `Responsable` : laisse vide (assigne par l'equipe au moment de recetter).

Profondeur : couvrir le tronc (connexion / lecture / ecriture / fiabilite) ET les
cas qui ont une vraie valeur (securite, cas d'erreur, cas limites, routage par
variante). S'arreter quand un test de plus n'apporte plus d'info nouvelle —
la couverture combinatoire et le non-determinisme relevent d'une eval automatisee,
pas de la recette manuelle.

Si aucune base Notion n'est configuree : fallback sur `.workflow/UAT.md` (lister
les scenarios), et le noter explicitement.

Pas de synchro retour automatique : l'avancement (statut par test) vit dans la
base de recette, pilote au point d'equipe.

## Etape 4 : Push de la branche feature
REGLE STRICTE : DELIVER ne push JAMAIS sur main/master, meme avec ordre explicite.
- Verifier que la branche courante n'est PAS main/master. Si c'est le cas, refuser et exiger une branche feature.
- Push : `git push -u origin <branche-feature>`

## Etape 5 : Creation de la PR
`gh pr create` avec description obligatoire au format :

```
## Summary
<1-3 lignes : ce que cette PR fait et pourquoi>

## Changes
- <fichier ou module modifie — quoi>
- <fichier ou module modifie — quoi>

## Test plan
- [ ] <comment verifier en local>
- [ ] <comment verifier en navigateur si UI>

## Recette
Tests ajoutes dans la base de recette « Recette <Projet> » (fonctionnalite "<nom>"),
statut « A recetter ».
```

Si une PR existe deja sur la branche, l'updater (`gh pr edit`) au lieu d'en creer une nouvelle.

## Etape 6 : Liberer le contexte
/compact pour preparer la suite.

## Etape 7 : Proposer la prochaine feature
Lire `.workflow/BACKLOG.md` et proposer la premiere case non cochee.
Si BACKLOG vide : demander a l'utilisateur quelle feature attaquer.
