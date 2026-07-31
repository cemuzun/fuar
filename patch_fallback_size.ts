import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "const fallbackData = (tradeShowName || '').toLowerCase().includes('pack') ? packExpoCuratedPool : shuffled.slice(0, 5);",
  "const fallbackData = (tradeShowName || '').toLowerCase().includes('pack') ? packExpoCuratedPool : shuffled.slice(0, 18);"
);

content = content.replace(
  "// Pick 5 random items",
  "// Pick 18 random items"
);

fs.writeFileSync('server.ts', content);
console.log("Fallback size patched");
