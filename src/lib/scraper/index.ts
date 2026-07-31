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

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });
      
      page.on('response', async (response) => {
        const req = response.request();
        if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
          if (response.url().includes('mapyourshow') || response.url().includes('api') || response.url().includes('json') || response.url().includes('graphql') || response.url().includes('marketplace') || response.url().includes('exhibitor')) {
            try {
              const json = await response.json();
              if (interceptedXhr.length < 200) {
                interceptedXhr.push({ url: response.url(), json });
              }
            } catch (e) {}
          }
        }
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(2000);
      htmlText = await page.content();
    } catch (e: any) {
      console.warn(`[Scraper] Playwright unavailable (${e.message}), attempting HTTP fetch fallback...`);
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        if (res.ok) {
          htmlText = await res.text();
          console.log(`[Scraper] HTTP fetch succeeded, HTML size: ${htmlText.length} bytes`);
        }
      } catch (fetchErr: any) {
        console.error(`[Scraper] HTTP fetch fallback failed:`, fetchErr.message);
      }
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
