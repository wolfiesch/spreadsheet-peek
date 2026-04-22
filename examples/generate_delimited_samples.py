"""Generate small CSV/TSV fixtures for direct-input benchmarks."""
from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).parent
ROWS = [
    ["date", "account", "entity", "memo", "debit", "credit", "balance"],
    ["2024-03-01", "4000 Revenue", "North", "Subscription invoice", "", "1250.00", "1250.00"],
    ["2024-03-02", "5000 COGS", "North", "Hosting allocation", "410.25", "", "839.75"],
    ["2024-03-03", "6100 Payroll", "Shared", "Contractor accrual", "725.00", "", "114.75"],
    ["2024-03-04", "1200 AR", "East", "Customer payment", "", "980.00", "1094.75"],
    ["2024-03-05", "7100 Legal", "Shared", "Diligence support", "350.00", "", "744.75"],
    ["2024-03-06", "4000 Revenue", "West", "Usage overage", "", "420.50", "1165.25"],
    ["2024-03-07", "6200 Benefits", "Shared", "Monthly premium", "210.00", "", "955.25"],
    ["2024-03-08", "1300 Deferred Rev", "West", "Annual contract deferral", "300.00", "", "655.25"],
]


def write_delimited(path: Path, delimiter: str) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, delimiter=delimiter, lineterminator="\n")
        writer.writerows(ROWS)


def main() -> None:
    write_delimited(ROOT / "sample-ledger.csv", ",")
    write_delimited(ROOT / "sample-ledger.tsv", "\t")


if __name__ == "__main__":
    main()
