const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix 1: Remove "realistic exhibitor companies" prompt in Tier 2
code = code.replace(
  'For each event, provide eventName, shortName, category, city, state, venue, dates (in 2026/2027), month, year 2026, officialWebsite, estimatedExhibitorsCount, and 3 realistic exhibitor companies with booth numbers (e.g., S-2408, West-102), booth sizes (e.g., 20x20 Island, 30x30 Custom), industry, website, description, and key marketing decision maker.',
  'For each event, provide eventName, shortName, category, city, state, venue, dates (in 2026/2027), month, year 2026, officialWebsite, estimatedExhibitorsCount. Do not generate fake exhibitors. Always set exhibitors to an empty array.'
);

// Fix 2: Clean up Tier 3 fallback to remove fake exhibitors
code = code.replace(/exhibitors: \[\s*\{\s*companyName:[^]*?\]/g, 'exhibitors: []');

// Fix 3: /api/extract/generate-roster to use search grounding
code = code.replace(
  "Generate a high-quality list of ${targetCount} major real exhibitor companies attending '${cleanShow}' in '${city || 'Chicago'}', '${state || 'IL'}'.",
  "Search the web for real exhibitor companies attending '${cleanShow}' in '${city || 'Chicago'}', '${state || 'IL'}'. Find their real booth numbers and industry. Do not hallucinate or generate mock data. If you cannot find real data, return empty."
);

code = code.replace(
  "const aiRes = await ai.models.generateContent({",
  "const aiRes = await ai.models.generateContent({\n        tools: [{ googleSearch: {} }],"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts mock data');
