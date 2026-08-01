import { ScraperAdapter, ExhibitorData } from '../types.js';
import * as cheerio from 'cheerio';

const EXCLUSION_PATTERNS = [
  /^home$/i, /^contact$/i, /^about us$/i, /^register$/i, /^login$/i, /^privacy$/i, /^terms$/i,
  /^new products?$/i, /^welding machines?$/i, /^register as a visitor$/i,
  /^product categories$/i, /^equipment categories$/i, /^service$/i, /^event names$/i,
  /^sponsors$/i, /^exhibitors$/i, /^search$/i, /^view all$/i, /^back to top$/i,
  /^logo$/i, /^banner$/i, /^image$/i, /^photo$/i, /^icon$/i, /^arrow$/i,
  /^menu$/i, /^navigation$/i, /^header$/i, /^footer$/i, /^close$/i, /^open$/i,
  /^next$/i, /^previous$/i, /^submit$/i, /^cancel$/i, /^ok$/i, /^yes$/i, /^no$/i,
];

function isGeneric(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 80 || trimmed.length < 2) return true;
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

    // Remove noisy elements
    $('script, style, nav, header, footer, noscript').remove();

    const addExhibitor = (name: string, booth: string | null = null, evidence: string = 'HTML Element', website?: string | null) => {
      const cleanName = name.replace(/\s+/g, ' ').trim();
      if (!cleanName || isGeneric(cleanName)) return;
      const key = cleanName.toLowerCase();
      if (!exhibitorsMap.has(key)) {
        exhibitorsMap.set(key, {
          companyName: cleanName,
          boothNumber: booth ? booth.trim() : null,
          profileUrl: null,
          companyWebsite: website || null,
          sourceUrl: url,
          sourceEvidence: evidence,
          extractionMethod: 'deterministic',
          confidence: booth ? 0.95 : 0.8
        });
      }
    };

    // 1. HTML tables
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

    // 2. Exhibitor / Sponsor / Company card selectors (broad coverage)
    const cardSelectors = [
      '.exhibitor-card', '.exhibitor-item', '.exhibitor', '[class*="exhibitor"]',
      '.sponsor-card', '.sponsor-item', '.sponsor-logo', '.sponsor-tile', '[class*="sponsor"]',
      '.company-card', '.company-item', '[class*="company"]',
      '.directory-item', '[class*="directory-item"]',
      '.partner-card', '.partner-item', '.partner-logo', '[class*="partner"]',
      '.vendor-card', '.vendor-item', '[class*="vendor"]',
      '.booth-card', '.booth-item', '[class*="booth-card"]',
      '.grid-item', '.card-item', '.listing-item',
    ];
    for (const selector of cardSelectors) {
      $(selector).each((_, el) => {
        const imgAlt = $(el).find('img[alt]').first().attr('alt') || '';
        const nameEl = $(el).find('h2, h3, h4, h5, .name, .title, .company-name, strong, a').first();
        const name = imgAlt || nameEl.text().trim();
        const boothEl = $(el).find('.booth, .booth-number, [class*="booth"]').first();
        const booth = boothEl.text().trim() || null;
        const website = $(el).find('a[href]').first().attr('href') || null;
        if (name) {
          addExhibitor(name, booth, `Card: ${selector}`, website);
        }
      });
    }

    // 3. img[alt] sweep — sponsor/exhibitor logo pages always use img alt = company name
    $('img[alt]').each((_, img) => {
      const alt = ($(img).attr('alt') || '').trim();
      if (alt.length >= 3 && alt.length <= 80 && !isGeneric(alt)) {
        const parentLink = $(img).closest('a');
        const website = parentLink.attr('href') || null;
        addExhibitor(alt, null, 'img[alt] Logo', website && website.startsWith('http') ? website : null);
      }
    });

    // 4. List items
    $('ul li, ol li').each((_, li) => {
      const text = $(li).text().trim();
      const match = text.match(/^([A-Za-z0-9&,.\-\s']+?)(?:\s*[\-\(]\s*(?:Booth|Stand)?\s*([A-Z0-9\-]+)[\)]?)?$/i);
      if (match && match[1]) {
        const name = match[1].trim();
        const booth = match[2] ? match[2].trim() : null;
        if (name.length >= 3 && name.length <= 70 && !isGeneric(name)) {
          addExhibitor(name, booth, 'List Item');
        }
      }
    });

    // 5. Anchor links to exhibitor/sponsor/company/booth/partner pages
    $('a[href*="exhibitor"], a[href*="company"], a[href*="booth"], a[href*="sponsor"], a[href*="partner"]').each((_, a) => {
      const text = $(a).text().trim();
      const href = $(a).attr('href') || '';
      if (text && text.length >= 3 && text.length <= 70 && !isGeneric(text)) {
        addExhibitor(text, null, 'Anchor Link', href.startsWith('http') ? href : null);
      }
    });

    // 6. data-* attribute sweep
    $('[data-company], [data-name], [data-exhibitor], [data-sponsor]').each((_, el) => {
      const name =
        $(el).attr('data-company') ||
        $(el).attr('data-name') ||
        $(el).attr('data-exhibitor') ||
        $(el).attr('data-sponsor') ||
        '';
      if (name.trim().length >= 2 && !isGeneric(name.trim())) {
        addExhibitor(name.trim(), null, 'data-* attribute');
      }
    });

    return Array.from(exhibitorsMap.values());
  }
}
