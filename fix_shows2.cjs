const fs = require('fs');

const initialShows = `
import { TradeShowEvent } from '../types';
export const INITIAL_USA_TRADE_SHOWS: TradeShowEvent[] = [
  {
    id: 'ts-orbus-1',
    eventName: 'Pack Expo International 2026',
    shortName: 'Pack Expo',
    category: 'Packaging & Processing',
    city: 'Chicago',
    state: 'IL',
    venue: 'McCormick Place',
    dates: 'Nov 3 - Nov 6, 2026',
    month: 'November',
    year: 2026,
    orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
    officialWebsite: 'https://www.packexpointernational.com',
    estimatedExhibitorsCount: 2500,
    extractedExhibitorsCount: 0,
    isUsa: true,
    exhibitors: []
  },
  {
    id: 'ts-orbus-2',
    eventName: 'SEMA Show 2026',
    shortName: 'SEMA',
    category: 'Automotive Aftermarket',
    city: 'Las Vegas',
    state: 'NV',
    venue: 'Las Vegas Convention Center',
    dates: 'Nov 4 - Nov 7, 2026',
    month: 'November',
    year: 2026,
    orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
    officialWebsite: 'https://www.semashow.com',
    estimatedExhibitorsCount: 2400,
    extractedExhibitorsCount: 0,
    isUsa: true,
    exhibitors: []
  },
  {
    id: 'ts-orbus-3',
    eventName: 'MAGIC Las Vegas (Fall 2026)',
    shortName: 'MAGIC Vegas',
    category: 'Fashion & Apparel',
    city: 'Las Vegas',
    state: 'NV',
    venue: 'Las Vegas Convention Center',
    dates: 'Aug 18 - Aug 20, 2026',
    month: 'August',
    year: 2026,
    orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
    officialWebsite: 'https://www.magicfashionevents.com',
    estimatedExhibitorsCount: 1800,
    extractedExhibitorsCount: 0,
    isUsa: true,
    exhibitors: []
  },
  {
    id: 'ts-orbus-4',
    eventName: 'InfoComm USA 2026',
    shortName: 'InfoComm',
    category: 'Audiovisual & Pro AV',
    city: 'Orlando',
    state: 'FL',
    venue: 'Orange County Convention Center',
    dates: 'Oct 14 - Oct 18, 2026',
    month: 'October',
    year: 2026,
    orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
    officialWebsite: 'https://www.infocommshow.org',
    estimatedExhibitorsCount: 1000,
    extractedExhibitorsCount: 0,
    isUsa: true,
    exhibitors: []
  },
  {
    id: 'ts-orbus-5',
    eventName: 'Global Pet Expo 2026',
    shortName: 'Global Pet Expo',
    category: 'Pet Products & Retail',
    city: 'Orlando',
    state: 'FL',
    venue: 'Orange County Convention Center',
    dates: 'Sep 22 - Sep 24, 2026',
    month: 'September',
    year: 2026,
    orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
    officialWebsite: 'https://www.globalpetexpo.org',
    estimatedExhibitorsCount: 1100,
    extractedExhibitorsCount: 0,
    isUsa: true,
    exhibitors: []
  }
];
`;

fs.writeFileSync('src/data/initialShows.ts', initialShows);
console.log('Restored initialShows with empty exhibitors');
