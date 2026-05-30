"""Measure local command timing with hyperfine.

This is a local timing harness, not a promise about every machine. It keeps
the benchmark commands simple and skips optional competitor tools when their
commands are not installed.

Run with:
    uv run --with openpyxl python benchmarks/measure_speed.py
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FILE = ROOT / "examples" / "messy-ops-export.xlsx"


@dataclass(frozen=True)
class Command:
    name: str
    command: str
    required: bool = False


def quote(value: str | Path) -> str:
    return "'" + str(value).replace("'", "'\"'\"'") + "'"


def commands_for(path: Path) -> tuple[list[Command], list[str]]:
    python_code = (
        "import openpyxl, pathlib; "
        f"wb=openpyxl.load_workbook({str(path)!r}, data_only=True); "
        "ws=wb.active; "
        "[print(tuple(row)) for row in ws.iter_rows(max_row=15, values_only=True)]"
    )
    commands = [
        Command(
            "wolfxl box preview, 15 rows",
            f"wolfxl peek {quote(path)} -n 15",
            required=True,
        ),
        Command(
            "wolfxl text preview, 15 rows",
            f"wolfxl peek {quote(path)} --export text | sed -n '1,16p'",
            required=True,
        ),
        Command(
            "wolfxl map",
            f"wolfxl map {quote(path)} --format text",
            required=True,
        ),
        Command(
            "generated openpyxl tuple dump, 15 rows",
            f"{quote(sys.executable)} -c {quote(python_code)}",
            required=True,
        ),
    ]
    skipped: list[str] = []
    if shutil.which("markitdown") is not None:
        commands.append(Command("MarkItDown", f"markitdown {quote(path)}"))
    else:
        skipped.append("MarkItDown (`markitdown` not installed)")
    if shutil.which("agent-xlsx") is not None:
        commands.append(Command("agent-xlsx probe", f"agent-xlsx probe {quote(path)}"))
    else:
        skipped.append("agent-xlsx (`agent-xlsx` not installed)")
    return commands, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local timing benchmarks with hyperfine.")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="Workbook to measure.")
    parser.add_argument("--runs", type=int, default=10, help="Exact hyperfine run count.")
    parser.add_argument("--warmup", type=int, default=3, help="Hyperfine warmup runs.")
    args = parser.parse_args()

    if shutil.which("hyperfine") is None:
        raise SystemExit("hyperfine is not installed")

    path = args.file.resolve()
    if not path.exists():
        raise SystemExit(f"file not found: {path}")

    commands, skipped = commands_for(path)
    with tempfile.TemporaryDirectory() as tmp:
        json_path = Path(tmp) / "hyperfine.json"
        hyperfine_cmd = [
            "hyperfine",
            "--warmup",
            str(args.warmup),
            "--runs",
            str(args.runs),
            "--style",
            "none",
            "--export-json",
            str(json_path),
        ]
        for command in commands:
            hyperfine_cmd.extend(["--command-name", command.name, command.command])
        result = subprocess.run(hyperfine_cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise SystemExit(result.stderr.strip() or result.stdout.strip() or "hyperfine failed")
        data = json.loads(json_path.read_text())

    print(f"Local timing harness for `{path}`")
    print()
    print("| Path | Mean ms | Stddev ms | Runs | Relative to text preview |")
    print("|------|--------:|----------:|-----:|-------------------------:|")
    measurements = data["results"]
    text_mean = next(
        item["mean"] for item in measurements if item["command"] == "wolfxl text preview, 15 rows"
    )
    for item in measurements:
        mean_ms = item["mean"] * 1000
        stddev_ms = item["stddev"] * 1000
        relative = item["mean"] / text_mean
        print(
            f"| {item['command']} | {mean_ms:.1f} | {stddev_ms:.1f} | "
            f"{len(item['times'])} | {relative:.1f}x |"
        )

    if skipped:
        print()
        print("Skipped optional tools:")
        for item in skipped:
            print(f"- {item}")


if __name__ == "__main__":
    main()
