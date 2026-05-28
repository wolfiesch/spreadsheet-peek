"""Compare local spreadsheet-to-context converters on one file.

This is a local comparison harness, not a universal performance claim. It always
measures Spreadsheet Peek's `wolfxl peek --export text` output. If optional
tools are installed, it measures those too; missing tools are reported as
skipped rather than treated as failures.

Run with:
    uv run --with tiktoken python benchmarks/compare_converters.py
    uv run --with tiktoken python benchmarks/compare_converters.py --file examples/wide-table.xlsx
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import tiktoken

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FILE = ROOT / "examples" / "sample-financials.xlsx"
ENC = tiktoken.get_encoding("cl100k_base")


@dataclass(frozen=True)
class Mode:
    name: str
    command: list[str]
    required: bool = False


def modes(path: Path) -> list[Mode]:
    return [
        Mode(
            "Spreadsheet Peek text export",
            ["wolfxl", "peek", str(path), "--export", "text"],
            required=True,
        ),
        Mode("MarkItDown", ["markitdown", str(path)]),
        Mode("agent-xlsx probe", ["agent-xlsx", "probe", str(path)]),
    ]


def run(command: list[str]) -> tuple[str, str]:
    if shutil.which(command[0]) is None:
        return "skipped", f"{command[0]} is not installed"
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip() or "no output"
        return "error", details.splitlines()[0]
    return "ok", result.stdout


def token_count(text: str) -> int:
    return len(ENC.encode(text))


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare local converter output sizes.")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="Workbook or table file to compare.")
    args = parser.parse_args()
    path = args.file.resolve()
    if not path.exists():
        raise SystemExit(f"file not found: {path}")

    rows = []
    for mode in modes(path):
        status, output = run(mode.command)
        if status != "ok":
            if mode.required:
                raise SystemExit(f"required command failed: {' '.join(mode.command)}\n{output}")
            rows.append(
                {
                    "tool": mode.name,
                    "command": " ".join(mode.command),
                    "status": status,
                    "tokens": "",
                    "bytes": "",
                    "notes": output,
                }
            )
            continue
        rows.append(
            {
                "tool": mode.name,
                "command": " ".join(mode.command),
                "status": "ok",
                "tokens": f"{token_count(output):,}",
                "bytes": f"{len(output.encode('utf-8')):,}",
                "notes": f"{len(output.splitlines()):,} lines",
            }
        )

    print(f"Local comparison harness for `{path}`")
    print()
    print("| Tool | Command | Status | Tokens | Bytes | Notes |")
    print("|------|---------|--------|-------:|------:|-------|")
    for row in rows:
        print(
            f"| {row['tool']} | `{row['command']}` | {row['status']} | "
            f"{row['tokens']} | {row['bytes']} | {row['notes']} |"
        )


if __name__ == "__main__":
    main()
