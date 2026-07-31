import { ScraperAdapter, ExhibitorData } from '../types.js';

export class MapYourShowAdapter implements ScraperAdapter {
  name = 'MapYourShow';

  detect(url: string, html: string): boolean {
    return url.includes('mapyourshow.com') || html.includes('mapyourshow');
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    
    // Prioritize intercepted JSON responses
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes('exhibitor') && xhr.json && Array.isArray(xhr.json.data)) {
        for (const item of xhr.json.data) {
          if (item.exhibitorName || item.name) {
            exhibitors.push({
              companyName: item.exhibitorName || item.name,
              boothNumber: item.booth || item.boothNumber || null,
              profileUrl: item.profileUrl || null,
              companyWebsite: item.website || null,
              sourceUrl: url,
              sourceEvidence: 'MapYourShow JSON API',
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
