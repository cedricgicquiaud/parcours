# Parcours « depuis zéro »

Le contenu s'écrit entièrement : aucun cours tiers, aucune contrainte de
source. La liberté est totale — c'est le cadrage qui empêche d'écrire un
document au lieu d'une formation.

## Cadrer par la fin

Commencer par la promesse : *qu'est-ce que l'apprenant saura FAIRE en
sortant ?* Chaque objectif de la fiche est un verbe d'action vérifiable
(« créer un Project et le lier au dépôt »), jamais un thème (« comprendre les
Projects »). Si un objectif ne se démontre pas par un geste, il ne structure
rien : le retravailler.

Puis remonter : quels gestes mènent à cette promesse → quelles leçons portent
ces gestes → quels modules groupent ces leçons. Une leçon = un geste ou une
notion qui se vérifie ; un module = une étape qui a du sens seule.

## Le fil rouge

Le meilleur moteur d'une formation depuis zéro est un projet qui grossit
leçon après leçon : l'apprenant construit quelque chose, et chaque leçon
ajoute une pièce visible.

- Choisir un projet **neutre et parlant** (une todo-list, un carnet, un
  blog…) : jamais les projets réels de l'auteur — la formation doit parler à
  tout le monde et les exemples réels embarquent de la confidentialité.
- Déclarer les dépendances directes entre leçons avec `suppose`.
- Prévoir la **leçon de clôture** : ce qu'on a construit, ce qu'on sait faire,
  et le sort du matériel d'exercice (jeter le bac à sable, garder le projet…).

## Le rythme d'une leçon

Le cours d'abord (pourquoi cette notion, comment elle marche), la pratique
ensuite (le geste sur le fil rouge, terrain posé), les critères en constats.
Une leçon se lit et se fait en 5 à 15 minutes ; au-delà, la couper.

Un pas à la fois : une leçon qui introduit deux notions en cache toujours une.
Mieux vaut deux leçons courtes chaînées par `suppose` qu'une leçon double.

## Ce qui se décide au cadrage, pas en route

- Les **identifiants** (formation, modules, leçons) : des slugs stables,
  choisis une fois — ce sont les clés de progression, les renommer efface les
  coches.
- Le **périmètre** : ce que la formation ne couvre PAS, dit dans la fiche
  (prérequis) ou la première leçon. Une formation qui promet tout ne tient
  rien.
