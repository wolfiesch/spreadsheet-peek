#!/usr/bin/env sh
# spreadsheet-peek installer.
#
# Installs wolfxl-cli and one or more agent setup artifacts.
# Default behavior stays Claude Code skill install for existing users.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/install.sh | sh
#   sh install.sh --target codex --output /tmp/spreadsheet-peek-agents-snippet.md
#
# Idempotent: re-running skips steps that are already done.
# Source: https://github.com/wolfiesch/spreadsheet-peek

set -eu

REPO="wolfiesch/spreadsheet-peek"
BRANCH="master"
RAW_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
SKILL_DIR="${HOME}/.claude/skills/spreadsheet-peek"
MIN_WOLFXL_VERSION="0.9.0"
TARGET="claude"
OUTPUT=""

say() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

usage() {
    cat <<'MSG'
spreadsheet-peek installer

Usage:
  sh install.sh [--target claude|codex|both|skill-only] [--output PATH]
  sh install.sh --help

Targets:
  claude      Install SKILL.md to ~/.claude/skills/spreadsheet-peek/ (default).
  codex       Print a Codex-ready AGENTS.md snippet, or write it with --output.
  both        Install the Claude skill and emit Codex instructions.
  skill-only  Download SKILL.md to ./SKILL.md, or to --output.

Examples:
  sh install.sh
  sh install.sh --target both
  sh install.sh --target codex --output /tmp/spreadsheet-peek-agents-snippet.md
  sh install.sh --target skill-only --output /tmp/spreadsheet-peek/SKILL.md

Codex note:
  This script never edits a project AGENTS.md unless you explicitly choose an
  output path. Review the snippet, then paste it where you want it.
MSG
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --help|-h)
            usage
            exit 0
            ;;
        --target)
            [ "$#" -ge 2 ] || die "--target requires a value"
            TARGET="$2"
            shift 2
            ;;
        --target=*)
            TARGET="${1#*=}"
            shift
            ;;
        --output)
            [ "$#" -ge 2 ] || die "--output requires a path"
            OUTPUT="$2"
            shift 2
            ;;
        --output=*)
            OUTPUT="${1#*=}"
            shift
            ;;
        *)
            die "unknown option: $1"
            ;;
    esac
done

case "${TARGET}" in
    claude|codex|both|skill-only) ;;
    *) die "invalid --target ${TARGET}; expected claude, codex, both, or skill-only" ;;
esac

wolfxl_compatibility() {
    if ! command -v wolfxl >/dev/null 2>&1; then
        printf 'false\n'
        return 0
    fi

    wolfxl_help="$(wolfxl --help 2>/dev/null || true)"
    case "${wolfxl_help}" in *peek*) ;; *) printf 'false\n'; return 0 ;; esac
    case "${wolfxl_help}" in *map*) ;; *) printf 'false\n'; return 0 ;; esac
    case "${wolfxl_help}" in *agent*) ;; *) printf 'false\n'; return 0 ;; esac
    case "${wolfxl_help}" in *schema*) ;; *) printf 'false\n'; return 0 ;; esac

    wolfxl_version="$(wolfxl --version 2>/dev/null || true)"
    wolfxl_major="$(printf '%s\n' "${wolfxl_version}" | sed -n 's/^wolfxl \([0-9][0-9]*\)\..*/\1/p')"
    wolfxl_minor="$(printf '%s\n' "${wolfxl_version}" | sed -n 's/^wolfxl [0-9][0-9]*\.\([0-9][0-9]*\)\..*/\1/p')"

    if [ -z "${wolfxl_major}" ] || [ -z "${wolfxl_minor}" ]; then
        printf 'false\n'
        return 0
    fi

    if [ "${wolfxl_major}" -gt 0 ]; then
        printf 'true\n'
        return 0
    fi

    if [ "${wolfxl_minor}" -lt 9 ]; then
        printf 'false\n'
        return 0
    fi

    printf 'true\n'
}

