import { A2ZAdapter } from './adapters/a2z.js';
import { ExpoFPAdapter } from './adapters/expofp.js';
import { SwapcardAdapter } from './adapters/swapcard.js';
import { ExpoPlatformAdapter } from './adapters/expoplatform.js';
import { chromium, Page, Browser } from 'playwright';
import { ScraperAdapter, ExhibitorData } from './types.js';
import { MapYourShowAdapter } from './adapters/mapyourshow.js';
import { GenericDeterministicAdapter } from './adapters/generic-deterministic.js';
import * as fsLib from 'fs';
import * as pathLib from 'path';

import { dbQueries } from '../db.js';

const adapters: ScraperAdapter[] = [
  new MapYourShowAdapter(),
  new A2ZAdapter(),
  new ExpoFPAdapter(),
  new SwapcardAdapter(),
  new ExpoPlatformAdapter(),
  new GenericDeterministicAdapter() // Fallback
];

export class DirectoryScraper {
  
  private async saveCheckpoint(url: string, data: any) {
    try {
      dbQueries.saveCheckpoint(url, data);
      console.log(`[SQLite Checkpoint] Saved progress for ${url}`);
    } catch (e: any) {
      console.error('[SQLite Checkpoint] Failed to save checkpoint:', e.message);
    }
  }

  private async loadCheckpoint(url: string) {
    try {
      return dbQueries.loadCheckpoint(url);
    } catch (e) {
      return null;
    }
  }

  async scrape(url: string, tradeShowName: string, city: string, state: string, runGeminiFallback: (candidates: string[]) => Promise<ExhibitorData[]>): Promise<{ exhibitors: ExhibitorData[], diagnostics?: any }> {
    console.log(`[Scraper] Starting extraction for: ${url}`);
    const checkpoint = await this.loadCheckpoint(url);
    if (checkpoint && checkpoint.status === 'completed') {
       console.log('[Scraper] Returning cached checkpoint result');
       return { exhibitors: checkpoint.exhibitors, diagnostics: checkpoint.diagnostics };
    }

    let browser: Browser | null = null;
    let page: Page | null = null;
    let htmlText = '';
    const interceptedXhr: { url: string, json: any }[] = [];
    
    try {
      browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
      page = await browser.newPage();

      // Set a realistic browser UA to reduce bot detection blocks
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });
      
      // Intercept XHR/fetch responses — raised cap to 200 to capture paginated API calls
      page.on('response', async (response) => {
        const req = response.request();
        if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
          if (response.url().includes('mapyourshow') || response.url().includes('api') || response.url().includes('json') || response.url().includes('graphql') || response.url().includes('marketplace') || response.url().includes('exhibitor')) {
            try {
              const json = await response.json();
              if (interceptedXhr.length < 200) {
                interceptedXhr.push({ url: response.url(), json });
                console.log(`[Scraper] XHR intercepted (#${interceptedXhr.length}): ${response.url().substring(0, 80)}`);
              }
            } catch (e) {
              // Ignore non-json responses
            }
          }
        }
      });

      // Use networkidle for SPA sites (React/Vue trade show directories) with generous timeout
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) {
        // networkidle timed out — fall back to domcontentloaded + extra wait
        console.warn(`[Scraper] networkidle timed out for ${url}, falling back`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
      }

      // Extra wait for lazy-loaded content
      await page.waitForTimeout(3000);
      htmlText = await page.content();
      console.log(`[Scraper] Page loaded, HTML size: ${htmlText.length} bytes, XHRs intercepted: ${interceptedXhr.length}`);

      // Save raw HTML to disk for debugging
      const safeUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50).toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logDir = pathLib.join(process.cwd(), 'logs');
      if (!fsLib.existsSync(logDir)) fsLib.mkdirSync(logDir, { recursive: true });
      fsLib.writeFileSync(pathLib.join(logDir, `scrape_${safeUrl}_${timestamp}.html`), htmlText);
      console.log(`[Scraper] Raw HTML saved to logs/scrape_${safeUrl}_${timestamp}.html`);
      
    } catch (e: any) {
      console.error(`[Scraper] Playwright error for ${url}:`, e.message);
      if (browser) await browser.close();
      return { exhibitors: [{ companyName: 'blocked', sourceUrl: url, sourceEvidence: e.message, extractionMethod: 'deterministic', confidence: 0, boothNumber: null, profileUrl: null, companyWebsite: null }] };
    }
    
    // Choose adapter
    let selectedAdapter = adapters[adapters.length - 1]; // Generic
    for (const adapter of adapters) {
      if (adapter.detect(url, htmlText)) {
        selectedAdapter = adapter;
        break;
      }
    }
    
    console.log(`Selected adapter: ${selectedAdapter.name}`);
    
    let exhibitors: ExhibitorData[] = [];
    try {
      exhibitors = await selectedAdapter.extractExhibitors(url, htmlText, page, interceptedXhr, this.saveCheckpoint.bind(this));
    } catch (e) {
      console.error(`Error in adapter ${selectedAdapter.name}:`, e);
    }
    
    if (browser) await browser.close();
    
    // Step 11: Run Gemini only for candidates that deterministic rules cannot confidently accept or reject.
    // If no exhibitors found via JSON/tables, we'll try Gemini on the text chunks.
    if (exhibitors.length === 0) {
      // Need to clean HTML and batch
      const textChunk = htmlText.replace(/</g, ' <').replace(/>/g, '> ')
         .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
         .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
         .replace(/(<([^>]+)>)/ig, ' ')
         .replace(/\s\s+/g, ' ')
         .substring(0, 30000);
         
      // Here we would run Gemini on the chunk
      // But we need to use the callback to batch them
      try {
        exhibitors = await runGeminiFallback([textChunk]);
      } catch (e: any) {
        if (e.message === 'waiting_for_ai_quota') {
           console.warn('AI quota exhausted. Continuing with deterministic only.');
           await this.saveCheckpoint(url, { status: 'waiting_for_ai_quota', exhibitors });
        }
      }
    }
    
    const diagnostics = (selectedAdapter as any).getDiagnostics ? (selectedAdapter as any).getDiagnostics() : undefined;
    await this.saveCheckpoint(url, { status: 'completed', exhibitors, diagnostics });
    return { exhibitors, diagnostics };
  }
}
