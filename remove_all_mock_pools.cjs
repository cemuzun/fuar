const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// We will use regex to remove the curated pools
server = server.replace(/const whiteLabelExpoCuratedPool = \[[\s\S]*?\];/m, '');
server = server.replace(/const packExpoCuratedPool = \[[\s\S]*?\];/m, '');
server = server.replace(/const whiteLabelCuratedPool = \[[\s\S]*?\];/m, '');

// Also remove the fallback logic in generate-roster
const fallbackLogicRegex = /\/\/ Backfill from curated pool if AI returned fewer than targetCount[\s\S]*?if \(exhibitorsList\.length < targetCount\) \{[\s\S]*?\}\s*\}/m;
server = server.replace(fallbackLogicRegex, '');

// Also remove the fallback event in search/tradeshow
const searchFallbackRegex = /const fallbackEvent = \{[\s\S]*?\};\n    return res\.json\(\{ success: true, event: fallbackEvent \}\);/m;
server = server.replace(searchFallbackRegex, `return res.status(500).json({ error: error.message || 'Failed to search for tradeshow' });`);

fs.writeFileSync('server.ts', server);
console.log('Removed mock pools and fallbacks from server.ts');
