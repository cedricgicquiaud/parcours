Voici le module promis en Bienvenue : partir d'une intention et obtenir un
backlog complet — la liste structurée de tout le travail — généré par Claude
et validé par vous. Tout commence par la matière première : la **spec**.

## Ce qu'est une spec, et ce qu'elle n'est pas

Une spec (spécification) décrit le **pourquoi** et le **quoi** d'un projet ou
d'une version : ce que l'utilisateur pourra faire, ce qui est exclu, ce qui
est non négociable. Elle ne liste PAS les tâches — c'est justement le
découpage qu'on va déléguer. Une bonne spec se reconnaît à ceci : chaque
phrase promet quelque chose de **vérifiable**.

Bonne nouvelle : votre spec existe déjà. La section V2 du README — écrite par
la boucle au module 5 — décrit les comptes, le partage, la synchronisation.
C'était le plan depuis le début : la boucle d'écriture a produit la matière du
backlog.

## La granularité : à quoi ressemble une bonne issue

Avant de faire découper, sachez juger un découpage. Une bonne issue :

- promet **un** résultat livrable (« l'invité peut cocher une tâche »), pas un
  thème (« le partage ») ni une miette (« ajouter un bouton ») ;
- se vérifie par des constats — son « Terminé quand » ;
- tient en quelques jours de travail au plus. Trop grosse ? Elle se découpe.
  Trop fine ? C'est une case à cocher dans une issue plus grande.

## À vous

Relisez la section V2 du README **en juge**, avec cette question par phrase :
*qu'est-ce que ça promet, et le verra-t-on ?* Cherchez les trous — les cas
dont la spec ne dit rien. Classiques du genre : le mot de passe oublié, ce que
peut faire un invité (tout ? cocher seulement ?), quitter une liste partagée,
supprimer son compte.

Puis faites combler les trous par la boucle, en autonomie complète cette
fois : une issue « Compléter la spec V2 » (moule, label `documentation`,
milestone V2), la branche, la rédaction, la PR avec « Closes », votre
relecture, la fusion. Deuxième tour de boucle — il doit déjà vous sembler
naturel.

:::indice
Votre demande peut tout enchaîner : « voici les manques que j'ai relevés :
[vos trous]. Prends-les en charge par une issue "Compléter la spec V2" et une
PR qui la ferme — je relis avant fusion. » Vous restez le juge aux deux bouts :
les manques en entrée, le texte en sortie.
:::

## Critères de réussite

- [ ] j'ai relevé au moins deux manques dans la spec V2
- [ ] une issue « Compléter la spec V2 » a été fermée par une PR fusionnée
- [ ] le README affiche la spec complétée de mes manques
- [ ] la carte de cette issue est dans Done, sans geste de ma part
