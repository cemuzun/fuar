import { TradeShowEvent, ExhibitorCompany, DecisionMaker } from '../types';

/**
 * Normalizes a company name for duplicate detection.
 * Removes common corporate suffixes, punctuation, and extra whitespace.
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\b(inc|llc|corp|corporation|ltd|limited|co|company|group|systems|technologies|tech|solutions|usa|north america)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a website URL for domain comparison.
 */
export function normalizeWebsite(url: string): string {
  if (!url) return '';
  return url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .trim();
}

/**
 * Merges two DecisionMaker arrays uniquely by email/name.
 */
function mergeDecisionMakers(dms1: DecisionMaker[] = [], dms2: DecisionMaker[] = []): DecisionMaker[] {
  const map = new Map<string, DecisionMaker>();

  [...dms1, ...dms2].forEach((dm) => {
    const key = dm.email ? dm.email.toLowerCase().trim() : dm.name.toLowerCase().trim();
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, { ...dm });
    } else {
      const existing = map.get(key)!;
      // Prefer verified email confidence
      if (dm.emailConfidence === 'Verified' && existing.emailConfidence !== 'Verified') {
        map.set(key, { ...dm });
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Merges duplicate ExhibitorCompany objects into a single master record.
 */
function mergeExhibitors(primary: ExhibitorCompany, secondary: ExhibitorCompany): ExhibitorCompany {
  const mergedDms = mergeDecisionMakers(primary.decisionMakers, secondary.decisionMakers);

  // Status hierarchy rank
  const statusRank: Record<string, number> = {
    'Closed Won': 6,
    'Proposal Sent': 5,
    'Meeting Scheduled': 4,
    'Contacted': 3,
    'Decision Maker Found': 2,
    'New Lead': 1,
  };

  const primaryRank = statusRank[primary.outreachStatus] || 1;
  const secondaryRank = statusRank[secondary.outreachStatus] || 1;
  const bestStatus = secondaryRank > primaryRank ? secondary.outreachStatus : primary.outreachStatus;

  const bestLeadScore = Math.max(primary.leadScore || 0, secondary.leadScore || 0);

  // Combine notes if distinct
  let combinedNotes = primary.notes || '';
  if (secondary.notes && secondary.notes !== primary.notes && !combinedNotes.includes(secondary.notes)) {
    combinedNotes = combinedNotes ? `${combinedNotes} | ${secondary.notes}` : secondary.notes;
  }

  return {
    ...primary,
    companyName: primary.companyName.length >= secondary.companyName.length ? primary.companyName : secondary.companyName,
    website: primary.website || secondary.website,
    phone: primary.phone || secondary.phone,
    description: primary.description && primary.description.length > secondary.description.length ? primary.description : (secondary.description || primary.description),
    decisionMakers: mergedDms,
    outreachStatus: bestStatus as any,
    leadScore: bestLeadScore,
    notes: combinedNotes,
    hubspotSynced: primary.hubspotSynced || secondary.hubspotSynced,
    hubspotId: primary.hubspotId || secondary.hubspotId,
  };
}

/**
 * Deduplicates companies across all trade shows or within a trade show array.
 * Merges duplicate entries and returns updated shows plus detailed statistics.
 */
export function deduplicateTradeShows(shows: TradeShowEvent[]): {
  updatedShows: TradeShowEvent[];
  removedCount: number;
  totalBefore: number;
  totalAfter: number;
} {
  let totalBefore = 0;
  const seenMap = new Map<string, { showIndex: number; exhibitorIndex: number; company: ExhibitorCompany }>();
  
  // Clone shows to avoid direct mutation
  const newShows: TradeShowEvent[] = shows.map((s) => ({
    ...s,
    exhibitors: [...(s.exhibitors || [])],
  }));

  // Pass 1: Identify duplicates and merge them into the first seen instance
  newShows.forEach((show, sIdx) => {
    totalBefore += show.exhibitors.length;

    const filteredExhibitors: ExhibitorCompany[] = [];

    show.exhibitors.forEach((ex) => {
      const normName = normalizeCompanyName(ex.companyName);
      const normWeb = normalizeWebsite(ex.website);

      // Match key: normalized company name OR normalized website domain if valid
      const matchKey = normName.length > 2 ? normName : normWeb;

      if (!matchKey) {
        filteredExhibitors.push(ex);
        return;
      }

      if (seenMap.has(matchKey)) {
        // Merge into existing master instance
        const existingRef = seenMap.get(matchKey)!;
        const targetShow = newShows[existingRef.showIndex];
        const existingEx = targetShow.exhibitors[existingRef.exhibitorIndex];

        targetShow.exhibitors[existingRef.exhibitorIndex] = mergeExhibitors(existingEx, ex);
        // Duplicate is skipped from filteredExhibitors
      } else {
        filteredExhibitors.push(ex);
        const newExIdx = filteredExhibitors.length - 1;
        seenMap.set(matchKey, {
          showIndex: sIdx,
          exhibitorIndex: newExIdx,
          company: ex,
        });
      }
    });

    show.exhibitors = filteredExhibitors;
    show.extractedExhibitorsCount = filteredExhibitors.length;
  });

  let totalAfter = 0;
  newShows.forEach((s) => {
    totalAfter += s.exhibitors.length;
  });

  const removedCount = totalBefore - totalAfter;

  return {
    updatedShows: newShows,
    removedCount,
    totalBefore,
    totalAfter,
  };
}
