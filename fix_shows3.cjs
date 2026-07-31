const fs = require('fs');
let code = fs.readFileSync('src/data/initialShows.ts', 'utf8');

if (!code.includes('TOTAL_ORBUS_USA_SHOWS_COUNT')) {
  code += '\nexport const TOTAL_ORBUS_USA_SHOWS_COUNT = 1417;\n';
  fs.writeFileSync('src/data/initialShows.ts', code);
  console.log('Added TOTAL_ORBUS_USA_SHOWS_COUNT');
}
