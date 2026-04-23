# VHS tape for the agent workflow demo GIF.
#
# Shows the behavior this skill is trying to teach: when a user mentions a
# spreadsheet path, the agent previews the workbook first before reasoning
# about it or running downstream processing.
#
# Render with: vhs scripts/record_agent_preview.tape
# Output:      assets/agent-preview.gif

Output assets/agent-preview.gif

Set FontSize 14
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 28ms
Set PlaybackSpeed 1.0

Type "# User: What is in examples/sample-financials.xlsx, sheet P&L?"
Sleep 700ms
Enter
Sleep 700ms

Type "# Agent: Preview first. Then answer from the visible sheet."
Sleep 700ms
Enter
Sleep 700ms

Type 'wolfxl peek examples/sample-financials.xlsx --sheet "P&L" -n 10'
Sleep 700ms
Enter
Sleep 4500ms

Type "clear"
Enter
Sleep 400ms

Type "# Agent: Now the answer is grounded in the workbook shape."
Sleep 700ms
Enter
Sleep 900ms

Type "# Follow-up work uses token-efficient text export."
Sleep 700ms
Enter
Sleep 700ms

Type 'wolfxl peek examples/sample-financials.xlsx --sheet "P&L" --export text | sed -n "1,12p"'
Sleep 700ms
Enter
Sleep 4500ms

Sleep 1s
