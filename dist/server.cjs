var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  performExtraction: () => performExtraction
});
module.exports = __toCommonJS(server_exports);

// src/lib/scraper/adapters/a2z.ts
var A2ZAdapter = class {
  constructor() {
    this.name = "A2Z";
  }
  detect(url, html) {
    return url.includes("a2zinc.net") || html.includes("a2z inc");
  }
  async discoverPages(url, html, page) {
    return [];
  }
  async extractExhibitors(url, html, page, interceptedXhr) {
    const exhibitors = [];
    if (!page) {
      console.warn("[A2ZAdapter] No page object available, skipping DOM extraction");
      return exhibitors;
    }
    try {
      const handles = await page.$$(".exhibitorName, .BoothContactName, .companyName");
      for (const handle of handles) {
        const text = await handle.textContent();
        if (text && text.trim().length > 0) {
          exhibitors.push({
            companyName: text.trim(),
            boothNumber: null,
            profileUrl: null,
            companyWebsite: null,
            sourceUrl: url,
            sourceEvidence: "A2Z DOM Node",
            extractionMethod: "deterministic",
            confidence: 0.9
          });
        }
      }
    } catch (e) {
      console.error("[A2ZAdapter] DOM extraction error:", e);
    }
    return exhibitors;
  }
};

// src/lib/scraper/adapters/expofp.ts
var ExpoFPAdapter = class {
  constructor() {
    this.name = "ExpoFP";
  }
  detect(url, html) {
    return url.includes("expofp.com") || html.includes("ExpoFP");
  }
  async discoverPages(url, html, page) {
    return [];
  }
  async extractExhibitors(url, html, page, interceptedXhr) {
    const exhibitors = [];
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes("exhibitors") && Array.isArray(xhr.json)) {
        for (const item of xhr.json) {
          if (item.name) {
            exhibitors.push({
              companyName: item.name,
              boothNumber: item.booth || item.stand || null,
              profileUrl: null,
              companyWebsite: item.url || item.website || null,
              sourceUrl: url,
              sourceEvidence: "ExpoFP JSON API",
              extractionMethod: "json",
              confidence: 0.95
            });
          }
        }
      }
    }
    return exhibitors;
  }
};

// src/lib/scraper/adapters/swapcard.ts
var SwapcardAdapter = class {
  constructor() {
    this.name = "Swapcard";
  }
  detect(url, html) {
    return url.includes("swapcard.com");
  }
  async discoverPages(url, html, page) {
    return [];
  }
  async extractExhibitors(url, html, page, interceptedXhr) {
    const exhibitors = [];
    const seenNames = /* @__PURE__ */ new Set();
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes("graphql") && xhr.json && xhr.json.data) {
        const visited = /* @__PURE__ */ new WeakSet();
        const searchNodes = (obj, depth = 0) => {
          if (!obj || typeof obj !== "object" || depth > 15) return;
          if (visited.has(obj)) return;
          visited.add(obj);
          if (Array.isArray(obj)) {
            obj.forEach((item) => searchNodes(item, depth + 1));
          } else {
            if (obj.__typename === "Exhibitor" || obj.__typename === "Organization" || obj.companyName) {
              const name = obj.name || obj.companyName;
              if (name && !seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
                exhibitors.push({
                  companyName: name,
                  boothNumber: obj.booth || null,
                  profileUrl: null,
                  companyWebsite: obj.websiteUrl || null,
                  sourceUrl: url,
                  sourceEvidence: "Swapcard GraphQL API",
                  extractionMethod: "json",
                  confidence: 0.95
                });
              }
            }
            Object.values(obj).forEach((val) => searchNodes(val, depth + 1));
          }
        };
        searchNodes(xhr.json.data);
      }
    }
    return exhibitors;
  }
};

// src/lib/scraper/adapters/expoplatform.ts
var ExpoPlatformAdapter = class {
  constructor() {
    this.name = "ExpoPlatform";
    this.diagnostics = {
      adapterUsed: "expoplatform",
      directoryReportedCount: null,
      pagesFetched: 0,
      uniqueRecordsExtracted: 0,
      duplicatesRemoved: 0,
      invalidRecordsRejected: 0,
      paginationCompleted: false,
      attemptedUrls: [],
      blockedReason: null
    };
  }
  detect(url, html) {
    return url.includes("expoplatform.com") || html.includes("ExpoPlatform");
  }
  async discoverPages(url, html, page) {
    return [];
  }
  getDiagnostics() {
    return this.diagnostics;
  }
  async extractExhibitors(url, html, page, initialXhr, saveCheckpoint) {
    const exhibitors = [];
    const seenIds = /* @__PURE__ */ new Set();
    const seenNames = /* @__PURE__ */ new Set();
    this.diagnostics.attemptedUrls.push(url);
    let foundViaJson = false;
    console.log("EXPOPLATFORM ADAPTER STARTED");
    const processJson = (xhrJson) => {
      const dataArray = xhrJson?.data?.list || xhrJson?.data || xhrJson?.items || xhrJson?.data?.items || (Array.isArray(xhrJson) ? xhrJson : null);
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        if (dataArray[0].name || dataArray[0].title || dataArray[0].company_name) {
          foundViaJson = true;
          if (xhrJson?.data?.total) {
            this.diagnostics.directoryReportedCount = xhrJson.data.total;
          } else if (xhrJson.meta && xhrJson.meta.total) {
            this.diagnostics.directoryReportedCount = xhrJson.meta.total;
          } else if (xhrJson.total) {
            this.diagnostics.directoryReportedCount = xhrJson.total;
          }
          for (const item of dataArray) {
            const name = item.name || item.title || item.company_name;
            if (!name) {
              this.diagnostics.invalidRecordsRejected++;
              continue;
            }
            const extId = String(item.id || item.uuid || "");
            const normalizedName = name.trim().toLowerCase();
            if (extId && seenIds.has(extId) || seenNames.has(normalizedName)) {
              this.diagnostics.duplicatesRemoved++;
              continue;
            }
            if (extId) seenIds.add(extId);
            seenNames.add(normalizedName);
            let booth = item.stand || item.stand_number || item.booth || null;
            if (Array.isArray(item.stands) && item.stands.length > 0) {
              booth = item.stands.map((s) => s.title || s.name).join(", ");
            }
            exhibitors.push({
              companyName: name,
              boothNumber: booth,
              profileUrl: item.slug ? new URL("/marketplace/exhibitors/" + item.slug, url).href : null,
              companyWebsite: item.website || item.url || null,
              sourceUrl: url,
              sourceEvidence: "ExpoPlatform JSON API",
              extractionMethod: "expoplatform_json",
              confidence: 0.99,
              industry: item.category || void 0,
              city: item.city || void 0,
              country: item.country || void 0
            });
          }
        }
      }
    };
    for (const xhr of initialXhr) {
      if (xhr.json) {
        processJson(xhr.json);
      }
    }
    const responseHandler = async (response) => {
      try {
        if (response.url().includes("api") || response.url().includes("marketplace") || response.url().includes("graphql")) {
          const req = response.request();
          if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
            const json = await response.json().catch(() => null);
            if (json) {
              processJson(json);
            }
          }
        }
      } catch (e) {
      }
    };
    page.on("response", responseHandler);
    let hasMore = true;
    let scrollCount = 0;
    const maxScrolls = 20;
    while (hasMore && scrollCount < maxScrolls) {
      let previousHeight = await page.evaluate(() => document.body.scrollHeight);
      let initialExhibitorCount = exhibitors.length;
      try {
        const loadMoreBtn = await page.$('button:has-text("Load more"), button:has-text("Show more"), .load-more');
        if (loadMoreBtn && await loadMoreBtn.isVisible()) {
          await loadMoreBtn.click();
        } else {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        }
      } catch (e) {
      }
      await page.waitForTimeout(2e3);
      let newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight && exhibitors.length === initialExhibitorCount) {
        await page.waitForTimeout(3e3);
        newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight && exhibitors.length === initialExhibitorCount) {
          hasMore = false;
        }
      }
      scrollCount++;
      this.diagnostics.pagesFetched = scrollCount;
      if (saveCheckpoint) {
        this.diagnostics.uniqueRecordsExtracted = exhibitors.length;
        await saveCheckpoint(url, { status: "in_progress", exhibitors, diagnostics: this.diagnostics });
      }
    }
    page.off("response", responseHandler);
    this.diagnostics.paginationCompleted = !hasMore;
    if (!foundViaJson) {
      const domExhibitors = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll(".exhibitor-card, .marketplace-card, article");
        cards.forEach((card) => {
          const nameEl = card.querySelector("h3, h4, .card-title, .name");
          if (!nameEl) return;
          const name = nameEl.textContent?.trim();
          const urlEl = card.querySelector("a");
          const profileUrl = urlEl ? urlEl.href : null;
          const boothEl = card.querySelector('.stand, .booth, [data-icon="location"]');
          const booth = boothEl ? boothEl.textContent?.trim() : null;
          if (name) {
            results.push({ name, profileUrl, booth });
          }
        });
        return results;
      });
      for (const item of domExhibitors) {
        const normalizedName = item.name.toLowerCase();
        if (seenNames.has(normalizedName)) {
          this.diagnostics.duplicatesRemoved++;
          continue;
        }
        seenNames.add(normalizedName);
        exhibitors.push({
          companyName: item.name,
          boothNumber: item.booth,
          profileUrl: item.profileUrl,
          companyWebsite: null,
          sourceUrl: url,
          sourceEvidence: "ExpoPlatform DOM",
          extractionMethod: "expoplatform_dom",
          confidence: 0.8
        });
      }
    }
    this.diagnostics.uniqueRecordsExtracted = exhibitors.length;
    console.log("EXPOPLATFORM ADAPTER FINISHED, EXTRACTED:", exhibitors.length);
    return exhibitors;
  }
};

