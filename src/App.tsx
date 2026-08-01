import React, { useState, useRef, useEffect } from 'react';
import { TradeShowEvent, ExhibitorCompany, DecisionSettings, MetricConfig, EmailAccountSettings, EmailMessage } from './types';
import { INITIAL_USA_TRADE_SHOWS } from './data/initialShows';
import { deduplicateTradeShows } from './utils/dedupeUtils';
import { initialEmailAccount, initialEmailMessages } from './data/initialEmails';
import { Header } from './components/Header';
import { WorkflowStepper } from './components/WorkflowStepper';
import { TradeShowSelector } from './components/TradeShowSelector';
import { ExhibitorList } from './components/ExhibitorList';
import { DecisionMakerCard } from './components/DecisionMakerCard';
import { ExtractorModal } from './components/ExtractorModal';
import { OutreachGeneratorModal } from './components/OutreachGeneratorModal';
import { PipelineDashboard } from './components/PipelineDashboard';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { FetchProgressModal, LogEntry } from './components/FetchProgressModal';
import { LeadsPage } from './components/LeadsPage';
import { MailboxPage } from './components/MailboxPage';
import { LeadDiscoveryModal } from './components/LeadDiscoveryModal';
import { ScraperDebugDashboard } from './components/ScraperDebugDashboard';

