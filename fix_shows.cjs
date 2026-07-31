const fs = require('fs');
let code = fs.readFileSync('src/data/initialShows.ts', 'utf8');

// I will just replace the file with an empty list to be safe, so that NO mockup data loads at all.
const emptyInitialShows = `
import { TradeShowEvent } from '../types';
export const INITIAL_USA_TRADE_SHOWS: TradeShowEvent[] = [];
`;
fs.writeFileSync('src/data/initialShows.ts', emptyInitialShows);
console.log('Cleared initialShows.ts');
