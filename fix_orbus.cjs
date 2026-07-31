const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startStr = '// Tier 2: AI Generation of USA Trade Show List if HTML parse returned 0';
const endStr = '// Tier 3: Curated Fallback Orbus USA Trade Show List';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `// Tier 2: AI Generation of USA Trade Show List if HTML parse returned 0
    if (!extractedEvents || extractedEvents.length === 0) {
      try {
        console.log('Attempting Tier 2 Gemini USA Trade Show extraction with Google Search...');
        const ai = getGenAI();
        const searchRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: \`Search the web for the official Orbus USA Trade Show List 2026/2027 or a comprehensive list of major upcoming B2B trade shows in the USA for 2026. Find at least 25 major events across cities like Las Vegas, Chicago, Orlando, New York, Atlanta, Dallas. Do not hallucinate. List their event name, industry category, city, state, venue, dates, and official website.\`,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
        const rawSearch = searchRes.text || '';
        
        const structRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: \`Based on these search findings:\\n\${rawSearch}\\n\\nExtract these into a structured JSON array of trade show events. Provide at least 15-25 events. Do not generate fake exhibitors (leave exhibitors empty). For each event, provide eventName, shortName, category, city, state, venue, dates, month, year, officialWebsite, estimatedExhibitorsCount.\`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  eventName: { type: Type.STRING },
                  shortName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  venue: { type: Type.STRING },
                  dates: { type: Type.STRING },
                  month: { type: Type.STRING },
                  year: { type: Type.INTEGER },
                  officialWebsite: { type: Type.STRING },
                  estimatedExhibitorsCount: { type: Type.INTEGER },
                  exhibitors: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        companyName: { type: Type.STRING }
                      }
                    }
                  }
                },
                required: ['eventName', 'city', 'state', 'dates']
              }
            }
          }
        });
        extractedEvents = JSON.parse(structRes.text || '[]');
      } catch (err) {
        console.warn('Tier 2 Gemini generation failed:', err);
      }
    }
    
    `;
    
    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
    fs.writeFileSync('server.ts', code);
    console.log('Fixed tier 2');
}

