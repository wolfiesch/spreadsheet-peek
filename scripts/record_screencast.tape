# VHS tape for the spreadsheet-peek long-form screencast.
#
# Demonstrates `wolfxl peek` rendering an Excel workbook with style-aware
# output (currency, percent, dates) - the capability most agent integrations
# miss when they fall back to ad-hoc openpyxl tuple dumps. Renders both MP4
# (for embedded docs) and GIF (for social shares) from a single recording
# via two Output directives.
#
# Render with:
#   cd ~/Projects/spreadsheet-peek
#   vhs scripts/record_screencast.tape
#
# Requires: vhs >= 0.11, ffmpeg (for MP4), wolfxl on PATH
# (`cargo install wolfxl-cli`).
# Target duration: ~1.5 minutes.

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

Type "# wolfxl peek: instant style-aware Excel previews from the shell."
Sleep 3s
Enter
Sleep 1s

# ---- Default styled preview ----------------------------------------------

Type "wolfxl peek examples/sample-financials.xlsx -n 12"
Sleep 1500ms
Enter
Sleep 6s

# ---- Switch sheets -------------------------------------------------------

Type "clear"
Enter
Sleep 500ms
Type "# Multi-sheet workbooks: pick a tab by name."
Sleep 1500ms
Enter
Sleep 500ms
Type 'wolfxl peek examples/sample-financials.xlsx --sheet "Balance Sheet" -n 12'
Sleep 1500ms
Enter
Sleep 6s

# ---- Token-efficient mode ------------------------------------------------

Type "clear"
Enter
Sleep 500ms
Type "# In long agent sessions, switch to text export for repeat views."
Sleep 1500ms
Enter
Sleep 500ms
Type "wolfxl peek examples/sample-financials.xlsx --export text | head -10"
Sleep 1500ms
Enter
Sleep 5s

# ---- Wide-table stress ---------------------------------------------------

Type "clear"
Enter
Sleep 500ms
Type "# Wide tables? --export text scales linearly; box-drawing does not."
Sleep 1500ms
Enter
Sleep 500ms
Type "wolfxl peek examples/wide-table.xlsx --export text | head -6"
Sleep 1500ms
Enter
Sleep 5s

# ---- Closing caption -----------------------------------------------------

Type "# All of this, on demand, from your agent."
Sleep 4s
Enter
Sleep 3s
