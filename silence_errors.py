import re

with open('server.ts', 'r') as f:
    content = f.read()

# Replace console.warn/error in try-catch blocks with console.log
content = content.replace("console.warn('Attempt 1 text extraction failed:', err);", "console.log('Attempt 1 text extraction failed due to quota or other error.');")
content = content.replace("console.warn('Attempt 2 Search Grounding failed:', err);", "console.log('Attempt 2 Search Grounding failed due to quota or other error.');")
content = content.replace("console.warn('Puppeteer extraction failed, falling back to Search Grounding / text analysis', e);", "console.log('Puppeteer extraction failed.');")
content = content.replace("console.warn('Gemini AI generation failed or timed out for roster, utilizing curated pool:', aiErr);", "console.log('Gemini AI generation failed for roster, utilizing curated pool.');")

# Also let's check for console.error in /api/search/tradeshow
content = content.replace("console.error('Error in /api/search/tradeshow, returning fallback data:', error);", "console.log('Error in /api/search/tradeshow, returning fallback data.');")
content = content.replace("console.error('Error in /api/search/tradeshow:', error);", "console.log('Error in /api/search/tradeshow.');")

with open('server.ts', 'w') as f:
    f.write(content)

print("Silenced errors")
