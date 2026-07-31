import re

with open('server.ts', 'r') as f:
    content = f.read()

# I want to isolate the logic from /api/extract/text into an async function:
# async function extractExhibitorsFromText(rawText, tradeShowName, city, state) { ... }

