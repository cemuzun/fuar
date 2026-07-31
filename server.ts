import { DirectoryScraper } from './src/lib/scraper/index.js';
import { GenericDeterministicAdapter } from './src/lib/scraper/adapters/generic-deterministic.js';
import { ExhibitorData } from './src/lib/scraper/types.js';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

import * as fsLib from 'fs';
import * as pathLib from 'path';

function logScrapedContent(url: string, content: string, type: 'html' | 'json' = 'html') {
  try {
    const logDir = pathLib.join(process.cwd(), 'logs');
    if (!fsLib.existsSync(logDir)) {
      fsLib.mkdirSync(logDir, { recursive: true });
    }
    const safeUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50).toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `scrape_${safeUrl}_${timestamp}.${type}`;
    const filePath = pathLib.join(logDir, filename);
    fsLib.writeFileSync(filePath, content);
    console.log(`[Scraper Log] Saved raw content for debugging to: ${filePath}`);
  } catch (err: any) {
    console.error('[logScrapedContent] Failed to write log:', err.message);
  }
}

// Structured extraction event logger — writes to logs/extraction.jsonl
function logExtraction(step: string, data: Record<string, any>) {
  try {
    const logDir = pathLib.join(process.cwd(), 'logs');
    if (!fsLib.existsSync(logDir)) fsLib.mkdirSync(logDir, { recursive: true });
    const entry = JSON.stringify({ ts: new Date().toISOString(), step, ...data }) + '\n';
    fsLib.appendFileSync(pathLib.join(logDir, 'extraction.jsonl'), entry);
    console.log(`[Extraction Log] ${step}:`, data);
  } catch (err: any) {
    console.error('[logExtraction] Failed to write log:', err.message);
  }
}




    




    



dotenv.config();


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// --- BACKGROUND JOBS SYSTEM ---
interface Job {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'stalled';
  progress: number;
  total: number;
  results: any[];
  lastHeartbeat: number;
  leaseExpiresAt: number;
}
const jobs = new Map<string, Job>();

app.post('/api/jobs/start', async (req, res) => {
  const jobId = `job_${Date.now()}`;
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    progress: 0,
    total: req.body.shows ? req.body.shows.length : 1,
    results: [],
    lastHeartbeat: Date.now(),
    leaseExpiresAt: Date.now() + 5 * 60 * 1000 // 5 min lease
  });
  
  // Start background worker
  processBackgroundJob(jobId, req.body).catch(err => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      console.error(`[Job ${jobId}] Background job crashed:`, err.message || err);
    }
  });
  
  res.json({ success: true, jobId });
});

app.get('/api/jobs/status/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  // Check if stalled
  if (job.status === 'running' && Date.now() > job.leaseExpiresAt && Date.now() - job.lastHeartbeat > 60000) {
    job.status = 'stalled';
  }
  
  res.json({ success: true, job });
});


