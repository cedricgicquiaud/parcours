À deux, la pull request prend tout son sens : ce n'est plus seulement votre
poste de contrôle, c'est le lieu du dialogue. Cette leçon outille la
relecture — et règle au passage les notifications, avant qu'elles ne vous
noient.

## La review : relire, annoter, trancher

Sur une PR, la colonne de droite a une rubrique **Reviewers** : on y demande
une relecture à un collaborateur. Le relecteur, dans *Files changed*, peut :

- **commenter une ligne précise** du diff (survoler la ligne, le `+` bleu) —
  le commentaire ouvre une **conversation**, rattachée à cet endroit exact ;
- conclure : **Approve** (bon pour moi), **Request changes** (à retravailler),
  ou simple commentaire. On ne peut pas approuver sa propre PR — se relire
  soi-même n'a jamais été une garantie.

Chaque conversation se marque **résolue** quand le point est traité : le fil
de la PR reste lisible, on voit ce qui est réglé et ce qui reste ouvert.

La règle qui marche à 2-3 : **toute PR non triviale attend une paire d'yeux**.
Et remarquez que vous la pratiquez depuis le module 5 — relire les PR de
Claude avant de fusionner, c'est déjà une review ; à deux humains, seul le
relecteur change.

## Les notifications : n'écouter que ce qui vous concerne

Dès qu'on est deux, GitHub se met à parler : la cloche (en haut à droite)
reçoit les invitations, les mentions, les reviews demandées. Deux réglages
suffisent pour rester sain :

- sur le dépôt, le bouton **Watch** : `Participating and @mentions` — vous
  n'êtes prévenu que sur ce qui vous implique, pas à chaque mouvement ;
- dans une conversation, mentionner quelqu'un par son pseudo (`@untel`)
  le notifie précisément — c'est le geste « j'ai besoin de toi ici ».

## Constatez-le sur pièce

Sur une PR de votre bac à sable (relancez une petite boucle d'écriture si
aucune n'est ouverte — vous savez faire) :

1. Dans *Files changed*, commentez une ligne précise du diff, comme un
   relecteur : une vraie remarque, ou un « vu, bon pour moi » d'exercice.
2. Marquez la conversation **résolue**.
3. Si votre second compte est collaborateur : demandez-lui la review,
   acceptez-la depuis l'autre fenêtre — et voyez arriver la notification.
4. Réglez le **Watch** du dépôt sur `Participating and @mentions`.

## Critères de réussite

- [ ] mon commentaire est posé sur une ligne précise du diff, pas dans le fil général
- [ ] la conversation est marquée résolue
- [ ] le réglage Watch du dépôt est sur « Participating and @mentions »
- [ ] si second compte : la review demandée est arrivée dans ses notifications
