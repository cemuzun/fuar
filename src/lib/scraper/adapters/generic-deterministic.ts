import { ScraperAdapter, ExhibitorData } from '../types.js';
import * as cheerio from 'cheerio';

const EXCLUSION_PATTERNS = [
  /^home$/i, /^contact$/i, /^about us$/i, /^register$/i, /^login$/i, /^privacy$/i, /^terms$/i,
  /^new products?$/i, /^welding machines?$/i, /^register as a visitor$/i,
  /^product categories$/i, /^equipment categories$/i, /^service$/i, /^event names$/i,
  /^sponsors$/i, /^exhibitors$/i, /^search$/i, /^view all$/i, /^back to top$/i
];

function isGeneric(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 70 || trimmed.length < 2) return true;
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
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
    const exhibitorsMap = new Map<string, ExhibitorData>();
    const $ = cheerio.load(html);

    const addExhibitor = (name: string, booth: string | null = null, evidence: string = 'HTML Element') => {
      const cleanName = name.replace(/\s+/g, ' ').trim();
      if (!cleanName || isGeneric(cleanName)) return;
      const key = cleanName.toLowerCase();
      if (!exhibitorsMap.has(key)) {
        exhibitorsMap.set(key, {
          companyName: cleanName,
          boothNumber: booth ? booth.trim() : null,
          profileUrl: null,
          companyWebsite: null,
          sourceUrl: url,
          sourceEvidence: evidence,
          extractionMethod: 'deterministic',
          confidence: booth ? 0.95 : 0.8
        });
      }
    };
    
    // 1. Attempt HTML tables
    $('table tr').each((_, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 1) {
        const name = $(tds[0]).text().trim();
        const booth = tds.length >= 2 ? $(tds[1]).text().trim() : null;
        
        if (name && !isGeneric(name)) {
          const cleanBooth = (booth && booth.match(/^[A-Z0-9- ]+$/i)) ? booth : null;
          addExhibitor(name, cleanBooth, 'HTML Table Row');
        }
      }
    });

    // 2. Attempt Cards / Directory Items
    $('.exhibitor-card, .exhibitor-item, .directory-item, .company-card, [class*="exhibitor"], [class*="directory-item"]').each((_, el) => {
      const nameEl = $(el).find('h2, h3, h4, .name, .title, .company-name, strong, a').first();
      const name = nameEl.text().trim();
      const boothEl = $(el).find('.booth, .booth-number, [class*="booth"]').first();
      const booth = boothEl.text().trim() || null;
      if (name) {
        addExhibitor(name, booth, 'HTML Card Element');
      }
    });

    // 3. Attempt List Items
    $('ul li, ol li').each((_, li) => {
      const text = $(li).text().trim();
      // Match pattern like "Company Name - Booth 101" or "Company Name (Booth A12)"
      const match = text.match(/^([A-Za-z0-9&,.\-\s']+?)(?:\s*[\-\(]\s*(?:Booth|Stand)?\s*([A-Z0-9\-]+)[\)]?)?$/i);
      if (match && match[1]) {
        const name = match[1].trim();
        const booth = match[2] ? match[2].trim() : null;
        if (name.length >= 3 && name.length <= 60 && !isGeneric(name)) {
          addExhibitor(name, booth, 'List Item');
        }
      }
    });

    // 4. Attempt Link Cards (a tags containing exhibitor/booth)
    $('a[href*="exhibitor"], a[href*="company"], a[href*="booth"]').each((_, a) => {
      const text = $(a).text().trim();
      if (text && text.length >= 3 && text.length <= 60 && !isGeneric(text)) {
        addExhibitor(text, null, 'Link Element');
      }
    });

    return Array.from(exhibitorsMap.values());
  }
}
