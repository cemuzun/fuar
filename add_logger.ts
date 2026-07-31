import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const loggerFunc = `
import * as fsLib from 'fs';
import * as pathLib from 'path';

function logScrapedContent(url: string, content: string, type: 'html' | 'json' = 'html') {
  try {
    const logDir = pathLib.join(process.cwd(), 'logs');
    if (!fsLib.existsSync(logDir)) {
      fsLib.mkdirSync(logDir, { recursive: true });
    }
    const safeUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50).toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = \`scrape_\${safeUrl}_\${timestamp}.\${type}\`;
    const filePath = pathLib.join(logDir, filename);
    fsLib.writeFileSync(filePath, content);
    console.log(\`[Scraper Log] Saved raw content for debugging to: \${filePath}\`);
  } catch (err: any) {
    console.error('[Scraper Log] Failed to log scraped content:', err.message);
  }
}
`;

// Inject logger after imports
const lastImportIdx = content.lastIndexOf('import ') > -1 ? content.indexOf(';', content.lastIndexOf('import ')) + 1 : 0;

content = content.slice(0, lastImportIdx) + '\n' + loggerFunc + content.slice(lastImportIdx);

// Inject for orbus fetch
content = content.replace(
  /const html = await response\.text\(\);/g,
  "const html = await response.text();\n    logScrapedContent(targetUrl, html, 'html');"
);

// Inject for puppeteer
content = content.replace(
  /const htmlText = await page\.content\(\);/g,
  "const htmlText = await page.content();\n        logScrapedContent(contentToAnalyze, htmlText, 'html');"
);

fs.writeFileSync('server.ts', content);
console.log("Logger added.");
