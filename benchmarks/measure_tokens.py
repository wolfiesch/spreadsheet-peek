"""Measure token costs for different `wolfxl peek` output modes.

This script produces the numbers cited in the README's token-efficiency table.
We use tiktoken's cl100k_base encoding (GPT-4 tokenizer) as a reasonable proxy
for Claude's tokenizer - actual Claude tokenization is similar but not
identical. The relative ratios between modes are what matters for the
efficiency argument, and those are stable across tokenizers.

Run with:
    uv run --with tiktoken --with openpyxl python benchmarks/measure_tokens.py

Outputs a markdown table to stdout.
"""
from __future__ import annotations

import subprocess
import shlex
from pathlib import Path

import tiktoken

EXAMPLES = Path(__file__).parent.parent / "examples"
FINANCIALS = EXAMPLES / "sample-financials.xlsx"
WIDE = EXAMPLES / "wide-table.xlsx"
ENC = tiktoken.get_encoding("cl100k_base")


def run(cmd: list[str]) -> str:
    """Run a shell command and return its stdout."""
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip() or "no output"
        raise RuntimeError(
            f"Command failed with exit code {result.returncode}: {shlex.join(cmd)}\n{details}"
        )
    return result.stdout


def tokens(s: str) -> int:
    """Count tokens using cl100k_base (GPT-4 tokenizer)."""
    return len(ENC.encode(s))


def row_count(output: str) -> int:
    """Count data rows in `wolfxl peek` box output (heuristic: lines starting
    with │ that aren't separators or headers)."""
    data_lines = [
        line for line in output.splitlines()
        if line.startswith("│") and "─" not in line
    ]
    # Subtract 1 for the header row (first │-line is usually the header)
    return max(0, len(data_lines) - 1)


def first_lines(output: str, limit: int) -> str:
    """Return the first ``limit`` lines while preserving line endings."""
    return "".join(output.splitlines(keepends=True)[:limit])


def bench(
    label: str,
    cmd: list[str],
    *,
    max_lines: int | None = None,
    data_rows: int | None = None,
) -> dict:
    output = run(cmd)
    if max_lines is not None:
        output = first_lines(output, max_lines)
    t = tokens(output)
    rows = data_rows or row_count(output) or len(output.splitlines())
    return {
        "label": label,
        "command": " ".join(cmd),
        "tokens": t,
        "bytes": len(output.encode("utf-8")),
        "rows": rows,
        "tokens_per_row": round(t / max(1, rows), 1),
    }


def benches_for(sample_path: Path, prefix: str) -> list[dict]:
    """Produce the same suite of benchmarks for a given sample file."""
    s = str(sample_path)
    return [
        bench(f"{prefix} - Box-drawing (5 rows)",  ["wolfxl", "peek", s, "-n", "5"]),
        bench(f"{prefix} - Box-drawing (15 rows)", ["wolfxl", "peek", s, "-n", "15"]),
        bench(f"{prefix} - Text export (5 data rows)",
              ["wolfxl", "peek", s, "--export", "text"], max_lines=6, data_rows=5),
        bench(f"{prefix} - Text export (15 data rows)",
              ["wolfxl", "peek", s, "--export", "text"], max_lines=16, data_rows=15),
        bench(f"{prefix} - CSV export (5 data rows)",
              ["wolfxl", "peek", s, "--export", "csv"], max_lines=6, data_rows=5),
    ]


def main() -> None:
    for sample in (FINANCIALS, WIDE):
        if not sample.exists():
            raise SystemExit(
                f"Sample file not found: {sample}\n"
                f"Run examples/generate_sample.py and examples/generate_wide_table.py first."
            )

    results = (
        benches_for(FINANCIALS, "Financials (7 cols)")
        + benches_for(WIDE,       "Wide (29 cols)")
    )

    # Print markdown table
    print("| Mode | Tokens | Bytes | Data rows | Tokens/row |")
    print("|------|-------:|------:|----------:|-----------:|")
    for r in results:
        print(
            f"| {r['label']} | {r['tokens']:,} | {r['bytes']:,} | "
            f"{r['rows']} | {r['tokens_per_row']} |"
        )

    print()
    print("## Ratios (box-drawing vs text export, normalized per row)")
    for prefix in ("Financials (7 cols)", "Wide (29 cols)"):
        box = next(r for r in results if r["label"] == f"{prefix} - Box-drawing (5 rows)")
        text = next(r for r in results if r["label"] == f"{prefix} - Text export (5 data rows)")
        ratio = box["tokens_per_row"] / max(1, text["tokens_per_row"])
        print(f"- **{prefix}**: box-drawing is **{ratio:.1f}x** more expensive per row than text export.")


if __name__ == "__main__":
    main()
