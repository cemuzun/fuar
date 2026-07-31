import { DirectoryScraper } from './src/lib/scraper/index.js';

async function runTest() {
  const url = 'https://texworldnycsummer2026-messefrankfurt.expoplatform.com/marketplace/exhibitors';
  console.log(`Testing scraping for ${url}`);
  const scraper = new DirectoryScraper();
  
  const result = await scraper.scrape(url, 'Texworld NYC Summer 2026', 'New York', 'NY', async () => []);
  
  const { exhibitors, diagnostics } = result;
  
  console.log('--- Diagnostics ---');
  console.log(JSON.stringify(diagnostics, null, 2));
  
  console.log(`\nExtracted ${exhibitors.length} exhibitors.`);
  console.log('--- Sample Records ---');
  console.log(JSON.stringify(exhibitors.slice(0, 5), null, 2));
  
  if (diagnostics && diagnostics.directoryReportedCount) {
    if (exhibitors.length >= diagnostics.directoryReportedCount * 0.9) {
       console.log('\n✅ Extraction counts are substantially consistent with directory total.');
    } else {
       console.log('\n⚠️ Extracted count is significantly less than the reported total.');
    }
  } else if (exhibitors.length > 50) {
    console.log('\n✅ Successfully extracted a large number of exhibitors.');
  } else {
    console.log('\n❌ Extracted too few exhibitors.');
  }
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
