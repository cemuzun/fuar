const fs = require('fs');
let types = fs.readFileSync('src/lib/scraper/types.ts', 'utf8');

types = types.replace(
  "extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]>;",
  "extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[], saveCheckpoint?: (url: string, data: any) => Promise<void>): Promise<ExhibitorData[]>;"
);

fs.writeFileSync('src/lib/scraper/types.ts', types);
