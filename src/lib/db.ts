import path from 'path';
import fs from 'fs';
import os from 'os';

interface DbSchema {
  trade_shows: Record<string, any>;
  exhibitors: Record<string, any>;
  decision_makers: Record<string, any>;
  scraper_checkpoints: Record<string, any>;
}

// Find a writable database path: try process.cwd() first, fallback to os.tmpdir()
function getWritableDbPath(): string {
  const primaryPath = path.join(process.cwd(), 'fuar_db.json');
  try {
    const testFile = path.join(process.cwd(), `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return primaryPath;
  } catch {
    const tmpPath = path.join(os.tmpdir(), 'fuar_db.json');
    console.warn(`[DB] Working directory is read-only. Falling back to: ${tmpPath}`);
    return tmpPath;
  }
}

const dbFilePath = getWritableDbPath();

// Helper to load DB from disk
function loadDb(): DbSchema {
  try {
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        trade_shows: data.trade_shows || {},
        exhibitors: data.exhibitors || {},
        decision_makers: data.decision_makers || {},
        scraper_checkpoints: data.scraper_checkpoints || {}
      };
    }
  } catch (err: any) {
    console.error('[DB] Error loading database file:', err.message);
  }
  return { trade_shows: {}, exhibitors: {}, decision_makers: {}, scraper_checkpoints: {} };
}

// Helper to save DB atomically to disk with memory fallback
function saveDb(data: DbSchema) {
  try {
    const tempPath = `${dbFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, dbFilePath);
  } catch (err: any) {
    // If disk save fails (e.g. read-only environment), log warning and retain in memory
    console.warn('[DB] Could not persist to disk, keeping state in memory:', err.message);
  }
}

// Singleton state in memory for ultra-fast queries
let dbState: DbSchema = loadDb();

console.log(`[DB] Fail-safe Database initialized at: ${dbFilePath}`);

// CRUD Helper Methods
export const dbQueries = {
  // Save or update checkpoint
  saveCheckpoint: (url: string, checkpointData: any) => {
    dbState.scraper_checkpoints[url] = {
      url,
      data: checkpointData,
      updated_at: new Date().toISOString()
    };
    saveDb(dbState);
  },

  // Load checkpoint
  loadCheckpoint: (url: string) => {
    return dbState.scraper_checkpoints[url]?.data || null;
  },

  // Insert or Update Trade Show
  upsertTradeShow: (show: any) => {
    if (!show || !show.id) return;
    const existing = dbState.trade_shows[show.id] || {};
    
    const incomingCount = (Array.isArray(show.exhibitors) && show.exhibitors.length > 0)
      ? show.exhibitors.length
      : (show.extractedExhibitorsCount || 0);
    const existingCount = existing.extractedExhibitorsCount || 0;
    const finalCount = Math.max(incomingCount, existingCount);

    dbState.trade_shows[show.id] = {
      id: show.id,
      eventName: show.eventName || existing.eventName || 'Trade Show',
      shortName: show.shortName || show.eventName || existing.shortName || '',
      category: show.category || existing.category || 'Trade Show',
      city: show.city || existing.city || '',
      state: show.state || existing.state || '',
      country: show.country || existing.country || 'USA',
      venue: show.venue || existing.venue || '',
      dates: show.dates || existing.dates || '',
      month: show.month || existing.month || '',
      year: show.year || existing.year || 2026,
      orbusUrl: show.orbusUrl || existing.orbusUrl || '',
      officialWebsite: show.officialWebsite || existing.officialWebsite || '',
      estimatedExhibitorsCount: show.estimatedExhibitorsCount || existing.estimatedExhibitorsCount || 0,
      extractedExhibitorsCount: finalCount,
      isUsa: show.isUsa ?? existing.isUsa ?? true,
      updatedAt: new Date().toISOString()
    };

    if (Array.isArray(show.exhibitors) && show.exhibitors.length > 0) {
      for (const ex of show.exhibitors) {
        dbQueries.upsertExhibitor(show.id, ex);
      }
    }
    saveDb(dbState);
  },

  // Insert or Update Exhibitor
  upsertExhibitor: (showId: string, ex: any) => {
    if (!ex || !ex.id) return;
    dbState.exhibitors[ex.id] = {
      id: ex.id,
      showId,
      companyName: ex.companyName || 'Unknown Exhibitor',
      tradeShowName: ex.tradeShowName || '',
      tradeShowCity: ex.tradeShowCity || '',
      tradeShowState: ex.tradeShowState || '',
      tradeShowDates: ex.tradeShowDates || '',
      tradeShowYear: ex.tradeShowYear || 2026,
      boothNumber: ex.boothNumber || null,
      boothSize: ex.boothSize || null,
      boothType: ex.boothType || null,
      estimatedBoothBudget: ex.estimatedBoothBudget || null,
      industry: ex.industry || null,
      website: ex.website || '',
      phone: ex.phone || '',
      city: ex.city || '',
      state: ex.state || '',
      country: ex.country || 'USA',
      description: ex.description || '',
      outreachStatus: ex.outreachStatus || 'New Lead',
      leadScore: ex.leadScore || 85,
      notes: ex.notes || '',
      extractedAt: ex.extractedAt || new Date().toISOString()
    };

    if (Array.isArray(ex.decisionMakers)) {
      for (const dm of ex.decisionMakers) {
        const dmId = dm.id || `dm-${ex.id}-${Math.random().toString(36).substring(2, 7)}`;
        dbState.decision_makers[dmId] = {
          id: dmId,
          exhibitorId: ex.id,
          name: dm.name || '',
          title: dm.title || '',
          department: dm.department || '',
          email: dm.email || '',
          emailConfidence: dm.emailConfidence || 'Verified',
          phone: dm.phone || ''
        };
      }
    }
  },

  // Get all trade shows with nested exhibitors and decision makers
  getAllTradeShows: () => {
    const shows = Object.values(dbState.trade_shows);
    const exhibitors = Object.values(dbState.exhibitors);
    const decisionMakers = Object.values(dbState.decision_makers);

    return shows.map(s => {
      const sName = (s.eventName || s.shortName || '').toLowerCase().trim();
      const showExhibitors = exhibitors
        .filter(ex => ex.showId === s.id || (ex.tradeShowName && ex.tradeShowName.toLowerCase().trim() === sName))
        .map(ex => {
          const exDms = decisionMakers.filter(dm => dm.exhibitorId === ex.id);
          return {
            ...ex,
            decisionMakers: exDms
          };
        });

      return {
        ...s,
        extractedExhibitorsCount: Math.max(s.extractedExhibitorsCount || 0, showExhibitors.length),
        exhibitors: showExhibitors
      };
    });
  },
  getExhibitorsForShow: (showId: string) => {
    const show = dbState.trade_shows[showId];
    const sName = (show?.eventName || show?.shortName || '').toLowerCase().trim();
    const exhibitors = Object.values(dbState.exhibitors);
    const decisionMakers = Object.values(dbState.decision_makers);
    return exhibitors
      .filter(ex => ex.showId === showId || (sName && ex.tradeShowName && ex.tradeShowName.toLowerCase().trim() === sName))
      .map(ex => ({
        ...ex,
        decisionMakers: decisionMakers.filter(dm => dm.exhibitorId === ex.id)
      }));
  }
};
