> Durée indicative : 30 min

**Objectif** : écrire le `CLAUDE.md` du projet et prouver qu'il change le comportement
de Claude.

**Énoncé** : rédigez le `CLAUDE.md` à la racine de votre espace de travail
(`mon-formacoach`) avec au minimum : la description du
projet en 2 lignes, les commandes (`uv run forma ...`, `uv run pytest`), et trois règles
de votre choix (style, workflow, interdits). Puis concevez un test A/B : une même demande
faite avec et sans une des règles, où la différence de comportement est observable.

**Critères de réussite**
- [ ] `CLAUDE.md` existe et fait moins de 60 lignes (un CLAUDE.md fleuve n'est pas lu)
- [ ] Vous avez un exemple concret où Claude a respecté une règle sans qu'on la rappelle
- [ ] Les commandes documentées fonctionnent telles quelles (copier-coller)

:::indice la direction
Choisissez des règles dont on VOIT le respect. Trois exemples qui marchent bien :
« jamais d'installation de bibliothèque sans me demander », « les messages de
commit sont en anglais », « après toute modification du dossier forma/, lance les
tests avant de conclure ».

Pour le test A/B : demandez une petite modification du code dans une session AVEC
la règle dans le fichier, puis la même demande dans une session où vous l'avez
retirée — et comparez ce que Claude fait spontanément.
:::

:::solution
**Le résultat attendu** — un CLAUDE.md en 4 sections :

1. **Projet** : deux lignes qui disent ce qu'est FormaCoach.
2. **Commandes** : un bloc de code avec les commandes utiles (`uv run forma list`,
   `uv run pytest`), copiables telles quelles.
3. **Architecture** : trois lignes qui disent qui fait quoi — cli.py comprend les
   commandes, store.py s'occupe des données, le dossier data/ est la seule source
   de vérité.
4. **Règles** : cinq puces maximum, à l'impératif (« lance... », « ne fais jamais... »).

**Pourquoi court** : ce fichier est relu par Claude à chaque session. Plus il est
long, plus chaque règle s'y dilue — cinq règles précises agissent mieux que
soixante lignes de contexte.

**Exemple de test A/B réussi** : avec la règle « lance uv run pytest après toute
modification de forma/ », demandez « renomme la commande next en suivant ». Si
Claude lance les tests sans qu'on le lui rappelle, la règle agit : c'est la
preuve demandée par le critère 2.
:::
