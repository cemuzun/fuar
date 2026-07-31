import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/console\.log\("Caught error:", err\);/g, "console.log('AI Extraction encountered an error or rate limit:', err.message);");
content = content.replace(/console\.error\('Extraction via search grounding failed', err\);/g, "console.log('Search Grounding encountered a rate limit or error:', err.message);");
content = content.replace(/console\.log\("Caught error:", aiErr\);/g, "console.log('AI Extraction encountered a rate limit or error:', aiErr.message);");

fs.writeFileSync('server.ts', content);
