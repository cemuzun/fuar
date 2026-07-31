import { ScraperAdapter, ExhibitorData } from '../types.js';
import * as cheerio from 'cheerio';

const EXCLUSION_PATTERNS = [
  /home/i, /contact/i, /about us/i, /register/i, /login/i, /privacy/i, /terms/i,
  /new products?/i, /welding machines?/i, /register as a visitor/i,
  /equipment/i, /solutions/i, /systems/i, /technologies/i, /manufacturing/i, /industries/i,
  /product categories/i, /equipment categories/i, /service/i, /event names/i,
  /sponsors/i, /exhibitors/i
];

function isGeneric(text: string): boolean {
  if (text.length > 50 || text.length < 2) return true;
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  // Reject candidates that merely end with generic words
  if (/ (Products|Systems|Solutions|Equipment|Technologies|Manufacturing|Industries)$/i.test(text.trim())) {
    return true;
  }
  return false;
}

export class GenericDeterministicAdapter implements ScraperAdapter {
  name = 'GenericDeterministic';

  detect(url: string, html: string): boolean {
    return true; // Fallback
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    const $ = cheerio.load(html);
    
    // Attempt HTML tables
    $('table tr').each((_, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 2) {
        const name = $(tds[0]).text().trim();
        const booth = $(tds[1]).text().trim();
        
        if (name && !isGeneric(name) && booth.match(/^[A-Z0-9- ]+$/i)) {
          exhibitors.push({
            companyName: name,
            boothNumber: booth,
            profileUrl: null,
            companyWebsite: null,
            sourceUrl: url,
            sourceEvidence: 'HTML Table Row',
            extractionMethod: 'deterministic',
            confidence: 0.8
          });
        }
      }
    });

    return exhibitors;
  }
}
