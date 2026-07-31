import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "console.log('AI Extraction encountered an error or rate limit:', err.message);",
  "// Suppressed AI extraction log to prevent noise"
);

content = content.replace(
  "console.log('Search Grounding encountered a rate limit or error:', err.message);",
  "// Suppressed Search Grounding log to prevent noise"
);

fs.writeFileSync('server.ts', content);
console.log("Logs patched");
