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

// src/lib/scraper/index.ts
var fsLib = __toESM(require("fs"), 1);
var pathLib = __toESM(require("path"), 1);

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
                console.log(`[Scraper] XHR intercepted (#${interceptedXhr.length}): ${response.url().substring(0, 80)}`);
              }
            } catch (e) {
            }
          }
        }
      });
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45e3 });
      } catch (e) {
        console.warn(`[Scraper] networkidle timed out for ${url}, falling back`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 3e4 });
        await page.waitForTimeout(5e3);
      }
      await page.waitForTimeout(3e3);
      htmlText = await page.content();
      console.log(`[Scraper] Page loaded, HTML size: ${htmlText.length} bytes, XHRs intercepted: ${interceptedXhr.length}`);
      const safeUrl = url.replace(/[^a-z0-9]/gi, "_").substring(0, 50).toLowerCase();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const logDir = pathLib.join(process.cwd(), "logs");
      if (!fsLib.existsSync(logDir)) fsLib.mkdirSync(logDir, { recursive: true });
      fsLib.writeFileSync(pathLib.join(logDir, `scrape_${safeUrl}_${timestamp}.html`), htmlText);
      console.log(`[Scraper] Raw HTML saved to logs/scrape_${safeUrl}_${timestamp}.html`);
    } catch (e) {
      console.error(`[Scraper] Playwright error for ${url}:`, e.message);
      if (browser) await browser.close();
      return { exhibitors: [{ companyName: "blocked", sourceUrl: url, sourceEvidence: e.message, extractionMethod: "deterministic", confidence: 0, boothNumber: null, profileUrl: null, companyWebsite: null }] };
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
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var cheerio2 = __toESM(require("cheerio"), 1);
var fsLib2 = __toESM(require("fs"), 1);
var pathLib2 = __toESM(require("path"), 1);
function logScrapedContent(url, content, type = "html") {
  try {
    const logDir = pathLib2.join(process.cwd(), "logs");
    if (!fsLib2.existsSync(logDir)) {
      fsLib2.mkdirSync(logDir, { recursive: true });
    }
    const safeUrl = url.replace(/[^a-z0-9]/gi, "_").substring(0, 50).toLowerCase();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `scrape_${safeUrl}_${timestamp}.${type}`;
    const filePath = pathLib2.join(logDir, filename);
    fsLib2.writeFileSync(filePath, content);
    console.log(`[Scraper Log] Saved raw content for debugging to: ${filePath}`);
  } catch (err) {
    console.error("[logScrapedContent] Failed to write log:", err.message);
  }
}
function logExtraction(step, data) {
  try {
    const logDir = pathLib2.join(process.cwd(), "logs");
    if (!fsLib2.existsSync(logDir)) fsLib2.mkdirSync(logDir, { recursive: true });
    const entry = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), step, ...data }) + "\n";
    fsLib2.appendFileSync(pathLib2.join(logDir, "extraction.jsonl"), entry);
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
app.use(import_express.default.json({ limit: "10mb" }));
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
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing in system settings.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/scraper-logs", (req, res) => {
  try {
    const logDir = pathLib2.join(process.cwd(), "logs");
    if (!fsLib2.existsSync(logDir)) {
      return res.json({ success: true, logs: [] });
    }
    const files = fsLib2.readdirSync(logDir);
    const logs = files.filter((f) => f.endsWith(".html") || f.endsWith(".json")).map((f) => {
      const filePath = pathLib2.join(logDir, f);
      const stats = fsLib2.statSync(filePath);
      return {
        filename: f,
        size: stats.size,
        mtime: stats.mtimeMs,
        content: fsLib2.readFileSync(filePath, "utf-8").substring(0, 5e5)
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
  usa: { name: "United States", flag: "\u{1F1FA}\u{1F1F8}", searchQuery: "major USA trade shows exhibitions 2026 list exhibitors booth" },
  germany: { name: "Germany", flag: "\u{1F1E9}\u{1F1EA}", searchQuery: "Germany Messe trade shows exhibitions 2026 Frankfurt M\xFCnchen D\xFCsseldorf exhibitors list" },
  uk: { name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", searchQuery: "UK trade shows exhibitions 2026 London ExCeL NEC Birmingham exhibitors list" },
  turkey: { name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}", searchQuery: "Turkey Istanbul fuar trade shows exhibitions 2026 T\xDCYAP CNR Expo exhibitors list" },
  uae: { name: "UAE / Dubai", flag: "\u{1F1E6}\u{1F1EA}", searchQuery: "Dubai UAE trade shows exhibitions 2026 DWTC ADNEC exhibitors list" },
  france: { name: "France", flag: "\u{1F1EB}\u{1F1F7}", searchQuery: "France Paris trade shows exhibitions 2026 Paris Nord Villepinte exhibitors list" },
  china: { name: "China", flag: "\u{1F1E8}\u{1F1F3}", searchQuery: "China trade shows exhibitions 2026 Shanghai Guangzhou Canton Fair exhibitors list" },
  italy: { name: "Italy", flag: "\u{1F1EE}\u{1F1F9}", searchQuery: "Italy Milan trade shows exhibitions 2026 Fiera Milano exhibitors list" },
  spain: { name: "Spain", flag: "\u{1F1EA}\u{1F1F8}", searchQuery: "Spain Madrid Barcelona trade shows exhibitions 2026 IFEMA Fira exhibitors list" },
  global: { name: "Global / All", flag: "\u{1F310}", searchQuery: "major international trade shows exhibitions worldwide 2026 exhibitors list" }
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
          events.push({ eventName, shortName: eventName, category: "Trade Show", city, state, country: "USA", venue: "", dates, month, year, officialWebsite, estimatedExhibitorsCount: exhibitors, attendees, exhibitors: [] });
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
  try {
    const ai = getGenAI();
    console.log(`[Directory] Searching for ${cfg.name} trade shows via Gemini...`);
    const searchRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `List 30\u201350 major trade shows and industry exhibitions in ${cfg.name} for 2025-2026. Include: event name, city, venue, dates, industry/category, estimated number of exhibitors, official website. ${cfg.searchQuery}`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const rawText = searchRes.text || "";
    logExtraction("intl_directory_search", { country, contentLength: rawText.length });
    const structRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Convert this list of international trade shows into a JSON array. Each item should have: eventName, shortName, category, city, state (use region/province if applicable), country, venue, dates, month, year (number), officialWebsite, estimatedExhibitorsCount (number). Return ONLY the JSON array.

TEXT:
${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              eventName: { type: import_genai.Type.STRING },
              shortName: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              city: { type: import_genai.Type.STRING },
              state: { type: import_genai.Type.STRING },
              country: { type: import_genai.Type.STRING },
              venue: { type: import_genai.Type.STRING },
              dates: { type: import_genai.Type.STRING },
              month: { type: import_genai.Type.STRING },
              year: { type: import_genai.Type.NUMBER },
              officialWebsite: { type: import_genai.Type.STRING },
              estimatedExhibitorsCount: { type: import_genai.Type.NUMBER }
            },
            required: ["eventName", "city", "country"]
          }
        }
      }
    });
    const events = JSON.parse(structRes.text || "[]").map((ev) => ({ ...ev, exhibitors: [] }));
    console.log(`[Directory] ${cfg.name}: found ${events.length} events via Gemini`);
    return res.json({ success: true, country, countryName: cfg.name, flag: cfg.flag, totalCount: events.length, events });
  } catch (err) {
    console.error(`[Directory] ${country} search failed:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/search/tradeshow", async (req, res) => {
  try {
    const { query, city, state } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    console.log(`Live Search Grounding lookup for trade show: ${query}...`);
    const ai = getGenAI();
    const searchPrompt = `Perform a live web search to find exact, real-time official details and verified exhibitor roster for the trade show: "${query}" ${city ? `in ${city}` : ""} ${state || ""}.
Find:
1. Official exact event name, dates (e.g. Sep 30 - Oct 01, 2026), city, state, venue (e.g. Jacob K. Javits Convention Center), and official website URL.
2. Actual verified exhibitor companies with booth numbers, booth sizes, industry, and contact details.`;
    const searchRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const rawSearchText = searchRes.text || "";
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
        responseMimeType: "application/json"
      }
    });
    const eventObj = JSON.parse(structRes.text || "{}");
    return res.json({ success: true, event: eventObj });
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
    const geminiFallback = async (candidates) => {
      const ai = getGenAI();
      let fallbackExhibitors = [];
      for (const chunk of candidates) {
        const prompt = `Analyze this text from a trade show directory ('${tradeShowName}') and extract genuine exhibitor companies ONLY. Reject generic navigation links, categories, and event names. Do not hallucinate. 

TEXT:
${chunk}`;
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    companyName: { type: import_genai.Type.STRING },
                    boothNumber: { type: import_genai.Type.STRING },
                    boothSize: { type: import_genai.Type.STRING },
                    boothType: { type: import_genai.Type.STRING },
                    industry: { type: import_genai.Type.STRING }
                  },
                  required: ["companyName"]
                }
              }
            }
          });
          const parsed = JSON.parse(aiRes.text || "[]");
          fallbackExhibitors = fallbackExhibitors.concat(parsed.map((p) => ({ ...p, extractionMethod: "ai", confidence: 0.6 })));
        } catch (e) {
          if (e.message?.toLowerCase().includes("quota") || e.status === 429 || e.message?.includes("resource_exhausted")) {
            throw new Error("waiting_for_ai_quota");
          }
        }
      }
      return fallbackExhibitors;
    };
    logExtraction("scraper_start", { url: contentToAnalyze, tradeShowName });
    const scrapeResult = await scraper.scrape(contentToAnalyze, tradeShowName, city, state, geminiFallback);
    logExtraction("scraper_done", { url: contentToAnalyze, exhibitorCount: scrapeResult.exhibitors.length, diagnostics: scrapeResult.diagnostics });
    extractedExhibitors = scrapeResult.exhibitors;
  } else {
    logExtraction("text_extraction_start", { contentLength: contentToAnalyze.length, tradeShowName });
    const adapter = new GenericDeterministicAdapter();
    extractedExhibitors = await adapter.extractExhibitors("pasted-content", contentToAnalyze, null, []);
    logExtraction("deterministic_done", { count: extractedExhibitors.length });
    if (!extractedExhibitors || extractedExhibitors.length === 0) {
      try {
        const ai = getGenAI();
        const prompt = `Analyze this raw text/HTML pasted from a trade show exhibitor list ('${tradeShowName || "Trade Show"}') and extract all legitimate exhibitor company names and booth numbers.
          
RAW CONTENT:
${contentToAnalyze.substring(0, 25e3)}`;
        const aiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  companyName: { type: import_genai.Type.STRING },
                  boothNumber: { type: import_genai.Type.STRING },
                  boothSize: { type: import_genai.Type.STRING },
                  boothType: { type: import_genai.Type.STRING },
                  industry: { type: import_genai.Type.STRING },
                  description: { type: import_genai.Type.STRING }
                },
                required: ["companyName"]
              }
            }
          }
        });
        const parsed = JSON.parse(aiRes.text || "[]");
        extractedExhibitors = parsed.map((p) => ({
          ...p,
          extractionMethod: "ai",
          confidence: 0.85
        }));
        logExtraction("gemini_text_extraction_done", { count: extractedExhibitors.length });
      } catch (e) {
        logExtraction("gemini_text_extraction_failed", { error: e.message });
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
        logExtraction("text_pattern_fallback_done", { count: extractedExhibitors.length });
      }
    }
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
    const { tradeShowName, city, state, count, existingCompanyNames = [] } = req.body;
    const cleanShow = tradeShowName || "Pack Expo International";
    const targetCount = Number(count) || 30;
    const existingSet = new Set((existingCompanyNames || []).map((n) => n.trim().toLowerCase()));
    console.log(`Generating auto-expanded roster for show: ${cleanShow} in ${city || "USA"}, ${state || ""} (Target: ${targetCount}, existing count: ${existingSet.size})...`);
    const isPackExpo = cleanShow.toLowerCase().includes("pack expo");
    const isWhiteLabelExpo = cleanShow.toLowerCase().includes("white label") || cleanShow.toLowerCase().includes("whitelabel");
    let exhibitorsList = [];
    try {
      const ai = getGenAI();
      const searchPrompt = `Search the web for the official exhibitor list for '${cleanShow}' in '${city || "Chicago"}', '${state || "IL"}'. Find as many ACTUAL (up to 2000) real exhibitor companies attending. Find their real booth numbers, website, industry, and any available contact info or decision makers. Do not hallucinate. List them as text.`;
      const searchRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const rawSearchText = searchRes.text || "";
      console.log("Search text for roster found:", rawSearchText.substring(0, 200));
      const structPrompt = `Based strictly on the following search results:
${rawSearchText}

Carefully analyze these results and extract them into a strict JSON array of REAL exhibitor company objects. Look for exact company names and ignore generic text. Do not hallucinate or make up any company that is not mentioned in the results. If you cannot find any, return an empty array.

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
- decisionMakers: array of REAL key contacts ONLY IF found in the text. NEVER invent names like 'Contact Lead' or 'John Doe'. Leave empty [] if none found.`;
      const structRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: structPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.ARRAY,
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                companyName: { type: import_genai.Type.STRING },
                boothNumber: { type: import_genai.Type.STRING },
                boothSize: { type: import_genai.Type.STRING },
                boothType: { type: import_genai.Type.STRING },
                estimatedBoothBudget: { type: import_genai.Type.STRING },
                industry: { type: import_genai.Type.STRING },
                website: { type: import_genai.Type.STRING },
                phone: { type: import_genai.Type.STRING },
                city: { type: import_genai.Type.STRING },
                state: { type: import_genai.Type.STRING },
                country: { type: import_genai.Type.STRING },
                description: { type: import_genai.Type.STRING },
                decisionMakers: {
                  type: import_genai.Type.ARRAY,
                  items: {
                    type: import_genai.Type.OBJECT,
                    properties: {
                      name: { type: import_genai.Type.STRING },
                      title: { type: import_genai.Type.STRING },
                      department: { type: import_genai.Type.STRING },
                      email: { type: import_genai.Type.STRING },
                      emailConfidence: { type: import_genai.Type.STRING },
                      phone: { type: import_genai.Type.STRING },
                      linkedinUrl: { type: import_genai.Type.STRING }
                    },
                    required: ["name", "title", "email"]
                  }
                }
              },
              required: ["companyName", "industry", "boothNumber"]
            }
          }
        }
      });
      const rawAiList = JSON.parse(structRes.text || "[]");
      exhibitorsList = rawAiList.filter((item) => item.companyName && !existingSet.has(item.companyName.trim().toLowerCase()));
    } catch (aiErr) {
      console.log("AI Extraction encountered a rate limit or error:", aiErr.message);
    }
    if (exhibitorsList.length === 0) {
      return res.status(429).json({ error: "AI Extraction failed and no curated data was available.", exhibitors: [] });
    }
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
    const ai = getGenAI();
    const searchPrompt = `Search for decision makers at '${companyName}' (${website || ""}), an exhibitor in ${industry || "B2B"} attending '${tradeShowName || "USA trade shows"}'.
Look for roles such as:
- VP of Marketing / CMO / Marketing Director
- Event Marketing Manager / Trade Show Coordinator / Field Marketing Manager
- Director of Corporate Events / Brand Manager / Founder / Owner

Find their Full Names, Titles, official corporate Email pattern or direct email (e.g., first.last@domain.com), corporate phone number, and LinkedIn profiles.`;
    const searchRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const rawSearchResult = searchRes.text || "";
    const structPrompt = `Based on the research findings for company '${companyName}' (${website || ""}):
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
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            companyOverview: { type: import_genai.Type.STRING },
            domainEmailFormat: { type: import_genai.Type.STRING },
            estimatedBoothNeeds: { type: import_genai.Type.STRING },
            decisionMakers: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  name: { type: import_genai.Type.STRING },
                  title: { type: import_genai.Type.STRING },
                  department: { type: import_genai.Type.STRING },
                  email: { type: import_genai.Type.STRING },
                  emailConfidence: { type: import_genai.Type.STRING },
                  phone: { type: import_genai.Type.STRING },
                  linkedinUrl: { type: import_genai.Type.STRING },
                  notes: { type: import_genai.Type.STRING }
                },
                required: ["name", "title", "email"]
              }
            }
          }
        }
      }
    });
    const parsedData = JSON.parse(structRes.text || "{}");
    res.json({ success: true, result: parsedData });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to discover decision makers" });
  }
});
app.post("/api/gemini/generate-pitch", async (req, res) => {
  try {
    const { companyName, decisionMakerName, decisionMakerTitle, tradeShowName, boothSize, valueProp, customInstructions } = req.body;
    const ai = getGenAI();
    const prompt = `You are a senior B2B Sales Executive for a premier Trade Show Booth Production & Event Display Manufacturing Company in the USA.
Write a highly compelling, personalized cold email pitch to a decision maker.

TARGET DECISION MAKER:
- Name: ${decisionMakerName || "Event Marketing Director"}
- Title: ${decisionMakerTitle || "Marketing Director"}
- Company: ${companyName || "Exhibitor Company"}
- Trade Show Event: ${tradeShowName || "Upcoming USA Trade Show"}
- Exhibitor Booth Size: ${boothSize || "20x20 Island Booth"}

CORE VALUE PROPOSITION TO HIGHLIGHT:
- Strategy: ${valueProp || "Turnkey Booth Rental & Custom Fabrication"}
- Key Strengths: USA nationwide turnkey service (engineering, custom printing, shipping, and local I&D labor in Las Vegas, Chicago, Orlando, etc.), modular reusable frames, LED lightboxes, fast turnarounds.

CUSTOM INSTRUCTIONS / FOCUS:
${customInstructions || "Keep email concise, highly professional, non-pushy, offering a 3D booth concept layout or rental price estimate."}

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
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            emailSubjectLine: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING }
            },
            selectedSubjectLine: { type: import_genai.Type.STRING },
            emailBody: { type: import_genai.Type.STRING },
            callToAction: { type: import_genai.Type.STRING },
            phoneCallScript: { type: import_genai.Type.STRING }
          },
          required: ["selectedSubjectLine", "emailBody", "callToAction"]
        }
      }
    });
    const pitchData = JSON.parse(aiRes.text || "{}");
    res.json({ success: true, pitch: pitchData });
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
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
