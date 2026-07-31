const fs = require('fs');
let idx = fs.readFileSync('src/lib/scraper/index.ts', 'utf8');

idx = idx.replace(
  "exhibitors = await selectedAdapter.extractExhibitors(url, htmlText, page, interceptedXhr);",
  "exhibitors = await selectedAdapter.extractExhibitors(url, htmlText, page, interceptedXhr, this.saveCheckpoint.bind(this));"
);

fs.writeFileSync('src/lib/scraper/index.ts', idx);
