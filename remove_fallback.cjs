const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\!extractedExhibitors \|\| extractedExhibitors\.length === 0\) \{\s*console\.log\('Falling back to curated pool[\s\S]*?return fallbackData\.map\(\(cur: any\) => \(\{[\s\S]*?\}\)\);\s*\}/m;

server = server.replace(regex, `if (!extractedExhibitors || extractedExhibitors.length === 0) {
      console.log('No exhibitors extracted and fallback is disabled.');
      return [];
    }`);

fs.writeFileSync('server.ts', server);
