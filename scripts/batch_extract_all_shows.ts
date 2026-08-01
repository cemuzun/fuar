import { dbQueries } from '../src/lib/db.js';
import { performExtraction } from '../server.ts';
import fs from 'fs';
import { execSync } from 'child_process';

async function batchExtractAll() {
  console.log('=====================================================');
  console.log('🚀 Starting Batch Extraction for ALL USA Trade Shows');
  console.log('=====================================================');

  const shows = dbQueries.getAllTradeShows();
  console.log(`Found ${shows.length} total trade shows in database.\n`);

  let countExtracted = 0;
  let totalExhibitorsScraped = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    const existing = dbQueries.getExhibitorsForShow(show.id);
    
    console.log(`[${i + 1}/${shows.length}] Checking "${show.eventName}" (${show.city}, ${show.state})...`);

    if (existing && existing.length > 0) {
      console.log(`   ⏩ Already has ${existing.length} exhibitors in DB. Skipping to next.`);
      countExtracted++;
      totalExhibitorsScraped += existing.length;
      continue;
    }

    const urlToScrape = show.officialWebsite || show.orbusUrl;
    if (!urlToScrape) {
      console.log(`   ⚠️ No valid URL for ${show.eventName}. Skipping.`);
      continue;
    }

    console.log(`   🔍 Scraping: ${urlToScrape}`);
    try {
      const exhibitors = await performExtraction(
        urlToScrape,
        show.eventName,
        show.city || 'Las Vegas',
        show.state || 'NV'
      );
      
      console.log(`   ✅ Extracted ${exhibitors.length} exhibitors for "${show.eventName}"`);
      totalExhibitorsScraped += exhibitors.length;
      countExtracted++;

      // Sync to initialShows.ts and re-deploy every 10 shows
      if (countExtracted % 10 === 0) {
        console.log('\n🔄 Syncing database to initialShows.ts and re-building bundle...');
        updateInitialShows();
      }
    } catch (err: any) {
      console.error(`   ❌ Error extracting ${show.eventName}:`, err.message);
    }

    // Brief delay to be polite
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n=====================================================');
  console.log(`🎉 Batch Extraction Completed!`);
  console.log(`Processed ${shows.length} shows. Total Extracted Exhibitors: ${totalExhibitorsScraped}`);
  console.log('=====================================================');

  updateInitialShows();
}

function updateInitialShows() {
  try {
    const db = JSON.parse(fs.readFileSync('fuar_db.json', 'utf-8'));
    const shows = Object.values(db.trade_shows || {}).map((s: any) => {
      const exhibitors = Object.values(db.exhibitors || {}).filter(
        (ex: any) => ex.showId === s.id || (ex.tradeShowName && ex.tradeShowName.toLowerCase().trim() === (s.eventName||'').toLowerCase().trim())
      );
      const exhibitorsWithDms = exhibitors.map((ex: any) => ({
        ...ex,
        decisionMakers: Object.values(db.decision_makers || {}).filter((dm: any) => dm.exhibitorId === ex.id)
      }));

      return {
        id: s.id,
        eventName: s.eventName,
        shortName: s.shortName || s.eventName,
        category: s.category || 'Trade Show',
        city: s.city || 'Las Vegas',
        state: s.state || 'NV',
        venue: s.venue || 'Convention Center',
        dates: s.dates || '2026',
        month: s.month || '2026',
        year: s.year || 2026,
        orbusUrl: s.orbusUrl || 'https://www.orbus.com/about-us/usa-tradeshow-list',
        officialWebsite: s.officialWebsite || '',
        estimatedExhibitorsCount: s.estimatedExhibitorsCount || exhibitorsWithDms.length,
        extractedExhibitorsCount: exhibitorsWithDms.length,
        isUsa: true,
        exhibitors: exhibitorsWithDms
      };
    });

    const content = `import { TradeShowEvent } from '../types';\nexport const INITIAL_USA_TRADE_SHOWS: TradeShowEvent[] = ${JSON.stringify(shows, null, 2)};\nexport const TOTAL_ORBUS_USA_SHOWS_COUNT = 1374;\n`;
    fs.writeFileSync('src/data/initialShows.ts', content);
    console.log('✅ Successfully updated initialShows.ts with latest DB snapshot.');
  } catch (err: any) {
    console.error('⚠️ Could not update initialShows.ts:', err.message);
  }
}

batchExtractAll().catch(console.error);
