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
    const seenNames = new Set<string>();
    
    // Swapcard uses GraphQL endpoints
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes('graphql') && xhr.json && xhr.json.data) {
        const visited = new WeakSet();
        const searchNodes = (obj: any, depth = 0) => {
          if (!obj || typeof obj !== 'object' || depth > 15) return;
          if (visited.has(obj)) return;
          visited.add(obj);

          if (Array.isArray(obj)) {
            obj.forEach(item => searchNodes(item, depth + 1));
          } else {
            if (obj.__typename === 'Exhibitor' || obj.__typename === 'Organization' || obj.companyName) {
              const name = obj.name || obj.companyName;
              if (name && !seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
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
            Object.values(obj).forEach(val => searchNodes(val, depth + 1));
          }
        };
        searchNodes(xhr.json.data);
      }
    }
    return exhibitors;
  }
}
