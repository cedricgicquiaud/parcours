#!/usr/bin/env bash
# Stop hook (FORGE) — vérifie les zones modifiées selon la stack détectée.
#   Python (pyproject.toml / setup.py) : ruff → mypy → pytest
#   Node   (package.json)              : <pm> run lint
#   Rust   (Cargo.toml)                : cargo clippy → cargo test
#   Go     (go.mod)                    : gofmt → go vet → go test
#   Ruby   (Gemfile)                   : rubocop
#   PHP    (composer.json)             : phpstan
# Outil absent / deps manquantes = skip EXPLICITE (vérif déléguée à la CI),
# jamais d'échec bidon.
#
# GARDE-FOU ANTI-FAUX-VERT : si du code a changé mais qu'AUCUNE vérification n'a
# réellement tourné (stack non couverte par ce hook, ou tous les outils absents),
# on N'AFFICHE PAS « ✅ OK » — on émet un AVERTISSEMENT visible. Un skip n'est
# jamais maquillé en vert. Exit 2 bloque la conclusion et renvoie les échecs.
#
# C'est un POINT DE DÉPART générique. Adapte les commandes (chemins de venv,
# scripts npm, dossiers à exclure) à ton projet — voir les hooks Nexus pour un
# exemple abouti spécifique à un monorepo.
set -uo pipefail
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" 2>/dev/null || exit 0

input="$(cat)"
printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0

changes="$(git -C "$root" status --porcelain 2>/dev/null)"
[ -z "$changes" ] && exit 0

excl='(-main/|/\.venv/|/node_modules/|/dist/|/build/|/vendor/|/target/)'
fail=0
ran=0   # passe à 1 dès qu'au moins une commande de vérif tourne réellement

# Fichiers de CODE modifiés, toutes stacks confondues (pour le garde-fou final).
code_changed="$(printf '%s\n' "$changes" | grep -E '\.(py|pyi|ts|tsx|js|jsx|vue|svelte|rs|go|rb|php|java|kt|cs|swift|c|h|cpp|cc|scala|clj|ex|exs)$' | grep -vE "$excl" || true)"

# ---- Python ----
if [ -f pyproject.toml ] || [ -f setup.py ]; then
  py_changed="$(printf '%s\n' "$changes" | grep -E '\.pyi?$' | grep -vE "$excl" || true)"
  if [ -n "$py_changed" ]; then
    echo "🔍 Python modifié → vérification…" >&2
    if command -v ruff >/dev/null 2>&1; then ran=1
      out="$(ruff check . 2>&1)" || { printf '── RUFF ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  ruff absent → skip (la CI couvre)." >&2; fi
    if command -v mypy >/dev/null 2>&1; then ran=1
      out="$(mypy . 2>&1)" || { printf '── MYPY ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  mypy absent → skip (la CI couvre)." >&2; fi
    if command -v pytest >/dev/null 2>&1 && pytest --collect-only -q >/dev/null 2>&1; then ran=1
      out="$(pytest -q 2>&1 | tail -25)" || { printf '── PYTEST ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  pytest indisponible (deps manquantes ?) → skip (la CI couvre)." >&2; fi
  fi
fi

# ---- Node / TS ----
if [ -f package.json ]; then
  js_changed="$(printf '%s\n' "$changes" | grep -E '\.(ts|tsx|js|jsx|vue|svelte)$' | grep -vE "$excl" || true)"
  if [ -n "$js_changed" ]; then
    echo "🔍 Front/JS modifié → lint…" >&2
    if command -v bun >/dev/null 2>&1; then PM=bun
    elif command -v pnpm >/dev/null 2>&1; then PM=pnpm
    elif command -v npm >/dev/null 2>&1; then PM=npm; else PM=""; fi
    if [ -n "$PM" ] && grep -q '"lint"' package.json; then ran=1
      out="$($PM run lint 2>&1 | tail -30)" || { printf '── LINT ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  pas de script lint ou de package manager → skip." >&2; fi
  fi
fi

# ---- Rust ----
if [ -f Cargo.toml ]; then
  rs_changed="$(printf '%s\n' "$changes" | grep -E '\.rs$' | grep -vE "$excl" || true)"
  if [ -n "$rs_changed" ] && command -v cargo >/dev/null 2>&1; then ran=1
    echo "🔍 Rust modifié → cargo clippy/test…" >&2
    out="$(cargo clippy -q 2>&1 | tail -25)" || { printf '── CLIPPY ✗ ──\n%s\n' "$out" >&2; fail=1; }
    out="$(cargo test -q 2>&1 | tail -25)" || { printf '── CARGO TEST ✗ ──\n%s\n' "$out" >&2; fail=1; }
  fi
fi

# ---- Go ----
if [ -f go.mod ]; then
  go_changed="$(printf '%s\n' "$changes" | grep -E '\.go$' | grep -vE "$excl" || true)"
  if [ -n "$go_changed" ] && command -v go >/dev/null 2>&1; then ran=1
    echo "🔍 Go modifié → gofmt/vet/test…" >&2
    out="$(gofmt -l . 2>&1)"; [ -n "$out" ] && { printf '── GOFMT ✗ (fichiers non formatés) ──\n%s\n' "$out" >&2; fail=1; }
    out="$(go vet ./... 2>&1)" || { printf '── GO VET ✗ ──\n%s\n' "$out" >&2; fail=1; }
    out="$(go test ./... 2>&1 | tail -25)" || { printf '── GO TEST ✗ ──\n%s\n' "$out" >&2; fail=1; }
  fi
fi

# ---- Ruby ----
if [ -f Gemfile ]; then
  rb_changed="$(printf '%s\n' "$changes" | grep -E '\.rb$' | grep -vE "$excl" || true)"
  if [ -n "$rb_changed" ]; then
    echo "🔍 Ruby modifié → rubocop…" >&2
    if command -v rubocop >/dev/null 2>&1; then ran=1
      out="$(rubocop 2>&1 | tail -30)" || { printf '── RUBOCOP ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  rubocop absent → skip (la CI couvre)." >&2; fi
  fi
fi

# ---- PHP ----
if [ -f composer.json ]; then
  php_changed="$(printf '%s\n' "$changes" | grep -E '\.php$' | grep -vE "$excl" || true)"
  if [ -n "$php_changed" ]; then
    echo "🔍 PHP modifié → phpstan…" >&2
    if command -v phpstan >/dev/null 2>&1; then ran=1
      out="$(phpstan analyse 2>&1 | tail -30)" || { printf '── PHPSTAN ✗ ──\n%s\n' "$out" >&2; fail=1; }
    else echo "⏭️  phpstan absent → skip (la CI couvre)." >&2; fi
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "❌ Vérification rouge — corrige avant de conclure (rien n'est « terminé » sans vert)." >&2
  exit 2
fi

# Garde-fou anti-faux-vert : du code a changé mais AUCUNE vérif n'a tourné.
if [ "$ran" -eq 0 ]; then
  if [ -n "$code_changed" ]; then
    echo "⚠️  FORGE : du code a été modifié mais AUCUNE vérification mécanique n'a tourné" >&2
    echo "    (stack non couverte par ce hook, ou outils/deps absents)." >&2
    echo "    Ce n'est PAS un vert : adapte .claude/hooks/verify-on-stop.sh à ta stack," >&2
    echo "    ou assure-toi explicitement que la CI couvre." >&2
  fi
  exit 0
fi

echo "✅ Vérification OK (zones modifiées)." >&2
exit 0