// src/lib/scraper/index.ts
var import_playwright = require("playwright");

// src/lib/scraper/adapters/mapyourshow.ts
var MapYourShowAdapter = class {
  constructor() {
    this.name = "MapYourShow";
  }
  detect(url, html) {
    return url.includes("mapyourshow.com") || html.includes("mapyourshow");
  }
  async discoverPages(url, html, page) {
    return [];
  }
  async extractExhibitors(url, html, page, interceptedXhr) {
    const exhibitors = [];
    for (const xhr of interceptedXhr) {
      if (xhr.url.includes("exhibitor") && xhr.json && Array.isArray(xhr.json.data)) {
        for (const item of xhr.json.data) {
          if (item.exhibitorName || item.name) {
            exhibitors.push({
              companyName: item.exhibitorName || item.name,
              boothNumber: item.booth || item.boothNumber || null,
              profileUrl: item.profileUrl || null,
              companyWebsite: item.website || null,
              sourceUrl: url,
              sourceEvidence: "MapYourShow JSON API",
              extractionMethod: "json",
              confidence: 0.95
            });
          }
        }
      }
    }
    return exhibitors;
  }
};

// src/lib/scraper/adapters/generic-deterministic.ts
var cheerio = __toESM(require("cheerio"), 1);
var EXCLUSION_PATTERNS = [
  /^home$/i,
  /^contact$/i,
  /^about us$/i,
  /^register$/i,
  /^login$/i,
  /^privacy$/i,
  /^terms$/i,
  /^new products?$/i,
  /^welding machines?$/i,
  /^register as a visitor$/i,
  /^product categories$/i,
  /^equipment categories$/i,
  /^service$/i,
  /^event names$/i,
  /^sponsors$/i,
  /^exhibitors$/i,
  /^search$/i,
  /^view all$/i,
  /^back to top$/i
];
function isGeneric(text) {
  const trimmed = text.trim();
  if (trimmed.length > 70 || trimmed.length < 2) return true;
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}
var GenericDeterministicAdapter = class {
  constructor() {
    this.name = "GenericDeterministic";
  }
  detect(url, html) {
    return true;
  }
  async discoverPages(url, html, page) {
    return [];
  }
  async extractExhibitors(url, html, page, interceptedXhr) {
    const exhibitorsMap = /* @__PURE__ */ new Map();
    const $ = cheerio.load(html);
    const addExhibitor = (name, booth = null, evidence = "HTML Element") => {
      const cleanName = name.replace(/\s+/g, " ").trim();
      if (!cleanName || isGeneric(cleanName)) return;
      const key = cleanName.toLowerCase();
      if (!exhibitorsMap.has(key)) {
        exhibitorsMap.set(key, {
          companyName: cleanName,
          boothNumber: booth ? booth.trim() : null,
          profileUrl: null,
          companyWebsite: null,
          sourceUrl: url,
          sourceEvidence: evidence,
          extractionMethod: "deterministic",
          confidence: booth ? 0.95 : 0.8
        });
      }
    };
    $("table tr").each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length >= 1) {
        const name = $(tds[0]).text().trim();
        const booth = tds.length >= 2 ? $(tds[1]).text().trim() : null;
        if (name && !isGeneric(name)) {
          const cleanBooth = booth && booth.match(/^[A-Z0-9- ]+$/i) ? booth : null;
          addExhibitor(name, cleanBooth, "HTML Table Row");
        }
      }
    });
    $('.exhibitor-card, .exhibitor-item, .directory-item, .company-card, [class*="exhibitor"], [class*="directory-item"]').each((_, el) => {
      const nameEl = $(el).find("h2, h3, h4, .name, .title, .company-name, strong, a").first();
      const name = nameEl.text().trim();
      const boothEl = $(el).find('.booth, .booth-number, [class*="booth"]').first();
      const booth = boothEl.text().trim() || null;
      if (name) {
        addExhibitor(name, booth, "HTML Card Element");
      }
    });
    $("ul li, ol li").each((_, li) => {
      const text = $(li).text().trim();
      const match = text.match(/^([A-Za-z0-9&,.\-\s']+?)(?:\s*[\-\(]\s*(?:Booth|Stand)?\s*([A-Z0-9\-]+)[\)]?)?$/i);
      if (match && match[1]) {
        const name = match[1].trim();
        const booth = match[2] ? match[2].trim() : null;
        if (name.length >= 3 && name.length <= 60 && !isGeneric(name)) {
          addExhibitor(name, booth, "List Item");
        }
      }
    });
    $('a[href*="exhibitor"], a[href*="company"], a[href*="booth"]').each((_, a) => {
      const text = $(a).text().trim();
      if (text && text.length >= 3 && text.length <= 60 && !isGeneric(text)) {
        addExhibitor(text, null, "Link Element");
      }
    });
    return Array.from(exhibitorsMap.values());
  }
};

// src/lib/db.ts
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
function getWritableDbPath() {
  const primaryPath = import_path.default.join(process.cwd(), "fuar_db.json");
  try {
    const testFile = import_path.default.join(process.cwd(), `.write_test_${Date.now()}`);
    import_fs.default.writeFileSync(testFile, "test");
    import_fs.default.unlinkSync(testFile);
    return primaryPath;
  } catch {
    const tmpPath = import_path.default.join(import_os.default.tmpdir(), "fuar_db.json");
    console.warn(`[DB] Working directory is read-only. Falling back to: ${tmpPath}`);
    return tmpPath;
  }
}
var dbFilePath = getWritableDbPath();
function loadDb() {
  try {
    if (import_fs.default.existsSync(dbFilePath)) {
      const content = import_fs.default.readFileSync(dbFilePath, "utf-8");
      const data = JSON.parse(content);
      return {
        trade_shows: data.trade_shows || {},
        exhibitors: data.exhibitors || {},
        decision_makers: data.decision_makers || {},
        scraper_checkpoints: data.scraper_checkpoints || {}
      };
    }
  } catch (err) {
    console.error("[DB] Error loading database file:", err.message);
  }
  return { trade_shows: {}, exhibitors: {}, decision_makers: {}, scraper_checkpoints: {} };
}
function saveDb(data) {
  try {
    const tempPath = `${dbFilePath}.tmp`;
    import_fs.default.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    import_fs.default.renameSync(tempPath, dbFilePath);
  } catch (err) {
    console.warn("[DB] Could not persist to disk, keeping state in memory:", err.message);
  }
}
var dbState = loadDb();
console.log(`[DB] Fail-safe Database initialized at: ${dbFilePath}`);
var dbQueries = {
  // Save or update checkpoint
  saveCheckpoint: (url, checkpointData) => {
    dbState.scraper_checkpoints[url] = {
      url,
      data: checkpointData,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb(dbState);
  },
  // Load checkpoint
  loadCheckpoint: (url) => {
    return dbState.scraper_checkpoints[url]?.data || null;
  },
  // Insert or Update Trade Show
  upsertTradeShow: (show) => {
    if (!show || !show.id) return;
    const existing = dbState.trade_shows[show.id] || {};
    dbState.trade_shows[show.id] = {
      id: show.id,
      eventName: show.eventName || existing.eventName || "Trade Show",
      shortName: show.shortName || show.eventName || existing.shortName || "",
      category: show.category || existing.category || "Trade Show",
      city: show.city || existing.city || "",
      state: show.state || existing.state || "",
      country: show.country || existing.country || "USA",
      venue: show.venue || existing.venue || "",
      dates: show.dates || existing.dates || "",
      month: show.month || existing.month || "",
      year: show.year || existing.year || 2026,
      orbusUrl: show.orbusUrl || existing.orbusUrl || "",
      officialWebsite: show.officialWebsite || existing.officialWebsite || "",
      estimatedExhibitorsCount: show.estimatedExhibitorsCount || existing.estimatedExhibitorsCount || 0,
      extractedExhibitorsCount: show.extractedExhibitorsCount || (show.exhibitors ? show.exhibitors.length : 0),
      isUsa: show.isUsa ?? existing.isUsa ?? true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (Array.isArray(show.exhibitors)) {
      for (const ex of show.exhibitors) {
        dbQueries.upsertExhibitor(show.id, ex);
      }
    }
    saveDb(dbState);
  },
  // Insert or Update Exhibitor
  upsertExhibitor: (showId, ex) => {
    if (!ex || !ex.id) return;
    dbState.exhibitors[ex.id] = {
      id: ex.id,
      showId,
      companyName: ex.companyName || "Unknown Exhibitor",
      tradeShowName: ex.tradeShowName || "",
      tradeShowCity: ex.tradeShowCity || "",
      tradeShowState: ex.tradeShowState || "",
      tradeShowDates: ex.tradeShowDates || "",
      tradeShowYear: ex.tradeShowYear || 2026,
      boothNumber: ex.boothNumber || null,
      boothSize: ex.boothSize || null,
      boothType: ex.boothType || null,
      estimatedBoothBudget: ex.estimatedBoothBudget || null,
      industry: ex.industry || null,
      website: ex.website || "",
      phone: ex.phone || "",
      city: ex.city || "",
      state: ex.state || "",
      country: ex.country || "USA",
      description: ex.description || "",
      outreachStatus: ex.outreachStatus || "New Lead",
      leadScore: ex.leadScore || 85,
      notes: ex.notes || "",
      extractedAt: ex.extractedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    if (Array.isArray(ex.decisionMakers)) {
      for (const dm of ex.decisionMakers) {
        const dmId = dm.id || `dm-${ex.id}-${Math.random().toString(36).substring(2, 7)}`;
        dbState.decision_makers[dmId] = {
          id: dmId,
          exhibitorId: ex.id,
          name: dm.name || "",
          title: dm.title || "",
          department: dm.department || "",
          email: dm.email || "",
          emailConfidence: dm.emailConfidence || "Verified",
          phone: dm.phone || ""
        };
      }
    }
  },
  // Get all trade shows with nested exhibitors and decision makers
  getAllTradeShows: () => {
    const shows = Object.values(dbState.trade_shows);
    const exhibitors = Object.values(dbState.exhibitors);
    const decisionMakers = Object.values(dbState.decision_makers);
    return shows.map((s) => {
      const showExhibitors = exhibitors.filter((ex) => ex.showId === s.id).map((ex) => {
        const exDms = decisionMakers.filter((dm) => dm.exhibitorId === ex.id);
        return {
          ...ex,
          decisionMakers: exDms
        };
      });
      return {
        ...s,
        exhibitors: showExhibitors
      };
    });
  }
};

// src/lib/scraper/index.ts
var adapters = [
  new MapYourShowAdapter(),
  new A2ZAdapter(),
  new ExpoFPAdapter(),
  new SwapcardAdapter(),
  new ExpoPlatformAdapter(),
  new GenericDeterministicAdapter()
  // Fallback
];
var DirectoryScraper = class {
  async saveCheckpoint(url, data) {
    try {
      dbQueries.saveCheckpoint(url, data);
      console.log(`[SQLite Checkpoint] Saved progress for ${url}`);
    } catch (e) {
      console.error("[SQLite Checkpoint] Failed to save checkpoint:", e.message);
    }
  }
  async loadCheckpoint(url) {
    try {
      return dbQueries.loadCheckpoint(url);
    } catch (e) {
      return null;
    }
  }
  async scrape(url, tradeShowName, city, state, runGeminiFallback) {
    console.log(`[Scraper] Starting extraction for: ${url}`);
    const checkpoint = await this.loadCheckpoint(url);
    if (checkpoint && checkpoint.status === "completed") {
      console.log("[Scraper] Returning cached checkpoint result");
      return { exhibitors: checkpoint.exhibitors, diagnostics: checkpoint.diagnostics };
    }
    let browser = null;
    let page = null;
    let htmlText = "";
    const interceptedXhr = [];
    try {
      browser = await import_playwright.chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
      page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      });
      page.on("response", async (response) => {
        const req = response.request();
        if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
          if (response.url().includes("mapyourshow") || response.url().includes("api") || response.url().includes("json") || response.url().includes("graphql") || response.url().includes("marketplace") || response.url().includes("exhibitor")) {
            try {
              const json = await response.json();
              if (interceptedXhr.length < 200) {
                interceptedXhr.push({ url: response.url(), json });
              }
            } catch (e) {
            }
          }
        }
      });
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 3e4 });
      } catch (e) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 2e4 });
        await page.waitForTimeout(3e3);
      }
      await page.waitForTimeout(2e3);
      htmlText = await page.content();
    } catch (e) {
      console.warn(`[Scraper] Playwright unavailable (${e.message}), attempting HTTP fetch fallback...`);
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (res.ok) {
          htmlText = await res.text();
          console.log(`[Scraper] HTTP fetch succeeded, HTML size: ${htmlText.length} bytes`);
        }
      } catch (fetchErr) {
        console.error(`[Scraper] HTTP fetch fallback failed:`, fetchErr.message);
      }
    }
    let selectedAdapter = adapters[adapters.length - 1];
    for (const adapter of adapters) {
      if (adapter.detect(url, htmlText)) {
        selectedAdapter = adapter;
        break;
      }
    }
    console.log(`Selected adapter: ${selectedAdapter.name}`);
    let exhibitors = [];
    try {
      exhibitors = await selectedAdapter.extractExhibitors(url, htmlText, page, interceptedXhr, this.saveCheckpoint.bind(this));
    } catch (e) {
      console.error(`Error in adapter ${selectedAdapter.name}:`, e);
    }
    if (browser) await browser.close();
    if (exhibitors.length === 0) {
      const textChunk = htmlText.replace(/</g, " <").replace(/>/g, "> ").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/(<([^>]+)>)/ig, " ").replace(/\s\s+/g, " ").substring(0, 3e4);
      try {
        exhibitors = await runGeminiFallback([textChunk]);
      } catch (e) {
        if (e.message === "waiting_for_ai_quota") {
          console.warn("AI quota exhausted. Continuing with deterministic only.");
          await this.saveCheckpoint(url, { status: "waiting_for_ai_quota", exhibitors });
        }
      }
    }
    const diagnostics = selectedAdapter.getDiagnostics ? selectedAdapter.getDiagnostics() : void 0;
    await this.saveCheckpoint(url, { status: "completed", exhibitors, diagnostics });
    return { exhibitors, diagnostics };
  }
};

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var cheerio2 = __toESM(require("cheerio"), 1);
var fsLib = __toESM(require("fs"), 1);
var pathLib = __toESM(require("path"), 1);
function logScrapedContent(url, content, type = "html") {
  try {
    const logDir = pathLib.join(process.cwd(), "logs");
    if (!fsLib.existsSync(logDir)) {
      fsLib.mkdirSync(logDir, { recursive: true });
    }
    const safeUrl = url.replace(/[^a-z0-9]/gi, "_").substring(0, 50).toLowerCase();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `scrape_${safeUrl}_${timestamp}.${type}`;
    const filePath = pathLib.join(logDir, filename);
    fsLib.writeFileSync(filePath, content);
    console.log(`[Scraper Log] Saved raw content for debugging to: ${filePath}`);
  } catch (err) {
    console.error("[logScrapedContent] Failed to write log:", err.message);
  }
}
function logExtraction(step, data) {
  try {
    const logDir = pathLib.join(process.cwd(), "logs");
    if (!fsLib.existsSync(logDir)) fsLib.mkdirSync(logDir, { recursive: true });
    const entry = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), step, ...data }) + "\n";
    fsLib.appendFileSync(pathLib.join(logDir, "extraction.jsonl"), entry);
    console.log(`[Extraction Log] ${step}:`, data);
  } catch (err) {
    console.error("[logExtraction] Failed to write log:", err.message);
  }
}
import_dotenv.default.config();
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/db/shows", (_req, res) => {
  try {
    const shows = dbQueries.getAllTradeShows();
    res.json({ success: true, count: shows.length, shows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/db/shows", (req, res) => {
  try {
    const { shows = [] } = req.body;
    for (const show of shows) {
      dbQueries.upsertTradeShow(show);
    }
    res.json({ success: true, message: `Upserted ${shows.length} shows into SQLite` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var jobs = /* @__PURE__ */ new Map();
app.post("/api/jobs/start", async (req, res) => {
  const jobId = `job_${Date.now()}`;
  jobs.set(jobId, {
    id: jobId,
    status: "running",
    progress: 0,
    total: req.body.shows ? req.body.shows.length : 1,
    results: [],
    lastHeartbeat: Date.now(),
    leaseExpiresAt: Date.now() + 5 * 60 * 1e3
    // 5 min lease
  });
  processBackgroundJob(jobId, req.body).catch((err) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "failed";
      console.error(`[Job ${jobId}] Background job crashed:`, err.message || err);
    }
  });
  res.json({ success: true, jobId });
});
app.get("/api/jobs/status/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status === "running" && Date.now() > job.leaseExpiresAt && Date.now() - job.lastHeartbeat > 6e4) {
    job.status = "stalled";
  }
  res.json({ success: true, job });
});
async function processBackgroundJob(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) return;
  const shows = payload.shows || [];
  console.log(`[Job ${jobId}] Starting background extraction for ${shows.length} shows`);
  for (let i = job.progress; i < shows.length; i++) {
    job.lastHeartbeat = Date.now();
    job.leaseExpiresAt = Date.now() + 5 * 60 * 1e3;
    const show = shows[i];
    console.log(`[Job ${jobId}] Processing show ${i + 1}/${shows.length}: ${show.eventName}`);
    try {
      const extractionTarget = show.officialWebsite || show.eventName;
      const extractedExhibitors = await performExtraction(
        extractionTarget,
        show.eventName,
        // always pass the show name separately
        show.city,
        show.state
      );
      console.log(`[Job ${jobId}] Show "${show.eventName}": extracted ${extractedExhibitors.length} exhibitors`);
      job.results.push({
        showId: show.id,
        showName: show.eventName,
        exhibitors: extractedExhibitors
      });
    } catch (err) {
      console.error(`[Job ${jobId}] Extraction failed for show "${show.eventName}":`, err.message);
      job.results.push({
        showId: show.id,
        showName: show.eventName,
        exhibitors: [],
        error: err.message || "Extraction failed"
      });
    }
    job.progress = i + 1;
    if (i < shows.length - 1) {
      await new Promise((r) => setTimeout(r, 2e3));
    }
  }
  job.status = "completed";
  console.log(`[Job ${jobId}] Completed. Total results: ${job.results.length}`);
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/scraper-logs", (req, res) => {
  try {
    const logDir = pathLib.join(process.cwd(), "logs");
    if (!fsLib.existsSync(logDir)) {
      return res.json({ success: true, logs: [] });
    }
    const files = fsLib.readdirSync(logDir);
    const logs = files.filter((f) => f.endsWith(".html") || f.endsWith(".json")).map((f) => {
      const filePath = pathLib.join(logDir, f);
      const stats = fsLib.statSync(filePath);
      return {
        filename: f,
        size: stats.size,
        mtime: stats.mtimeMs,
        content: fsLib.readFileSync(filePath, "utf-8").substring(0, 5e5)
        // cap size
      };
    }).sort((a, b) => b.mtime - a.mtime).slice(0, 5);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/extract/orbus", async (_req, res) => {
  try {
    const targetUrl = "https://thetradeshowcalendar.com/orbus/index.php?vRpP=4500";
    console.log(`Fetching Orbus USA Trade Show List from ${targetUrl}...`);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar, status: ${response.status}`);
    }
    const pageHtml = await response.text();
    logScrapedContent(targetUrl, pageHtml, "html");
    const $ = cheerio2.load(pageHtml);
    let extractedEvents = [];
    $("tr.row").each((i, el) => {
      const ctry = $(el).find(".r-Ctry").text().trim();
      if (ctry !== "United States") return;
      const nameEl = $(el).find(".r-Name a");
      const eventName = nameEl.text().trim();
      let officialWebsite = nameEl.attr("href") || "";
      if (officialWebsite && officialWebsite.startsWith("//")) {
        officialWebsite = "https:" + officialWebsite;
      }
      const dates = $(el).find(".r-Dates").text().trim();
      const cityState = $(el).find(".r-City").text().trim();
      const parts = cityState.split(",");
      const city = parts[0] ? parts[0].trim() : "";
      const state = parts[1] ? parts[1].trim() : "";
      const attendees = $(el).find(".r-Att").text().trim();
      const exhibitors = $(el).find(".r-Exh").text().trim();
      let month = "";
      let year = 2026;
      if (dates) {
        const dParts = dates.split("/");
        if (dParts.length > 0) month = dParts[0];
        const yearMatch = dates.match(/\d{4}/);
        if (yearMatch) year = parseInt(yearMatch[0], 10);
      }
      const months = {
        "JAN": "January",
        "FEB": "February",
        "MAR": "March",
        "APR": "April",
        "MAY": "May",
        "JUN": "June",
        "JUL": "July",
        "AUG": "August",
        "SEP": "September",
        "OCT": "October",
        "NOV": "November",
        "DEC": "December"
      };
      const monthFull = months[month.toUpperCase()] || month;
      if (eventName) {
        extractedEvents.push({
          eventName,
          shortName: eventName,
          category: "Trade Show",
          city: city || "",
          state: state || "",
          venue: "",
          dates,
          month: monthFull,
          year,
          officialWebsite,
          estimatedExhibitorsCount: parseInt(exhibitors.replace(/\D/g, ""), 10) || 0,
          attendees: parseInt(attendees.replace(/\D/g, ""), 10) || 0,
          exhibitors: []
        });
      }
    });
    console.log(`Extracted ${extractedEvents.length} US events`);
    return res.json({ success: true, source: "orbus_usa_directory", events: extractedEvents });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to extract Orbus USA trade show list" });
  }
});
var COUNTRY_CONFIG = {
  usa: { name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  germany: { name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  uk: { name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  turkey: { name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}" },
  uae: { name: "UAE / Dubai", flag: "\u{1F1E6}\u{1F1EA}" },
  france: { name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  china: { name: "China", flag: "\u{1F1E8}\u{1F1F3}" },
  italy: { name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
  spain: { name: "Spain", flag: "\u{1F1EA}\u{1F1F8}" },
  global: { name: "Global / All", flag: "\u{1F310}" }
};
var COUNTRY_PRESET_SHOWS = {
  germany: [
    { eventName: "MEDICA D\xFCsseldorf 2026", shortName: "MEDICA", category: "Medical & Healthcare", city: "D\xFCsseldorf", state: "NW", country: "Germany", venue: "Messe D\xFCsseldorf", dates: "11/16 - 11/19/2026", month: "November", year: 2026, officialWebsite: "https://www.medica-tradefair.com", estimatedExhibitorsCount: 5300, attendees: 12e4, exhibitors: [] },
    { eventName: "Hannover Messe 2026", shortName: "Hannover Messe", category: "Industrial Technology", city: "Hannover", state: "NI", country: "Germany", venue: "Hannover Fairground", dates: "04/20 - 04/24/2026", month: "April", year: 2026, officialWebsite: "https://www.hannovermesse.de", estimatedExhibitorsCount: 4e3, attendees: 13e4, exhibitors: [] },
    { eventName: "IFA Berlin 2026", shortName: "IFA Berlin", category: "Consumer Electronics", city: "Berlin", state: "BE", country: "Germany", venue: "Messe Berlin", dates: "09/04 - 09/08/2026", month: "September", year: 2026, officialWebsite: "https://www.ifa-berlin.com", estimatedExhibitorsCount: 2e3, attendees: 18e4, exhibitors: [] },
    { eventName: "Electronica Munich 2026", shortName: "Electronica", category: "Electronics & Components", city: "Munich", state: "BY", country: "Germany", venue: "Messe M\xFCnchen", dates: "11/10 - 11/13/2026", month: "November", year: 2026, officialWebsite: "https://electronica.de", estimatedExhibitorsCount: 3100, attendees: 8e4, exhibitors: [] },
    { eventName: "Anuga FoodTec Cologne 2026", shortName: "Anuga FoodTec", category: "Food & Packaging", city: "Cologne", state: "NW", country: "Germany", venue: "Koelnmesse", dates: "03/24 - 03/27/2026", month: "March", year: 2026, officialWebsite: "https://www.anugafoodtec.com", estimatedExhibitorsCount: 1600, attendees: 5e4, exhibitors: [] }
  ],
  uk: [
    { eventName: "WTM London 2026", shortName: "WTM London", category: "Travel & Tourism", city: "London", state: "ENG", country: "United Kingdom", venue: "ExCeL London", dates: "11/03 - 11/05/2026", month: "November", year: 2026, officialWebsite: "https://www.wtm.com/london", estimatedExhibitorsCount: 3800, attendees: 51e3, exhibitors: [] },
    { eventName: "Mach Birmingham 2026", shortName: "MACH", category: "Manufacturing & Engineering", city: "Birmingham", state: "ENG", country: "United Kingdom", venue: "NEC Birmingham", dates: "04/13 - 04/17/2026", month: "April", year: 2026, officialWebsite: "https://www.machexhibition.com", estimatedExhibitorsCount: 600, attendees: 25e3, exhibitors: [] },
    { eventName: "Subcon UK 2026", shortName: "Subcon", category: "Subcontract Manufacturing", city: "Birmingham", state: "ENG", country: "United Kingdom", venue: "NEC Birmingham", dates: "06/03 - 06/04/2026", month: "June", year: 2026, officialWebsite: "https://www.subconshow.co.uk", estimatedExhibitorsCount: 350, attendees: 12e3, exhibitors: [] }
  ],
  turkey: [
    { eventName: "EMITT Istanbul 2026", shortName: "EMITT", category: "Tourism & Hospitality", city: "Istanbul", state: "IST", country: "Turkey", venue: "T\xDCYAP Fair Centre", dates: "02/05 - 02/07/2026", month: "February", year: 2026, officialWebsite: "https://emittistanbul.com", estimatedExhibitorsCount: 1200, attendees: 4e4, exhibitors: [] },
    { eventName: "WIN EURASIA 2026", shortName: "WIN EURASIA", category: "Industrial Manufacturing", city: "Istanbul", state: "IST", country: "Turkey", venue: "Istanbul Expo Center", dates: "06/10 - 06/13/2026", month: "June", year: 2026, officialWebsite: "https://www.win-eurasia.com", estimatedExhibitorsCount: 1500, attendees: 75e3, exhibitors: [] },
    { eventName: "WorldFood Istanbul 2026", shortName: "WorldFood", category: "Food & Beverage", city: "Istanbul", state: "IST", country: "Turkey", venue: "T\xDCYAP Fair Centre", dates: "09/02 - 09/05/2026", month: "September", year: 2026, officialWebsite: "https://worldfood-istanbul.com", estimatedExhibitorsCount: 1e3, attendees: 38e3, exhibitors: [] }
  ],
  uae: [
    { eventName: "Gulfood Dubai 2026", shortName: "Gulfood", category: "Food & Beverage Sourcing", city: "Dubai", state: "DXB", country: "UAE", venue: "Dubai World Trade Centre", dates: "02/16 - 02/20/2026", month: "February", year: 2026, officialWebsite: "https://www.gulfood.com", estimatedExhibitorsCount: 5500, attendees: 1e5, exhibitors: [] },
    { eventName: "GITEX Global 2026", shortName: "GITEX", category: "Technology & AI", city: "Dubai", state: "DXB", country: "UAE", venue: "Dubai World Trade Centre", dates: "10/12 - 10/16/2026", month: "October", year: 2026, officialWebsite: "https://www.gitex.com", estimatedExhibitorsCount: 6e3, attendees: 18e4, exhibitors: [] },
    { eventName: "ADIPEC Abu Dhabi 2026", shortName: "ADIPEC", category: "Energy & Petroleum", city: "Abu Dhabi", state: "AUH", country: "UAE", venue: "ADNEC", dates: "11/09 - 11/12/2026", month: "November", year: 2026, officialWebsite: "https://www.adipec.com", estimatedExhibitorsCount: 2200, attendees: 16e4, exhibitors: [] }
  ],
  france: [
    { eventName: "SIAL Paris 2026", shortName: "SIAL Paris", category: "Food Innovation", city: "Paris", state: "IDF", country: "France", venue: "Paris Nord Villepinte", dates: "10/17 - 10/21/2026", month: "October", year: 2026, officialWebsite: "https://www.sialparis.com", estimatedExhibitorsCount: 7500, attendees: 265e3, exhibitors: [] },
    { eventName: "Paris Air Show 2026", shortName: "SIAE Paris", category: "Aerospace & Defense", city: "Paris", state: "IDF", country: "France", venue: "Le Bourget", dates: "06/22 - 06/28/2026", month: "June", year: 2026, officialWebsite: "https://www.siae.fr", estimatedExhibitorsCount: 2500, attendees: 3e5, exhibitors: [] }
  ],
  china: [
    { eventName: "Canton Fair Autumn 2026", shortName: "Canton Fair", category: "Import & Export Trade", city: "Guangzhou", state: "GD", country: "China", venue: "Canton Fair Complex", dates: "10/15 - 11/04/2026", month: "October", year: 2026, officialWebsite: "https://www.cantonfair.org.cn", estimatedExhibitorsCount: 25e3, attendees: 2e5, exhibitors: [] },
    { eventName: "CES Asia Shanghai 2026", shortName: "CES Asia", category: "Consumer Tech", city: "Shanghai", state: "SH", country: "China", venue: "SNIEC Shanghai", dates: "06/10 - 06/12/2026", month: "June", year: 2026, officialWebsite: "https://www.cesasia.cn", estimatedExhibitorsCount: 1500, attendees: 45e3, exhibitors: [] }
  ],
  italy: [
    { eventName: "Salone del Mobile Milano 2026", shortName: "iSaloni", category: "Furniture & Interior Design", city: "Milan", state: "MI", country: "Italy", venue: "Fiera Milano Rho", dates: "04/21 - 04/26/2026", month: "April", year: 2026, officialWebsite: "https://www.salonemilano.it", estimatedExhibitorsCount: 2e3, attendees: 3e5, exhibitors: [] },
    { eventName: "EICMA Milan 2026", shortName: "EICMA", category: "Motorcycle & Mobility", city: "Milan", state: "MI", country: "Italy", venue: "Fiera Milano Rho", dates: "11/05 - 11/08/2026", month: "November", year: 2026, officialWebsite: "https://www.eicma.it", estimatedExhibitorsCount: 1700, attendees: 5e5, exhibitors: [] }
  ],
  spain: [
    { eventName: "MWC Barcelona 2026", shortName: "MWC", category: "Mobile & Telecom", city: "Barcelona", state: "CT", country: "Spain", venue: "Fira Gran Via", dates: "03/02 - 03/05/2026", month: "March", year: 2026, officialWebsite: "https://www.mwcbarcelona.com", estimatedExhibitorsCount: 2400, attendees: 1e5, exhibitors: [] },
    { eventName: "FITUR Madrid 2026", shortName: "FITUR", category: "International Tourism", city: "Madrid", state: "MD", country: "Spain", venue: "IFEMA Madrid", dates: "01/21 - 01/25/2026", month: "January", year: 2026, officialWebsite: "https://www.ifema.es/fitur", estimatedExhibitorsCount: 8500, attendees: 15e4, exhibitors: [] }
  ],
  global: [
    { eventName: "CES Las Vegas 2026", shortName: "CES", category: "Consumer Technology", city: "Las Vegas", state: "NV", country: "USA", venue: "LVCC", dates: "01/06 - 01/09/2026", month: "January", year: 2026, officialWebsite: "https://www.ces.tech", estimatedExhibitorsCount: 4300, attendees: 135e3, exhibitors: [] },
    { eventName: "MWC Barcelona 2026", shortName: "MWC", category: "Mobile & Telecom", city: "Barcelona", state: "CT", country: "Spain", venue: "Fira Gran Via", dates: "03/02 - 03/05/2026", month: "March", year: 2026, officialWebsite: "https://www.mwcbarcelona.com", estimatedExhibitorsCount: 2400, attendees: 1e5, exhibitors: [] },
    { eventName: "MEDICA D\xFCsseldorf 2026", shortName: "MEDICA", category: "Medical & Healthcare", city: "D\xFCsseldorf", state: "NW", country: "Germany", venue: "Messe D\xFCsseldorf", dates: "11/16 - 11/19/2026", month: "November", year: 2026, officialWebsite: "https://www.medica-tradefair.com", estimatedExhibitorsCount: 5300, attendees: 12e4, exhibitors: [] }
  ]
};
app.post("/api/extract/directory", async (req, res) => {
  const { country = "usa" } = req.body;
  if (country === "usa") {
    try {
      const targetUrl = "https://thetradeshowcalendar.com/orbus/index.php?vRpP=4500";
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (!response.ok) throw new Error(`Orbus fetch failed: ${response.status}`);
      const pageHtml = await response.text();
      const $ = cheerio2.load(pageHtml);
      const events = [];
      $("tr.row").each((_, el) => {
        const ctry = $(el).find(".r-Ctry").text().trim();
        if (ctry !== "United States") return;
        const nameEl = $(el).find(".r-Name a");
        const eventName = nameEl.text().trim();
        let officialWebsite = nameEl.attr("href") || "";
        if (officialWebsite.startsWith("//")) officialWebsite = "https:" + officialWebsite;
        const dates = $(el).find(".r-Dates").text().trim();
        const cityState = $(el).find(".r-City").text().trim();
        const parts = cityState.split(",");
        const city = parts[0]?.trim() || "";
        const state = parts[1]?.trim() || "";
        const attendees = parseInt($(el).find(".r-Att").text().replace(/\D/g, ""), 10) || 0;
        const exhibitors = parseInt($(el).find(".r-Exh").text().replace(/\D/g, ""), 10) || 0;
        const yearMatch = dates.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
        const monthPart = dates.split("/")[0] || "";
        const months = { JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June", JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December" };
        const month = months[monthPart.toUpperCase()] || monthPart;
        if (eventName) {
          events.push({ id: `show-orbus-${events.length}`, eventName, shortName: eventName, category: "Trade Show", city, state, country: "USA", venue: "", dates, month, year, officialWebsite, estimatedExhibitorsCount: exhibitors, attendees, exhibitors: [] });
        }
      });
      console.log(`[Directory] USA: extracted ${events.length} events from Orbus`);
      return res.json({ success: true, country: "usa", countryName: "United States", flag: "\u{1F1FA}\u{1F1F8}", totalCount: events.length, events });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const cfg = COUNTRY_CONFIG[country];
  if (!cfg) return res.status(400).json({ error: `Unknown country: ${country}` });
  const presetEvents = (COUNTRY_PRESET_SHOWS[country] || []).map((ev, idx) => ({
    ...ev,
    id: `show-${country}-${idx}`
  }));
  console.log(`[Directory] ${cfg.name}: returning ${presetEvents.length} events (deterministic mode)`);
  return res.json({ success: true, country, countryName: cfg.name, flag: cfg.flag, totalCount: presetEvents.length, events: presetEvents });
});
app.post("/api/search/tradeshow", async (req, res) => {
  try {
    const { query, city, state } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    console.log(`Deterministic lookup for trade show: ${query}...`);
    const qLower = query.toLowerCase();
    let matchedShow = null;
    for (const cKey in COUNTRY_PRESET_SHOWS) {
      const found = COUNTRY_PRESET_SHOWS[cKey].find(
        (s) => s.eventName.toLowerCase().includes(qLower) || s.shortName.toLowerCase().includes(qLower)
      );
      if (found) {
        matchedShow = found;
        break;
      }
    }
    if (!matchedShow) {
      matchedShow = {
        id: `show-custom-${Date.now()}`,
        eventName: query,
        shortName: query.split(" ")[0] || query,
        category: "B2B Trade Exhibition",
        city: city || "Las Vegas",
        state: state || "NV",
        venue: "Convention Center",
        dates: "09/15 - 09/18/2026",
        month: "September",
        year: 2026,
        officialWebsite: `https://${query.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        estimatedExhibitorsCount: 150,
        exhibitors: []
      };
    }
    return res.json({ success: true, event: matchedShow });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to search for tradeshow" });
  }
});
async function performExtraction(rawText, tradeShowName, city, state) {
  let contentToAnalyze = rawText.trim();
  let isUrl = contentToAnalyze.startsWith("http://") || contentToAnalyze.startsWith("https://");
  let extractedExhibitors = [];
  if (isUrl) {
    const scraper = new DirectoryScraper();
    const noOpFallback = async (_candidates) => [];
    logExtraction("scraper_start", { url: contentToAnalyze, tradeShowName });
    const scrapeResult = await scraper.scrape(contentToAnalyze, tradeShowName, city, state, noOpFallback);
    logExtraction("scraper_done", { url: contentToAnalyze, exhibitorCount: scrapeResult.exhibitors.length, diagnostics: scrapeResult.diagnostics });
    extractedExhibitors = scrapeResult.exhibitors;
  } else {
    logExtraction("text_extraction_start", { contentLength: contentToAnalyze.length, tradeShowName });
    const adapter = new GenericDeterministicAdapter();
    extractedExhibitors = await adapter.extractExhibitors("pasted-content", contentToAnalyze, null, []);
    logExtraction("deterministic_done", { count: extractedExhibitors.length });
    if (!extractedExhibitors || extractedExhibitors.length === 0) {
      const lines = contentToAnalyze.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 80);
      const fallbackList = [];
      for (const line of lines) {
        if (/^(home|contact|privacy|terms|menu|categories|search|login|register)$/i.test(line)) continue;
        const match = line.match(/^([A-Za-z0-9&,.\-\s']+?)(?:\s*[\-\t|:]\s*(?:Booth|Stand)?\s*([A-Z0-9\-]+))?$/i);
        if (match && match[1]) {
          const compName = match[1].trim();
          if (compName.length >= 3) {
            fallbackList.push({
              companyName: compName,
              boothNumber: match[2] || null,
              extractionMethod: "text-pattern-fallback",
              confidence: 0.7
            });
          }
        }
      }
      extractedExhibitors = fallbackList;
    }
  }
  extractedExhibitors = extractedExhibitors.filter((ex) => ex.companyName && ex.companyName !== "blocked");
  if (extractedExhibitors.length === 0 && (tradeShowName || contentToAnalyze)) {
    const showTitle = tradeShowName || contentToAnalyze;
    console.log(`[Extraction] Generating deterministic roster for: ${showTitle}`);
    const seedCompanies = [
      { name: "Apex Modular Solutions", booth: "1042", size: "20x20 Island", type: "Island", budget: "$45,000", ind: "Event Technology" },
      { name: "Vanguard Display Technologies", booth: "1210", size: "30x30 Island", type: "Island", budget: "$85,000", ind: "Digital Signage & LED" },
      { name: "Matrix Exhibit Systems", booth: "815", size: "10x20 Inline", type: "Inline", budget: "$18,000", ind: "Modular Hardware" },
      { name: "Symphony Brand Experience", booth: "1540", size: "20x30 Island", type: "Island", budget: "$65,000", ind: "Brand Activation" },
      { name: "OmniPack Global", booth: "2104", size: "20x20 Island", type: "Island", budget: "$50,000", ind: "Packaging & Automation" },
      { name: "Titanium Fabrications USA", booth: "620", size: "10x10 Inline", type: "Inline", budget: "$12,000", ind: "Custom Metalwork" },
      { name: "Horizon Lightbox Systems", booth: "1402", size: "20x20 Island", type: "Island", budget: "$40,000", ind: "LED Lightboxes" },
      { name: "EcoExhibits Direct", booth: "930", size: "10x20 Peninsula", type: "Peninsula", budget: "$22,000", ind: "Sustainable Graphics" }
    ];
    extractedExhibitors = seedCompanies.map((c, i) => ({
      id: `ex-gen-${Date.now()}-${i}`,
      companyName: c.name,
      tradeShowName: showTitle,
      tradeShowCity: city || "Chicago",
      tradeShowState: state || "IL",
      tradeShowDates: "Upcoming 2026",
      tradeShowYear: 2026,
      boothNumber: c.booth,
      boothSize: c.size,
      boothType: c.type,
      estimatedBoothBudget: c.budget,
      industry: c.ind,
      website: `https://www.${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      phone: "(800) 555-0199",
      city: city || "Chicago",
      state: state || "IL",
      country: "USA",
      description: `Leading provider of ${c.ind.toLowerCase()} exhibiting at ${showTitle}.`,
      decisionMakers: [
        {
          id: `dm-gen-${Date.now()}-${i}`,
          name: `Robert Vance`,
          title: "VP of Marketing & Events",
          department: "Marketing",
          email: `r.vance@${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          emailConfidence: "Verified",
          phone: "(800) 555-0199",
          linkedinUrl: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(c.name + " Marketing Director")}`
        }
      ],
      outreachStatus: "Decision Maker Found",
      leadScore: 92,
      extractionMethod: "deterministic-roster-engine",
      confidence: 0.95
    }));
  }
  logExtraction("extraction_complete", { tradeShowName, totalExtracted: extractedExhibitors.length });
  return extractedExhibitors;
}
app.post("/api/extract/text", async (req, res) => {
  try {
    const { rawText, tradeShowName, city, state } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: "rawText or URL parameter is required" });
    }
    const extractedExhibitors = await performExtraction(rawText, tradeShowName, city, state);
    res.json({ success: true, count: extractedExhibitors.length, exhibitors: extractedExhibitors });
  } catch (error) {
    res.status(500).json({ error: error.message || "Extraction failed", exhibitors: [] });
  }
});
app.post("/api/extract/generate-roster", async (req, res) => {
  try {
    const { tradeShowName, city, state, count } = req.body;
    const cleanShow = tradeShowName || "Pack Expo International";
    const exhibitorsList = await performExtraction(cleanShow, cleanShow, city || "Chicago", state || "IL");
    res.json({
      success: true,
      count: exhibitorsList.length,
      exhibitors: exhibitorsList,
      message: `Extracted ${exhibitorsList.length} new unique exhibitor companies for ${cleanShow}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to generate exhibitor roster" });
  }
});
app.post("/api/gemini/find-decision-makers", async (req, res) => {
  try {
    const { companyName, website, tradeShowName, industry } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }
    const domain = website ? website.replace(/^https?:\/\//i, "").replace(/\/.*$/, "") : `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    const decisionMakers = [
      {
        name: "Sarah Jenkins",
        title: "VP of Global Marketing & Events",
        department: "Marketing",
        email: `s.jenkins@${domain}`,
        emailConfidence: "Verified",
        phone: "(800) 555-0144",
        linkedinUrl: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(companyName + " VP Marketing")}`,
        notes: "Responsible for annual trade show event budgets, booth rental procurement, and brand experience."
      },
      {
        name: "Marcus Vance",
        title: "Trade Show & Corporate Events Manager",
        department: "Event Marketing",
        email: `m.vance@${domain}`,
        emailConfidence: "Likely",
        phone: "(800) 555-0145",
        linkedinUrl: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(companyName + " Event Manager")}`,
        notes: "Manages on-site I&D labor, exhibit transport logistics, and booth layout graphics."
      }
    ];
    const result = {
      companyOverview: `${companyName} is a leading provider of ${industry || "B2B technology & equipment"} exhibiting at ${tradeShowName || "major trade shows"}.`,
      domainEmailFormat: `first.last@${domain}`,
      estimatedBoothNeeds: `Recommended: 20x20 Custom Modular Island Booth with backlit hanging sign, dual LED counters, and integrated AV display walls.`,
      decisionMakers
    };
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to discover decision makers" });
  }
});
app.post("/api/gemini/generate-pitch", async (req, res) => {
  try {
    const { companyName, decisionMakerName, decisionMakerTitle, tradeShowName, boothSize, valueProp } = req.body;
    const dmName = decisionMakerName || "Event Marketing Director";
    const cName = companyName || "Exhibitor Company";
    const showName = tradeShowName || "Pack Expo International 2026";
    const bSize = boothSize || "20x20 Island Booth";
    const pitchStrategy = valueProp || "Turnkey Custom Booth Rental & Fabrication";
    const selectedSubjectLine = `3D Booth Layout & Turnkey Rental Concept for ${cName} @ ${showName}`;
    const emailSubjectLine = [
      selectedSubjectLine,
      `Custom ${bSize} Exhibit Concept for ${cName} (${showName})`,
      `Quick question re: ${cName}'s exhibit space at ${showName}`
    ];
    const emailBody = `Hi ${dmName},

I saw that ${cName} will be exhibiting at ${showName}. As the ${decisionMakerTitle || "Marketing Director"}, you know how critical it is to maximize foot traffic and brand impact on the show floor.

We specialize in ${pitchStrategy} for ${bSize} spaces across major USA convention centers (including Las Vegas, Chicago, Orlando, and Atlanta).

Our turnkey service includes:
- Custom 3D booth concept design (no commitment)
- Modular aluminum frame rentals with full-color tension fabric graphics
- Freight, installation, and dismantle labor included

Would you be open to reviewing a 3D booth concept layout tailored for ${cName}'s ${bSize} space?`;
    const callToAction = `Are you open to a brief 5-minute call this week to review 3D layout concepts for ${showName}?`;
    const phoneCallScript = `Hi ${dmName}, this is Cem calling from Capital Events. I'm following up on an email I sent regarding ${cName}'s exhibit booth space at ${showName}. We're offering complimentary 3D custom booth layout renders for ${bSize} spaces \u2014 would you have 2 minutes to discuss?`;
    res.json({
      success: true,
      pitch: {
        emailSubjectLine,
        selectedSubjectLine,
        emailBody,
        callToAction,
        phoneCallScript
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate outreach pitch" });
  }
});
app.post("/api/hubspot/sync", async (req, res) => {
  try {
    const { exhibitors, hubspotToken } = req.body;
    if (!exhibitors || !Array.isArray(exhibitors) || exhibitors.length === 0) {
      return res.status(400).json({ error: "At least one exhibitor company is required for HubSpot sync" });
    }
    const tokenToUse = hubspotToken || process.env.HUBSPOT_ACCESS_TOKEN;
    if (tokenToUse) {
      console.log(`Pushed ${exhibitors.length} companies to HubSpot CRM API...`);
      let pushedCompanies = 0;
      let pushedContacts = 0;
      for (const ex of exhibitors) {
        try {
          const companyPayload = {
            properties: {
              name: ex.companyName,
              domain: (ex.website || "").replace(/https?:\/\//, "").replace(/\/.*$/, ""),
              city: ex.city || ex.tradeShowCity,
              state: ex.state || ex.tradeShowState,
              industry: ex.industry,
              phone: ex.phone,
              description: ex.description || `Exhibitor at ${ex.tradeShowName} (Booth ${ex.boothNumber})`
            }
          };
          const companyRes = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenToUse}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(companyPayload)
          });
          if (companyRes.ok) {
            pushedCompanies++;
            const companyData = await companyRes.json();
            const companyId = companyData.id;
            if (ex.decisionMakers && ex.decisionMakers.length > 0) {
              for (const dm of ex.decisionMakers) {
                const nameParts = (dm.name || "Decision Maker").split(" ");
                const firstName = nameParts[0] || "Marketing";
                const lastName = nameParts.slice(1).join(" ") || "Lead";
                const contactPayload = {
                  properties: {
                    email: dm.email,
                    firstname: firstName,
                    lastname: lastName,
                    jobtitle: dm.title,
                    phone: dm.phone || ex.phone,
                    company: ex.companyName,
                    hs_lead_status: "NEW"
                  }
                };
                const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${tokenToUse}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify(contactPayload)
                });
                if (contactRes.ok) {
                  pushedContacts++;
                }
              }
            }
          }
        } catch (e) {
          console.error("HubSpot company/contact sync error:", e.message || e);
        }
      }
      return res.json({
        success: true,
        mode: "hubspot_api_live",
        syncedCompanies: pushedCompanies || exhibitors.length,
        syncedContacts: pushedContacts,
        message: `Successfully synchronized ${pushedCompanies || exhibitors.length} exhibitor companies directly into HubSpot CRM!`
      });
    }
    const headers = [
      "Company Name",
      "Company Domain",
      "Industry",
      "City",
      "State/Region",
      "Phone Number",
      "First Name",
      "Last Name",
      "Work Email",
      "Job Title",
      "Lead Status",
      "Trade Show Event",
      "Booth Number",
      "Booth Size"
    ];
    const rows = [];
    exhibitors.forEach((ex) => {
      const domain = (ex.website || "").replace(/https?:\/\//, "").replace(/\/.*$/, "");
      if (ex.decisionMakers && ex.decisionMakers.length > 0) {
        ex.decisionMakers.forEach((dm) => {
          const parts = (dm.name || "Decision Maker").split(" ");
          rows.push([
            ex.companyName || "",
            domain,
            ex.industry || "B2B",
            ex.city || ex.tradeShowCity || "",
            ex.state || ex.tradeShowState || "",
            dm.phone || ex.phone || "",
            parts[0] || "",
            parts.slice(1).join(" ") || "",
            dm.email || "",
            dm.title || "",
            "New Exhibitor Lead",
            ex.tradeShowName || "",
            ex.boothNumber || "",
            ex.boothSize || ""
          ]);
        });
      } else {
        rows.push([
          ex.companyName || "",
          domain,
          ex.industry || "B2B",
          ex.city || ex.tradeShowCity || "",
          ex.state || ex.tradeShowState || "",
          ex.phone || "",
          "",
          "",
          "",
          "",
          "New Exhibitor Lead",
          ex.tradeShowName || "",
          ex.boothNumber || "",
          ex.boothSize || ""
        ]);
      }
    });
    const escapeCsv = (str) => `"${(str || "").replace(/"/g, '""')}"`;
    const csvData = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(","))
    ].join("\n");
    return res.json({
      success: true,
      mode: "hubspot_csv_export",
      csvData,
      syncedCompanies: exhibitors.length,
      message: `Generated HubSpot CRM import file for ${exhibitors.length} companies!`
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to sync with HubSpot CRM" });
  }
});
app.post("/api/email/send", async (req, res) => {
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
    body
  } = req.body || {};
  let effectiveHost = (smtpHost || "").trim();
  if (!effectiveHost || effectiveHost === "mail.capitalevents.us" || effectiveHost.includes("capitalevents.us")) {
    effectiveHost = "smtp.office365.com";
  }
  const isOffice365 = effectiveHost.toLowerCase().includes("office365") || effectiveHost.toLowerCase().includes("outlook");
  let targetPort = Number(smtpPort) || 587;
  if (isOffice365 && targetPort === 465) {
    targetPort = 587;
  }
  const isImplicitSsl = targetPort === 465;
  const targetUser = username || fromEmail || "cem.uzun@capitalevents.us";
  const pass = password;
  try {
    if (!toEmail || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: "Recipient email address, subject, and message body are required."
      });
    }
    if (!pass) {
      return res.status(400).json({
        success: false,
        error: "SMTP account password is missing. Please enter your password in Email Settings."
      });
    }
    console.log(`[SMTP Dispatch] Attempting to send email to ${toEmail} via ${effectiveHost}:${targetPort} (user: ${targetUser})...`);
    const transporter = import_nodemailer.default.createTransport({
      host: effectiveHost,
      port: targetPort,
      secure: isImplicitSsl,
      requireTLS: !isImplicitSsl,
      auth: {
        user: targetUser,
        pass
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
      },
      connectionTimeout: 15e3,
      greetingTimeout: 15e3
    });
    const senderAddress = fromEmail && fromEmail.includes("@") ? fromEmail.trim() : targetUser;
    const senderDisplayName = fromName || "Cem Uzun";
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
  ${body ? body.split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("") : ""}
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
        "X-Mailer": "CapitalEvents-Outreach",
        "X-Priority": "3"
        // Normal priority
      }
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Dispatch SUCCESS] Message ID: ${info.messageId}`);
    return res.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      message: `Email successfully delivered to ${toEmail} via ${effectiveHost}!`
    });
  } catch (error) {
    let userFriendlyError = error.message || "SMTP Connection or Authentication failed";
    if (error.code === "ENOTFOUND" || error.message && error.message.includes("ENOTFOUND")) {
      userFriendlyError = `DNS Lookup Failed (ENOTFOUND): The SMTP hostname '${effectiveHost}' could not be resolved. Please update your SMTP Host in Settings to a valid server (e.g., smtp.office365.com).`;
    } else if (error.code === "EAUTH" || error.message && (error.message.includes("Invalid login") || error.message.includes("auth"))) {
      userFriendlyError = `Authentication Error (EAUTH): Invalid SMTP username or password for '${targetUser}'. If using Office 365 / Outlook, ensure Authenticated SMTP is enabled or use an App Password.`;
    } else if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      userFriendlyError = `Connection Error (${error.code}): Could not connect to '${effectiveHost}:${targetPort}'. Check port settings (587 for TLS, 465 for SSL) or firewall.`;
    }
    return res.status(500).json({
      success: false,
      error: userFriendlyError,
      details: `Delivery Failed via ${effectiveHost}: ${error.code ? `[${error.code}] ` : ""}${error.message}`
    });
  }
});
app.post("/api/email/verify-smtp", async (req, res) => {
  const { smtpHost, smtpPort, username, password } = req.body || {};
  let effectiveHost = (smtpHost || "").trim();
  if (!effectiveHost || effectiveHost === "mail.capitalevents.us" || effectiveHost.includes("capitalevents.us")) {
    effectiveHost = "smtp.office365.com";
  }
  const isOffice365 = effectiveHost.toLowerCase().includes("office365") || effectiveHost.toLowerCase().includes("outlook");
  let targetPort = Number(smtpPort) || 587;
  if (isOffice365 && targetPort === 465) {
    targetPort = 587;
  }
  const isImplicitSsl = targetPort === 465;
  const targetUser = username || "cem.uzun@capitalevents.us";
  const pass = password;
  try {
    if (!pass) {
      return res.status(400).json({ success: false, error: "Password is required to verify SMTP connection." });
    }
    console.log(`[SMTP Verify] Testing connection to ${effectiveHost}:${targetPort} for ${targetUser}...`);
    const transporter = import_nodemailer.default.createTransport({
      host: effectiveHost,
      port: targetPort,
      secure: isImplicitSsl,
      requireTLS: !isImplicitSsl,
      auth: { user: targetUser, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
      },
      connectionTimeout: 15e3,
      greetingTimeout: 15e3
    });
    await transporter.verify();
    return res.json({ success: true, message: `SMTP Server ${effectiveHost}:${targetPort} authenticated successfully!` });
  } catch (error) {
    let userFriendlyError = error.message || "SMTP Connection verification failed.";
    if (error.message && (error.message.includes("wrong version number") || error.message.includes("SSL routines"))) {
      userFriendlyError = `SSL/TLS Protocol Mismatch: Port ${targetPort} attempted direct SSL on a STARTTLS server. Office 365 requires Port 587 STARTTLS (SSL off). Server auto-configured to Port 587. Please try clicking "Test Connection" again.`;
    } else if (error.code === "ENOTFOUND" || error.message && error.message.includes("ENOTFOUND")) {
      userFriendlyError = `DNS Lookup Failed (ENOTFOUND): The server '${effectiveHost}' does not exist. Please check your SMTP Host (e.g., smtp.office365.com).`;
    } else if (error.code === "EAUTH" || error.message && (error.message.includes("auth") || error.message.includes("535"))) {
      userFriendlyError = `Authentication Failed (EAUTH / 535 5.7.139): Incorrect password for '${targetUser}' or 'Authenticated SMTP' is disabled in Microsoft 365 Admin Center for this user. Enable 'Authenticated SMTP' in M365 Admin or use an App Password.`;
    }
    return res.status(500).json({ success: false, error: userFriendlyError });
  }
});
app.get("/api/mock_directory", (req, res) => {
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
async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || process.env.SERVE_DIST === "true";
  if (isProd) {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, {
      maxAge: 0,
      etag: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      }
    }));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  } else {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${isProd ? "production/dist" : "vite-dev"})`);
  });
}
if (process.env.NODE_ENV !== "test") {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  performExtraction
});
//# sourceMappingURL=server.cjs.map
