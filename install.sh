#!/usr/bin/env sh
# spreadsheet-peek installer.
#
# Installs:
#   1. The wolfxl CLI (via cargo; homebrew tap planned)
#   2. The spreadsheet-peek SKILL.md into ~/.claude/skills/spreadsheet-peek/
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/install.sh | sh
#
# Idempotent: re-running skips steps that are already done.
# Source: https://github.com/wolfiesch/spreadsheet-peek

set -eu

REPO="wolfiesch/spreadsheet-peek"
BRANCH="master"
RAW_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
SKILL_DIR="${HOME}/.claude/skills/spreadsheet-peek"

say() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

say "Installing spreadsheet-peek..."

# ---- Step 1: wolfxl --------------------------------------------------------

if command -v wolfxl >/dev/null 2>&1; then
    wolfxl_path="$(command -v wolfxl)"
    say "wolfxl already installed (${wolfxl_path})"
else
    if command -v cargo >/dev/null 2>&1; then
        say "Installing wolfxl-cli via cargo (this takes a few minutes)..."
        cargo install wolfxl-cli
    else
        die "need cargo to install wolfxl-cli.
  - macOS:   brew install rust   (or install rustup from https://rustup.rs)
  - Linux:   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi
fi

# Sanity check the install landed on PATH.
if ! command -v wolfxl >/dev/null 2>&1; then
    warn "wolfxl installed but not on PATH yet - open a new shell or source your profile."
fi

# ---- Step 2: SKILL.md ------------------------------------------------------

mkdir -p "${SKILL_DIR}"

if [ -f "${SKILL_DIR}/SKILL.md" ]; then
    say "Updating existing SKILL.md at ${SKILL_DIR}"
else
    say "Writing SKILL.md to ${SKILL_DIR}"
fi

# Download to a temp file first so a mid-transfer failure doesn't leave
# a half-written SKILL.md behind.
TMP_SKILL="$(mktemp)"
trap 'rm -f "${TMP_SKILL}"' EXIT INT HUP TERM

if command -v curl >/dev/null 2>&1; then
    curl -fsSL "${RAW_URL}/SKILL.md" -o "${TMP_SKILL}"
elif command -v wget >/dev/null 2>&1; then
    wget -q -O "${TMP_SKILL}" "${RAW_URL}/SKILL.md"
else
    die "need curl or wget to download SKILL.md"
fi

# Sanity check: a broken fetch can write a zero-byte file.
if [ ! -s "${TMP_SKILL}" ]; then
    die "downloaded SKILL.md is empty - check network and try again"
fi

mv "${TMP_SKILL}" "${SKILL_DIR}/SKILL.md"
trap - EXIT INT HUP TERM

say "Installed SKILL.md -> ${SKILL_DIR}/SKILL.md"

# ---- Done ------------------------------------------------------------------

cat <<'MSG'

Done. Next steps:

  1. Start a new Claude Code session - the skill loads from ~/.claude/skills/.
  2. Reference an .xlsx file; the agent should preview it with `wolfxl peek` automatically.
  3. Other agents (Codex, Cursor, Continue, Aider): see
     https://github.com/wolfiesch/spreadsheet-peek/blob/master/docs/agent-setup.md

Uninstall:
  rm -rf ~/.claude/skills/spreadsheet-peek

MSG
