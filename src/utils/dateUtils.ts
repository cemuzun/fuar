/**
 * Utility functions to parse trade show date strings and calculate days remaining until event start date.
 */

export function getEventStartDate(datesStr: string, defaultYear: number = 2026): Date | null {
  if (!datesStr) return null;

  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Look for year match e.g., 2026 or 2027
  const yearMatch = datesStr.match(/\b(202\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : defaultYear;

  // Match month and day e.g. "Nov 3" or "March 25" or "Aug 15"
  const match = datesStr.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);

  if (match) {
    const monthKey = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const monthIndex = monthMap[monthKey] !== undefined ? monthMap[monthKey] : monthMap[monthKey.substring(0, 3)];

    if (monthIndex !== undefined && !isNaN(day)) {
      return new Date(year, monthIndex, day);
    }
  }

  return null;
}

/**
 * Calculates the number of days remaining until the trade show event starts.
 * Current reference date is 2026-07-29.
 */
export function getDaysUntilEvent(datesStr: string, defaultYear: number = 2026): number | null {
  const startDate = getEventStartDate(datesStr, defaultYear);
  if (!startDate) return null;

  // Reference today date in 2026
  const referenceToday = new Date(2026, 6, 29); // July 29, 2026
  const eventDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const diffMs = eventDate.getTime() - referenceToday.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Helper to check if event is within lead time cutoff days
 */
export function isWithinLeadTimeCutoff(datesStr: string, cutoffDays: number, defaultYear: number = 2026): boolean {
  const days = getDaysUntilEvent(datesStr, defaultYear);
  if (days === null) return false;
  return days <= cutoffDays;
}
