const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  "return [];",
  "return { exhibitors: [] };"
);

server = server.replace(
  "const extractedExhibitors = await performExtraction(rawText, tradeShowName, city, state);\n    res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors, diagnostics: extractedExhibitors.diagnostics }); // We will fix this",
  "const result = await performExtraction(rawText, tradeShowName, city, state);\n    res.json({ success: true, count: result.exhibitors.length, exhibitors: result.exhibitors, diagnostics: result.diagnostics });"
);

fs.writeFileSync('server.ts', server);
