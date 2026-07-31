import fs from 'fs';

let content = fs.readFileSync('src/lib/scraper/index.ts', 'utf8');

// We don't have to fully implement everything if time is short, 
// but we should add a class for CheckpointManager
const imports = `import fs from 'fs';
import path from 'path';\n`;

content = imports + content;

content = content.replace(
  'export class DirectoryScraper {',
  `export class DirectoryScraper {
  
  private checkpointDir = path.join(process.cwd(), '.scraper_checkpoints');
  
  constructor() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  private saveCheckpoint(url: string, data: any) {
    const filename = Buffer.from(url).toString('base64') + '.json';
    fs.writeFileSync(path.join(this.checkpointDir, filename), JSON.stringify(data));
  }

  private loadCheckpoint(url: string) {
    const filename = Buffer.from(url).toString('base64') + '.json';
    const file = path.join(this.checkpointDir, filename);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return null;
  }
`
);

content = content.replace(
  'console.log(`Starting Playwright extraction for ${url}`);',
  `console.log(\`Starting Playwright extraction for \${url}\`);
    const checkpoint = this.loadCheckpoint(url);
    if (checkpoint && checkpoint.status === 'completed') {
       console.log('Returning from checkpoint');
       return checkpoint.exhibitors;
    }
`
);

content = content.replace(
  'return exhibitors;',
  `this.saveCheckpoint(url, { status: 'completed', exhibitors });
    return exhibitors;`
);

fs.writeFileSync('src/lib/scraper/index.ts', content);
