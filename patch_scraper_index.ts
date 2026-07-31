import fs from 'fs';

let content = fs.readFileSync('src/lib/scraper/index.ts', 'utf8');

const imports = `import { A2ZAdapter } from './adapters/a2z.js';
import { ExpoFPAdapter } from './adapters/expofp.js';
import { SwapcardAdapter } from './adapters/swapcard.js';
`;

content = imports + content;

content = content.replace(
  'new MapYourShowAdapter(),',
  'new MapYourShowAdapter(),\n  new A2ZAdapter(),\n  new ExpoFPAdapter(),\n  new SwapcardAdapter(),'
);

fs.writeFileSync('src/lib/scraper/index.ts', content);