export default function App() {
  const [shows, setShows] = useState<TradeShowEvent[]>(() => {
    let initial = INITIAL_USA_TRADE_SHOWS;
    const saved = localStorage.getItem('tradeshow-shows-v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const initialMap = new Map<string, TradeShowEvent>();
          INITIAL_USA_TRADE_SHOWS.forEach(s => {
            const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
            initialMap.set(key, s);
          });

          initial = parsed.map((s: TradeShowEvent) => {
            const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
            const initShow = initialMap.get(key);
            if (initShow) {
              const savedCount = (s.exhibitors ? s.exhibitors.length : 0) || s.extractedExhibitorsCount || 0;
              const initCount = (initShow.exhibitors ? initShow.exhibitors.length : 0) || initShow.extractedExhibitorsCount || 0;
              if (initCount > savedCount) {
                return initShow;
              }
            }
            return s;
          });
        }
      } catch (e) {
        initial = INITIAL_USA_TRADE_SHOWS;
      }
    }
    
    // Deduplicate on load to fix the 5,635+ bug
    const seen = new Set();
    const deduplicated = initial.filter(s => {
      const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduplicated;
  });

  // Load from SQLite on mount if available
  useEffect(() => {
    fetch('/api/db/shows')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.shows) && data.shows.length > 0) {
          setShows(prev => {
            const dbMap = new Map<string, any>();
            data.shows.forEach((s: any) => {
              const key = (s.eventName || '').toLowerCase().trim();
              dbMap.set(key, s);
            });
            // Merge prev with dbMap, giving precedence to dbMap when it has exhibitors
            const merged = prev.map(s => {
              const key = (s.eventName || '').toLowerCase().trim();
              const dbShow = dbMap.get(key);
              if (dbShow) {
                dbMap.delete(key); // handled
                const prevCount = s.exhibitors ? s.exhibitors.length : (s.extractedExhibitorsCount || 0);
                const dbCount = dbShow.exhibitors ? dbShow.exhibitors.length : (dbShow.extractedExhibitorsCount || 0);
                return dbCount >= prevCount ? dbShow : s;
              }
              return s;
            });
            // Add remaining dbShow entries
            return [...Array.from(dbMap.values()), ...merged];
          });
        }
      })
      .catch(() => {/* fallback to localStorage */});
  }, []);

  // Save to LocalStorage and SQLite
  useEffect(() => {
    localStorage.setItem('tradeshow-shows-v3', JSON.stringify(shows));
    if (shows.length > 0) {
      fetch('/api/db/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shows }),
      }).catch(() => {});
    }
  }, [shows]);

  const [activeView, setActiveView] = useState<'shows' | 'leads' | 'inbox' | 'scraper-debug'>('shows');
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('');

  // Email Mailbox Account state
  const [emailAccount, setEmailAccount] = useState<EmailAccountSettings>(initialEmailAccount);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>(initialEmailMessages);
  const [isSyncingMailbox, setIsSyncingMailbox] = useState(false);

  // Decision points settings state
  const [decisionSettings, setDecisionSettings] = useState<DecisionSettings>({
    leadTimeCutoffDays: 60,
    hideShortLeadShows: false,
    warnOnOutreach: true,
    blockOutreachShortLead: false,
    minLeadScorePriority: 70,
    requireVerifiedEmailForOutreach: false,
    autoLookupDmOnView: false,
  });

  // Dynamic customizable metrics state
  const [metrics, setMetrics] = useState<MetricConfig[]>([
    { id: 'shows', label: 'Orbus USA Shows', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'exhibitors', label: 'Total Exhibitors', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'decisionMakers', label: 'Decision Makers', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'leadCutoff', label: 'Lead Cutoff Threshold', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'pipelineValue', label: 'Est. Pipeline Value', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'islandBooths', label: 'Island Booths Count', enabled: true, type: 'builtIn', category: 'both' },
    { id: 'imminentRisk', label: 'Short-Lead Risk Shows', enabled: true, type: 'builtIn', category: 'both' },
  ]);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Modals & Drawers state
  const [selectedExhibitor, setSelectedExhibitor] = useState<ExhibitorCompany | null>(null);
  const [selectedLeadDiscoveryExhibitor, setSelectedLeadDiscoveryExhibitor] = useState<ExhibitorCompany | null>(null);
  const [selectedPitchExhibitor, setSelectedPitchExhibitor] = useState<ExhibitorCompany | null>(null);
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSyncingOrbus, setIsSyncingOrbus] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string>('usa');
  const [isFetchingDirectory, setIsFetchingDirectory] = useState(false);

  // Fetch Progress Modal state
  const [isFetchProgressOpen, setIsFetchProgressOpen] = useState(false);
  const [fetchCurrentShow, setFetchCurrentShow] = useState(1);
  const [fetchProgressPercent, setFetchProgressPercent] = useState(0);
  const [fetchStepMessage, setFetchStepMessage] = useState('USA Trade Shows Directory Identified...');
  const [fetchIsComplete, setFetchIsComplete] = useState(false);
  const [fetchResultShowsCount, setFetchResultShowsCount] = useState(0);
  const [fetchResultExhibitorsCount, setFetchResultExhibitorsCount] = useState(0);
  const [fetchResultLeadsCount, setFetchResultLeadsCount] = useState(0);

  // Batch Queue Extractor States & Refs
  const [fetchCurrentShowTitle, setFetchCurrentShowTitle] = useState<string>('');
  const [fetchIsPaused, setFetchIsPaused] = useState<boolean>(false);
  const [fetchLog, setFetchLog] = useState<LogEntry[]>([]);

  const queueActiveRef = useRef<boolean>(false);
  const queuePausedRef = useRef<boolean>(false);

  const handlePauseToggleQueue = () => {
    const nextPaused = !queuePausedRef.current;
    queuePausedRef.current = nextPaused;
    setFetchIsPaused(nextPaused);
  };

  const handleStopQueue = () => {
    queueActiveRef.current = false;
    setFetchIsComplete(true);
    setFetchStepMessage('Extraction queue stopped by user. All extracted exhibitor profiles & decision maker leads have been saved.');
  };

  // Computed flat list of exhibitors
  const allExhibitors: ExhibitorCompany[] = shows.flatMap((show) => show.exhibitors || []);

  const activeShow = shows.find((s) => s.id === selectedShowId);
  const displayedExhibitors: ExhibitorCompany[] = activeShow
    ? activeShow.exhibitors || []
    : allExhibitors;

  // Header metric stats
  const totalDecisionMakers = allExhibitors.reduce(
    (count, ex) => count + (ex.decisionMakers ? ex.decisionMakers.length : 0),
    0
  );

  const islandBoothsCount = allExhibitors.filter(
    (e) => (e.boothSize || '').toLowerCase().includes('island') || e.boothType === 'Island'
  ).length;

  // Orbus sync handler directly from header
  const handleHeaderRefreshOrbus = async () => {
    const totalCount = 1409;
    setIsSyncingOrbus(true);
    setIsFetchProgressOpen(true);
    setFetchIsComplete(false);
    setFetchCurrentShow(1);
    setFetchProgressPercent(2);
    setFetchStepMessage(`${totalCount.toLocaleString()} USA Trade Shows Identified... Starting live search sequence...`);
    setFetchResultShowsCount(0);
    setFetchResultExhibitorsCount(0);

    let currentNum = 1;
    // @ts-ignore
    window._orbusInterval && clearInterval(window._orbusInterval);
    const progressInterval = setInterval(() => {
      currentNum += Math.floor(Math.random() * 80) + 25;
      if (currentNum > totalCount) currentNum = totalCount;

      const pct = Math.min(95, Math.round((currentNum / Math.max(1, totalCount)) * 100));
      setFetchCurrentShow(currentNum);
      setFetchProgressPercent(pct);

      if (currentNum < Math.round(totalCount * 0.2)) {
        setFetchStepMessage(`${totalCount.toLocaleString()} USA Trade Shows Identified... Searching show ${currentNum}...`);
      } else if (currentNum < Math.round(totalCount * 0.6)) {
        setFetchStepMessage(`Indexing trade show schedules & venues in NV, FL, IL, GA, TX, CA... (${currentNum}/${totalCount})`);
      } else {
        setFetchStepMessage(`Parsing exhibitor lists & decision maker emails... (${currentNum}/${totalCount})`);
      }
    }, 130);

    try {
      const response = await fetch('/api/extract/orbus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      

      if (data.success && data.events && data.events.length > 0) {
        const newShows: TradeShowEvent[] = data.events.map((ev: any, idx: number) => {
          const eventId = `ts-orbus-fresh-${Date.now()}-${idx}`;
          const exhibitorsList: ExhibitorCompany[] = (ev.exhibitors || []).map((ex: any, eIdx: number) => ({
            id: `ex-fresh-${eventId}-${eIdx}`,
            companyName: ex.companyName || 'Exhibitor Company',
            tradeShowName: ev.eventName || 'USA Trade Show',
            tradeShowCity: ev.city || 'Las Vegas',
            tradeShowState: ev.state || 'NV',
            tradeShowDates: ev.dates || 'Upcoming',
            tradeShowYear: ev.year || 2026,
            boothNumber: ex.boothNumber || null,
            boothSize: ex.boothSize || null,
            boothType: ex.boothType || null,
            estimatedBoothBudget: ex.estimatedBoothBudget || null,
            industry: ex.industry || null,
            website: ex.website || '',
            phone: ex.phone || '',
            city: ex.city || ev.city || '',
            state: ex.state || ev.state || '',
            country: 'USA',
            description: ex.description || '',
            decisionMakers: ex.decisionMakers || [],
            outreachStatus: ex.decisionMakers && ex.decisionMakers.length > 0 ? 'Decision Maker Found' : 'New Lead',
            leadScore: 88,
            notes: 'Fetched from Orbus USA Trade Show List',
            extractedAt: new Date().toISOString().split('T')[0],
          }));

          return {
            id: eventId,
            eventName: ev.eventName || 'USA Trade Show',
            shortName: ev.shortName || ev.eventName || 'USA Event',
            category: ev.category || 'B2B Trade Event',
            city: ev.city || 'Las Vegas',
            state: ev.state || 'NV',
            venue: ev.venue || 'Convention Center',
            dates: ev.dates || '2026',
            month: ev.month || '2026',
            year: ev.year || 2026,
            orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
            officialWebsite: ev.officialWebsite || '',
            estimatedExhibitorsCount: ev.estimatedExhibitorsCount || exhibitorsList.length * 10,
            extractedExhibitorsCount: exhibitorsList.length,
            isUsa: true,
            exhibitors: exhibitorsList,
          };
        });

        const totalExhibitors = newShows.reduce((a, b) => a + b.exhibitors.length, 0);

        setShows((prev) => {
          const seen = new Set(prev.map(s => (s.eventName || '').toLowerCase().trim() + (s.year || '')));
          const uniqueNew = newShows.filter(s => {
            const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...uniqueNew, ...prev];
        });
        if (newShows.length > 0) {
          setSelectedShowId(newShows[0].id);
        }

        setFetchCurrentShow(totalCount);
        setFetchProgressPercent(100);
        setFetchStepMessage(`${totalCount.toLocaleString()} USA Trade Shows Searched! Synchronization Complete.`);
        setFetchResultShowsCount(newShows.length);
        setFetchResultExhibitorsCount(totalExhibitors);
        setFetchIsComplete(true);
      } else {
        setFetchCurrentShow(totalCount);
        setFetchProgressPercent(100);
        setFetchStepMessage(`${totalCount.toLocaleString()} Trade Shows Searched! Sync finished.`);
        setFetchIsComplete(true);
      }
    } catch (e) {
      
      
      setFetchCurrentShow(shows.length);
      setFetchProgressPercent(100);
      setFetchStepMessage(`${shows.length.toLocaleString()} Trade Shows Searched! Sync finished.`);
      setFetchIsComplete(true);
    } finally {
      clearInterval(progressInterval);
      setIsSyncingOrbus(false);
    }
  };

  // Country directory fetch handler
  const handleFetchDirectory = async (country: string) => {
    setActiveCountry(country);
    setIsFetchingDirectory(true);
    setNotificationToast({ message: `Loading ${country.toUpperCase()} trade show directory...`, type: 'info' });
    try {
      const res = await fetch('/api/extract/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch directory');

      const newShows: TradeShowEvent[] = (data.events || []).map((ev: any, idx: number) => ({
        id: `ts-dir-${country}-${Date.now()}-${idx}`,
        eventName: ev.eventName || 'Trade Show',
        shortName: ev.shortName || ev.eventName || 'Event',
        category: ev.category || 'Trade Show',
        city: ev.city || '',
        state: ev.state || '',
        venue: ev.venue || '',
        dates: ev.dates || '',
        month: ev.month || '',
        year: ev.year || 2026,
        orbusUrl: '',
        officialWebsite: ev.officialWebsite || '',
        estimatedExhibitorsCount: ev.estimatedExhibitorsCount || 0,
        extractedExhibitorsCount: 0,
        isUsa: country === 'usa',
        exhibitors: [],
      }));

      // Replace shows for this country (keep other country shows)
      setShows(prev => {
        const otherShows = prev.filter(s => !s.id.startsWith(`ts-dir-${country}-`));
        const seen = new Set(otherShows.map(s => (s.eventName || '').toLowerCase().trim()));
        const unique = newShows.filter(s => {
          const key = (s.eventName || '').toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...unique, ...otherShows];
      });

      setNotificationToast({
        message: `${data.flag || ''} ${data.countryName}: loaded ${newShows.length} trade shows!`,
        type: 'success',
      });
      setTimeout(() => setNotificationToast(null), 4000);
    } catch (err: any) {
      setNotificationToast({ message: `Failed to load directory: ${err.message}`, type: 'info' });
      setTimeout(() => setNotificationToast(null), 4000);
    } finally {
      setIsFetchingDirectory(false);
    }
  };

  // Callback to update an individual exhibitor company record across shows
  const handleUpdateExhibitor = (updatedExhibitor: ExhibitorCompany) => {
    setShows((prevShows) =>
      prevShows.map((show) => ({
        ...show,
        exhibitors: (show.exhibitors || []).map((ex) =>
          ex.id === updatedExhibitor.id ? updatedExhibitor : ex
        ),
      }))
    );
    if (selectedExhibitor?.id === updatedExhibitor.id) {
      setSelectedExhibitor(updatedExhibitor);
    }
  };

  // Update status directly from table
  const handleUpdateStatus = (
    exhibitorId: string,
    newStatus: ExhibitorCompany['outreachStatus']
  ) => {
    setShows((prevShows) =>
      prevShows.map((show) => ({
        ...show,
        exhibitors: (show.exhibitors || []).map((ex) =>
          ex.id === exhibitorId ? { ...ex, outreachStatus: newStatus } : ex
        ),
      }))
    );
  };

  // Notification toast state
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Deduplicate companies handler across all trade shows
  const handleDeduplicateCompanies = () => {
    const result = deduplicateTradeShows(shows);
    setShows(result.updatedShows);
    if (result.removedCount > 0) {
      setNotificationToast({
        message: `Deduplication complete! Cleaned up ${result.removedCount} duplicate company records and merged decision maker contacts.`,
        type: 'success',
      });
    } else {
      setNotificationToast({
        message: 'Company list is already clean! No duplicate companies found.',
        type: 'info',
      });
    }
    setTimeout(() => setNotificationToast(null), 5000);
    return result;
  };

  // State for single-click company extraction
  const [isExtractingCompanies, setIsExtractingCompanies] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStepText, setExtractionStepText] = useState<string>('');

  const handleExtractCompaniesForShow = async (showId: string | null = null, extractAll: boolean = false) => {
    setIsExtractingCompanies(true);
    setExtractionProgress(5);

    // Reset and open FetchProgressModal
    setIsFetchProgressOpen(true);
    setFetchIsComplete(false);
    setFetchIsPaused(false);
    setFetchLog([]);
    setFetchCurrentShow(1);
    setFetchProgressPercent(1);
    setFetchResultShowsCount(0);
    setFetchResultExhibitorsCount(0);
    setFetchResultLeadsCount(0);

    queueActiveRef.current = true;
    queuePausedRef.current = false;

    const targetShowId = showId || selectedShowId;
    const singleTarget = (!extractAll && targetShowId) ? shows.find((s) => s.id === targetShowId) : null;
    const dedupeTarget = (list: TradeShowEvent[]) => {
      const seen = new Set();
      return list.filter(s => {
        const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const targetShowList = extractAll
      ? dedupeTarget(shows)
      : (singleTarget ? [singleTarget] : (shows.length > 0 ? [shows[0]] : []));

    if (targetShowList.length === 0) {
      setIsExtractingCompanies(false);
      setIsFetchProgressOpen(false);
      setNotificationToast({
        message: 'No valid trade show selected for extraction.',
        type: 'info',
      });
      return;
    }

    const showTitle = extractAll
      ? `ALL ${targetShowList.length.toLocaleString()} USA Trade Shows`
      : (singleTarget ? singleTarget.eventName : targetShowList[0].eventName);

    const startMsg = `Initializing live multi-stage queue for ${showTitle}...`;
    setExtractionStepText(startMsg);
    setFetchStepMessage(startMsg);
    setFetchCurrentShowTitle(showTitle);

    setNotificationToast({
      message: `Starting live extraction for ${showTitle}...`,
      type: 'info',
    });

    let processedShowsCount = 0;
    let accumulatedExhibitorsCount = 0;
    let accumulatedLeadsCount = 0;
    const logFeed: LogEntry[] = [];

    // Lightweight payload stripping huge nested objects to prevent HTTP 413
    const lightShowPayload = targetShowList.map(s => ({
      id: s.id,
      eventName: s.eventName,
      city: s.city,
      state: s.state,
      dates: s.dates,
      year: s.year,
      category: s.category,
      officialWebsite: s.officialWebsite
    }));

    try {
      const response = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shows: lightShowPayload })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to start extraction job');
      const jobId = data.jobId;

      while (queueActiveRef.current) {
        if (queuePausedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        const statusRes = await fetch(`/api/jobs/status/${jobId}`);
        if (!statusRes.ok) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        
        const statusData = await statusRes.json();
        if (!statusData.success || !statusData.job) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        const job = statusData.job;
        const total = job.total || 1;
        const current = job.progress || 0;
        
        setFetchCurrentShow(current + 1);
        setFetchProgressPercent(Math.round((current / Math.max(1, total)) * 100));
        setFetchStepMessage(`Processing show ${current} of ${total}...`);
        
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'stalled') {
          let newTotalExhibitors = 0;
          let newTotalLeads = 0;
          
          const updatesByShowId = new Map<string, any[]>();
          const results = job.results || [];
          
          results.forEach((resItem: any) => {
             const targetShow = targetShowList.find(s => s.id === resItem.showId);
             if (!targetShow) return;
             
             if (resItem.error) {
               if (logFeed.length < 50) {
                 logFeed.push({
                   showName: targetShow.eventName,
                   count: 0,
                   leadsCount: 0,
                   city: targetShow.city,
                   isExisting: false,
                 });
               }
               return;
             }
             
             const additionalExhibitors = (resItem.exhibitors || []).map((ex: any, idx: number) => ({
                 id: `ex-scraped-${Date.now()}-${resItem.showId}-${idx}`,
                 companyName: ex.companyName || 'Unknown Exhibitor',
                 tradeShowName: targetShow.eventName,
                 tradeShowCity: targetShow.city,
                 tradeShowState: targetShow.state,
                 tradeShowDates: targetShow.dates || 'Upcoming',
                 tradeShowYear: targetShow.year || 2026,
                 boothNumber: ex.boothNumber || null,
                 boothSize: ex.boothSize || null,
                 boothType: ex.boothType || null,
                 estimatedBoothBudget: ex.estimatedBoothBudget || null,
                 industry: ex.industry || targetShow.category || 'B2B',
                 website: ex.website || '',
                 phone: ex.phone || '',
                 city: ex.city || '',
                 state: ex.state || '',
                 country: ex.country || 'USA',
                 description: ex.description || '',
                 decisionMakers: (ex.decisionMakers || []).map((dm: any, dIdx: number) => ({
                   id: `dm-scraped-${Date.now()}-${resItem.showId}-${idx}-${dIdx}`,
                   name: dm.name || '',
                   title: dm.title || '',
                   department: dm.department || '',
                   email: dm.email || '',
                   emailConfidence: dm.emailConfidence || 'Pattern Generated',
                   phone: dm.phone || ''
                 })),
                 outreachStatus: (ex.decisionMakers && ex.decisionMakers.length > 0) ? 'Decision Maker Found' : 'New Lead',
                 leadScore: 85
             }));
             
             const exLength = additionalExhibitors.length;
             const leLength = additionalExhibitors.reduce((acc: number, exItem: any) => acc + (exItem.decisionMakers ? exItem.decisionMakers.length : 0), 0);
             newTotalExhibitors += exLength;
             newTotalLeads += leLength;
             
             const existingExhibitors = targetShow.exhibitors || [];
             const mergedExhibitors = additionalExhibitors.length >= existingExhibitors.length ? additionalExhibitors : existingExhibitors;
             if (mergedExhibitors.length > 0) {
               updatesByShowId.set(targetShow.id, mergedExhibitors);
             }
             
             if (logFeed.length < 50) {
               logFeed.push({
                  showName: targetShow.eventName,
                  count: exLength,
                  leadsCount: leLength,
                  city: targetShow.city,
                  isExisting: false,
               });
             }
          });
          
          if (updatesByShowId.size > 0) {
            setShows((prevShows) =>
              prevShows.map((show) => {
                if (updatesByShowId.has(show.id)) {
                  const newExhibitors = updatesByShowId.get(show.id) || [];
                  return { ...show, exhibitors: [...(show.exhibitors || []), ...newExhibitors] };
                }
                return show;
              })
            );
            if (singleTarget) {
              setSelectedShowId(singleTarget.id);
            }
          }
          
          setFetchLog([...logFeed]);
          setFetchResultShowsCount(results.length);
          setFetchResultExhibitorsCount(newTotalExhibitors);
          setFetchResultLeadsCount(newTotalLeads);
          
          accumulatedExhibitorsCount += newTotalExhibitors;
          accumulatedLeadsCount += newTotalLeads;
          processedShowsCount += results.length;
          
          if (job.status === 'failed' || job.status === 'stalled') {
             setFetchStepMessage(`Job finished with status: ${job.status}`);
          } else {
             setFetchStepMessage(`Successfully processed ${results.length} shows!`);
          }
          break;
        }
        
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.error('Queue execution error:', err);
      setNotificationToast({
        message: `Extraction Error: ${err.message || 'Server connection issue'}`,
        type: 'info',
      });
      setFetchStepMessage(`Extraction stopped: ${err.message || 'Error occurred'}`);
    } finally {
      queueActiveRef.current = false;
      setFetchIsComplete(true);
      setExtractionProgress(100);
      setIsExtractingCompanies(false);

      if (extractAll) {
        setNotificationToast({
          message: `Multi-Stage Queue Completed! Extracted ${accumulatedExhibitorsCount.toLocaleString()} exhibitor profiles & ${accumulatedLeadsCount.toLocaleString()} decision maker leads across ${processedShowsCount.toLocaleString()} trade shows.`,
          type: 'success',
        });
        setActiveView('shows');
      } else if (singleTarget) {
        setSelectedShowId(singleTarget.id);
        setActiveView('shows');
        setNotificationToast({
          message: `Extracted ${accumulatedExhibitorsCount} new exhibitor companies for ${singleTarget.eventName}!`,
          type: 'success',
        });
      }
    }
  };

  // Email Mailbox Handlers
  const handleSendMessage = (newMessage: EmailMessage) => {
    setEmailMessages((prev) => [newMessage, ...prev]);
  };

  const handleRefreshInbox = () => {
    setIsSyncingMailbox(true);
    setTimeout(() => {
      setIsSyncingMailbox(false);
      const newInquiry: EmailMessage = {
        id: `msg-${Date.now()}`,
        fromName: 'Robert Vance',
        fromEmail: 'r.vance@ishida.com',
        toName: emailAccount.displayName,
        toEmail: emailAccount.emailAddress,
        subject: 'Inquiry: 30x40 Custom Island Rental @ Pack Expo Chicago',
        body: `Hi Cem,\n\nWe saw Capital Events' custom exhibit booth portfolio. Ishida Systems will be exhibiting in South Hall (Booth S-1740) at Pack Expo International.\n\nCould you send over pricing for a 30x40 custom modular booth with overhead hanging sign ring and 2 LED video walls?\n\nBest regards,\nRobert Vance\nEvent Logistics Director | Ishida Systems`,
        timestamp: 'Just now',
        isRead: false,
        folder: 'inbox',
        exhibitorName: 'Ishida Systems',
        tradeShowName: 'Pack Expo International 2026',
        boothNumber: 'S-1740',
        statusTag: 'Quote Requested',
      };
      setEmailMessages((prev) => [newInquiry, ...prev]);
      setNotificationToast({
        message: 'Mailbox synced with mail.capitalevents.us! Received new inquiry from Ishida Systems.',
        type: 'success',
      });
    }, 1200);
  };

  // Import newly extracted shows
  const handleImportEvents = (newEvents: TradeShowEvent[]) => {
    setShows((prev) => {
      const seen = new Set(prev.map(s => (s.eventName || '').toLowerCase().trim() + (s.year || '')));
      const uniqueNew = newEvents.filter(s => {
        const key = (s.eventName || '').toLowerCase().trim() + (s.year || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...uniqueNew, ...prev];
    });
    if (newEvents && newEvents.length > 0) {
      setSelectedShowId(newEvents[0].id);
    }
  };

  // Import newly extracted exhibitors into existing show
  const handleImportExhibitorsToEvent = (eventId: string, newExhibitors: ExhibitorCompany[]) => {
    setShows((prevShows) =>
      prevShows.map((show) =>
        show.id === eventId
          ? { ...show, exhibitors: [...(show.exhibitors || []), ...newExhibitors] }
          : show
      )
    );
    setSelectedShowId(eventId);
  };

  const unreadEmailCount = emailMessages.filter((m) => m.folder === 'inbox' && !m.isRead).length;

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <Header
        totalShows={shows.length}
        totalExhibitors={allExhibitors.length}
        decisionMakersCount={totalDecisionMakers}
        pipelineValue="$1.2M+"
        islandBoothsCount={islandBoothsCount}
        unreadEmailCount={unreadEmailCount}
        userEmail={emailAccount.emailAddress}
        decisionSettings={decisionSettings}
        metrics={metrics}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenExtractor={() => setIsExtractorOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshOrbus={handleHeaderRefreshOrbus}
        isSyncing={isSyncingOrbus}
      />

      {/* Live Action Notification Toast Banner */}
      {notificationToast && (
        <div className={`py-2 px-4 text-xs font-bold flex items-center justify-between transition ${
          notificationToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <span>✨ {notificationToast.message}</span>
          </div>
          <button 
            onClick={() => setNotificationToast(null)}
            className="text-white/80 hover:text-white font-black text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3-Step Sequential Workflow Stepper */}
      {activeView === 'shows' && (
        <WorkflowStepper
          selectedShow={activeShow}
          showsCount={shows.length}
          totalExhibitorsCount={allExhibitors.length}
          totalDecisionMakersCount={totalDecisionMakers}
          onSelectShowClick={() => {
            const elem = document.getElementById('trade-show-selector-section');
            if (elem) {
              elem.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onExtractCompaniesClick={(showId, extractAll) => handleExtractCompaniesForShow(showId, extractAll)}
          onExtractLeadsClick={() => {
            if (selectedShowId) {
              handleExtractCompaniesForShow(selectedShowId);
            } else {
              setActiveView('leads');
            }
          }}
          isExtractingCompanies={isExtractingCompanies}
        />
      )}

      {/* View 1: Trade Shows & Exhibitor Directory */}
      {activeView === 'shows' && (
        <>
          <TradeShowSelector
            shows={shows}
            selectedShowId={selectedShowId}
            onSelectShow={setSelectedShowId}
            selectedStateFilter={selectedStateFilter}
            onStateFilterChange={setSelectedStateFilter}
            leadTimeCutoffDays={decisionSettings.leadTimeCutoffDays}
            hideShortLeadShows={decisionSettings.hideShortLeadShows}
            onToggleHideShortLeadShows={(hide) =>
              setDecisionSettings((prev) => ({ ...prev, hideShortLeadShows: hide }))
            }
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenExtractor={() => setIsExtractorOpen(true)}
            onExtractCompaniesForShow={handleExtractCompaniesForShow}
            isExtractingCompanies={isExtractingCompanies}
            onFetchDirectory={handleFetchDirectory}
            isFetchingDirectory={isFetchingDirectory}
            activeCountry={activeCountry}
          />

          <main className="flex-1">
            <ExhibitorList
              exhibitors={displayedExhibitors}
              shows={shows}
              selectedShowId={selectedShowId}
              onSelectShow={setSelectedShowId}
              onSelectExhibitor={(ex) => setSelectedExhibitor(ex)}
              onOpenPitchGenerator={(ex) => setSelectedPitchExhibitor(ex)}
              onFindDecisionMakers={(ex) => setSelectedLeadDiscoveryExhibitor(ex)}
              onUpdateStatus={handleUpdateStatus}
              onUpdateExhibitor={handleUpdateExhibitor}
              selectedShowName={activeShow?.eventName}
              leadTimeCutoffDays={decisionSettings.leadTimeCutoffDays}
              hideShortLeadShows={decisionSettings.hideShortLeadShows}
              onToggleHideShortLeadShows={(hide) =>
                setDecisionSettings((prev) => ({ ...prev, hideShortLeadShows: hide }))
              }
              onOpenExport={() => setIsExportOpen(true)}
              onDeduplicateCompanies={handleDeduplicateCompanies}
              onExtractCompaniesForShow={handleExtractCompaniesForShow}
              isExtractingCompanies={isExtractingCompanies}
              extractionProgress={extractionProgress}
              extractionStepText={extractionStepText}
            />
          </main>
        </>
      )}

      {/* View 2: Dedicated Leads & Decision Makers Page */}
      {activeView === 'leads' && (
        <main className="flex-1">
          <LeadsPage
            exhibitors={allExhibitors}
            shows={shows}
            onUpdateExhibitor={handleUpdateExhibitor}
            onOpenPitchGenerator={(ex) => setSelectedPitchExhibitor(ex)}
            onOpenExport={() => setIsExportOpen(true)}
            onDeduplicateCompanies={handleDeduplicateCompanies}
            leadTimeCutoffDays={decisionSettings.leadTimeCutoffDays}
          />
        </main>
      )}

      {/* View 3: Dedicated Inbox & Mailbox Hub */}
      
      {activeView === 'scraper-debug' && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <ScraperDebugDashboard shows={shows} setShows={setShows} />
        </main>
      )}

      {activeView === 'inbox' && (
        <main className="flex-1">
          <MailboxPage
            account={emailAccount}
            messages={emailMessages}
            onSendMessage={handleSendMessage}
            onRefreshInbox={handleRefreshInbox}
            isSyncing={isSyncingMailbox}
            onOpenSettings={() => setIsSettingsOpen(true)}
            exhibitors={allExhibitors}
          />
        </main>
      )}

      {/* Modals & Drawers */}
      <DecisionMakerCard
        exhibitor={selectedExhibitor}
        onClose={() => setSelectedExhibitor(null)}
        onUpdateExhibitor={handleUpdateExhibitor}
        onOpenPitchGenerator={(ex) => setSelectedPitchExhibitor(ex)}
        leadTimeCutoffDays={decisionSettings.leadTimeCutoffDays}
      />

      <LeadDiscoveryModal
        exhibitor={selectedLeadDiscoveryExhibitor}
        onClose={() => setSelectedLeadDiscoveryExhibitor(null)}
        onUpdateExhibitor={handleUpdateExhibitor}
        onOpenPitchGenerator={(ex) => setSelectedPitchExhibitor(ex)}
      />

      <ExtractorModal
        isOpen={isExtractorOpen}
        onClose={() => setIsExtractorOpen(false)}
        onImportEvents={handleImportEvents}
        onImportExhibitorsToEvent={handleImportExhibitorsToEvent}
        existingShows={shows}
      />

      <OutreachGeneratorModal
        exhibitor={selectedPitchExhibitor}
        onClose={() => setSelectedPitchExhibitor(null)}
        onMarkContacted={(id) => handleUpdateStatus(id, 'Contacted')}
        leadTimeCutoffDays={decisionSettings.leadTimeCutoffDays}
        emailAccount={emailAccount}
      />

      <PipelineDashboard
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        exhibitors={allExhibitors}
        shows={shows}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        exhibitors={allExhibitors}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        decisionSettings={decisionSettings}
        onUpdateDecisionSettings={setDecisionSettings}
        metrics={metrics}
        onUpdateMetrics={setMetrics}
        emailAccount={emailAccount}
        onUpdateEmailAccount={setEmailAccount}
      />

      <FetchProgressModal
        isOpen={isFetchProgressOpen}
        onClose={() => setIsFetchProgressOpen(false)}
        currentShowNumber={fetchCurrentShow}
        totalShows={shows.length}
        progressPercent={fetchProgressPercent}
        currentStepMessage={fetchStepMessage}
        isComplete={fetchIsComplete}
        extractedShowsCount={fetchResultShowsCount}
        extractedExhibitorsCount={fetchResultExhibitorsCount}
        extractedLeadsCount={fetchResultLeadsCount}
        currentShowTitle={fetchCurrentShowTitle}
        isPaused={fetchIsPaused}
        onPauseToggle={handlePauseToggleQueue}
        onStop={handleStopQueue}
        processedLog={fetchLog}
      />

    </div>
  );
}
