Le markdown de Parcours est du markdown standard — titres, listes, tableaux,
cases à cocher, blocs de code — plus cinq blocs à trois deux-points.

:::prerequis
[La documentation du format, dans le dépôt](https://commonmark.org/help/)
:::

## Les cinq blocs

```markdown
:::astuce
Toujours ouvert, fond teinté.
:::

:::attention
Toujours ouvert, pour ce qui peut casser.
:::

:::indice Le titre est optionnel
Replié. Numéroté automatiquement : Indice 1, Indice 2…
:::

:::solution
Replié aussi. Jamais indexé par la recherche.
:::

:::prerequis
Les liens vers l'extérieur, ouverts dans un nouvel onglet.
:::
```

Les noms anglais fonctionnent aussi : `tip`, `warning`, `danger`, `hint`. Un nom
inconnu n'est pas une erreur : le contenu s'affiche normalement, sans encadré.

## Ce que fait le rendu

- Le HTML écrit à la main est affiché en texte, jamais interprété.
- Les liens externes s'ouvrent dans un nouvel onglet.
- Les liens internes s'écrivent `[texte](lecon:identifiant)`.
- Les images sont relatives au dossier de la formation : `![alt](assets/image.png)`.

Les cases à cocher du contenu sont des **critères de réussite** : cochez-les,
Parcours retient. Essayez sur celles-ci.

- [ ] j'ai coché ce critère, et le décompte ci-dessus est passé à 1
- [ ] j'ai rechargé la page : mon état est toujours là
- [x] cette case est cochée dans le fichier, mais je peux la décocher

Cocher le dernier critère ouvert marque la leçon terminée. Décocher ensuite ne
la défait pas : revenir vérifier un détail ne coûte pas son avancement.

:::attention
Une image absente n'est pas une page cassée : son texte alternatif s'affiche
encadré, et la leçon continue.
:::

## Le code

Le langage déclaré sur la barrière de code active la coloration syntaxique :

```typescript
export function bonjour(nom: string): string {
  return `Bonjour ${nom}`;
}
```

Un langage inconnu reste lisible, en monospace neutre :

```klingon
nuqneH
```
