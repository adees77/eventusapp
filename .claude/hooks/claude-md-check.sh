#!/bin/bash
# Stop hook: if this work added/removed/renamed files in the code tree
# (or changed package.json / config) but CLAUDE.md was not touched,
# ask Claude once to update the project map. Never loops.
input=$(cat)
echo "$input" | grep -q '"stop_hook_active": *true' && exit 0
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# CLAUDE.md already edited (staged or not) → nothing to do
git status --porcelain -- CLAUDE.md 2>/dev/null | grep -q . && exit 0

structural=$(git status --porcelain --untracked-files=all -- app components lib config messages supabase package.json 2>/dev/null \
  | grep -E '^(\?\?|A|D|R| D| A)|package\.json|config/' | grep -v '__tests__' | head -10)
[ -z "$structural" ] && exit 0

files=$(echo "$structural" | awk '{print $NF}' | tr '\n' ' ')
# Ask only once per set of changes (not every turn)
ack="$(git rev-parse --git-dir)/claude-md-ack"
[ "$(cat "$ack" 2>/dev/null)" = "$files" ] && exit 0
echo "$files" > "$ack"
printf '{"decision":"block","reason":"Структурные изменения (%s). Если они меняют карту/правила в CLAUDE.md — обнови 1-2 строки там коротко; если нет — просто заверши."}\n' "$files"
exit 0
