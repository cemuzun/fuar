export interface DecisionMaker {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title: string;
  department: string;
  email: string;
  emailConfidence: 'Verified' | 'Likely' | 'Pattern Generated';
  emailStatus?: 'Valid' | 'Bounced' | 'Unknown';
  phone: string;
  linkedinUrl?: string;
  notes?: string;
}

export interface ExhibitorCompany {
  id: string;
  companyName: string;
  tradeShowName: string;
  tradeShowCity: string;
  tradeShowState: string;
  tradeShowDates: string;
  tradeShowYear: number;
  boothNumber: string;
  boothSize: string; // e.g., '10x10', '10x20', '20x20 Island', '30x30 Custom'
  boothType: 'Inline' | 'Peninsula' | 'Island' | 'Corner' | 'Split Island' | 'Unspecified';
  estimatedBoothBudget: string; // e.g., '$15,000 - $35,000'
  industry: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  hqAddress?: string;
  hqZip?: string;
  employeeSize?: string | number;
  country: string;
  description: string;
  decisionMakers: DecisionMaker[];
  outreachStatus: 'New Lead' | 'Decision Maker Found' | 'Contacted' | 'Meeting Scheduled' | 'Proposal Sent' | 'Closed Won';
  leadScore: number; // 1 to 100
  notes: string;
  extractedAt: string;
  hubspotSynced?: boolean;
  hubspotId?: string;
}

export interface TradeShowEvent {
  id: string;
  eventName: string;
  shortName: string;
  category: string;
  city: string;
  state: string;
  venue: string;
  dates: string;
  month: string;
  year: number;
  orbusUrl?: string;
  officialWebsite?: string;
  estimatedExhibitorsCount: number;
  extractedExhibitorsCount: number;
  isUsa: boolean;
  exhibitors: ExhibitorCompany[];
}

export interface ExtractionFilter {
  searchQuery: string;
  state: string;
  industry: string;
  status: string;
  boothSize: string;
  hasDecisionMakerOnly: boolean;
}

export interface MetricConfig {
  id: string;
  label: string;
  enabled: boolean;
  type: 'builtIn' | 'custom';
  customValue?: string;
  category?: 'header' | 'analytics' | 'both';
  iconName?: string;
}

export interface DecisionSettings {
  leadTimeCutoffDays: number;
  hideShortLeadShows: boolean;
  warnOnOutreach: boolean;
  blockOutreachShortLead: boolean;
  minLeadScorePriority: number;
  requireVerifiedEmailForOutreach: boolean;
  autoLookupDmOnView: boolean;
}

export interface PitchConfig {
  companyName: string;
  decisionMakerName: string;
  decisionMakerTitle: string;
  tradeShowName: string;
  boothSize: string;
  valueProp: 'Turnkey Booth Rental & Fabrication' | 'Modular Reusable Displays' | 'Emergency Graphic Printing & I&D' | 'Full Custom Double-Deck Exhibit';
  customInstructions?: string;
}

export interface EmailAccountSettings {
  displayName: string;
  emailAddress: string;
  username: string;
  password?: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  useSsl: boolean;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export interface EmailMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  exhibitorName?: string;
  tradeShowName?: string;
  boothNumber?: string;
  statusTag?: 'Interested' | 'Quote Requested' | 'Follow-up Sent' | 'Meeting Scheduled' | 'New Email' | 'Delivered (SMTP)' | 'Undelivered (SMTP Error)' | string;
}
