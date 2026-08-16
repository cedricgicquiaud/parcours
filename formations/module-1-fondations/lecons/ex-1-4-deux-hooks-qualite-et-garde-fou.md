> Durée indicative : 45 min

**Objectif** : automatiser ce qui doit l'être, verrouiller ce qui doit l'être.

**Énoncé** : un hook est une commande qui se déclenche automatiquement quand
Claude Code fait une action donnée. Configurez-en deux dans `.claude/settings.json` :

1. Un hook **PostToolUse** (déclenché juste APRÈS l'action) qui lance `ruff format`
   — l'outil qui met en forme le code Python — sur tout fichier Python modifié
   par Claude.
2. Un hook **PreToolUse** (déclenché juste AVANT l'action, le seul qui peut
   l'empêcher) qui **bloque** toute modification directe de `data/cours.json`
   par Edit/Write (la donnée ne doit passer que par la CLI `forma`), avec un
   message expliquant la règle.

**Critères de réussite**
- [ ] Après une édition de `forma/cli.py` par Claude, le fichier est déjà formaté ruff
- [ ] Demander à Claude « édite data/cours.json pour marquer subagents terminé »
      échoue avec votre message, et Claude se rabat de lui-même sur `forma done`
- [ ] Les deux hooks survivent à un redémarrage de session

:::indice la direction
Un hook est une commande qui se déclenche automatiquement quand Claude fait une
action donnée — ici, modifier un fichier. Les hooks se décrivent dans le fichier
`.claude/settings.json` de votre projet. Deux notions suffisent : le `matcher`
dit quelles actions surveiller (`Edit|Write` = les modifications et créations de
fichiers), et la commande du hook reçoit une description de l'action, dont le
chemin du fichier touché.

Bon réflexe pour cet exercice : demandez à Claude Code de rédiger ce
settings.json avec vous. Utiliser Claude pour configurer Claude, c'est l'esprit
du module.
:::

:::indice le comment
Il existe deux moments d'accrochage : `PostToolUse` (juste après l'action —
parfait pour formater ce qui vient d'être écrit) et `PreToolUse` (juste avant —
le seul qui peut l'empêcher).

Pour bloquer : la commande du hook doit se terminer avec le code de sortie 2.
L'action est alors annulée, et tout ce que la commande a affiché en erreur est
montré à Claude — c'est là que vous placez votre message « utilise uv run forma
done ». Pour savoir quel fichier est visé, l'outil `jq` (un extracteur de
valeurs dans du JSON) lit le chemin : `jq -r '.tool_input.file_path'`.
:::

:::solution
**Le résultat attendu** — `.claude/settings.json` :

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "f=$(jq -r '.tool_input.file_path'); case \"$f\" in *.py) uv run ruff format \"$f\";; esac"
      }]
    }],
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "f=$(jq -r '.tool_input.file_path'); case \"$f\" in *data/cours.json) echo 'cours.json ne se modifie que via la CLI : uv run forma done <id>' >&2; exit 2;; esac"
      }]
    }]
  }
}
```

**Pourquoi ça marche**, ligne à ligne :

- `"matcher": "Edit|Write"` : ces hooks s'activent quand Claude modifie ou crée
  un fichier.
- `f=$(jq -r '.tool_input.file_path')` : range le chemin du fichier concerné
  dans la variable `f`.
- `case "$f" in *.py) ... esac` : « si le nom finit par .py, alors... ». Le
  premier hook formate donc les fichiers Python (avec `ruff format`), le second
  ne s'intéresse qu'à cours.json.
- `>&2` puis `exit 2` : le message part sur la sortie d'erreur, puis le code de
  sortie 2 annule l'action. Claude voit votre message et se rabat de lui-même
  sur `uv run forma done`.

**L'erreur fréquente** : modifier settings.json et tester dans la même session.
Les hooks sont lus au démarrage — redémarrez la session pour qu'ils s'activent
(c'est le critère 3).
:::
