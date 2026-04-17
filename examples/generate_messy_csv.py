"""Generate examples/messy.csv - a CSV designed to break naive previews.

Covers the edge cases plain `head` or `column -s, -t` mis-renders and
that the SKILL.md CSV fallback section explicitly warns about:

  - UTF-8 BOM at the start (shows up as garbage first cell with naive head)
  - Quoted fields containing commas (naive column -s, -t splits them wrong)
  - Embedded newlines inside quoted fields (confuses line counters)
  - Escaped quotes ("") inside quoted fields
  - Empty fields (NULL semantics)
  - Unicode (emoji, non-ASCII punctuation)
  - Mixed number formats (US decimals vs European commas-as-decimals)

Keeping this as a generator (not a committed CSV) means the file is
reproducible and the edge cases are documented alongside the data.

Regenerate with:
    python3 examples/generate_messy_csv.py
"""
from pathlib import Path

OUT_PATH = Path(__file__).parent / "messy.csv"

ROWS: list[list[str]] = [
    ["id", "customer", "notes", "amount_usd", "amount_eur", "tags"],
    [
        "1",
        "Acme, Inc.",  # comma inside field
        "Pays on time",
        "1250.00",
        "1150,75",  # European decimal
        "enterprise;priority",
    ],
    [
        "2",
        'O\'Brien "The Boss" LLC',  # embedded quotes
        'Said: "invoice me next quarter"\nand then never replied',  # embedded newline + quotes
        "",  # null amount
        "",
        "smb",
    ],
    [
        "3",
        "Globex  ",  # trailing whitespace
        "Tags: R&D, legal, finance",  # multiple commas in unquoted-looking context
        "0.00",
        "0,00",
        "",
    ],
    [
        "4",
        "Umbrella 🌂",  # emoji
        "Multi-line\nnote about a\npayment dispute",
        "9999.99",
        "9.999,99",  # European thousands separator
        "disputed;legal-hold",
    ],
    [
        "5",
        "Initech",
        "",  # null note
        "420.69",
        "420,69",
        "smb;overdue",
    ],
]


def csv_escape(value: str) -> str:
    """Minimal RFC 4180-ish escaper: quote if the value contains comma,
    quote, or newline; double any embedded quotes.
    """
    if any(c in value for c in [",", '"', "\n", "\r"]):
        return '"' + value.replace('"', '""') + '"'
    return value


def main() -> None:
    # Write with a UTF-8 BOM so the first cell of the header gets mangled
    # by any tool that doesn't strip it (which is most of them).
    with OUT_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        for row in ROWS:
            f.write(",".join(csv_escape(v) for v in row) + "\n")

    print(f"Wrote {OUT_PATH} ({len(ROWS)} rows including header)")


if __name__ == "__main__":
    main()
