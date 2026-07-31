const fs = require('fs');

let index = fs.readFileSync('src/lib/scraper/index.ts', 'utf8');

index = index.replace(
  "import { SwapcardAdapter } from './adapters/swapcard.js';",
  "import { SwapcardAdapter } from './adapters/swapcard.js';\nimport { ExpoPlatformAdapter } from './adapters/expoplatform.js';"
);

index = index.replace(
  "new SwapcardAdapter(),",
  "new SwapcardAdapter(),\n  new ExpoPlatformAdapter(),"
);

index = index.replace(
  "async scrape(url: string, tradeShowName: string, city: string, state: string, runGeminiFallback: (candidates: string[]) => Promise<ExhibitorData[]>): Promise<ExhibitorData[]> {",
  "async scrape(url: string, tradeShowName: string, city: string, state: string, runGeminiFallback: (candidates: string[]) => Promise<ExhibitorData[]>): Promise<{ exhibitors: ExhibitorData[], diagnostics?: any }> {"
);

index = index.replace(
  "return checkpoint.exhibitors;",
  "return { exhibitors: checkpoint.exhibitors, diagnostics: checkpoint.diagnostics };"
);

index = index.replace(
  "await this.saveCheckpoint(url, { status: 'completed', exhibitors });",
  "const diagnostics = (selectedAdapter as any).getDiagnostics ? (selectedAdapter as any).getDiagnostics() : undefined;\n    await this.saveCheckpoint(url, { status: 'completed', exhibitors, diagnostics });"
);

index = index.replace(
  "return exhibitors;",
  "return { exhibitors, diagnostics };"
);

index = index.replace(
  "return [{ companyName: 'blocked', sourceUrl: url, sourceEvidence: e.message, extractionMethod: 'deterministic', confidence: 0, boothNumber: null, profileUrl: null, companyWebsite: null }];",
  "return { exhibitors: [{ companyName: 'blocked', sourceUrl: url, sourceEvidence: e.message, extractionMethod: 'deterministic', confidence: 0, boothNumber: null, profileUrl: null, companyWebsite: null }] };"
);

fs.writeFileSync('src/lib/scraper/index.ts', index);
