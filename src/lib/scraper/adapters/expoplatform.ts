import { ScraperAdapter, ExhibitorData, ExtractionDiagnostics } from '../types.js';
import { Page } from 'playwright';

export class ExpoPlatformAdapter implements ScraperAdapter {
  name = 'ExpoPlatform';
  private diagnostics: ExtractionDiagnostics = {
    adapterUsed: 'expoplatform',
    directoryReportedCount: null,
    pagesFetched: 0,
    uniqueRecordsExtracted: 0,
    duplicatesRemoved: 0,
    invalidRecordsRejected: 0,
    paginationCompleted: false,
    attemptedUrls: [],
    blockedReason: null
  };

  detect(url: string, html: string): boolean {
    return url.includes('expoplatform.com') || html.includes('ExpoPlatform');
  }

  async discoverPages(url: string, html: string, page: Page): Promise<string[]> {
    return [];
  }

  getDiagnostics(): ExtractionDiagnostics {
    return this.diagnostics;
  }

  async extractExhibitors(url: string, html: string, page: Page, initialXhr: any[], saveCheckpoint?: (url: string, data: any) => Promise<void>): Promise<ExhibitorData[]> {
    const exhibitors: ExhibitorData[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    
    this.diagnostics.attemptedUrls.push(url);

    let foundViaJson = false;
    console.log('EXPOPLATFORM ADAPTER STARTED');

    const processJson = (xhrJson: any) => {
        const dataArray = xhrJson?.data?.list || xhrJson?.data || xhrJson?.items || xhrJson?.data?.items || (Array.isArray(xhrJson) ? xhrJson : null);
        if (Array.isArray(dataArray) && dataArray.length > 0) {
            if (dataArray[0].name || dataArray[0].title || dataArray[0].company_name) {
                foundViaJson = true;
                
                if (xhrJson?.data?.total) {
                    this.diagnostics.directoryReportedCount = xhrJson.data.total;
                } else if (xhrJson.meta && xhrJson.meta.total) {
                    this.diagnostics.directoryReportedCount = xhrJson.meta.total;
                } else if (xhrJson.total) {
                    this.diagnostics.directoryReportedCount = xhrJson.total;
                }

                for (const item of dataArray) {
                    const name = item.name || item.title || item.company_name;
                    if (!name) {
                        this.diagnostics.invalidRecordsRejected++;
                        continue;
                    }
                    
                    const extId = String(item.id || item.uuid || '');
                    const normalizedName = name.trim().toLowerCase();
                    
                    if ((extId && seenIds.has(extId)) || seenNames.has(normalizedName)) {
                        this.diagnostics.duplicatesRemoved++;
                        continue;
                    }

                    if (extId) seenIds.add(extId);
                    seenNames.add(normalizedName);

                    let booth = item.stand || item.stand_number || item.booth || null;
                    if (Array.isArray(item.stands) && item.stands.length > 0) {
                        booth = item.stands.map((s:any) => s.title || s.name).join(', ');
                    }

                    exhibitors.push({
                        
                        companyName: name,
                        boothNumber: booth,
                        profileUrl: item.slug ? new URL('/marketplace/exhibitors/' + item.slug, url).href : null,
                        companyWebsite: item.website || item.url || null,
                        sourceUrl: url,
                        sourceEvidence: 'ExpoPlatform JSON API',
                        extractionMethod: 'expoplatform_json',
                        confidence: 0.99,
                        industry: item.category || undefined,
                        city: item.city || undefined,
                        country: item.country || undefined,
                    });
                }
            }
        }
    };

    // Process initial XHRs
    for (const xhr of initialXhr) {
      if (xhr.json) {
         processJson(xhr.json);
      }
    }

    const responseHandler = async (response: any) => {
        try {
            if (response.url().includes('api') || response.url().includes('marketplace') || response.url().includes('graphql')) {
                const req = response.request();
                if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
                    const json = await response.json().catch(() => null);
                    if (json) {
                        processJson(json);
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    };
    
    page.on('response', responseHandler);

    let hasMore = true;
    let scrollCount = 0;
    const maxScrolls = 20;

    while (hasMore && scrollCount < maxScrolls) {
        let previousHeight = await page.evaluate(() => document.body.scrollHeight);
        
        let initialExhibitorCount = exhibitors.length;

        try {
            const loadMoreBtn = await page.$('button:has-text("Load more"), button:has-text("Show more"), .load-more');
            if (loadMoreBtn && await loadMoreBtn.isVisible()) {
                await loadMoreBtn.click();
            } else {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            }
        } catch(e) {}
        
        await page.waitForTimeout(2000);
        
        let newHeight = await page.evaluate(() => document.body.scrollHeight);
        
        if (newHeight === previousHeight && exhibitors.length === initialExhibitorCount) {
            await page.waitForTimeout(3000); // Wait longer
            newHeight = await page.evaluate(() => document.body.scrollHeight);
            if (newHeight === previousHeight && exhibitors.length === initialExhibitorCount) {
                hasMore = false;
            }
        }
        scrollCount++;
        this.diagnostics.pagesFetched = scrollCount;
        
        if (saveCheckpoint) {
            this.diagnostics.uniqueRecordsExtracted = exhibitors.length;
            await saveCheckpoint(url, { status: 'in_progress', exhibitors, diagnostics: this.diagnostics });
        }
    }
    
    page.off('response', responseHandler);
    this.diagnostics.paginationCompleted = !hasMore;

    if (!foundViaJson) {
        const domExhibitors = await page.evaluate(() => {
            const results: any[] = [];
            const cards = document.querySelectorAll('.exhibitor-card, .marketplace-card, article');
            cards.forEach(card => {
                const nameEl = card.querySelector('h3, h4, .card-title, .name');
                if (!nameEl) return;
                const name = nameEl.textContent?.trim();
                
                const urlEl = card.querySelector('a') as HTMLAnchorElement;
                const profileUrl = urlEl ? urlEl.href : null;
                
                const boothEl = card.querySelector('.stand, .booth, [data-icon="location"]');
                const booth = boothEl ? boothEl.textContent?.trim() : null;
                
                if (name) {
                    results.push({ name, profileUrl, booth });
                }
            });
            return results;
        });

        for (const item of domExhibitors) {
            const normalizedName = item.name.toLowerCase();
            if (seenNames.has(normalizedName)) {
                this.diagnostics.duplicatesRemoved++;
                continue;
            }
            seenNames.add(normalizedName);
            
            exhibitors.push({
                companyName: item.name,
                boothNumber: item.booth,
                profileUrl: item.profileUrl,
                companyWebsite: null,
                sourceUrl: url,
                sourceEvidence: 'ExpoPlatform DOM',
                extractionMethod: 'expoplatform_dom',
                confidence: 0.8
            });
        }
    }

    this.diagnostics.uniqueRecordsExtracted = exhibitors.length;
    console.log('EXPOPLATFORM ADAPTER FINISHED, EXTRACTED:', exhibitors.length);
    return exhibitors;
  }
}
