« Vous pouvez me donner une roadmap sur trois-quatre mois ? » La question
arrivera — d'un associé, d'un client, de vous-même. Voici comment y répondre
avec GitHub seul, sans promettre ce que personne ne peut tenir.

## Le principe de la longue-vue

Sur un projet réel, la spec ne prévoit jamais tout, et les cas s'identifient
en route — c'est normal, le réel en apprend plus que la réflexion. Une roadmap
honnête en tient compte : **plus c'est proche, plus c'est net.** Trois niveaux
de zoom :

1. **Les milestones lointains** : des enveloppes datées — une promesse en deux
   phrases, une échéance **estimée**. Pas d'issues : détailler le lointain,
   c'est du travail jeté d'avance.
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
  de vos milestones. Pour donner un corps aux paliers lointains, une
  **issue-chapeau** par palier (« Chantier synchronisation »), datée par des
  champs de dates début/cible, devient une barre sur la frise.

## Constatez-le sur pièce

Dans votre bac à sable :

1. Donnez une **date d'échéance** à vos milestones V1 et V2 (page Milestones →
   Edit sur chacun — une date plausible suffit, c'est un bac à sable).
2. Relisez la page Milestones : l'ordre, les dates, les barres — voilà votre
   roadmap « texte », telle qu'un associé la lirait.
3. Dans la vue Roadmap du Project, ouvrez les options et activez les
   **Markers** sur les milestones : leurs échéances apparaissent en traits
   verticaux sur la frise.

## Critères de réussite

- [ ] mes milestones V1 et V2 portent chacun une date d'échéance
- [ ] la page Milestones se lit comme une roadmap : l'ordre du temps, les dates, les barres
- [ ] les échéances des milestones sont dessinées sur la frise de ma vue Roadmap
