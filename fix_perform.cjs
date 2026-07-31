const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  "async function performExtraction(rawText: string, tradeShowName: string, city: string, state: string) {",
  "async function performExtraction(rawText: string, tradeShowName: string, city: string, state: string): Promise<{ exhibitors: any[], diagnostics?: any }> {"
);

server = server.replace(
  "return extractedExhibitors;",
  "return { exhibitors: extractedExhibitors };"
);

server = server.replace(
  /const scrapeResult = await scraper\.scrape.*?console\.log\('Extraction Diagnostics:', scrapeResult\.diagnostics\);\n\s*\}/s,
  `const scrapeResult = await scraper.scrape(contentToAnalyze, tradeShowName, city, state, geminiFallback);
      return { exhibitors: scrapeResult.exhibitors, diagnostics: scrapeResult.diagnostics };
    }`
);

server = server.replace(
  "const scrapeResult = isUrl ? await scraper.scrape(contentToAnalyze, tradeShowName, city, state, async () => []) : null;\n    res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors, diagnostics: scrapeResult?.diagnostics });",
  "res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors, diagnostics: extractedExhibitors.diagnostics }); // We will fix this"
);

fs.writeFileSync('server.ts', server);
