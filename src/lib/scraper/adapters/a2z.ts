import { ScraperAdapter, ExhibitorData } from '../types.js';

export class A2ZAdapter implements ScraperAdapter {
  name = 'A2Z';

  detect(url: string, html: string): boolean {
    return url.includes('a2zinc.net') || html.includes('a2z inc');
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    
    if (!page) {
      console.warn('[A2ZAdapter] No page object available, skipping DOM extraction');
      return exhibitors;
    }

    // Fallback logic for A2Z parsing based on common list DOM elements
    try {
      const handles = await page.$$('.exhibitorName, .BoothContactName, .companyName');
      for (const handle of handles) {
        const text = await handle.textContent();
        if (text && text.trim().length > 0) {
          exhibitors.push({
            companyName: text.trim(),
            boothNumber: null,
            profileUrl: null,
            companyWebsite: null,
            sourceUrl: url,
            sourceEvidence: 'A2Z DOM Node',
            extractionMethod: 'deterministic',
            confidence: 0.9
          });
        }
      }
    } catch(e) {
      console.error('[A2ZAdapter] DOM extraction error:', e);
    }
    
    return exhibitors;
  }
}
