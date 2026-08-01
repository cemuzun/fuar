import { ScraperAdapter, ExhibitorData } from '../types.js';
import * as cheerio from 'cheerio';

// BlackhatAdapter
// Handles Black Hat event sponsor/exhibitor pages:
//   - https://blackhat.com/us-26/event-sponsors.html
//   - https://blackhat.com/eu-N/event-sponsors.html
//   - Other Cloudflare-protected sponsor/exhibitor grid pages
//
// Approach:
//  1. Re-fetch the URL with Cloudflare-bypass headers
//  2. Parse with broad CSS selectors targeting sponsor/exhibitor grid patterns
//  3. Extract company names from img[alt], h3/h4, .sponsor-name, data-company etc.
export class BlackhatAdapter implements ScraperAdapter {
  name = 'Blackhat';

  detect(url: string, html: string): boolean {
    return (
      url.includes('blackhat.com') ||
      url.includes('blackhat.') ||
      (url.includes('event-sponsors') && (html.includes('blackhat') || html.includes('Black Hat')))
    );
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(
    url: string,
    html: string,
    page: any,
    interceptedXhr: any[],
    saveCheckpoint?: Function
  ): Promise<ExhibitorData[]> {
    const exhibitorsMap = new Map<string, ExhibitorData>();

    // Helper to add unique exhibitor
    const addExhibitor = (name: string, website?: string | null, evidence: string = 'HTML Element') => {
      const cleanName = name.replace(/\s+/g, ' ').trim();
      if (!cleanName || cleanName.length < 2 || cleanName.length > 100) return;
      // Filter out nav/UI/footer noise
      const noise = /^(home|about|contact|register|login|search|sponsors|exhibitors|menu|schedule|agenda|speakers|venue|hotel|faq|news|press|blog|twitter|x\/twitter|linkedin|facebook|instagram|address|privacy policy|terms of use|terms|conditions|copyright|all rights reserved|back to top|cookie policy)$/i;
      if (noise.test(cleanName)) return;
      const key = cleanName.toLowerCase();
      if (!exhibitorsMap.has(key)) {
        exhibitorsMap.set(key, {
          companyName: cleanName,
          boothNumber: null,
          profileUrl: null,
          companyWebsite: website || null,
          sourceUrl: url,
          sourceEvidence: evidence,
          extractionMethod: 'deterministic',
          confidence: 0.85
        });
      }
    };

    // Step 1: Try to bypass Cloudflare by re-fetching with full browser headers
    let workingHtml = html;
    if (!html || html.includes('cf-wrapper') || html.includes('Cloudflare') || html.length < 5000) {
      console.log('[BlackhatAdapter] Cloudflare block detected, attempting bypass fetch...');
      try {
        const bypassHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Upgrade-Insecure-Requests': '1',
        };

        const res = await fetch(url, { headers: bypassHeaders });
        if (res.ok) {
          const freshHtml = await res.text();
          if (freshHtml.length > 10000 && !freshHtml.includes('cf-wrapper')) {
            workingHtml = freshHtml;
            console.log(`[BlackhatAdapter] Bypass fetch succeeded, HTML size: ${freshHtml.length} bytes`);
          } else {
            console.warn(`[BlackhatAdapter] Bypass fetch returned Cloudflare page or empty (${freshHtml.length} bytes)`);
          }
        }
      } catch (e: any) {
        console.error('[BlackhatAdapter] Bypass fetch failed:', e.message);
      }
    }

    const $ = cheerio.load(workingHtml);

    // Step 2: Remove non-content elements
    $('script, style, nav, header, footer, noscript, iframe').remove();

    // Step 3: Broad sponsor/exhibitor CSS selectors used by security conf sites
    const sponsorSelectors = [
      // Explicit sponsor containers
      '.sponsor-logo',
      '.sponsor-item',
      '.sponsor-card',
      '.sponsor-block',
      '.sponsor-tile',
      '[class*="sponsor"]',
      // Exhibitor containers
      '.exhibitor-logo',
      '.exhibitor-item',
      '.exhibitor-card',
      '[class*="exhibitor"]',
      // Company / partner containers
      '.company-item',
      '.company-card',
      '.partner-item',
      '.partner-logo',
      '[class*="partner"]',
      // Generic grid items containing logos
      '.grid-item',
      '.card',
      '.logo-item',
      '.tile',
    ];

    for (const selector of sponsorSelectors) {
      $(selector).each((_, el) => {
        // Get company name from: img[alt], h2/h3/h4, .name, a text, or element text
        const imgAlt = $(el).find('img[alt]').first().attr('alt') || '';
        const heading = $(el).find('h2, h3, h4, h5, strong, b').first().text().trim();
        const linkText = $(el).find('a').first().text().trim();
        const elText = $(el).text().trim().split('\n')[0].trim();
        const website = $(el).find('a[href]').first().attr('href') || null;

        const name = imgAlt || heading || linkText || elText;
        if (name && name.length >= 2 && name.length <= 100) {
          addExhibitor(name, website, `CSS Selector: ${selector}`);
        }
      });
    }

    // Step 4: img[alt] sweep — sponsor logos almost always have alt text = company name
    $('img[alt]').each((_, img) => {
      const alt = ($(img).attr('alt') || '').trim();
      // Only pick up image alts that look like company names (2-80 chars, not "logo" etc.)
      if (
        alt.length >= 3 &&
        alt.length <= 80 &&
        !/^(logo|banner|image|photo|picture|icon|badge|sponsor logo|exhibitor logo|company logo|arrow|chevron|check|close|menu|header|footer)$/i.test(alt)
      ) {
        const parentLink = $(img).closest('a');
        const website = parentLink.attr('href') || null;
        addExhibitor(alt, website, 'img[alt] Logo');
      }
    });

    // Step 5: Anchor sweep for links like /exhibitor/company-name or /sponsor/company-name
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().trim();
      if (
        (href.includes('/exhibitor/') || href.includes('/sponsor/') || href.includes('/company/') || href.includes('/partner/')) &&
        text.length >= 2 &&
        text.length <= 80
      ) {
        addExhibitor(text, href.startsWith('http') ? href : null, 'Anchor exhibitor/sponsor link');
      }
    });

    // Step 6: data-company / data-name attribute sweep
    $('[data-company], [data-name], [data-exhibitor], [data-sponsor]').each((_, el) => {
      const name =
        $(el).attr('data-company') ||
        $(el).attr('data-name') ||
        $(el).attr('data-exhibitor') ||
        $(el).attr('data-sponsor') ||
        '';
      if (name.trim().length >= 2) {
        addExhibitor(name.trim(), null, 'data-* attribute');
      }
    });

    // Step 7: JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const json = JSON.parse($(script).html() || '{}');
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item.sponsor) {
            const sponsors = Array.isArray(item.sponsor) ? item.sponsor : [item.sponsor];
            for (const s of sponsors) {
              if (s.name) addExhibitor(s.name, s.url || null, 'JSON-LD sponsor');
            }
          }
          if (item.organizer?.name) addExhibitor(item.organizer.name, item.organizer.url, 'JSON-LD organizer');
        }
      } catch (e) {}
    });

    const results = Array.from(exhibitorsMap.values());
    console.log(`[BlackhatAdapter] Extracted ${results.length} companies from ${url}`);
    return results;
  }
}
