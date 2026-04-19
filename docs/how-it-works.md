# How spreadsheet-peek Works

`spreadsheet-peek` is a small idea delivered as a single file (`SKILL.md`): teach an AI coding agent to use [`wolfxl peek`](https://crates.io/crates/wolfxl-cli) instead of improvising Python every time it touches a `.xlsx`. The payoff is two-sided. The agent gets faster, more readable, *style-aware* previews. The user gets a context window that survives long sessions. This doc unpacks the mechanics behind that claim.

The short version sits at three layers:

1. **Proactive triggers** change *when* the agent looks at a spreadsheet.
2. **Token-efficient output modes** change *how* it looks at one.
3. **A reproducible pattern** means the same shape can wrap any opaque file format.

Below is ~45 seconds of `wolfxl peek` rendering the committed sample workbook. If you only know spreadsheets as `openpyxl` tuple dumps, this is the part you've been missing.

https://github.com/wolfiesch/spreadsheet-peek/assets/screencast.mp4

![screencast](../assets/screencast.gif)

---

## 1. Why proactive triggers win

Most agent integrations are *reactive*. The user asks "what does that file look like?" and the agent answers. That pattern is fine for a one-shot tool call. It falls apart when an agent is about to run a 30-second data pipeline on a file nobody has inspected, and the first surfaced surprise is the stack trace.

`spreadsheet-peek` inverts that. The `SKILL.md` body lists five specific conditions where the agent is expected to preview without being asked:

1. **Before data processing.** Any pipeline, ETL, or script that reads a spreadsheet gets a preview of the input first. The cost is one `wolfxl peek` call (~0.05s, ~600 tokens). The benefit is the user sees what the pipeline is actually processing before the run, not after a silent misclassification buries the real question under hundreds of rows of output.
2. **After generating a test fixture.** When the agent creates or modifies an `.xlsx` under `tests/`, it previews the result. Fixtures that look right on paper frequently render wrong (merged cells collapsed, numbers stored as strings, off-by-one header rows), and catching that before a test run saves a debugging round.
3. **When the user references a spreadsheet by path.** "Look at `data/q3.xlsx`" becomes `wolfxl peek data/q3.xlsx -n 15` before anything else, rather than a conversational description of what's in the file from memory.
4. **When debugging a parsing issue.** If a classifier flagged a sheet as the wrong archetype, the agent looks at what the parser actually got.
5. **When comparing before/after.** Transformations show source and result side-by-side.

Each trigger is a moment where a reactive agent would either ask a clarifying question or skip the preview and regret it later. Proactive triggers collapse the loop: the agent acts first, the user reads the output, and the next turn is already ahead of where a "let me know if you want to see it" conversation would be.

The fixture trigger is worth lingering on. Test fixtures are a class of files where the *writer* and the *reader* are both the agent, and where the feedback loop between "I created this" and "this is wrong" is exactly one test run long. Previewing the fixture immediately after generation catches three common failure modes before they turn into red tests: header rows written to the second row instead of the first, numeric columns written as strings because the generator called `str(x)` somewhere, and multi-sheet workbooks where the intended sheet is index 1 and the default sheet (still named "Sheet") is empty. Each of those has cost me (and probably you) a multi-minute detour when spotted after a test failure. Spotting them from a 15-row preview takes two seconds.

The skill also lists explicit *skip* rules (already previewed, already shown in programmatic output, user opted out, file >10K rows). Without those, proactive becomes obnoxious. With them, the balance tilts strongly toward action.

This is the part of the skill that pays the agent-level dividend. The technical artifact is ~40 lines of markdown. The behavior change is moving a class of decisions from "ask the human" to "just do it."

## 2. The token-efficiency math

The next layer is more mechanical. `wolfxl peek`'s default output uses Unicode box-drawing characters for borders. They look great in a terminal. They cost real tokens in an agent's context window.

From [`benchmarks/measure_tokens.py`](../benchmarks/measure_tokens.py), measured with `cl100k_base` (GPT-4 tokenizer, a reasonable proxy for Claude) against two sample shapes committed to `examples/`:

| Sample | Mode | Command | Tokens (5 rows) | Tokens/row |
|--------|------|---------|----------------:|-----------:|
| [`sample-financials.xlsx`](../examples/sample-financials.xlsx) (7 cols) | Box-drawing | `wolfxl peek file -n 5` | **573** | 114.6 |
| 〃 | Text export | `wolfxl peek file --export text \| head -5` | **117** | 23.4 |
| 〃 | CSV export | `wolfxl peek file --export csv \| head -5` | 119 | 23.8 |
| [`wide-table.xlsx`](../examples/wide-table.xlsx) (29 cols) | Box-drawing | `wolfxl peek file -n 5` | **2,249** | 449.8 |
| 〃 | Text export | `wolfxl peek file --export text \| head -5` | **632** | 126.4 |

Two observations from the two-shape comparison:

1. On the financial workbook, text export is **4.9x cheaper per row** than box-drawing. The overhead is mostly fixed (header lines, border runs), so the per-row cost improves with larger slices, but the ratio holds.
2. On the wide workbook, the *ratio* drops to **3.6x** - because the text-export baseline is itself larger per row when a table has many columns. But the *absolute* per-row savings grows from ~91 tokens/row (financials) to ~323 tokens/row (wide). The wider the workbook, the more expensive naive usage gets in raw tokens, even if the ratio looks less dramatic.

Here's the worked example the skill encodes implicitly. Imagine a 30-spreadsheet agent session (a realistic FDD or QoE engagement). Naive usage runs the box-drawing default on every file:

```
30 spreadsheets x 15-row preview x 87.5 tokens/row = 39,375 tokens
```

That is ~20% of a 200K context window spent on box characters. Now apply the skill's rule: box-drawing for the first preview only, text export for every subsequent look:

```
First previews:  30 x 1,313 tokens (15 rows, box) = 39,390 tokens
Re-previews:     60 x 328 tokens   (15 rows, text) = 19,680 tokens
Total:                                              59,070 tokens
```

vs. naive (90 total previews, all box-drawing):

```
90 x 1,313 = 118,170 tokens
```

Half the context saved. In a session that also has to hold a codebase, a plan, and a conversation, that difference is the gap between finishing and hitting a compaction.

The skill's actual rule is compressed to one sentence: *"Use box-drawing for the FIRST preview in a conversation, switch to `--export text | head` for subsequent previews or when context is getting long."* That sentence is load-bearing. Without it, agents default to the prettiest output and burn the runway.

The ratios are reproducible. `uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py` prints them against the committed sample file; a CI workflow (see [`.github/workflows/benchmark.yml`](../.github/workflows/benchmark.yml)) re-measures them on every PR that touches the skill so the numbers in this doc can't drift silently.

## 3. Extending the pattern

`spreadsheet-peek` is a template more than a tool. The shape generalizes cleanly to any opaque binary format an agent might touch:

- **`pdf-peek`**: `pdftotext` + page-range summaries for audit workpapers, contracts, and scanned financials. Proactive triggers fire on `.pdf` references.
- **`sql-peek`**: `sqlite3 .schema` + `SELECT * LIMIT 10` for `.db`/`.sqlite` files an agent encounters. Token cost of schema-first-then-sample is trivially measurable the same way.
- **`parquet-peek`**: `duckdb -c "SELECT * FROM '/path.parquet' LIMIT 10"` with dtype summary. Parquet is especially gruesome to look at without tooling because it's columnar and binary.
- **`notebook-peek`**: `jq '.cells[].source'` on `.ipynb` files to strip outputs and render only the inputs, since cached outputs often dominate the file size.

The shared shape is the thing:

1. A `SKILL.md` with YAML frontmatter declaring the agent triggers (file patterns, bash patterns, plain-language description).
2. A body that lists proactive triggers and skip rules explicitly.
3. A token-efficiency section with a measured table, not an asserted one.
4. A `benchmarks/` directory with a reproducible script and CI that guards the numbers.
5. One canonical sample file in `examples/` so the benchmarks aren't run against a moving target.

The frontmatter is the only agent-specific piece, and even that is portable. Claude Code consumes it natively; every other agent (Codex, Cursor, Continue, Aider) uses the body text the same way it would any pasted system-prompt content. See [`agent-setup.md`](agent-setup.md) for per-agent wiring.

**None of these siblings exist yet.** That is deliberate. Shipping one skill end-to-end (benchmarks, CI, OG card, install script, compat matrix) and letting it settle before forking the pattern is faster than building four half-finished skills. If you want to build one, the shape above is the blueprint.

A note on the YAML frontmatter, because it is easy to under-think. The `description` field is the *retrieval hook* Claude Code uses to decide whether to load the skill at all. It has to be pointed enough that "work with an `.xlsx`" pulls it in and general enough that "preview this file" does too. The `filePattern` globs catch path mentions the description might miss; the `bashPattern` entries catch cases where the agent is about to shell out to something spreadsheet-shaped without having said the word "xlsx" in the turn. Each of those is cheap to add and expensive to notice is missing, so when you fork the pattern, err on the side of more frontmatter triggers, not fewer.

The same logic applies to SKILL.md body size. The skill currently sits at ~6.7 KB. That is comfortably small enough to paste into any other agent's system-prompt mechanism without crowding out real instructions. If a sibling skill grows past ~10 KB of prose, split it: keep the triggers and the one-paragraph rationale in the body, move the command reference to a linked doc. Agents do not skim; every line in the skill body is loaded into context verbatim when the skill fires.

---

## What this doc is not

It is not a tutorial for `wolfxl peek`. Run `wolfxl peek --help` for that, or read the [`wolfxl-cli` docs on crates.io](https://crates.io/crates/wolfxl-cli).

It is not a rationale for a wrapper MCP server. The skill runs `wolfxl peek` as a plain shell command. If an MCP server would help, it would help the same way for every CLI tool an agent ever touches, and that is a separate problem. (For what it's worth, `wolfxl serve --mcp` is on the sprint-2 backlog precisely so the same `wolfxl-core` logic is reachable from MCP without a wrapper layer.)

It is not marketing. If the 4.9x ratio above is wrong on a larger file or a different tokenizer, the benchmark script is the arbiter. Open an issue with a repro.

---

*Last verified against `wolfxl-cli 0.4.0` and `tiktoken cl100k_base`, 2026-04-19.*
