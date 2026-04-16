"""Measure token costs for different xleak output modes.

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
from pathlib import Path

import tiktoken

SAMPLE = Path(__file__).parent.parent / "examples" / "sample-financials.xlsx"
ENC = tiktoken.get_encoding("cl100k_base")


def run(cmd: list[str]) -> str:
    """Run a shell command and return its stdout."""
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return result.stdout


def tokens(s: str) -> int:
    """Count tokens using cl100k_base (GPT-4 tokenizer)."""
    return len(ENC.encode(s))


def row_count(output: str) -> int:
    """Count data rows in xleak output (heuristic: lines starting with │ that
    aren't separators or headers)."""
    data_lines = [
        line for line in output.splitlines()
        if line.startswith("│") and "─" not in line
    ]
    # Subtract 1 for the header row (first │-line is usually the header)
    return max(0, len(data_lines) - 1)


def bench(label: str, cmd: list[str]) -> dict:
    output = run(cmd)
    t = tokens(output)
    rows = row_count(output) or output.count("\n")  # fall back to line count for text export
    return {
        "label": label,
        "command": " ".join(cmd),
        "tokens": t,
        "bytes": len(output.encode("utf-8")),
        "rows": rows,
        "tokens_per_row": round(t / max(1, rows), 1),
    }


def main() -> None:
    if not SAMPLE.exists():
        raise SystemExit(
            f"Sample file not found: {SAMPLE}\n"
            f"Run examples/generate_sample.py first."
        )

    results = [
        bench(
            "Box-drawing (5 rows)",
            ["xleak", str(SAMPLE), "-n", "5"],
        ),
        bench(
            "Box-drawing (15 rows)",
            ["xleak", str(SAMPLE), "-n", "15"],
        ),
        bench(
            "Text export (head -5)",
            ["bash", "-c", f"xleak {SAMPLE} --export text | head -5"],
        ),
        bench(
            "Text export (head -15)",
            ["bash", "-c", f"xleak {SAMPLE} --export text | head -15"],
        ),
        bench(
            "CSV export (head -5)",
            ["bash", "-c", f"xleak {SAMPLE} --export csv | head -5"],
        ),
    ]

    # Print markdown table
    print("| Mode | Tokens | Bytes | Data rows | Tokens/row |")
    print("|------|-------:|------:|----------:|-----------:|")
    for r in results:
        print(
            f"| {r['label']} | {r['tokens']:,} | {r['bytes']:,} | "
            f"{r['rows']} | {r['tokens_per_row']} |"
        )

    print()
    print("## Ratio (box-drawing vs text export, normalized per row)")
    box = next(r for r in results if r["label"] == "Box-drawing (5 rows)")
    text = next(r for r in results if r["label"] == "Text export (head -5)")
    ratio = box["tokens_per_row"] / max(1, text["tokens_per_row"])
    print(f"Box-drawing is **{ratio:.1f}x** more expensive per row than text export.")


if __name__ == "__main__":
    main()
