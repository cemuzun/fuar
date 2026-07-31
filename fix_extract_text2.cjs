const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startStr = '// Attempt 2: If fewer than 2 companies extracted or input was short/URL, use Gemini Search Grounding';
const endStr = '// No mockup data fallback per user request.';

const idx1 = code.indexOf(startStr);
const idx2 = code.indexOf(endStr);

if (idx1 !== -1 && idx2 !== -1) {
  const replacement = `// Attempt 2: If fewer than 2 companies extracted or input was short/URL, use Gemini Search Grounding
    if (!extractedExhibitors || extractedExhibitors.length < 2) {
      console.log('Attempting Search Grounding for exhibitor company extraction...');
      try {
        const ai = getGenAI();
        const queryTarget = isUrl ? contentToAnalyze : (tradeShowName || rawText);
        const searchPrompt = \`Search the web for the official exhibitor list or major exhibitor companies for the trade show event: '\${queryTarget}' located in \${city || 'USA'}, \${state || 'US'}.
        Find 15-20 ACTUAL, REAL exhibitor companies attending this trade show with their booth numbers, industry, and website. Do not make up fake exhibitors.\`;
        
        const searchRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        const rawSearch = searchRes.text || '';
        console.log('Tier 2 Extraction Search Output:', rawSearch.substring(0, 300));
        
        const structPrompt = \`Convert these search findings into a strict JSON array of exhibitor company objects. Do not hallucinate or make up fake companies. If the findings do not list specific exhibitors, return an empty array []:\\n\${rawSearch}\\n
        For each exhibitor company, provide:
        - companyName
        - boothNumber
        - boothSize (e.g. '20x20 Island')
        - boothType ('Island', 'Inline', 'Peninsula', or 'Corner')
        - estimatedBoothBudget
        - industry
        - website (URL)
        - phone
        - city, state, country ('USA')
        - description (1 sentence)
        - decisionMakers: array of 1-2 key contacts (name, title, department, email, emailConfidence 'Verified'|'Likely', phone, linkedinUrl)\`;
        
        const structRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: structPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  companyName: { type: Type.STRING },
                  boothNumber: { type: Type.STRING },
                  boothSize: { type: Type.STRING },
                  boothType: { type: Type.STRING },
                  estimatedBoothBudget: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  website: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  country: { type: Type.STRING },
                  description: { type: Type.STRING },
                  decisionMakers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        title: { type: Type.STRING },
                        department: { type: Type.STRING },
                        email: { type: Type.STRING },
                        emailConfidence: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        linkedinUrl: { type: Type.STRING },
                      },
                      required: ['name', 'title', 'email'],
                    },
                  },
                },
                required: ['companyName', 'industry'],
              },
            },
          },
        });
        
        extractedExhibitors = JSON.parse(structRes.text || '[]');
      } catch (err) {
        console.warn('Attempt 2 Search Grounding failed:', err);
      }
    }

    `;
  
  code = code.substring(0, idx1) + replacement + code.substring(idx2);
  fs.writeFileSync('server.ts', code);
  console.log('Fixed Attempt 2 Search Grounding in /api/extract/text');
} else {
  console.log('Indices not found:', idx1, idx2);
}
