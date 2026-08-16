Parcours est multi-utilisateur, sur une seule machine. Plusieurs personnes
peuvent lire les mêmes formations sans jamais voir la progression des autres.

## Le premier démarrage

Sur une base neuve, Parcours n'affiche qu'un écran : « Créer le compte
administrateur ». Une adresse e-mail, un nom, un mot de passe d'au moins 10
caractères. Ce premier compte est confirmé d'office, et vous entrez directement
dans le catalogue.

Si une progression existait déjà avant l'arrivée des comptes, ce premier
administrateur la retrouve : elle lui est rattachée.

## Deux rôles

**Administrateur** : lit, écrit les formations (édition allumée), gère les
comptes et les réglages.

**Lecteur** : lit, coche, cherche. Rien d'autre. Il ne voit ni l'interrupteur
d'édition, ni les outils d'auteur, et les adresses d'administration lui
répondent par un refus expliqué.

:::attention
Le rôle est vérifié par le serveur, pas seulement à l'écran. Un lecteur qui
tenterait d'appeler directement une route d'écriture reçoit un refus, quel que
soit ce que son navigateur affiche.
:::

## La console des comptes

L'icône « personnes » du pied de colonne, pour les administrateurs. On y crée un
compte, on change un rôle, on désactive, on réinitialise un mot de passe.

Quelques garde-fous, tous voulus :

- On ne peut pas se rétrograder ni se désactiver soi-même : rôle et
  désactivation sont grisés sur sa propre ligne.
- Le **dernier** administrateur ne peut pas être rétrogradé. Parcours explique
  pourquoi plutôt que de laisser l'installation sans personne aux commandes.
- Un compte doit être désactivé avant de pouvoir être supprimé. Le supprimer
  emporte sa progression.
- Un mot de passe provisoire n'est montré **qu'une fois**. Recharger la page ne
  le remontre pas.

## Les sessions

La connexion pose un cookie de session, et rien d'autre. Changer son mot de
passe déconnecte les autres navigateurs et garde celui d'où vient le changement.
Désactiver un compte le déconnecte à sa requête suivante.

Un mauvais mot de passe et un identifiant inconnu donnent **exactement le même
message** : rien ne permet de deviner qu'un compte existe. Après dix échecs
consécutifs, une attente de quinze minutes s'impose.

## Critères de réussite

- [ ] j'ai créé un compte lecteur depuis la console
- [ ] connecté avec ce compte : ni « Nouvelle formation », ni menu « … », ni icône crayon
- [ ] ce lecteur a coché une leçon, et mon compte administrateur ne voit pas cette coche
- [ ] j'ai essayé un mot de passe faux, puis un identifiant inexistant : même message
- [ ] j'ai vérifié que le rôle et la désactivation sont grisés sur ma propre ligne
- [ ] j'ai promu ce lecteur en administrateur : après rechargement, il a l'interrupteur d'édition
