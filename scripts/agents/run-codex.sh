#!/usr/bin/env bash
# Run Codex non-interactively in a task worktree.
# Usage: scripts/agents/run-codex.sh <worktree-dir> <prompt-file> [last-message-out]
# Env: CODEX_SANDBOX=read-only for reviews (default workspace-write), CODEX_MODEL, CODEX_BIN.
#
# Sandbox: workspace-write, plus network (for uv/pnpm installs) and write access to the
# main repo's .git (worktree commits write there). Nothing here changes ~/.codex/config.toml.
set -euo pipefail

worktree=$(cd "$1" && pwd)
prompt_file=$2
out=${3:-"$worktree/.codex-last-message.txt"}
repo_git=$(git -C "$worktree" rev-parse --path-format=absolute --git-common-dir)

codex_bin=${CODEX_BIN:-$(command -v codex || true)}
if [[ -z "$codex_bin" ]]; then
  # Fall back to the CLI bundled with the VS Code extension (newest version).
  codex_bin=$(ls -d "$HOME"/.vscode/extensions/openai.chatgpt-*/bin/*/codex 2>/dev/null | sort -V | tail -1)
fi
[[ -x "$codex_bin" ]] || { echo "codex CLI not found; set CODEX_BIN" >&2; exit 1; }

# ~/.codex/config.toml pins a model the ChatGPT-account CLI rejects; use the one the IDE uses.
model=${CODEX_MODEL:-gpt-6-astra}

exec "$codex_bin" exec \
  -m "$model" \
  -C "$worktree" \
  -s "${CODEX_SANDBOX:-workspace-write}" \
  --add-dir "$repo_git" \
  -c sandbox_workspace_write.network_access=true \
  -o "$out" \
  - < "$prompt_file"
