# Contributing to spreadsheet-peek

Thanks for your interest. This project is small but takes contributions seriously - the skill is a piece of agent behavior that many people will rely on, so quality matters more than speed.

## What kinds of contributions are welcome

- **Bug reports** - Cases where xleak output is misleading, the skill misfires, or an agent doesn't invoke it when it should
- **Agent compatibility** - Install instructions for agents not yet listed (Aider, Continue, etc.)
- **Token benchmarks** - Additional workbook shapes (very wide, very tall, CSV, different locales) benchmarked with the existing methodology
- **Proactive trigger refinements** - Heuristics for when the agent should or shouldn't preview
- **Documentation clarity** - Better examples, clearer phrasing, fixing typos

## What's probably out of scope

- Replacing `xleak` with a different backend (the skill is intentionally a thin behavioral wrapper)
- Claude Code-specific features that wouldn't work in other agents (breaks the agent-agnostic design)
- Adding heavy dependencies - the skill should stay a single-file `SKILL.md` with minimal tooling

## Development setup

You don't strictly need a dev environment to edit `SKILL.md` - it's just markdown. But if you want to rerun benchmarks or regenerate the demo GIF:

```bash
# Clone
git clone https://github.com/wolfiesch/spreadsheet-peek
cd spreadsheet-peek

# Install xleak (the only runtime dependency)
brew install bgreenwell/tap/xleak

# For benchmarks + sample regeneration
# (uses uv, which spins up ephemeral envs)
uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py

# For re-recording the demo GIF
brew install charmbracelet/tap/vhs
vhs examples/demo.tape
```

## Testing skill changes

There's no automated test suite because the skill is behavioral, not code. The recommended loop:

1. Copy your modified `SKILL.md` to `~/.claude/skills/spreadsheet-peek/` (or your agent's equivalent)
2. Start a fresh agent session
3. Reference a spreadsheet file and verify the agent invokes xleak correctly
4. Try edge cases: multi-sheet workbooks, very large files, CSV vs XLSX, formulas

## Pull request checklist

- [ ] `SKILL.md` changes keep the document agent-agnostic (no Claude Code-only features)
- [ ] If you changed the proactive triggers, the description in `SKILL.md` frontmatter still matches
- [ ] If you changed token-cost claims in the README, `benchmarks/measure_tokens.py` still reproduces the numbers
- [ ] CHANGELOG.md updated with a brief entry under an `[Unreleased]` heading
- [ ] If you added a new file to `examples/`, linked it in `examples/README.md`

## Style notes

- Use regular hyphens (`-`), not em dashes, in prose
- Avoid "it's not X, it's Y" constructions - just state Y directly
- Keep code examples short and paste-able

## Questions

Open an issue with the `question` label. I'd rather answer the same question 50 times than have someone bounce silently.
