"""Generate the GitHub social preview (Open Graph) card.

Produces a 1280x640 PNG at ``assets/og-card.png`` using local system fonts.
Dracula palette to match the demo GIF and screencast.

Run locally (macOS):

    uv run --with pillow python scripts/generate_og_card.py

Do not run on CI - system fonts differ and the committed PNG is the source
of truth for github.com/settings/repo social preview.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "og-card.png"

# Dracula palette
BG = (40, 42, 54)           # #282a36
FG = (248, 248, 242)        # #f8f8f2
MUTED = (98, 114, 164)      # #6272a4 (comment)
PINK = (255, 121, 198)      # #ff79c6
PURPLE = (189, 147, 249)    # #bd93f9
GREEN = (80, 250, 123)      # #50fa7b
CYAN = (139, 233, 253)      # #8be9fd
ORANGE = (255, 184, 108)    # #ffb86c
TERMINAL_BG = (30, 31, 41)  # slightly darker than BG for contrast

WIDTH, HEIGHT = 1280, 640

# Font candidates, in priority order. Menlo + SFNSMono are always present on
# macOS; other agents can swap in JetBrains Mono if they have it installed.
MONO_CANDIDATES = [
    ("/System/Library/Fonts/SFNSMono.ttf", 0),
    ("/System/Library/Fonts/Menlo.ttc", 0),
]
SANS_CANDIDATES = [
    ("/System/Library/Fonts/Helvetica.ttc", 0),
    ("/System/Library/Fonts/Avenir Next.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
]


def load_font(candidates: list[tuple[str, int]], size: int) -> ImageFont.FreeTypeFont:
    for path, index in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size=size, index=index)
            except OSError:
                continue
    raise SystemExit(
        f"No font found. Tried: {', '.join(p for p, _ in candidates)}"
    )


def capture_terminal_lines() -> list[str]:
    """Run xleak against the sample file and keep the first few rendered
    lines so the terminal mock mirrors real output. Falls back to a static
    snippet if xleak is missing on PATH."""
    # Static snippet, hand-tuned to fit the terminal panel width at 15pt
    # Menlo. We intentionally don't use live xleak output - the real table
    # has too many columns and gets clipped, hurting legibility at 600px.
    return [
        "┌──────────────────────┬────────────┬────────────┐",
        "│ Metric               │    Q1 2026 │    Q2 2026 │",
        "├──────────────────────┼────────────┼────────────┤",
        "│ Revenue              │  1,240,000 │  1,385,000 │",
        "│ COGS                 │    480,000 │    520,000 │",
        "│ Gross Profit         │    760,000 │    865,000 │",
        "│ Operating Expenses   │    420,000 │    455,000 │",
        "│ EBITDA               │    340,000 │    410,000 │",
        "└──────────────────────┴────────────┴────────────┘",
    ]


def draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def main() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    wordmark_font = load_font(SANS_CANDIDATES, 62)
    tagline_font = load_font(SANS_CANDIDATES, 28)
    footer_font = load_font(SANS_CANDIDATES, 20)
    term_font = load_font(MONO_CANDIDATES, 15)
    prompt_font = load_font(MONO_CANDIDATES, 17)

    # ---- Left column: wordmark + tagline ---------------------------------
    left_x = 56
    draw.text((left_x, 104), "spreadsheet-peek", font=wordmark_font, fill=PINK)

    tagline = "Eyes on spreadsheets"
    tagline2 = "for AI coding agents."
    draw.text((left_x, 196), tagline, font=tagline_font, fill=FG)
    draw.text((left_x, 232), tagline2, font=tagline_font, fill=FG)

    # Accent line under the tagline
    draw.rectangle((left_x, 290, left_x + 72, 294), fill=PURPLE)

    # Three-bullet feature strip
    bullets = [
        ("Proactive triggers.", CYAN),
        ("5x cheaper previews.", GREEN),
        ("Agent-agnostic.", ORANGE),
    ]
    by = 324
    for text, color in bullets:
        draw.text((left_x, by), "->", font=tagline_font, fill=color)
        draw.text((left_x + 40, by), text, font=tagline_font, fill=FG)
        by += 44

    # Footer / attribution
    draw.text(
        (left_x, HEIGHT - 48),
        "MIT - github.com/wolfiesch/spreadsheet-peek",
        font=footer_font,
        fill=MUTED,
    )

    # ---- Right column: terminal mock -------------------------------------
    term_x0, term_y0 = 690, 80
    term_x1, term_y1 = WIDTH - 64, HEIGHT - 96
    draw_rounded_rect(draw, (term_x0, term_y0, term_x1, term_y1), radius=14, fill=TERMINAL_BG)

    # Traffic lights
    lights_y = term_y0 + 22
    for idx, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        cx = term_x0 + 24 + idx * 22
        draw.ellipse((cx, lights_y, cx + 12, lights_y + 12), fill=color)

    # Terminal body
    body_x = term_x0 + 28
    body_y = term_y0 + 64

    # Prompt line
    draw.text((body_x, body_y), "$", font=prompt_font, fill=GREEN)
    draw.text((body_x + 22, body_y), "xleak financials.xlsx -n 5", font=prompt_font, fill=FG)
    body_y += 36

    # Captured xleak output
    for line in capture_terminal_lines():
        draw.text((body_x, body_y), line, font=term_font, fill=FG)
        body_y += 22

    # Cursor block under the output
    body_y += 4
    draw.text((body_x, body_y), "$", font=prompt_font, fill=GREEN)
    draw.rectangle((body_x + 24, body_y + 2, body_x + 36, body_y + 22), fill=PURPLE)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUTPUT, format="PNG", optimize=True)
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({WIDTH}x{HEIGHT}, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
