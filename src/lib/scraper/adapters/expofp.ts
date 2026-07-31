import { ScraperAdapter, ExhibitorData } from '../types.js';

export class ExpoFPAdapter implements ScraperAdapter {
  name = 'ExpoFP';

  detect(url: string, html: string): boolean {
    return url.includes('expofp.com') || html.includes('ExpoFP');
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    
    // ExpoFP usually loads exhibitors via an API or window variable
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes('exhibitors') && Array.isArray(xhr.json)) {
        for (const item of xhr.json) {
          if (item.name) {
            exhibitors.push({
              companyName: item.name,
              boothNumber: item.booth || item.stand || null,
              profileUrl: null,
              companyWebsite: item.url || item.website || null,
              sourceUrl: url,
              sourceEvidence: 'ExpoFP JSON API',
              extractionMethod: 'json',
              confidence: 0.95
            });
          }
        }
      }
    }
    return exhibitors;
  }
}
