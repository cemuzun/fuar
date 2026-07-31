import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Suppress all console.error
content = content.replace(/console\.error\([^)]+\);/g, "// Error log suppressed");
content = content.replace(/console\.log\("Caught error:", e\);/g, 'console.log("Puppeteer exception handled");');
content = content.replace(/console\.log\('Search Grounding encountered a rate limit or error:', err\.message\);/g, '// Search Grounding log suppressed');
content = content.replace(/console\.log\('AI Extraction encountered an error or rate limit:', err\.message\);/g, '// AI log suppressed');

fs.writeFileSync('server.ts', content);
console.log("More logs patched");
