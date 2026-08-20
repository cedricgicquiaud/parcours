« Vous pouvez me donner une roadmap sur trois-quatre mois ? » La question
arrivera — d'un associé, d'un client, de vous-même. Voici comment y répondre
avec GitHub seul, sans promettre ce que personne ne peut tenir.

## Le principe de la longue-vue

Sur un projet réel, la spec ne prévoit jamais tout, et les cas s'identifient
en route — c'est normal, le réel en apprend plus que la réflexion. Une roadmap
honnête en tient compte : **plus c'est proche, plus c'est net.** Trois niveaux
de zoom :

1. **Les milestones lointains** : des enveloppes datées — une promesse en deux
   phrases, une échéance **estimée**, et une seule issue : leur chapeau de
   chantier (la barre sur la frise, on y vient). Rien de plus : détailler le
   lointain, c'est du travail jeté d'avance.
2. **Le milestone en cours** : le seul découpé en issues — spec relue,
   découpage discuté, création en masse (c'est tout le module 6, qui se rejoue
   à chaque palier, au moment de s'y mettre).
3. **L'itération** : elle ne crée rien, elle **pioche** — deux ou trois issues
   du milestone en cours, prises pour la quinzaine.

Une même tâche vit donc trois moments : promise (dans l'enveloppe), définie
(au découpage), prise (dans une itération). Et chaque niveau a son rendez-vous
de mise au point : le mensuel ajuste les dates des enveloppes, l'hebdomadaire
choisit la pioche.

C'est ce qui empêche la roadmap de « glisser en permanence » : elle n'engage
le détail que sur le proche, et se re-décide à intervalle fixe. Le glissement
douloureux naît du calendrier intégral promis d'avance — celui qu'on ne
construit jamais ici. Mieux : la barre du milestone en cours alerte tôt (elle
n'avance pas assez vite ? on le voit des semaines avant l'échéance, pas la
veille).

## La roadmap en deux affichages

- **La version texte : la page Milestones.** Les paliers dans l'ordre du
  temps, leur échéance, la barre d'avancement du palier en cours. C'est la
  page à montrer — elle se lit sans explication et dit toujours vrai.
- **La version dessinée : la vue Roadmap du Project.** Les issues du milestone
  en cours sur leurs itérations (le net), et les **markers** : dans les
  options de la vue (le même menu où vous avez réglé « Dates »), le réglage
  **Markers** dessine des traits verticaux aux dates clés — dont les échéances
  de vos milestones.

## La règle qui rend la vue complète : un chapeau par palier

Pour dessiner des **barres**, la frise a besoin d'items datés. La règle qui
marche : chaque palier a son **issue-chapeau de chantier** (« Chantier
comptes », « Chantier partage »…), datée par deux champs début/cible —
**systématiquement, palier en cours compris**. Le chapeau n'est pas réservé
aux gros morceaux : c'est la barre du palier sur la roadmap.

La séparation des deux mondes devient alors nette, et la vue toujours
complète :

- la roadmap « produit » ne montre **que les chapeaux** — un par palier, du
  premier jour du projet au dernier : jamais de trou ;
- le Board et les itérations ne montrent **que les issues** — le travail
  concret du palier en cours, sans dates, jamais sur la frise.

Le découpage mensuel ne touche donc pas à la roadmap : il remplit l'intérieur
d'une barre (les sous-issues du chantier qui s'ouvre), il n'en ajoute ni n'en
retire. La vue d'ensemble est stable ; seul le détail en dessous évolue.

## Constatez-le sur pièce

Dans votre bac à sable :

1. Donnez une **date d'échéance** à vos milestones V1 et V2 (page Milestones →
   Edit sur chacun — une date plausible suffit, c'est un bac à sable).
2. Relisez la page Milestones : l'ordre, les dates, les barres — voilà votre
   roadmap « texte », telle qu'un associé la lirait.
3. Dans la vue Roadmap du Project, ouvrez les options et activez les
   **Markers** sur les milestones : leurs échéances apparaissent en traits
   verticaux sur la frise.
4. Maintenant les **barres décalées** — l'image qu'on attend d'une roadmap.
   La frise ne sait dessiner une durée que si l'item porte des dates : créez
   deux champs de type **Date**, `Début` et `Cible` (dans la vue Inventaire,
   comme au module 4). Puis créez une **seconde vue Roadmap**, nommée
   « Produit », et réglez ses **Dates** sur la paire `Début` / `Cible` — une
   vue ne lit qu'une source de temps à la fois, d'où les deux vues : celle des
   itérations pour la quinzaine, celle-ci pour les mois.
5. Appliquez la règle : un chapeau par palier. Créez « Chantier V1 » et
   « Chantier V2 » (deux issues, trois lignes de description chacune), et
   datez-les en quinconce — V1 sur les semaines à venir, V2 décalé d'un
   mois. La vue « Produit » les
   dessine en barres décalées dans le temps : votre roadmap visuelle, sur
   trois mois, en dix minutes.

## Critères de réussite

- [ ] mes milestones V1 et V2 portent chacun une date d'échéance
- [ ] la page Milestones se lit comme une roadmap : l'ordre du temps, les dates, les barres
- [ ] les échéances des milestones sont dessinées sur la frise de ma vue Roadmap
- [ ] ma vue « Produit » montre des barres décalées dans le temps, une par chantier
