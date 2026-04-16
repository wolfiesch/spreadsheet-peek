# VHS tape for the spreadsheet-peek demo GIF
# Render with: vhs examples/demo.tape
# Output: examples/demo.gif

Output examples/demo.gif

Set FontSize 14
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0

# Start on a clean prompt
Type "# A spreadsheet. Let's peek."
Sleep 1s
Enter
Sleep 500ms

# Primary demo: the default box-drawing preview
Type "xleak examples/sample-financials.xlsx -n 10"
Sleep 800ms
Enter
Sleep 3500ms

# Switch to a different sheet (multi-sheet workflow)
Type "clear"
Enter
Sleep 400ms
Type "# Multi-sheet workbook? Pick the tab you want."
Sleep 800ms
Enter
Sleep 500ms
Type 'xleak examples/sample-financials.xlsx --sheet "Balance Sheet" -n 8'
Sleep 800ms
Enter
Sleep 3500ms

# Token-efficient mode
Type "clear"
Enter
Sleep 400ms
Type "# Big file? Use text export - 13x cheaper on tokens."
Sleep 800ms
Enter
Sleep 500ms
Type "xleak examples/sample-financials.xlsx --export text | head -8"
Sleep 800ms
Enter
Sleep 3500ms

# Closing
Sleep 1s
