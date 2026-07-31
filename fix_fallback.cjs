const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const fallbackStr = '// Attempt 3: Fallback realistic exhibitor generation if still empty';
const endFallbackStr = "res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors });";

const idx1 = code.indexOf(fallbackStr);
const idx2 = code.indexOf(endFallbackStr);

if (idx1 !== -1 && idx2 !== -1) {
  const replacement = `// No mockup data fallback per user request.
    if (!extractedExhibitors || extractedExhibitors.length === 0) {
       console.log('Extraction returned empty.');
    }
    `;
  
  code = code.substring(0, idx1) + replacement + code.substring(idx2);
  fs.writeFileSync('server.ts', code);
  console.log('Removed Attempt 3 Mockup Data');
}
