import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = "      const fallbackData = (tradeShowName || '').toLowerCase().includes('pack') ? packExpoCuratedPool : packExpoCuratedPool.slice(0, 5);";

const replacement = `      // Pick 5 random items from the pool so repeated extractions yield new companies
      const shuffled = [...packExpoCuratedPool].sort(() => 0.5 - Math.random());
      const fallbackData = (tradeShowName || '').toLowerCase().includes('pack') ? packExpoCuratedPool : shuffled.slice(0, 5);`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
console.log("Fallback patched");
