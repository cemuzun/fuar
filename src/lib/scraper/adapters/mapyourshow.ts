import { ScraperAdapter, ExhibitorData } from '../types.js';

export class MapYourShowAdapter implements ScraperAdapter {
  name = 'MapYourShow';

  detect(url: string, html: string): boolean {
    return url.includes('mapyourshow.com') || html.includes('.mapyourshow.com');
  }

  async discoverPages(url: string, html: string, page: any): Promise<string[]> {
    return [];
  }

  async extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[]): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    
    // Prioritize intercepted JSON responses
    for (const xhr of interceptedXhr) {
      if ((xhr.url.includes('exhibitor') || xhr.url.includes('search') || xhr.url.includes('api')) && xhr.json) {
        const list = Array.isArray(xhr.json.data) ? xhr.json.data : Array.isArray(xhr.json) ? xhr.json : [];
        for (const item of list) {
          if (item.exhibitorName || item.name || item.companyName) {
            exhibitors.push({
              companyName: item.exhibitorName || item.name || item.companyName,
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

    // HTML DOM parsing fallback if JSON XHR yielded 0 items
    if (exhibitors.length === 0 && html) {
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);
      const exMap = new Map<string, ExhibitorData>();

      const addEx = (name: string, booth?: string | null, website?: string | null) => {
        const clean = name.replace(/\s+/g, ' ').trim();
        if (!clean || clean.length < 2 || clean.length > 90) return;
        if (/^(home|search|exhibitors|floor plan|sessions|myinfocomm|featured|sitemap|privacy policy|download|login|help)$/i.test(clean)) return;
        const key = clean.toLowerCase();
        if (!exMap.has(key)) {
          exMap.set(key, {
            companyName: clean,
            boothNumber: booth || null,
            profileUrl: null,
            companyWebsite: website || null,
            sourceUrl: url,
            sourceEvidence: 'MapYourShow DOM Element',
            extractionMethod: 'deterministic',
            confidence: 0.85
          });
        }
      };

      // MapYourShow DOM selectors
      $('.mys-exhibitor-name, [class*="exhibitor-name"], [class*="exhibitor-title"], [class*="mys-card-title"]').each((_, el) => {
        const name = $(el).text().trim();
        const booth = $(el).closest('.mys-card, [class*="card"]').find('[class*="booth"]').text().trim();
        addEx(name, booth);
      });

      // Broad img[alt] and link sweep
      $('img[alt]').each((_, img) => {
        const alt = ($(img).attr('alt') || '').trim();
        if (alt.length >= 3 && alt.length <= 80 && !/^(logo|icon|banner|image|mapyourshow|download)$/i.test(alt)) {
          addEx(alt);
        }
      });
      $('a[href*="exhibitor"]').each((_, a) => {
        const text = $(a).text().trim();
        if (text.length >= 2 && text.length <= 80) addEx(text);
      });

      exhibitors.push(...Array.from(exMap.values()));
    }

    return exhibitors;
  }
}
