# Charte de rédaction des leçons

Héritée de `FORMATION_CLAUDE/STYLE.md` (qui sera gelé), enrichie des leçons de
la recette de « Prise en main de Parcours ». C'est elle qui fait qu'une
formation Parcours vaut d'être suivie.

Public par défaut : curieux et motivé, mais pas forcément développeur. Test de
réussite : un indice ou une solution doit être compréhensible par quelqu'un qui
découvre l'outil, sans rien chercher ailleurs.

## Règles générales

- Une idée par phrase.
- Tout terme technique est expliqué à sa PREMIÈRE apparition dans la leçon —
  ou remplacé par un mot courant. Exemple vécu : « backticks » employé sans
  explication a arrêté net le premier apprenant. La forme qui marche : le
  terme, un tiret, sa définition en français courant, un exemple (« les
  backticks — l'accent grave, tapé deux fois autour d'un mot, qui l'affiche
  `comme du code` »).
- Chaque bloc se lit seul : ne jamais renvoyer à un autre indice.
- Les termes techniques restent en anglais (`hook`, `manifeste`…), leur
  explication est en français courant.
- Pas d'emojis. Accents et orthographe soignés.

## Structure d'une leçon

Chaque leçon enchaîne trois temps, dans le même fichier :

1. **Le cours** — le magistral : ce qu'est la notion, à quoi elle sert,
   comment elle s'articule avec le reste. Tableaux et schémas mermaid
   bienvenus quand ils condensent.
2. **La pratique** — une section d'exercice (titre conseillé : « Constatez-le
   sur pièce » ou « À vous ») qui pose le TERRAIN : où faire le geste, avec
   quoi, comment préparer ce qu'il faut (commandes copiables si un dossier ou
   des fichiers d'essai sont nécessaires), et comment remettre en état après.
3. **Les critères de réussite** — la liste à cocher, en fin de leçon sous un
   titre « Critères de réussite ».

## La règle du terrain — le défaut le plus fréquent

Un critère qui demande un geste que la leçon n'a pas outillé est un critère
mort : l'apprenant reste devant sa case sans savoir quoi faire. C'est le défaut
le plus souvent trouvé en recette réelle (trois leçons corrigées le même jour).

Avant d'écrire un critère, se demander : *la leçon a-t-elle dit où faire ce
geste, avec quoi, et comment préparer le terrain ?* Si la réponse est non,
écrire d'abord la section de pratique qui le rend faisable.

## Les énoncés d'exercice

- **L'objectif et les contraintes, jamais les étapes.** Si l'énoncé liste les
  étapes, l'apprenant exécute une recette sans rien comprendre ; c'est en
  cherchant le chemin que l'apprentissage se fait. La difficulté n'est pas
  supprimée : elle est déplacée dans les indices.
- **Indice 1 — la direction** : où chercher, quelle question se poser, en
  langage courant. Ne révèle pas la solution. Bloc `:::indice`.
- **Indice 2 — le comment** : les noms précis (outil, commande, paramètre),
  chacun expliqué en une phrase. Bloc `:::indice`.
- **Solution — trois parties**, bloc `:::solution` (replié par défaut) :
  1. le résultat : code ou configuration complets, commentés en français simple ;
  2. « pourquoi ça marche » : reformulable par un non-développeur ;
  3. l'erreur fréquente : ce qui piège le plus souvent, et comment s'en sortir.

## Les critères de réussite

- **Des constats, jamais des questions.** Parcours n'exécute rien et ne
  corrige rien : le critère décrit un fait que l'apprenant a observé.
  « `npm test` affiche 12 tests verts », pas « j'ai compris les tests ».
- Chacun se répond par oui ou par non, sans hésiter, seul devant sa liste.
- **3 à 6 par leçon.** En dessous, la leçon ne se vérifie pas ; au-dessus, la
  liste devient une corvée.
- Formulation à la première personne du passé : « j'ai déposé… », « j'ai vu
  que… » — l'apprenant raconte ce qu'il a fait.
- **Relire avant de publier.** L'identité d'un critère est son texte
  (normalisé : casse, accents, ponctuation, backticks et espaces ne comptent
  pas). Le reformuler après coup efface la coche des apprenants, sans message.

## Les durées

Chaque leçon porte une `duree` en minutes dans le manifeste : le temps de
lecture PLUS le temps des gestes. Une formation dont toutes les leçons sont
datées affiche ses totaux partout ; une seule leçon sans durée et le total
disparaît (une somme partielle mentirait).

## Le fil rouge et `suppose`

Quand les leçons construisent l'une sur l'autre (un projet qui grossit),
déclarer les dépendances directes avec `suppose` : à l'ouverture, Parcours
nomme les leçons supposées non terminées, avec un lien — sans jamais bloquer.
Déclarer les dépendances DIRECTES seulement (pas de chaîne : Parcours ne remonte
jamais au-delà), 5 au plus par leçon.
