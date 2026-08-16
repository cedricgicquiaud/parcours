L'identifiant d'un compte est une adresse e-mail, et Parcours sait s'en servir —
si, et seulement si, vous le lui demandez.

## Par défaut, rien ne part

Tant que la variable d'environnement `PARCOURS_SMTP_URL` n'est pas configurée,
**aucun courriel n'est envoyé**. Aucune connexion sortante non plus.

Les messages que Parcours aurait envoyés s'affichent alors dans le terminal où
tourne le serveur — celui où vous avez tapé `npm run dev` —, lien de confirmation
compris. Vous copiez le lien depuis le terminal, vous le collez dans le
navigateur : tout fonctionne, hors ligne, sans compte chez personne.

:::astuce
C'est le mode normal pour un usage personnel. Configurer un serveur d'envoi n'a
d'intérêt que si d'autres personnes doivent recevoir ces liens ailleurs que sur
votre machine.
:::

## À quoi servent ces liens

**Confirmer une adresse.** Un compte créé par inscription libre doit confirmer
son adresse avant de pouvoir se connecter. Un administrateur peut aussi
confirmer un compte à la main depuis la console.

**Réinitialiser un mot de passe.** « Mot de passe oublié » envoie un lien à usage
unique. Le suivre permet de choisir un nouveau mot de passe et connecte
directement. L'ancien mot de passe cesse de fonctionner, et les autres sessions
ouvertes sont fermées.

## L'inscription libre

Fermée par défaut. Ouverte depuis la console, l'écran de connexion propose
« Créer un compte ».

Ouverte ou fermée, les messages ne trahissent jamais l'existence d'un compte :
s'inscrire avec une adresse déjà connue affiche exactement le même message
qu'avec une adresse neuve. Ce qui change, c'est le courriel reçu — « une
inscription a été tentée avec votre adresse » — et il part au vrai titulaire.

Un lien déjà utilisé, expiré ou inventé donne toujours la même réponse :
« invalide, expiré ou déjà utilisé ».

## Critères de réussite

- [ ] j'ai vérifié qu'à l'installation, un identifiant sans `@` est refusé
- [ ] j'ai ouvert l'inscription libre depuis la console, et « Créer un compte » est apparu sur l'écran de connexion
- [ ] je me suis inscrit avec une adresse neuve, et j'ai trouvé le courriel dans le terminal du serveur
- [ ] j'ai ouvert le lien de confirmation : je suis entré dans l'application
- [ ] j'ai rouvert le même lien : « invalide, expiré ou déjà utilisé »
- [ ] j'ai demandé « mot de passe oublié » avec une adresse inconnue : même message qu'avec une connue
