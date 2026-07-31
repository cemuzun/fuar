const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// Tier 3: Curated Fallback Orbus USA Trade Show List');
const endString = "return res.json({ success: true, source: 'orbus_usa_directory', events: extractedEvents });";
const endIdx = code.indexOf(endString) + endString.length;

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `// Tier 3: Curated Fallback Orbus USA Trade Show List
    if (!extractedEvents || extractedEvents.length === 0) {
      console.log('Using Tier 3 Curated Orbus USA Trade Show List...');
      extractedEvents = [
        {
          eventName: 'Pack Expo International 2026',
          shortName: 'Pack Expo',
          category: 'Packaging & Processing',
          city: 'Chicago',
          state: 'IL',
          venue: 'McCormick Place',
          dates: 'Nov 3 - Nov 6, 2026',
          month: 'November',
          year: 2026,
          officialWebsite: 'https://www.packexpointernational.com',
          estimatedExhibitorsCount: 2500,
          exhibitors: []
        },
        {
          eventName: 'MAGIC Las Vegas (Fall 2026)',
          shortName: 'MAGIC Vegas',
          category: 'Fashion & Apparel',
          city: 'Las Vegas',
          state: 'NV',
          venue: 'Las Vegas Convention Center',
          dates: 'Aug 18 - Aug 20, 2026',
          month: 'August',
          year: 2026,
          officialWebsite: 'https://www.magicfashionevents.com',
          estimatedExhibitorsCount: 1800,
          exhibitors: []
        },
        {
          eventName: 'SEMA Show 2026',
          shortName: 'SEMA',
          category: 'Automotive Aftermarket',
          city: 'Las Vegas',
          state: 'NV',
          venue: 'Las Vegas Convention Center',
          dates: 'Nov 4 - Nov 7, 2026',
          month: 'November',
          year: 2026,
          officialWebsite: 'https://www.semashow.com',
          estimatedExhibitorsCount: 2400,
          exhibitors: []
        },
        {
          eventName: 'InfoComm USA 2026',
          shortName: 'InfoComm',
          category: 'Audiovisual & Pro AV',
          city: 'Orlando',
          state: 'FL',
          venue: 'Orange County Convention Center',
          dates: 'Oct 14 - Oct 18, 2026',
          month: 'October',
          year: 2026,
          officialWebsite: 'https://www.infocommshow.org',
          estimatedExhibitorsCount: 1000,
          exhibitors: []
        }
      ];
    }
    return res.json({ success: true, source: 'orbus_usa_directory', events: extractedEvents });`;

  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('server.ts', code);
  console.log('Replaced successfully');
} else {
  console.log('Failed to find start or end index');
}
