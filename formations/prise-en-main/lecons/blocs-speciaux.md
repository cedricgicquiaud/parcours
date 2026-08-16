Le markdown de Parcours est du markdown standard — titres, listes, tableaux,
cases à cocher, blocs de code — plus cinq encadrés à trois deux-points.

:::prerequis
[La syntaxe markdown de base, en une page](https://commonmark.org/help/)
:::

## Les cinq blocs

```markdown
:::astuce
Toujours ouvert, fond teinté.
:::

:::attention
Toujours ouvert, pour ce qui peut casser.
:::

:::indice Le titre est facultatif
Replié. Numéroté automatiquement : Indice 1, Indice 2…
:::

:::solution
Replié aussi. Jamais indexé par la recherche.
:::

:::prerequis
Les liens vers l'extérieur, ouverts dans un nouvel onglet.
:::
```

Les noms anglais fonctionnent : `tip`, `warning`, `danger`, `hint`. La casse et
les accents sont ignorés — `:::Astuce` et `:::Prérequis` marchent. Un nom inconnu
n'est pas une erreur : le contenu s'affiche normalement, sans encadré.

Les indices et les solutions sont **repliés à l'arrivée**, sans exception, et le
restent après un rechargement. Rien ne se dévoile sans un clic.

## Les liens

| Écriture | Effet |
| --- | --- |
| `[texte](https://exemple.test)` | Lien externe, nouvel onglet |
| `[texte](lecon:identifiant)` | Va à une leçon de la même formation |
| `[texte](assets/fichier.pdf)` | Fichier joint de la formation |
| `[texte](#ancre)` | Ancre dans la page |

Un `lecon:` dont l'identifiant n'existe pas s'affiche en texte simple, non
cliquable. Tout autre schéma — `javascript:`, `data:`, un chemin absolu — est
refusé : le texte du lien reste, le lien disparaît.

## Les images

```markdown
![Texte alternatif](assets/schema.png)
```

Chemins relatifs uniquement, confinés au dossier de la formation. Une image
absente affiche son texte alternatif encadré : la leçon ne casse pas.

## Le code et les schémas

Le langage déclaré sur la barrière active la coloration, hors ligne :

```typescript
export function bonjour(nom: string): string {
  return `Bonjour ${nom}`;
}
```

Un langage inconnu reste lisible, en monospace neutre :

```klingon
nuqneH
```

Une barrière ` ```mermaid ` produit un schéma, dessiné par le navigateur en mode
sécurité strict. Une syntaxe invalide affiche le source avec la mention « schéma
non rendu » — jamais une page cassée.

:::attention
Le HTML écrit à la main est **affiché en texte**, jamais interprété. Écrire
`<script>` dans une leçon affiche `<script>`, et rien ne s'exécute.
:::

Les titres du contenu descendent d'un niveau au rendu : un `#` dans le fichier
devient un sous-titre. Le seul grand titre de l'écran est celui de la leçon,
pris dans le manifeste.

## Critères de réussite

- [ ] j'ai vu que l'encadré « AVANT CETTE LEÇON », en haut, ouvre son lien dans un nouvel onglet
- [ ] j'ai constaté que le bloc TypeScript est coloré et que le bloc `klingon` reste lisible
- [ ] j'ai vu le schéma de la leçon [Ce que Parcours retient de vous](lecon:progression) s'afficher comme un dessin
- [ ] j'ai ouvert un indice de l'[exercice guidé](lecon:exercice-guide), rechargé, et il était de nouveau replié
- [ ] j'ai cherché un mot présent uniquement dans une solution : aucun résultat
