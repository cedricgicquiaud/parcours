Le formulaire discipline les humains qui passent par « New issue ». Mais
Claude, lui, crée les issues par `gh` — qui ne passe pas par le formulaire.
Dernier maillon : faire du gabarit le contrat de **tous** les créateurs
d'issues, humains et IA.

## Un seul moule, défini à un seul endroit

Jusqu'ici, vous rappeliez le moule dans chaque demande (« trois temps, cases à
cocher… »). Ça marche, mais c'est fragile : un oubli, et la fiche sort du
rang. La version robuste : dire à Claude de **suivre le formulaire du dépôt**.
Le fichier `tache.yml` devient la référence unique — si le moule évolue un
jour, on ne le change qu'à un seul endroit, et tout le monde suit.

Et pour ne plus le répéter du tout : la consigne se range dans les
**instructions du projet** — le fichier `CLAUDE.md` à la racine du dépôt, que
Claude Code lit automatiquement à chaque session. Une ligne y suffit :
« toute issue suit le formulaire `.github/ISSUE_TEMPLATE/tache.yml` ». C'est
l'équivalent, pour votre exécutant, de ce que le formulaire est pour les
humains.

## À vous

1. Demandez à Claude une issue de test en exigeant : « suis le formulaire
   tache.yml du dépôt ». Comparez la fiche produite à celle de votre essai au
   formulaire (leçon précédente) : mêmes sections, même ordre —
   indistinguables.
2. Rendez la consigne permanente : faites ajouter au `CLAUDE.md` du bac à
   sable la ligne ci-dessus — par la boucle courte si vous voulez rester
   puriste, ou d'un simple « ajoute et publie » : c'est un fichier
   d'instructions, pas un livrable.
3. Fermez l'issue de test (encore un essai), et regardez sa carte filer dans
   Done — vous ne le remarquez même plus, c'est bon signe.

## Critères de réussite

- [ ] l'issue créée par Claude suit exactement les sections du formulaire
- [ ] je ne la distingue pas d'une fiche saisie par « New issue »
- [ ] le `CLAUDE.md` du dépôt impose le formulaire pour toute issue à venir
- [ ] l'issue de test est refermée, sa carte dans Done
