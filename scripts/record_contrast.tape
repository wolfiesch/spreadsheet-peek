# VHS tape for the contrast demo GIF.
#
# Shows the pitch side-by-side: a naive agent writing throwaway Python
# (slow openpyxl startup, ugly tuple output) vs the same agent running
# xleak (instant, readable box-drawing). This is the "why the skill
# exists" visual that the original examples/demo.gif doesn't convey.
#
# Render with: vhs scripts/record_contrast.tape
# Output:      assets/contrast.gif

Output assets/contrast.gif

Set FontSize 14
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

# ----- BEFORE: what a naive agent reaches for ------------------------

Type "# Naive approach: agent writes throwaway Python"
Sleep 800ms
Enter
Type "cat scripts/naive_preview.py"
Sleep 400ms
Enter
Sleep 2500ms

Type "python3 scripts/naive_preview.py"
Sleep 400ms
Enter
# openpyxl cold-start + tuple dump is the point - let it breathe
Sleep 3500ms

Type "clear"
Enter
Sleep 300ms

# ----- AFTER: same task, with spreadsheet-peek -----------------------

Type "# With spreadsheet-peek: one line, instant, readable"
Sleep 800ms
Enter
Type "xleak examples/sample-financials.xlsx -n 5"
Sleep 400ms
Enter
Sleep 4000ms

# Closing beat so the last frame is the clean xleak output
Sleep 1s
