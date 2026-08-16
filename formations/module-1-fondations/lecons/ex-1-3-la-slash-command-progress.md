> Durée indicative : 20 min

**Objectif** : créer une commande personnalisée réutilisable.

**Énoncé** : une slash command est un raccourci personnel dans Claude Code — vous
tapez `/nom` et une consigne préparée à l'avance s'exécute. Créez
`.claude/commands/progress.md` pour que `/progress` produise un
compte-rendu : cours terminés / restants, pourcentage, prochain cours, et une phrase
d'encouragement basée sur le rythme (comparer la progression au rythme cible du
parcours : environ deux semaines pour tout terminer).

**Critères de réussite**
- [ ] `/progress` apparaît dans l'autocomplétion et fonctionne
- [ ] Le compte-rendu contient le pourcentage exact et le prochain cours
- [ ] La commande utilise `forma list` (ou lit le JSON) plutôt que la mémoire de Claude

:::indice la direction
Une slash command est simplement un fichier texte : tout ce que vous écrivez
dedans est envoyé à Claude comme si vous l'aviez tapé vous-même, chaque fois que
vous saisissez `/nom-du-fichier`. Écrivez donc dans
`.claude/commands/progress.md` les consignes exactes que vous donneriez à la
main — y compris l'ordre d'exécuter `uv run forma list` d'abord, et de ne se
baser que sur sa sortie.
:::

:::solution
**Le résultat attendu** — `.claude/commands/progress.md` :

```markdown
Fais un point de progression de ma formation Anthropic Academy.

1. Exécute `uv run forma list` et base-toi UNIQUEMENT sur cette sortie.
2. Calcule : nombre de cours terminés / total, pourcentage arrondi.
3. Indique le prochain cours (statut a_faire, ordre croissant) et son lien.
4. Sachant que le parcours vise ~2 semaines au total, dis-moi en une phrase
   si mon rythme est bon par rapport à ma progression actuelle.
Format : 5 lignes maximum, pas de tableau.
```

**Pourquoi la consigne « base-toi UNIQUEMENT sur cette sortie »** : sans elle,
Claude peut répondre de mémoire, à partir de ce qu'il a vu plus tôt dans la
conversation — et cette mémoire peut être périmée. En l'obligeant à exécuter la
commande, le compte-rendu reflète toujours l'état réel de vos données.

**L'erreur fréquente** : placer le fichier au mauvais endroit. C'est bien
`.claude/commands/` À L'INTÉRIEUR de votre projet ; sinon `/progress`
n'apparaît pas dans l'autocomplétion.
:::
