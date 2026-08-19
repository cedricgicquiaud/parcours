La spec est prête. Le réflexe naturel serait de dire « crée les issues » —
c'est précisément le piège. Entre la spec et la création, il manque l'étape
qui fait la qualité du backlog : **le découpage proposé, discuté, validé**.

## Proposer d'abord, créer ensuite

La règle tient en une phrase : **rien ne se crée avant que la liste soit
validée**. On demande à Claude une *proposition* de découpage — une liste de
titres, une ligne d'explication chacun, et rien d'autre. Pas de descriptions
complètes à ce stade : relire dix fiches détaillées pour en rejeter trois,
c'est du travail jeté. On juge le squelette, puis seulement on habille.

C'est une **conversation**, pas une commande : vous allez fusionner deux
propositions, en couper une trop grosse, en rejeter une hors sujet, en
reformuler une floue. Ce dialogue-là est exactement le travail d'un chef de
projet avec son équipe — l'équipe est simplement plus rapide.

## Votre grille de jugement

Devant la liste proposée, quatre questions :

1. **Un résultat par titre ?** (la granularité de la leçon précédente)
2. **Rien ne doublonne l'existant ?** Les issues #5 et #6 couvrent déjà le
   compte et le partage — la proposition doit compléter, pas répéter.
3. **Tout est couvert ?** Reprenez la spec phrase à phrase : chaque promesse a
   son issue quelque part.
4. **Rien d'inventé ?** Une issue qui ne se rattache à aucune phrase de la
   spec est une idée de l'exécutant — peut-être bonne, mais c'est VOTRE
   décision de l'ajouter à la spec d'abord.

## À vous

Le dossier `todo-app` ouvert, demandez la proposition. Exigez le format
(titres + une ligne), le périmètre (la section V2 du README), le signalement
des recouvrements avec les issues existantes — et **l'interdiction de créer
quoi que ce soit** à ce stade. Puis passez la liste à votre grille, et faites
au moins une correction avant de dire « validé » : il y en a toujours une.

:::indice
Une demande qui pose le cadre : « Propose-moi un découpage de la section V2 du
README en issues : titres + une ligne, signale ce que #5 et #6 couvrent déjà,
ne crée rien. » Puis répondez comme à un collègue : « fusionne A et B, coupe
C en deux, D est hors spec — retire-la. »
:::

## Critères de réussite

- [ ] j'ai reçu une proposition en titres + une ligne, sans qu'aucune issue soit créée
- [ ] elle signale ce que les issues #5 et #6 couvrent déjà
- [ ] j'ai corrigé au moins un élément (fusion, coupe, rejet ou reformulation)
- [ ] chaque phrase de la spec V2 a son issue dans la liste finale validée