install_wolfxl() {
    wolfxl_compatible=false
    wolfxl_compatible="$(wolfxl_compatibility)"

    if [ "${wolfxl_compatible}" = true ]; then
        wolfxl_path="$(command -v wolfxl)"
        say "wolfxl already installed (${wolfxl_path})"
    else
        if command -v wolfxl >/dev/null 2>&1; then
            wolfxl_path="$(command -v wolfxl)"
            wolfxl_version="$(wolfxl --version 2>/dev/null || printf 'unknown version')"
            say "Upgrading incompatible wolfxl (${wolfxl_version}, ${wolfxl_path}); need wolfxl-cli >= ${MIN_WOLFXL_VERSION}"
        fi

        if command -v cargo >/dev/null 2>&1; then
            say "Installing wolfxl-cli via cargo (this takes a few minutes)..."
            cargo install --force wolfxl-cli
        else
            die "need cargo to install wolfxl-cli.
  - macOS:   brew install rust   (or install rustup from https://rustup.rs)
  - Linux:   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        fi
    fi

    wolfxl_compatible=false
    wolfxl_compatible="$(wolfxl_compatibility)"

    if [ "${wolfxl_compatible}" = true ]; then
        wolfxl_ready="$(wolfxl --version 2>/dev/null)" || wolfxl_ready="$(command -v wolfxl)"
        say "wolfxl ready: ${wolfxl_ready}"
    elif command -v wolfxl >/dev/null 2>&1; then
        die "wolfxl is on PATH but does not expose the required peek/map/agent/schema commands. Ensure wolfxl-cli >= ${MIN_WOLFXL_VERSION} is first on PATH."
    else
        warn "wolfxl installed but not on PATH yet - open a new shell or source your profile."
    fi
}

download_skill_to() {
    destination="$1"
    destination_dir="$(dirname "${destination}")"
    mkdir -p "${destination_dir}"

    tmp_skill="$(mktemp)"
    trap 'rm -f "${tmp_skill}"' EXIT INT HUP TERM

    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "${RAW_URL}/SKILL.md" -o "${tmp_skill}"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "${tmp_skill}" "${RAW_URL}/SKILL.md"
    else
        die "need curl or wget to download SKILL.md"
    fi

    if [ ! -s "${tmp_skill}" ]; then
        die "downloaded SKILL.md is empty - check network and try again"
    fi

    mv "${tmp_skill}" "${destination}"
    trap - EXIT INT HUP TERM
}

install_claude_skill() {
    mkdir -p "${SKILL_DIR}"
    if [ -f "${SKILL_DIR}/SKILL.md" ]; then
        say "Updating existing SKILL.md at ${SKILL_DIR}"
    else
        say "Writing SKILL.md to ${SKILL_DIR}"
    fi
    download_skill_to "${SKILL_DIR}/SKILL.md"
    say "Installed SKILL.md -> ${SKILL_DIR}/SKILL.md"
}

codex_snippet() {
    cat <<'MSG'
## Spreadsheet Previews

When the user references a spreadsheet or delimited table file, or when you are
about to run a data pipeline that reads one, preview it first with `wolfxl peek`:

    wolfxl peek <file> -n 15

For large files or repeat previews in the same conversation, use the
token-efficient mode:

    wolfxl peek <file> --export text | sed -n '1,20p'

For large or unfamiliar workbooks, ask for a compact briefing:

    wolfxl agent <file> --max-tokens 800

When sheet structure matters more than values, map the workbook:

    wolfxl map <file> --format text

Direct preview works for `.xlsx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.csv`,
`.tsv`, and comma-delimited `.txt` files with `wolfxl-cli >= 0.9.0`.

Full skill reference: https://github.com/wolfiesch/spreadsheet-peek
MSG
}

emit_codex_instructions() {
    if [ -n "${OUTPUT}" ]; then
        output_dir="$(dirname "${OUTPUT}")"
        mkdir -p "${output_dir}"
        codex_snippet > "${OUTPUT}"
        say "Wrote Codex AGENTS snippet -> ${OUTPUT}"
    else
        cat <<'MSG'

Codex setup:
  Paste this snippet into the project AGENTS.md section where you keep agent
  instructions. This script did not edit AGENTS.md automatically.

MSG
        codex_snippet
    fi
}

install_skill_only() {
    destination="${OUTPUT:-./SKILL.md}"
    download_skill_to "${destination}"
    say "Downloaded SKILL.md -> ${destination}"
}

say "Installing spreadsheet-peek (target: ${TARGET})..."
install_wolfxl

case "${TARGET}" in
    claude)
        install_claude_skill
        ;;
    codex)
        emit_codex_instructions
        ;;
    both)
        install_claude_skill
        emit_codex_instructions
        ;;
    skill-only)
        install_skill_only
        ;;
    *)
        die "invalid target after validation: ${TARGET}"
        ;;
esac

cat <<'MSG'

Done. Next steps:

  1. Start a fresh agent session so it reloads instructions.
  2. Reference a spreadsheet or delimited table; the agent should preview it
     with `wolfxl peek` automatically.
  3. Other setup paths are documented at:
     https://github.com/wolfiesch/spreadsheet-peek/blob/master/docs/agent-setup.md

Uninstall Claude skill:
  rm -rf ~/.claude/skills/spreadsheet-peek

MSG
