export interface ExhibitorData {
  companyName: string;
  boothNumber: string | null;
  profileUrl: string | null;
  companyWebsite: string | null;
  sourceUrl: string;
  sourceEvidence: string;
  extractionMethod: 'json' | 'html' | 'ai' | 'fallback' | 'deterministic' | 'expoplatform_json' | 'expoplatform_dom';
  confidence: number;
  industry?: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface ScraperAdapter {
  name: string;
  detect(url: string, html: string): boolean;
  discoverPages(url: string, html: string, page: any): Promise<string[]>;
  extractExhibitors(url: string, html: string, page: any, interceptedXhr: any[], saveCheckpoint?: (url: string, data: any) => Promise<void>): Promise<ExhibitorData[]>;
}

export interface ExtractionDiagnostics {
  adapterUsed: string;
  directoryReportedCount: number | null;
  pagesFetched: number;
  uniqueRecordsExtracted: number;
  duplicatesRemoved: number;
  invalidRecordsRejected: number;
  paginationCompleted: boolean;
  attemptedUrls: string[];
  blockedReason: string | null;
}
