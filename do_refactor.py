import re

with open('server.ts', 'r') as f:
    content = f.read()

# I will define `async function performExtraction(rawText: string, tradeShowName: string, city: string, state: string) { ... }`
# And then use it inside `/api/extract/text`

refactored = """
async function performExtraction(rawText: string, tradeShowName: string, city: string, state: string) {
    const ai = getGenAI();
    let contentToAnalyze = rawText.trim();
    let isUrl = contentToAnalyze.startsWith('http://') || contentToAnalyze.startsWith('https://');

    if (isUrl) {
      console.log(`Extracting exhibitors from URL via Puppeteer: ${contentToAnalyze}`);
      try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        // Wait until network is mostly idle to let JS render the tables
        await page.goto(contentToAnalyze, { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Extra wait just in case
        await new Promise(r => setTimeout(r, 2000));
        
        const htmlText = await page.content();
        await browser.close();

        // Use Cheerio to strip out unnecessary tags and extract clean text
        const $ = cheerio.load(htmlText);
        $('script, style, link, img, svg, iframe, noscript, header, footer').remove();
        let cleanedText = $('body').text().replace(/\\s+/g, ' ').trim();

        if (cleanedText && cleanedText.length > 300) {
          contentToAnalyze = cleanedText.substring(0, 45000); // Pass a good chunk to Gemini
        } else {
          // Fallback if empty body
          if (htmlText.length > 300) {
            contentToAnalyze = htmlText.substring(0, 35000);
          }
        }
      } catch (e) {
        console.log("Caught error:", e);
      }
    }

    let extractedExhibitors: any[] = [];

    // Attempt 1: Direct JSON parsing of contentToAnalyze
    try {
      const prompt = `You are a specialized B2B trade show exhibitor extraction tool.
Analyze the following text/HTML/content for trade show event '${tradeShowName || 'USA Trade Show'}' in '${city || 'USA'}, ${state || ''}'.

Extract a structured JSON array of exhibitor companies.
Only extract ACTUAL exhibitor companies clearly mentioned. Do not hallucinate or guess.
If none are found, return an empty array [].

For each exhibitor company, provide:
- companyName
- boothNumber
- boothSize (e.g. '20x20 Island')
- boothType ('Island', 'Inline', 'Peninsula', or 'Corner')
- estimatedBoothBudget
- industry
- website (URL)
- phone
- city, state, country
- description
- decisionMakers: array of key contacts (if mentioned or relevant, e.g. Name, Title, Department, Email, Phone)

CONTENT:
${contentToAnalyze.substring(0, 35000)}`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
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
                      phone: { type: Type.STRING },
                    },
                  },
                },
              },
              required: ['companyName', 'industry'],
            },
          },
        },
      });

      extractedExhibitors = JSON.parse(aiRes.text || '[]');
    } catch (err) {
        console.log("Caught error:", err);
      }

    // Attempt 2: If fewer than 2 companies extracted or input was short/URL, use Gemini Search Grounding
    if (!extractedExhibitors || extractedExhibitors.length < 2) {
      console.log('Attempting Search Grounding for exhibitor company extraction...');
      try {
        const queryTarget = isUrl ? contentToAnalyze : (tradeShowName || rawText);
        const searchPrompt = `Search the web for the official exhibitor list or major exhibitor companies for the trade show event: '${queryTarget}' located in ${city || 'USA'}, ${state || 'US'}.
        Find 15-20 ACTUAL, REAL exhibitor companies attending this trade show with their booth numbers, industry, and website. Do not make up fake exhibitors.`;
        
        const searchRes = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawSearch = searchRes.text || '';
        console.log('Tier 2 Extraction Search Output:', rawSearch.substring(0, 300));
        
        const structPrompt = `Convert these search findings into a strict JSON array of exhibitor company objects. Do not hallucinate or make up fake companies. If the findings do not list specific exhibitors, return an empty array []:\\n${rawSearch}\\n
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
        - decisionMakers: array of REAL key contacts ONLY IF found in the text. NEVER invent names like 'Contact Lead' or 'John Doe'. Leave empty [] if none found.\`;
        
        const structRes = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
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
        console.error('Extraction via search grounding failed', err);
      }
    }

    if (!extractedExhibitors || extractedExhibitors.length === 0) {
      throw new Error('AI Extraction failed or quota exceeded. No real data could be found.');
    }

    return extractedExhibitors;
}
"""

app_post_regex = re.compile(r"app\.post\('/api/extract/text',\s*async\s*\(req,\s*res\)\s*=>\s*\{.*?(?:return\s+res\.status\(400\)\.json.*?\}\s*)(?:const ai = getGenAI\(\);\s*)?let contentToAnalyze.*?(?:res\.json\(\{ success: true, count: extractedExhibitors\.length, exhibitors: extractedExhibitors \}\);\s*\} catch \(error: any\) \{\s*res\.status\(500\)\.json\(\{ error: error\.message \|\| 'Extraction failed', exhibitors: \[\] \}\);\s*\}\s*\});", re.DOTALL)

def replace_extract(match):
    return refactored + """
app.post('/api/extract/text', async (req, res) => {
  try {
    const { rawText, tradeShowName, city, state } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'rawText or URL parameter is required' });
    }
    
    const extractedExhibitors = await performExtraction(rawText, tradeShowName, city, state);
    res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Extraction failed', exhibitors: [] });
  }
});
"""

content = app_post_regex.sub(replace_extract, content)

with open('server.ts', 'w') as f:
    f.write(content)

print("Refactored /api/extract/text successfully")
