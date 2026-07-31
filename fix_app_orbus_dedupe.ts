import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldSetShows = `        setShows((prev) => [...newShows, ...prev]);`;
const newSetShows = `        setShows((prev) => {
          const seen = new Set(prev.map(s => (s.eventName || '').toLowerCase().trim() + (s.year || '')));
          const uniqueNew = newShows.filter(s => {
            const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...uniqueNew, ...prev];
        });`;

content = content.replace(oldSetShows, newSetShows);
fs.writeFileSync('src/App.tsx', content);
