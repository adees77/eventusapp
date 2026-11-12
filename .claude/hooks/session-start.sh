#!/bin/bash
# Cheap context at session start so Claude doesn't re-explore the repo.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
echo "Ветка: $(git branch --show-current 2>/dev/null)"
echo "Последние коммиты:"; git log --oneline -5 2>/dev/null
changes=$(git status --short 2>/dev/null | head -20)
[ -n "$changes" ] && { echo "Незакоммичено:"; echo "$changes"; }
echo "Структура проекта — в CLAUDE.md; не исследуй заново."
exit 0
