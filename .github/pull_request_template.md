<!--
Thanks for sending a PR. Short is fine. The checklist below mirrors CONTRIBUTING.md.
-->

## Summary

<!-- One or two sentences. What does this change and why? -->

## Checklist

- [ ] `SKILL.md` changes (if any) keep the document agent-agnostic - no Claude Code-only features
- [ ] If proactive triggers changed, the description in `SKILL.md` frontmatter still matches
- [ ] If token-cost claims in the README or `docs/how-it-works.md` changed, `benchmarks/measure_tokens.py` still reproduces the numbers
- [ ] `CHANGELOG.md` updated under an `[Unreleased]` heading
- [ ] If a new file was added to `examples/`, it is linked in `examples/README.md`
- [ ] Prose uses regular hyphens (not em dashes) and avoids "not X but Y" framing

## Testing

<!-- How did you verify the change? For skill edits, a fresh agent session + a sample .xlsx is usually enough. -->

## Related

<!-- Link related issues or discussions. Use "Fixes #123" to auto-close. -->
