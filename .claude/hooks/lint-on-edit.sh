#!/usr/bin/env bash
# PostToolUse(Edit|Write) (FORGE) — lint le fichier qui vient d'être modifié
# selon son type, si le linter est disponible. No-op silencieux sinon
# (linter absent, fichier vendorisé). Exit 2 = renvoie l'erreur à Claude pour
# correction immédiate.
#
# Stacks couvertes (par extension) : Python (ruff), Node/TS (eslint),
# Rust (rustfmt), Go (gofmt), Ruby (rubocop), PHP (php -l).
# Point de départ générique : ajoute/ajuste les cas selon la stack du projet.
# NB : ici le linter absent = skip silencieux (lint incrémental best-effort, à
# chaque édition). Le garde-fou anti-faux-vert « stack non couverte » est porté
# par verify-on-stop.sh (la gate de conclusion), pour éviter le spam d'édition.
set -uo pipefail
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" 2>/dev/null || exit 0

file="$(sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in *"-main/"*|*"/.venv/"*|*"/node_modules/"*|*"/dist/"*|*"/build/"*|*"/vendor/"*|*"/target/"*) exit 0 ;; esac

case "$file" in
  *.py)
    command -v ruff >/dev/null 2>&1 || exit 0
    out="$(ruff check "$file" 2>&1)" || { printf '%s\n\n⚠️ ruff : corrige les problèmes ci-dessus dans %s.\n' "$out" "$file" >&2; exit 2; }
    ;;
  *.ts|*.tsx|*.js|*.jsx)
    command -v eslint >/dev/null 2>&1 || exit 0
    out="$(eslint "$file" 2>&1)" || { printf '%s\n\n⚠️ eslint : corrige les problèmes ci-dessus dans %s.\n' "$out" "$file" >&2; exit 2; }
    ;;
  *.rs)
    command -v rustfmt >/dev/null 2>&1 || exit 0
    rustfmt --check "$file" >/dev/null 2>&1 || { echo "⚠️ rustfmt : $file non formaté (lance « cargo fmt »)." >&2; exit 2; }
    ;;
  *.go)
    command -v gofmt >/dev/null 2>&1 || exit 0
    [ -z "$(gofmt -l "$file" 2>/dev/null)" ] || { echo "⚠️ gofmt : $file non formaté (lance « gofmt -w $file »)." >&2; exit 2; }
    ;;
  *.rb)
    command -v rubocop >/dev/null 2>&1 || exit 0
    out="$(rubocop --force-exclusion "$file" 2>&1)" || { printf '%s\n\n⚠️ rubocop : corrige les problèmes ci-dessus dans %s.\n' "$out" "$file" >&2; exit 2; }
    ;;
  *.php)
    command -v php >/dev/null 2>&1 || exit 0
    out="$(php -l "$file" 2>&1)" || { printf '%s\n\n⚠️ php -l : corrige la syntaxe dans %s.\n' "$out" "$file" >&2; exit 2; }
    ;;
esac
exit 0
