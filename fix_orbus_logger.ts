import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /const pageHtml = await response\.text\(\);/g,
  "const pageHtml = await response.text();\n    logScrapedContent(targetUrl, pageHtml, 'html');"
);

fs.writeFileSync('server.ts', content);
