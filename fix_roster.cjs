const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startStr = '// Attempt 1: Call Gemini AI to generate fresh exhibitor companies';
const endStr = '    // Backfill from curated pool if AI returned fewer than targetCount';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `// Attempt 1: Call Gemini AI to search and structure actual exhibitor companies
    try {
      const ai = getGenAI();
      
      const searchPrompt = \`Search the web for the official exhibitor list for '\${cleanShow}' in '\${city || 'Chicago'}', '\${state || 'IL'}'. Find 15-20 ACTUAL, real exhibitor companies attending. Find their real booth numbers, website, industry, and any available contact info or decision makers. Do not hallucinate. List them as text.\`;
      
      const searchRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const rawSearchText = searchRes.text || '';
      console.log('Search text for roster found:', rawSearchText.substring(0, 200));

      const structPrompt = \`Based strictly on the following search results:\\n\${rawSearchText}\\n\\nExtract these into a structured JSON array of exhibitor companies. Do not hallucinate or make up any company that is not mentioned in the results. If you cannot find any, return an empty array.\\n\\nFor each exhibitor company, provide:\\n- companyName\\n- boothNumber\\n- boothSize (e.g. '20x20 Island')\\n- boothType ('Island', 'Inline', 'Peninsula', or 'Corner')\\n- estimatedBoothBudget\\n- industry\\n- website (URL)\\n- phone\\n- city, state, country ('USA')\\n- description (1 sentence)\\n- decisionMakers: array of 1-2 key contacts (name, title, department, email, emailConfidence 'Verified'|'Likely', phone, linkedinUrl)\`;
      
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
              required: ['companyName', 'industry', 'boothNumber'],
            },
          },
        },
      });
      const rawAiList = JSON.parse(structRes.text || '[]');
      // Filter out duplicates
      exhibitorsList = rawAiList.filter((item: any) => item.companyName && !existingSet.has(item.companyName.trim().toLowerCase()));
    } catch (aiErr) {
      console.warn('Gemini AI generation failed or timed out for roster, utilizing curated pool:', aiErr);
    }
`;
  
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('server.ts', code);
  console.log('Replaced generate-roster with 2-step search');
} else {
  console.log('Could not find boundaries');
}
