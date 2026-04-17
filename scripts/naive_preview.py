# What an agent without spreadsheet-peek reaches for.
# Used as the 'before' half of the contrast demo GIF.
import openpyxl

wb = openpyxl.load_workbook("examples/sample-financials.xlsx", data_only=True)
ws = wb.active
assert ws is not None
for row in ws.iter_rows(max_row=5, values_only=True):
    print(row)
