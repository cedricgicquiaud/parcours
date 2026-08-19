---
name: creation-formation
description: >
  Écrire une formation complète au format Parcours : le dossier, son manifeste
  formation.json, ses leçons markdown avec critères de réussite cochables, sa
  fiche de présentation — puis la valider avec le vrai scanner avant livraison.
  Utiliser cette skill dès que l'utilisateur demande de créer, écrire, rédiger,
  adapter ou convertir une formation, un cours, un module ou des leçons — que
  Parcours soit nommé ou non — y compris « transforme ce guide en formation »,
  « fais-en un cours », « ajoute un module à la formation X », ou l'adaptation
  pédagogique d'un cours en ligne existant (Anthropic Academy ou autre).
---

# Créer une formation Parcours

Une formation Parcours est un dossier dans `formations/` : un manifeste
`formation.json` (seule source des métadonnées), des leçons markdown, des
assets facultatifs. Parcours l'affiche comme un site de cours ; chaque case à
cocher d'une leçon devient un critère de réussite mémorisé par compte.

## Avant d'écrire — les trois lectures

1. **Le format** : `docs/FORMAT.md` (manifeste, slugs, blocs `:::`, critères,
   `suppose`, fiche de présentation, ordre de validation). C'est la référence
   exacte ; ne rien deviner.
2. **La charte de rédaction** : `references/charte.md` de cette skill. Elle
   fait la valeur pédagogique de la formation — structure d'une leçon, énoncés,
   indices, critères. Non négociable.
3. **Le parcours applicable** :
   - Le contenu s'appuie sur un cours ou une ressource en ligne qui ne nous
     appartient pas → `references/depuis-un-cours.md` (garde-fous juridiques
     compris — les lire AVANT de rédiger quoi que ce soit).
   - Le contenu s'écrit entièrement → `references/depuis-zero.md`.

## Le déroulé

1. **Cadrer en une conversation courte** : le sujet, le public et son niveau,
   la promesse (que sait-on faire à la fin ?), la source éventuelle, le volume
   visé. Un module de 3 à 6 leçons est un bon premier jalon ; ne pas viser
   sept modules d'un coup.
2. **Structurer avant de rédiger** : la liste modules → leçons avec identifiants
   (slugs stables — ils sont les clés de progression, on ne les renomme plus),
   durées estimées, et les liens `suppose` si les leçons construisent l'une sur
   l'autre. Faire valider cette structure par l'utilisateur avant d'écrire les
   leçons : déplacer une leçon coûte cher après, rien avant.
3. **Écrire leçon par leçon**, chaque leçon complète avant la suivante, selon
   la charte. Relire les critères de chaque leçon AVANT de passer à la
   suivante : l'identité d'un critère est son texte — le reformuler après
   publication efface les coches des apprenants, en silence.
4. **La fiche de présentation** en dernier, quand le contenu est stable :
   description, présentation, objectifs (ce qu'on saura FAIRE), prérequis,
   couverture éventuelle.
5. **Valider avec le vrai code** — jamais à l'œil :

   ```bash
   npx tsx .claude/skills/creation-formation/scripts/valider.ts formations/<id>
   ```

   Le script rejoue le scanner et le moteur de rendu de Parcours : statut de la
   formation, erreur exacte le cas échéant, critères par leçon, durées, liens
   `lecon:` morts. Corriger jusqu'au vert. Une formation invalide s'affiche au
   catalogue avec son erreur — ne jamais livrer dans cet état.
6. **Relire contre la check-list** ci-dessous, puis annoncer à l'utilisateur ce
   qui est prêt et comment le voir (`npm run dev`, catalogue).

## Check-list finale

- Chaque leçon suit la charte : le cours d'abord, la pratique ensuite, les
  critères en constats.
- Aucun critère sans terrain : si un critère demande un geste, la leçon a
  montré où et comment le faire.
- Tout terme technique est expliqué à sa première apparition dans la leçon.
- 3 à 6 critères par leçon, chacun répondable par oui ou non.
- Les identifiants sont des slugs, uniques, et ne changeront plus.
- Le script de validation est vert, et sa sortie a été lue (pas seulement
  lancée).
- Si le contenu vient d'un cours tiers : relecture spécifique de
  `references/depuis-un-cours.md` § « La relecture juridique ».

## Ce que Parcours ne fait pas — ne pas l'oublier en écrivant

Parcours n'exécute jamais de code et ne corrige jamais : les exercices se font
dans un terminal ou un navigateur, avec Claude Code à côté, et l'apprenant
constate lui-même le résultat. Un critère n'est donc jamais une question de
quiz — c'est un fait que l'apprenant vérifie. Et le bandeau `suppose` prévient
sans jamais verrouiller : la progression imposée n'existe pas.
