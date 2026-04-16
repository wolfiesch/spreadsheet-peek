# VHS tape for the spreadsheet-peek long-form screencast.
#
# Demonstrates xleak's interactive TUI mode - the capability most users miss.
# Renders both MP4 (for embedded docs) and GIF (for social shares) from a
# single recording via two Output directives.
#
# Render with:
#   cd ~/Projects/spreadsheet-peek
#   vhs scripts/record_screencast.tape
#
# Requires: vhs >= 0.11, ffmpeg (for MP4), xleak on PATH.
# Target duration: ~2 minutes.

Output assets/screencast.mp4
Output assets/screencast.gif

Set FontSize 14
Set Width 1280
Set Height 720
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 45ms
Set PlaybackSpeed 1.0

# ---- Intro ----------------------------------------------------------------

Type "# Quick previews are just the start. xleak has an interactive TUI."
Sleep 3s
Enter
Sleep 1s

# ---- Launch the interactive TUI ------------------------------------------

Type "xleak -i examples/sample-financials.xlsx"
Sleep 1500ms
Enter
Sleep 5s

# Let the viewer read the initial sheet (P&L).
Sleep 5s

# ---- Navigation: arrow keys move the cell cursor -------------------------

Down
Sleep 700ms
Down
Sleep 700ms
Down
Sleep 700ms
Down
Sleep 700ms
Down
Sleep 1s
Right
Sleep 700ms
Right
Sleep 700ms
Right
Sleep 700ms
Right
Sleep 2s

# ---- Jump to a specific cell (Ctrl+G) ------------------------------------

Ctrl+G
Sleep 1500ms
Type "C15"
Sleep 1s
Enter
Sleep 3s

# ---- Switch sheets (Tab cycles) ------------------------------------------

Tab
Sleep 5s
Tab
Sleep 5s
Tab
Sleep 5s

# ---- Search within the sheet ---------------------------------------------

Type "/"
Sleep 1s
Type "Revenue"
Sleep 1500ms
Enter
Sleep 3s
Type "n"
Sleep 2500ms
Type "n"
Sleep 2500ms

# ---- Help overlay --------------------------------------------------------

Type "?"
Sleep 8s
Escape
Sleep 1500ms

# ---- Quit back to shell --------------------------------------------------

Type "q"
Sleep 2s

# ---- Show CLI / pipeline integration -------------------------------------

Type "# The same binary also powers non-interactive previews."
Sleep 2s
Enter
Sleep 700ms
Type "xleak examples/sample-financials.xlsx --export text | head -5"
Sleep 1500ms
Enter
Sleep 7s

# ---- Closing caption -----------------------------------------------------

Type "# All of this, on demand, from your agent."
Sleep 4s
Enter
Sleep 3s
