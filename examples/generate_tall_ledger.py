"""Generate a tall ledger benchmark workbook.

This sample covers a common accounting/advisory shape that neither the
financial package nor the wide-table stress test captures: many rows with a
moderate number of columns, dates, memo text, and running balances.

Regenerate with:
    uv run --with openpyxl python examples/generate_tall_ledger.py
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook

OUT_PATH = Path(__file__).parent / "tall-ledger.xlsx"
DATE_FORMAT = "yyyy-mm-dd"

HEADERS = [
    "Date",
    "Account",
    "Department",
    "Counterparty",
    "Memo",
    "Debit",
    "Credit",
    "Balance",
]

ACCOUNTS = [
    "Cash",
    "Accounts Receivable",
    "Deferred Revenue",
    "Revenue",
    "Cost of Goods Sold",
    "Payroll Expense",
    "Cloud Infrastructure",
    "Professional Fees",
]

DEPARTMENTS = ["Finance", "Sales", "Support", "Engineering", "Operations"]
COUNTERPARTIES = [
    "Acme, Inc.",
    "Northwind Traders",
    "Globex",
    "Initech",
    "Umbrella Services",
    "Internal Payroll",
]
MEMOS = [
    "Monthly subscription invoice",
    "Vendor payment batch",
    "Customer receipt",
    "Accrual true-up",
    "Expense reclass",
    "Deferred revenue release",
]


def ledger_rows(count: int = 120) -> list[list[object]]:
    rows: list[list[object]] = []
    balance = 250_000
    start = date(2024, 1, 1)

    for idx in range(count):
        account = ACCOUNTS[idx % len(ACCOUNTS)]
        dept = DEPARTMENTS[(idx * 2) % len(DEPARTMENTS)]
        counterparty = COUNTERPARTIES[(idx * 3) % len(COUNTERPARTIES)]
        memo = MEMOS[(idx * 5) % len(MEMOS)]
        amount = 1_200 + ((idx * 791) % 28_000)

        if idx % 3 == 0:
            debit = amount
            credit = 0
            balance += amount
        else:
            debit = 0
            credit = amount
            balance -= amount

        rows.append(
            [
                start + timedelta(days=idx),
                account,
                dept,
                counterparty,
                memo,
                debit,
                credit,
                balance,
            ]
        )

    return rows


def main() -> None:
    rows = ledger_rows()
    wb = Workbook()
    ws = wb.active
    ws.title = "GL Detail"

    ws.append(HEADERS)
    for row in rows:
        ws.append(row)

    for cell in ws["A"]:
        if cell.row > 1:
            cell.number_format = DATE_FORMAT

    widths = {
        "A": 12,
        "B": 22,
        "C": 16,
        "D": 22,
        "E": 28,
        "F": 14,
        "G": 14,
        "H": 14,
    }
    for col, width in widths.items():
        ws.column_dimensions[col].width = width

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_PATH)
    print(f"Wrote {OUT_PATH} ({len(HEADERS)} columns x {len(rows) + 1} rows)")


if __name__ == "__main__":
    main()
