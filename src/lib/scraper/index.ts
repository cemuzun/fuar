import { createClient } from '@supabase/supabase-js';
import { A2ZAdapter } from './adapters/a2z.js';
import { ExpoFPAdapter } from './adapters/expofp.js';
import { SwapcardAdapter } from './adapters/swapcard.js';
import { ExpoPlatformAdapter } from './adapters/expoplatform.js';
import { chromium, Page, Browser } from 'playwright';
import { ScraperAdapter, ExhibitorData } from './types.js';
import { MapYourShowAdapter } from './adapters/mapyourshow.js';
import { GenericDeterministicAdapter } from './adapters/generic-deterministic.js';

const adapters: ScraperAdapter[] = [
  new MapYourShowAdapter(),
  new A2ZAdapter(),
  new ExpoFPAdapter(),
  new SwapcardAdapter(),
  new ExpoPlatformAdapter(),
  new GenericDeterministicAdapter() // Fallback
];

export class DirectoryScraper {
  
  private supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) 
    : null;

  private async saveCheckpoint(url: string, data: any) {
    if (!this.supabase) {
       console.warn('Supabase not configured, skipping saveCheckpoint');
       return;
    }
    try {
      await this.supabase.from('scraper_checkpoints').upsert({
        url,
        data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'url' });
    } catch (e) {
      console.error('Failed to save checkpoint to Supabase:', e);
    }
  }

  private async loadCheckpoint(url: string) {
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('scraper_checkpoints')
        .select('data')
        .eq('url', url)
        .single();
      
      if (error) return null;
      return data?.data || null;
    } catch (e) {
      return null;
    }
  }

  async scrape(url: string, tradeShowName: string, city: string, state: string, runGeminiFallback: (candidates: string[]) => Promise<ExhibitorData[]>): Promise<{ exhibitors: ExhibitorData[], diagnostics?: any }> {
    console.log(`Starting Playwright extraction for ${url}`);
    const checkpoint = await this.loadCheckpoint(url);
    if (checkpoint && checkpoint.status === 'completed') {
       console.log('Returning from checkpoint');
       return { exhibitors: checkpoint.exhibitors, diagnostics: checkpoint.diagnostics };
    }

    
    let browser: Browser | null = null;
    let page: Page | null = null;
    let htmlText = '';
    const interceptedXhr: { url: string, json: any }[] = [];
    
    try {
      browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
      page = await browser.newPage();
      
      page.on('response', async (response) => {
        const req = response.request();
        if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
          if (response.url().includes('mapyourshow') || response.url().includes('api') || response.url().includes('json') || response.url().includes('graphql') || response.url().includes('marketplace')) {
            try {
              const json = await response.json();
              if (interceptedXhr.length < 50) { interceptedXhr.push({ url: response.url(), json }); }
            } catch (e) {
              // Ignore non-json parsing errors
            }
          }
        }
      });
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // wait a bit for js to execute
      await page.waitForTimeout(3000);
      htmlText = await page.content();
      
    } catch (e: any) {
      console.error(`Playwright error for ${url}:`, e);
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
