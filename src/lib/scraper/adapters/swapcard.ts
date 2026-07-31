import { ScraperAdapter, ExhibitorData } from '../types.js';

export class SwapcardAdapter implements ScraperAdapter {
  name = 'Swapcard';

  detect(url: string, html: string): boolean {
    return url.includes('swapcard.com');
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    
    // Swapcard uses GraphQL endpoints
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes('graphql') && xhr.json && xhr.json.data) {
        // Simple search for nodes that might be exhibitors
        const searchNodes = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            obj.forEach(searchNodes);
          } else {
            if (obj.__typename === 'Exhibitor' || obj.__typename === 'Organization' || obj.companyName) {
              const name = obj.name || obj.companyName;
              if (name) {
                exhibitors.push({
                  companyName: name,
                  boothNumber: obj.booth || null,
                  profileUrl: null,
                  companyWebsite: obj.websiteUrl || null,
                  sourceUrl: url,
                  sourceEvidence: 'Swapcard GraphQL API',
                  extractionMethod: 'json',
                  confidence: 0.95
                });
              }
            }
            Object.values(obj).forEach(searchNodes);
          }
        };
        searchNodes(xhr.json.data);
      }
    }
    return exhibitors;
  }
}
