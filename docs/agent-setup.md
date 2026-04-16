# Agent Setup Guide

Detailed installation for each AI coding agent. If your agent isn't listed, the pattern is the same: paste the content of `SKILL.md` into whatever mechanism your agent uses for persistent system instructions.

## Verification status

Each agent below carries a badge indicating how the integration was confirmed.

| Badge | Meaning |
|-------|---------|
| ✅ **Verified** | Skill was loaded into a live session of that agent and the expected behavior was observed directly. Date shown is the last-verified date. |
| 📖 **Documented** | Install steps follow the agent's published configuration docs, but were not personally round-tripped on real hardware. Works in principle; please open an issue if you hit problems. |

Badges get re-dated whenever the skill, the agent, or the agent's instruction-loading mechanism changes meaningfully.

## Table of contents

- [Claude Code](#claude-code) ✅ Verified 2026-04-16
- [Codex](#codex) 📖 Documented
- [Cursor](#cursor) 📖 Documented
- [Continue](#continue) 📖 Documented
- [Aider](#aider) 📖 Documented
- [Generic / any agent](#generic)

---

## Claude Code

> ✅ **Verified 2026-04-16** - Skill loads from `~/.claude/skills/spreadsheet-peek/SKILL.md` in an active Claude Code session; frontmatter description and `filePattern`/`bashPattern` triggers are recognized by the skills index.

Claude Code has native support for skills via the `~/.claude/skills/` directory. The skill's frontmatter (`name`, `description`, `filePattern`, `bashPattern`) is used to auto-invoke it when relevant.

**Global install (all projects):**

```bash
mkdir -p ~/.claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md
```

**Project-specific install:**

```bash
# From your project root
mkdir -p .claude/skills/spreadsheet-peek
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o .claude/skills/spreadsheet-peek/SKILL.md
```

**Verify it's loaded:**

Start a new session and ask Claude: "What skills do you have available?" The spreadsheet-peek skill should appear. You can also reference a `.xlsx` file and the skill should auto-trigger.

**Keep it updated:**

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o ~/.claude/skills/spreadsheet-peek/SKILL.md
```

---

## Codex

> 📖 **Documented** - Install steps below follow Codex's published `AGENTS.md` convention. Not yet round-tripped in a live Codex session. If the agent fails to pick up the skill, please open an issue.

Codex reads `AGENTS.md` from the repo root as its persistent instructions. Add a section for spreadsheet-peek:

```bash
# From your project root
cat >> AGENTS.md << 'EOF'

## Spreadsheet Previews (spreadsheet-peek)

Prerequisites: `brew install bgreenwell/tap/xleak`

When the user references a `.xlsx`, `.csv`, or `.ods` file, or when about to
run a data pipeline or script that reads a spreadsheet, preview the file first
with xleak before doing anything else:

    xleak <file> -n 15

For large files or repeat previews in the same conversation, switch to the
token-efficient mode:

    xleak <file> --export text | head -20

For multi-sheet workbooks, preview each relevant sheet:

    xleak <file> --sheet "Balance Sheet" -n 15

Never write disposable Python to view a spreadsheet. Use xleak.

Full skill reference: https://github.com/wolfiesch/spreadsheet-peek
EOF
```

Or copy the full `SKILL.md` content if you want the complete trigger rules and fallback patterns:

```bash
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  >> AGENTS.md
```

---

## Cursor

> 📖 **Documented** - Install steps below follow Cursor's published Rules for AI and `.cursor/rules/` docs. Not personally round-tripped. PRs with a verification screenshot welcome.

Cursor uses "Rules for AI" (Settings → General → Rules for AI) for persistent instructions. Paste the body of `SKILL.md` (everything after the YAML frontmatter) into that box.

Or use project-level rules:

```bash
# From your project root
mkdir -p .cursor
curl -fsSL https://raw.githubusercontent.com/wolfiesch/spreadsheet-peek/master/SKILL.md \
  -o .cursor/rules/spreadsheet-peek.md
```

Cursor will pick up markdown files in `.cursor/rules/` automatically.

---

## Continue

> 📖 **Documented** - Based on Continue's published `config.json` `systemMessage` field. Not personally round-tripped.

Continue uses `~/.continue/config.json`. Add a `systemMessage` entry or append to an existing one:

```json
{
  "models": [...],
  "systemMessage": "When the user references a .xlsx or .csv file, preview it with `xleak <file> -n 15` before discussing it. For repeat previews, use `xleak <file> --export text | head -20` to save tokens. Never write Python just to inspect a spreadsheet. Full reference: https://github.com/wolfiesch/spreadsheet-peek"
}
```

---

## Aider

> 📖 **Documented** - Based on Aider's published `.aider.conf.yml` `read:` mechanism. Not personally round-tripped.

Aider reads `.aider.conf.yml` for configuration. Set `instructions` pointing to a file:

```yaml
# .aider.conf.yml
read:
  - SKILL.md
```

Then copy `SKILL.md` to your repo root or reference the raw GitHub URL.

---

## Generic

For any agent that supports persistent system instructions (system prompt, rules file, custom instructions, etc.), the pattern is the same:

1. Ensure xleak is installed: `brew install bgreenwell/tap/xleak`
2. Copy the body of `SKILL.md` into your agent's persistent instruction mechanism
3. Start a new session - the agent will now know to use xleak proactively

The behavioral rules in `SKILL.md` are written in agent-neutral language. Any agent that can execute shell commands can apply them.

---

## Troubleshooting

### The agent still writes Python to inspect spreadsheets

- Verify the skill is actually loaded (in Claude Code: ask "what skills do you have?")
- Check that `xleak` is in the agent's `PATH` - some agents run commands in a restricted shell
- The proactive triggers in `SKILL.md` assume the agent reads the full skill body, not just the description - make sure you pasted the whole file, not just the frontmatter

### xleak command not found

```bash
brew install bgreenwell/tap/xleak
which xleak   # should print /opt/homebrew/bin/xleak on Apple Silicon
```

If Homebrew isn't available, xleak has prebuilt binaries: https://github.com/bgreenwell/xleak/releases

### The agent uses box-drawing mode everywhere and eats context

The token-efficiency rule in `SKILL.md` instructs the agent to switch to `--export text | head` after the first preview. If this isn't happening, your agent may be using only the description/frontmatter of the skill, not the full body. Re-check the install - the full SKILL.md content needs to be in the agent's context.