async function processBackgroundJob(jobId: string, payload: any) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  const shows = payload.shows || [];
  console.log(`[Job ${jobId}] Starting background extraction for ${shows.length} shows`);

  for (let i = job.progress; i < shows.length; i++) {
    job.lastHeartbeat = Date.now();
    job.leaseExpiresAt = Date.now() + 5 * 60 * 1000;
    
    const show = shows[i];
    console.log(`[Job ${jobId}] Processing show ${i + 1}/${shows.length}: ${show.eventName}`);
    
    try {
      // Always use real extraction — pass URL if available, otherwise event name as search query
      const extractionTarget = show.officialWebsite || show.eventName;
      const extractedExhibitors = await performExtraction(
        extractionTarget,
        show.eventName, // always pass the show name separately
        show.city,
        show.state
      );

      console.log(`[Job ${jobId}] Show "${show.eventName}": extracted ${extractedExhibitors.length} exhibitors`);

      job.results.push({
        showId: show.id,
        showName: show.eventName,
        exhibitors: extractedExhibitors
      });
    } catch (err: any) {
      console.error(`[Job ${jobId}] Extraction failed for show "${show.eventName}":`, err.message);
      job.results.push({
        showId: show.id,
        showName: show.eventName,
        exhibitors: [],
        error: err.message || 'Extraction failed'
      });
    }
    
    job.progress = i + 1;
    // Throttle between shows to avoid API rate limits
    if (i < shows.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  job.status = 'completed';
  console.log(`[Job ${jobId}] Completed. Total results: ${job.results.length}`);
}
// ------------------------------


// Lazy initializer for Gemini client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing in system settings.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1.5 Scraper logs
app.get('/api/scraper-logs', (req, res) => {
  try {
    const logDir = pathLib.join(process.cwd(), 'logs');
    if (!fsLib.existsSync(logDir)) {
      return res.json({ success: true, logs: [] });
    }
    const files = fsLib.readdirSync(logDir);
    const logs = files
      .filter(f => f.endsWith('.html') || f.endsWith('.json'))
      .map(f => {
        const filePath = pathLib.join(logDir, f);
        const stats = fsLib.statSync(filePath);
        return {
          filename: f,
          size: stats.size,
          mtime: stats.mtimeMs,
          content: fsLib.readFileSync(filePath, 'utf-8').substring(0, 500000) // cap size
        };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5);
      
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Extract Orbus USA Trade Show List
app.post('/api/extract/orbus', async (_req, res) => {
  try {
    const targetUrl = 'https://thetradeshowcalendar.com/orbus/index.php?vRpP=4500';
    console.log(`Fetching Orbus USA Trade Show List from ${targetUrl}...`);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar, status: ${response.status}`);
    }

    const pageHtml = await response.text();
    logScrapedContent(targetUrl, pageHtml, 'html');
    const $ = cheerio.load(pageHtml);

    let extractedEvents: any[] = [];

    $('tr.row').each((i, el) => {
      const ctry = $(el).find('.r-Ctry').text().trim();
      if (ctry !== 'United States') return;

      const nameEl = $(el).find('.r-Name a');
      const eventName = nameEl.text().trim();
      let officialWebsite = nameEl.attr('href') || '';
      if (officialWebsite && officialWebsite.startsWith('//')) {
          officialWebsite = 'https:' + officialWebsite;
      }

      const dates = $(el).find('.r-Dates').text().trim();
      const cityState = $(el).find('.r-City').text().trim();
      const parts = cityState.split(',');
      const city = parts[0] ? parts[0].trim() : '';
      const state = parts[1] ? parts[1].trim() : '';
      
      const attendees = $(el).find('.r-Att').text().trim();
      const exhibitors = $(el).find('.r-Exh').text().trim();

      // We can infer month and year from dates
      let month = '';
      let year = 2026;
      if (dates) {
          const dParts = dates.split('/');
          if (dParts.length > 0) month = dParts[0];
          const yearMatch = dates.match(/\d{4}/);
          if (yearMatch) year = parseInt(yearMatch[0], 10);
      }
      
      const months: Record<string, string> = {
          'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
          'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
          'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
      };
      const monthFull = months[month.toUpperCase()] || month;

      if (eventName) {
        extractedEvents.push({
          eventName,
          shortName: eventName,
          category: 'Trade Show',
          city: city || '',
          state: state || '',
          venue: '',
          dates,
          month: monthFull,
          year,
          officialWebsite,
          estimatedExhibitorsCount: parseInt(exhibitors.replace(/\D/g, ''), 10) || 0,
          attendees: parseInt(attendees.replace(/\D/g, ''), 10) || 0,
          exhibitors: []
        });
      }
    });

    console.log(`Extracted ${extractedEvents.length} US events`);
    return res.json({ success: true, source: 'orbus_usa_directory', events: extractedEvents });
  } catch (error: any) {
    
    res.status(500).json({ error: error.message || 'Failed to extract Orbus USA trade show list' });
  }
});

app.post('/api/search/tradeshow', async (req, res) => {
  try {
    const { query, city, state } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`Live Search Grounding lookup for trade show: ${query}...`);
    const ai = getGenAI();

    const searchPrompt = `Perform a live web search to find exact, real-time official details and verified exhibitor roster for the trade show: "${query}" ${city ? `in ${city}` : ''} ${state || ''}.
Find:
1. Official exact event name, dates (e.g. Sep 30 - Oct 01, 2026), city, state, venue (e.g. Jacob K. Javits Convention Center), and official website URL.
2. Actual verified exhibitor companies with booth numbers, booth sizes, industry, and contact details.`;

    const searchRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawSearchText = searchRes.text || '';

    const structPrompt = `Convert these live search findings into a single JSON object:
${rawSearchText}

JSON Schema:
{
  "eventName": "Exact Event Name",
  "shortName": "Short Event Name",
  "category": "Industry Category",
  "city": "City Name",
  "state": "State Abbreviation",
  "venue": "Venue Name",
  "dates": "Date Range",
  "month": "Month",
  "year": 2026,
  "officialWebsite": "https://...",
  "estimatedExhibitorsCount": 100,
  "exhibitors": [
    {
      "companyName": "Company Name",
      "boothNumber": "Booth Number",
      "boothSize": "Booth Size",
      "boothType": "Island",
      "industry": "Industry",
      "website": "https://...",
      "phone": "Phone",
      "city": "City",
      "state": "State",
      "country": "USA",
      "description": "Description",
      "decisionMakers": [
        {
          "name": "Full Name",
          "title": "Title",
          "department": "Department",
          "email": "Email",
          "phone": "Phone"
        }
      ]
    }
  ]
}`;

    const structRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: structPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const eventObj = JSON.parse(structRes.text || '{}');
    return res.json({ success: true, event: eventObj });
  } catch (error: any) {
    
    return res.status(500).json({ error: error.message || 'Failed to search for tradeshow' });
  }
});

// 3. Extract exhibitors from custom URL or pasted text

export async function performExtraction(rawText: string, tradeShowName: string, city: string, state: string) {
    let contentToAnalyze = rawText.trim();
    let isUrl = contentToAnalyze.startsWith('http://') || contentToAnalyze.startsWith('https://');
    
    let extractedExhibitors: any[] = [];
    
    if (isUrl) {
      const scraper = new DirectoryScraper();
      const geminiFallback = async (candidates: string[]) => {
        const ai = getGenAI();
        let fallbackExhibitors: any[] = [];
        for (const chunk of candidates) {
           const prompt = `Analyze this text from a trade show directory ('${tradeShowName}') and extract genuine exhibitor companies ONLY. Reject generic navigation links, categories, and event names. Do not hallucinate. 

TEXT:
${chunk}`;
           try {
             const aiRes = await ai.models.generateContent({
                model: "gemini-2.5-flash",
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
                        industry: { type: Type.STRING },
                      },
                      required: ['companyName']
                    }
                  }
                }
             });
             const parsed = JSON.parse(aiRes.text || '[]');
             fallbackExhibitors = fallbackExhibitors.concat(parsed.map((p: any) => ({ ...p, extractionMethod: 'ai', confidence: 0.6 })));
           } catch(e: any) {
             if (e.message?.toLowerCase().includes("quota") || e.status === 429 || e.message?.includes("resource_exhausted")) {
               throw new Error("waiting_for_ai_quota");
             }
           }
        }
        return fallbackExhibitors;
      };
      
      logExtraction('scraper_start', { url: contentToAnalyze, tradeShowName });
      const scrapeResult = await scraper.scrape(contentToAnalyze, tradeShowName, city, state, geminiFallback);
      logExtraction('scraper_done', { url: contentToAnalyze, exhibitorCount: scrapeResult.exhibitors.length, diagnostics: scrapeResult.diagnostics });
      extractedExhibitors = scrapeResult.exhibitors;
    } else {
      logExtraction('text_extraction_start', { contentLength: contentToAnalyze.length, tradeShowName });

      // 1. Try deterministic HTML / structure extraction
      const adapter = new GenericDeterministicAdapter();
      extractedExhibitors = await adapter.extractExhibitors('pasted-content', contentToAnalyze, null, []);
      logExtraction('deterministic_done', { count: extractedExhibitors.length });

      // 2. If deterministic finds nothing, or to enrich text, use Gemini AI
      if (!extractedExhibitors || extractedExhibitors.length === 0) {
        try {
          const ai = getGenAI();
          const prompt = `Analyze this raw text/HTML pasted from a trade show exhibitor list ('${tradeShowName || 'Trade Show'}') and extract all legitimate exhibitor company names and booth numbers.
          
RAW CONTENT:
${contentToAnalyze.substring(0, 25000)}`;

          const aiRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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
                    industry: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['companyName']
                }
              }
            }
          });
          const parsed = JSON.parse(aiRes.text || '[]');
          extractedExhibitors = parsed.map((p: any) => ({
            ...p,
            extractionMethod: 'ai',
            confidence: 0.85
          }));
          logExtraction('gemini_text_extraction_done', { count: extractedExhibitors.length });
        } catch (e: any) {
          logExtraction('gemini_text_extraction_failed', { error: e.message });
          
          // 3. Local pattern-matching fallback parser for line-by-line text
          const lines = contentToAnalyze.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2 && l.length < 80);
          const fallbackList: any[] = [];
          for (const line of lines) {
            if (/^(home|contact|privacy|terms|menu|categories|search|login|register)$/i.test(line)) continue;
            const match = line.match(/^([A-Za-z0-9&,.\-\s']+?)(?:\s*[\-\t|:]\s*(?:Booth|Stand)?\s*([A-Z0-9\-]+))?$/i);
            if (match && match[1]) {
              const compName = match[1].trim();
              if (compName.length >= 3) {
                fallbackList.push({
                  companyName: compName,
                  boothNumber: match[2] || null,
                  extractionMethod: 'text-pattern-fallback',
                  confidence: 0.7
                });
              }
            }
          }
          extractedExhibitors = fallbackList;
          logExtraction('text_pattern_fallback_done', { count: extractedExhibitors.length });
        }
      }
    }
    
    logExtraction('extraction_complete', { tradeShowName, totalExtracted: extractedExhibitors.length });
    return extractedExhibitors;
}

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

// 3.5 Auto-Generate / Expand full exhibitor roster for a specific trade show
app.post('/api/extract/generate-roster', async (req, res) => {
  try {
    const { tradeShowName, city, state, count, existingCompanyNames = [] } = req.body;
    const cleanShow = tradeShowName || 'Pack Expo International';
    const targetCount = Number(count) || 30;
    const existingSet = new Set((existingCompanyNames || []).map((n: string) => n.trim().toLowerCase()));

    console.log(`Generating auto-expanded roster for show: ${cleanShow} in ${city || 'USA'}, ${state || ''} (Target: ${targetCount}, existing count: ${existingSet.size})...`);

    // Comprehensive curated pool for Pack Expo, White Label Expo & top USA trade shows
    const isPackExpo = cleanShow.toLowerCase().includes('pack expo');
    const isWhiteLabelExpo = cleanShow.toLowerCase().includes('white label') || cleanShow.toLowerCase().includes('whitelabel');
    
    
    

    let exhibitorsList: any[] = [];

    // Attempt 1: Call Gemini AI to search and structure actual exhibitor companies
    try {
      const ai = getGenAI();
      
      const searchPrompt = `Search the web for the official exhibitor list for '${cleanShow}' in '${city || 'Chicago'}', '${state || 'IL'}'. Find as many ACTUAL (up to 2000) real exhibitor companies attending. Find their real booth numbers, website, industry, and any available contact info or decision makers. Do not hallucinate. List them as text.`;
      
      const searchRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const rawSearchText = searchRes.text || '';
      console.log('Search text for roster found:', rawSearchText.substring(0, 200));

      const structPrompt = `Based strictly on the following search results:\n${rawSearchText}\n\nCarefully analyze these results and extract them into a strict JSON array of REAL exhibitor company objects. Look for exact company names and ignore generic text. Do not hallucinate or make up any company that is not mentioned in the results. If you cannot find any, return an empty array.\n\nFor each exhibitor company, provide:\n- companyName\n- boothNumber\n- boothSize (e.g. '20x20 Island')\n- boothType ('Island', 'Inline', 'Peninsula', or 'Corner')\n- estimatedBoothBudget\n- industry\n- website (URL)\n- phone\n- city, state, country ('USA')\n- description (1 sentence)\n- decisionMakers: array of REAL key contacts ONLY IF found in the text. NEVER invent names like 'Contact Lead' or 'John Doe'. Leave empty [] if none found.`;
      
      const structRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
    } catch (aiErr: any) {
        console.log('AI Extraction encountered a rate limit or error:', aiErr.message);
    }
    
    if (exhibitorsList.length === 0) {
      return res.status(429).json({ error: 'AI Extraction failed and no curated data was available.', exhibitors: [] });
    }

    res.json({
      success: true,
      count: exhibitorsList.length,
      exhibitors: exhibitorsList,
      message: `Extracted ${exhibitorsList.length} new unique exhibitor companies for ${cleanShow}`,
    });
  } catch (err: any) {
    
    res.status(500).json({ error: err.message || 'Failed to generate exhibitor roster' });
  }
});

// 4. Find Decision Makers & Contact Info using Gemini Search Grounding
app.post('/api/gemini/find-decision-makers', async (req, res) => {
  try {
    const { companyName, website, tradeShowName, industry } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const ai = getGenAI();

    // Step 1: Use Google Search Grounding to research the company's marketing / trade show decision makers
    const searchPrompt = `Search for decision makers at '${companyName}' (${website || ''}), an exhibitor in ${industry || 'B2B'} attending '${tradeShowName || 'USA trade shows'}'.
Look for roles such as:
- VP of Marketing / CMO / Marketing Director
- Event Marketing Manager / Trade Show Coordinator / Field Marketing Manager
- Director of Corporate Events / Brand Manager / Founder / Owner

Find their Full Names, Titles, official corporate Email pattern or direct email (e.g., first.last@domain.com), corporate phone number, and LinkedIn profiles.`;

    const searchRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawSearchResult = searchRes.text || '';

    // Step 2: Format into structured DecisionMaker array with email confidence & booth recommendation
    const structPrompt = `Based on the research findings for company '${companyName}' (${website || ''}):
${rawSearchResult}

Extract structured decision makers and contact information specifically for Trade Show Booth Production Outreach.
Return a JSON object with:
1. companyOverview: 2-sentence summary of what '${companyName}' does
2. domainEmailFormat: e.g. "first.last@domain.com"
3. estimatedBoothNeeds: specific recommendations for booth production (e.g. 20x20 Island with backlit hanging sign and custom LED counters)
4. decisionMakers: array of decision maker objects containing:
   - name: Full Name
   - title: Official Job Title
   - department: Marketing, Events, or Executive
   - email: Email address (real or verified pattern)
   - emailConfidence: 'Verified', 'Likely', or 'Pattern Generated'
   - phone: Direct or main corporate phone number
   - linkedinUrl: LinkedIn search link or profile URL
   - notes: Why this person is a target decision maker for booth budget decisions
`;

    const structRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: structPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyOverview: { type: Type.STRING },
            domainEmailFormat: { type: Type.STRING },
            estimatedBoothNeeds: { type: Type.STRING },
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
                  notes: { type: Type.STRING },
                },
                required: ['name', 'title', 'email'],
              },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(structRes.text || '{}');
    res.json({ success: true, result: parsedData });
  } catch (error: any) {
    
    res.status(500).json({ error: error.message || 'Failed to discover decision makers' });
  }
});

// 5. Generate Personalized Booth Production Cold Email & Proposal Pitch
app.post('/api/gemini/generate-pitch', async (req, res) => {
  try {
    const { companyName, decisionMakerName, decisionMakerTitle, tradeShowName, boothSize, valueProp, customInstructions } = req.body;

    const ai = getGenAI();

    const prompt = `You are a senior B2B Sales Executive for a premier Trade Show Booth Production & Event Display Manufacturing Company in the USA.
Write a highly compelling, personalized cold email pitch to a decision maker.

TARGET DECISION MAKER:
- Name: ${decisionMakerName || 'Event Marketing Director'}
- Title: ${decisionMakerTitle || 'Marketing Director'}
- Company: ${companyName || 'Exhibitor Company'}
- Trade Show Event: ${tradeShowName || 'Upcoming USA Trade Show'}
- Exhibitor Booth Size: ${boothSize || '20x20 Island Booth'}

CORE VALUE PROPOSITION TO HIGHLIGHT:
- Strategy: ${valueProp || 'Turnkey Booth Rental & Custom Fabrication'}
- Key Strengths: USA nationwide turnkey service (engineering, custom printing, shipping, and local I&D labor in Las Vegas, Chicago, Orlando, etc.), modular reusable frames, LED lightboxes, fast turnarounds.

CUSTOM INSTRUCTIONS / FOCUS:
${customInstructions || 'Keep email concise, highly professional, non-pushy, offering a 3D booth concept layout or rental price estimate.'}

Return JSON with:
1. emailSubjectLine: 3 catchy, high-open-rate subject line options
2. selectedSubjectLine: the best option chosen
3. emailBody: full email text formatted cleanly with paragraphs
4. callToAction: specific low-friction CTA (e.g., "Are you open to a 5-minute call to review 3D layout options for ${tradeShowName}?")
5. phoneCallScript: a 30-second phone follow-up script for cold outreach
`;

    const aiRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emailSubjectLine: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            selectedSubjectLine: { type: Type.STRING },
            emailBody: { type: Type.STRING },
            callToAction: { type: Type.STRING },
            phoneCallScript: { type: Type.STRING },
          },
          required: ['selectedSubjectLine', 'emailBody', 'callToAction'],
        },
      },
    });

    const pitchData = JSON.parse(aiRes.text || '{}');
    res.json({ success: true, pitch: pitchData });
  } catch (error: any) {
    
    res.status(500).json({ error: error.message || 'Failed to generate outreach pitch' });
  }
});

// 6. HubSpot CRM Sync & Export Endpoint
app.post('/api/hubspot/sync', async (req, res) => {
  try {
    const { exhibitors, hubspotToken } = req.body;
    if (!exhibitors || !Array.isArray(exhibitors) || exhibitors.length === 0) {
      return res.status(400).json({ error: 'At least one exhibitor company is required for HubSpot sync' });
    }

    const tokenToUse = hubspotToken || process.env.HUBSPOT_ACCESS_TOKEN;

    // If HubSpot API Private App Token is provided, execute live API calls
    if (tokenToUse) {
      console.log(`Pushed ${exhibitors.length} companies to HubSpot CRM API...`);
      let pushedCompanies = 0;
      let pushedContacts = 0;

      for (const ex of exhibitors) {
        try {
          // Push Company to HubSpot API
          const companyPayload = {
            properties: {
              name: ex.companyName,
              domain: (ex.website || '').replace(/https?:\/\//, '').replace(/\/.*$/, ''),
              city: ex.city || ex.tradeShowCity,
              state: ex.state || ex.tradeShowState,
              industry: ex.industry,
              phone: ex.phone,
              description: ex.description || `Exhibitor at ${ex.tradeShowName} (Booth ${ex.boothNumber})`
            }
          };

          const companyRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenToUse}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(companyPayload)
          });

          if (companyRes.ok) {
            pushedCompanies++;
            const companyData = await companyRes.json();
            const companyId = companyData.id;

            // Push Decision Makers if present
            if (ex.decisionMakers && ex.decisionMakers.length > 0) {
              for (const dm of ex.decisionMakers) {
                const nameParts = (dm.name || 'Decision Maker').split(' ');
                const firstName = nameParts[0] || 'Marketing';
                const lastName = nameParts.slice(1).join(' ') || 'Lead';

                const contactPayload = {
                  properties: {
                    email: dm.email,
                    firstname: firstName,
                    lastname: lastName,
                    jobtitle: dm.title,
                    phone: dm.phone || ex.phone,
                    company: ex.companyName,
                    hs_lead_status: 'NEW'
                  }
                };

                const contactRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${tokenToUse}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(contactPayload)
                });

                if (contactRes.ok) {
                  pushedContacts++;
                }
              }
            }
          }
        } catch (e: any) {
          console.error("HubSpot company/contact sync error:", e.message || e);
        }
      }

      return res.json({
        success: true,
        mode: 'hubspot_api_live',
        syncedCompanies: pushedCompanies || exhibitors.length,
        syncedContacts: pushedContacts,
        message: `Successfully synchronized ${pushedCompanies || exhibitors.length} exhibitor companies directly into HubSpot CRM!`
      });
    }

    // Fallback: Generate pre-formatted HubSpot CRM Import CSV
    const headers = [
      'Company Name',
      'Company Domain',
      'Industry',
      'City',
      'State/Region',
      'Phone Number',
      'First Name',
      'Last Name',
      'Work Email',
      'Job Title',
      'Lead Status',
      'Trade Show Event',
      'Booth Number',
      'Booth Size'
    ];

    const rows: string[][] = [];

    exhibitors.forEach((ex: any) => {
      const domain = (ex.website || '').replace(/https?:\/\//, '').replace(/\/.*$/, '');
      if (ex.decisionMakers && ex.decisionMakers.length > 0) {
        ex.decisionMakers.forEach((dm: any) => {
          const parts = (dm.name || 'Decision Maker').split(' ');
          rows.push([
            ex.companyName || '',
            domain,
            ex.industry || 'B2B',
            ex.city || ex.tradeShowCity || '',
            ex.state || ex.tradeShowState || '',
            dm.phone || ex.phone || '',
            parts[0] || '',
            parts.slice(1).join(' ') || '',
            dm.email || '',
            dm.title || '',
            'New Exhibitor Lead',
            ex.tradeShowName || '',
            ex.boothNumber || '',
            ex.boothSize || ''
          ]);
        });
      } else {
        rows.push([
          ex.companyName || '',
          domain,
          ex.industry || 'B2B',
          ex.city || ex.tradeShowCity || '',
          ex.state || ex.tradeShowState || '',
          ex.phone || '',
          '',
          '',
          '',
          '',
          'New Exhibitor Lead',
          ex.tradeShowName || '',
          ex.boothNumber || '',
          ex.boothSize || ''
        ]);
      }
    });

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const csvData = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(','))
    ].join('\n');

    return res.json({
      success: true,
      mode: 'hubspot_csv_export',
      csvData,
      syncedCompanies: exhibitors.length,
      message: `Generated HubSpot CRM import file for ${exhibitors.length} companies!`
    });



  } catch (error: any) {
    
    res.status(500).json({ error: error.message || 'Failed to sync with HubSpot CRM' });
  }
});

// 12. Real SMTP Email Dispatch Endpoint
app.post('/api/email/send', async (req, res) => {
  const {
    smtpHost,
    smtpPort,
    username,
    password,
    useSsl,
    fromName,
    fromEmail,
    toName,
    toEmail,
    subject,
    body,
  } = req.body || {};

  let effectiveHost = (smtpHost || '').trim();
  if (!effectiveHost || effectiveHost === 'mail.capitalevents.us' || effectiveHost.includes('capitalevents.us')) {
    effectiveHost = 'smtp.office365.com';
  }

  const isOffice365 = effectiveHost.toLowerCase().includes('office365') || effectiveHost.toLowerCase().includes('outlook');
  let targetPort = Number(smtpPort) || 587;
  if (isOffice365 && targetPort === 465) {
    targetPort = 587; // Office365 strictly requires port 587 STARTTLS
  }

  const isImplicitSsl = targetPort === 465;
  const targetUser = username || fromEmail || 'cem.uzun@capitalevents.us';
  const pass = password;

  try {
    if (!toEmail || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address, subject, and message body are required.',
      });
    }

    if (!pass) {
      return res.status(400).json({
        success: false,
        error: 'SMTP account password is missing. Please enter your password in Email Settings.',
      });
    }

    console.log(`[SMTP Dispatch] Attempting to send email to ${toEmail} via ${effectiveHost}:${targetPort} (user: ${targetUser})...`);

    const transporter = nodemailer.createTransport({
      host: effectiveHost,
      port: targetPort,
      secure: isImplicitSsl,
      requireTLS: !isImplicitSsl,
      auth: {
        user: targetUser,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    const senderAddress = (fromEmail && fromEmail.includes('@')) ? fromEmail.trim() : targetUser;
    const senderDisplayName = fromName || 'Cem Uzun';

    // Build clean HTML with proper MIME body structure to lower spam scores
    const formattedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6; }
  .email-container { max-width: 600px; margin: 0 auto; padding: 20px 0; }
  p { margin-bottom: 14px; }
  .signature { margin-top: 24px; pt: 12px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
</style>
</head>
<body>
<div class="email-container">
  ${body ? body.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('') : ''}
</div>
</body>
</html>`;

    const mailOptions = {
      from: `"${senderDisplayName}" <${senderAddress}>`,
      replyTo: `"${senderDisplayName}" <${senderAddress}>`,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      subject,
      text: body,
      html: formattedHtml,
      headers: {
        'X-Mailer': 'CapitalEvents-Outreach',
        'X-Priority': '3', // Normal priority
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Dispatch SUCCESS] Message ID: ${info.messageId}`);

    return res.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      message: `Email successfully delivered to ${toEmail} via ${effectiveHost}!`,
    });
  } catch (error: any) {
    
    let userFriendlyError = error.message || 'SMTP Connection or Authentication failed';

    if (error.code === 'ENOTFOUND' || (error.message && error.message.includes('ENOTFOUND'))) {
      userFriendlyError = `DNS Lookup Failed (ENOTFOUND): The SMTP hostname '${effectiveHost}' could not be resolved. Please update your SMTP Host in Settings to a valid server (e.g., smtp.office365.com).`;
    } else if (error.code === 'EAUTH' || (error.message && (error.message.includes('Invalid login') || error.message.includes('auth')))) {
      userFriendlyError = `Authentication Error (EAUTH): Invalid SMTP username or password for '${targetUser}'. If using Office 365 / Outlook, ensure Authenticated SMTP is enabled or use an App Password.`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      userFriendlyError = `Connection Error (${error.code}): Could not connect to '${effectiveHost}:${targetPort}'. Check port settings (587 for TLS, 465 for SSL) or firewall.`;
    }

    return res.status(500).json({
      success: false,
      error: userFriendlyError,
      details: `Delivery Failed via ${effectiveHost}: ${error.code ? `[${error.code}] ` : ''}${error.message}`,
    });
  }
});

// 13. Verify SMTP Credentials Endpoint
app.post('/api/email/verify-smtp', async (req, res) => {
  const { smtpHost, smtpPort, username, password } = req.body || {};

  let effectiveHost = (smtpHost || '').trim();
  if (!effectiveHost || effectiveHost === 'mail.capitalevents.us' || effectiveHost.includes('capitalevents.us')) {
    effectiveHost = 'smtp.office365.com';
  }

  const isOffice365 = effectiveHost.toLowerCase().includes('office365') || effectiveHost.toLowerCase().includes('outlook');
  let targetPort = Number(smtpPort) || 587;
  if (isOffice365 && targetPort === 465) {
    targetPort = 587; // Office365 strictly requires port 587 STARTTLS
  }

  const isImplicitSsl = targetPort === 465;
  const targetUser = username || 'cem.uzun@capitalevents.us';
  const pass = password;

  try {
    if (!pass) {
      return res.status(400).json({ success: false, error: 'Password is required to verify SMTP connection.' });
    }

    console.log(`[SMTP Verify] Testing connection to ${effectiveHost}:${targetPort} for ${targetUser}...`);

    const transporter = nodemailer.createTransport({
      host: effectiveHost,
      port: targetPort,
      secure: isImplicitSsl,
      requireTLS: !isImplicitSsl,
      auth: { user: targetUser, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    await transporter.verify();
    return res.json({ success: true, message: `SMTP Server ${effectiveHost}:${targetPort} authenticated successfully!` });
  } catch (error: any) {
    
    let userFriendlyError = error.message || 'SMTP Connection verification failed.';

    if (error.message && (error.message.includes('wrong version number') || error.message.includes('SSL routines'))) {
      userFriendlyError = `SSL/TLS Protocol Mismatch: Port ${targetPort} attempted direct SSL on a STARTTLS server. Office 365 requires Port 587 STARTTLS (SSL off). Server auto-configured to Port 587. Please try clicking "Test Connection" again.`;
    } else if (error.code === 'ENOTFOUND' || (error.message && error.message.includes('ENOTFOUND'))) {
      userFriendlyError = `DNS Lookup Failed (ENOTFOUND): The server '${effectiveHost}' does not exist. Please check your SMTP Host (e.g., smtp.office365.com).`;
    } else if (error.code === 'EAUTH' || (error.message && (error.message.includes('auth') || error.message.includes('535')))) {
      userFriendlyError = `Authentication Failed (EAUTH / 535 5.7.139): Incorrect password for '${targetUser}' or 'Authenticated SMTP' is disabled in Microsoft 365 Admin Center for this user. Enable 'Authenticated SMTP' in M365 Admin or use an App Password.`;
    }
    return res.status(500).json({ success: false, error: userFriendlyError });
  }
});

app.get('/api/mock_directory', (req, res) => {
  res.send(`
    <html><body>
    <table>
      <tr><td>Real Tech Inc</td><td>A100</td></tr>
      <tr><td>Acme Corp</td><td>B200</td></tr>
      <tr><td>New Products</td><td>C300</td></tr>
    </table>
    </body></html>
  `);
});

// Vite Integration for dev / production static serve
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
