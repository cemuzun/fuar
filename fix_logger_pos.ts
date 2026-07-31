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

content = content.replace(loggerFunc.trim(), ''); // remove old
// also remove the imports from line 1092, 1093 if they are there
content = content.replace(/import \* as fsLib from 'fs';\nimport \* as pathLib from 'path';\n/g, '');
content = content.replace(/function logScrapedContent[\s\S]*?}\n/g, ''); // just in case

// prepend after the first block of imports
content = content.replace("import * as cheerio from 'cheerio';", "import * as cheerio from 'cheerio';\n" + loggerFunc);

fs.writeFileSync('server.ts', content);
