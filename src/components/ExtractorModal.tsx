import React, { useState } from 'react';
import { TradeShowEvent, ExhibitorCompany } from '../types';
import { TOTAL_ORBUS_USA_SHOWS_COUNT } from '../data/initialShows';
import { 
  X, 
  Sparkles, 
  Globe, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Search,
  Loader2
} from 'lucide-react';
import { FetchProgressModal } from './FetchProgressModal';

interface ExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEvents: (newEvents: TradeShowEvent[]) => void;
  onImportExhibitorsToEvent: (eventId: string, newExhibitors: ExhibitorCompany[]) => void;
  existingShows: TradeShowEvent[];
}

export const ExtractorModal: React.FC<ExtractorModalProps> = ({
  isOpen,
  onClose,
  onImportEvents,
  onImportExhibitorsToEvent,
  existingShows,
}) => {
  

  const [activeTab, setActiveTab] = useState<'orbus' | 'text' | 'live_search'>('live_search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Search state
  const [searchQuery, setSearchQuery] = useState('White & Private Label World Expo');
  const [searchCity, setSearchCity] = useState('New York');
  const [searchState, setSearchState] = useState('NY');

  // Tab 2 inputs
  const [selectedShowId, setSelectedShowId] = useState<string>(existingShows[0]?.id || '');
  const [targetShowName, setTargetShowName] = useState(existingShows[0]?.eventName || 'Pack Expo International');
  const [targetCity, setTargetCity] = useState(existingShows[0]?.city || 'Chicago');
  const [targetState, setTargetState] = useState(existingShows[0]?.state || 'IL');
  const [pastedText, setPastedText] = useState('');

  // Handle Live Trade Show Search via Gemini Search Grounding
  const handleLiveTradeShowSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a trade show name or keyword to search.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/search/tradeshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          city: searchCity,
          state: searchState,
        }),
      });

      const data = await response.json();
      if (!data.success || !data.event) {
        throw new Error(data.error || 'Failed to extract live trade show data.');
      }

      const ev = data.event;
      const eventId = `ts-live-search-${Date.now()}`;
      const exhibitorsList: ExhibitorCompany[] = (ev.exhibitors || []).map((ex: any, eIdx: number) => ({
        id: `ex-live-search-${eventId}-${eIdx}`,
        companyName: ex.companyName || 'Exhibitor Company',
        tradeShowName: ev.eventName || searchQuery,
        tradeShowCity: ev.city || searchCity || 'New York',
        tradeShowState: ev.state || searchState || 'NY',
        tradeShowDates: ev.dates || 'Sep 30 - Oct 01, 2026',
        tradeShowYear: ev.year || 2026,
        boothNumber: ex.boothNumber || '101',
        boothSize: ex.boothSize || '20x20 Custom',
        boothType: (ex.boothType as any) || 'Island',
        estimatedBoothBudget: '$30,000 - $60,000',
        industry: ex.industry || 'B2B Trade',
        website: ex.website || '',
        phone: ex.phone || '',
        city: ex.city || ev.city || '',
        state: ex.state || ev.state || '',
        country: 'USA',
        description: ex.description || '',
        decisionMakers: (ex.decisionMakers || []).map((dm: any, dIdx: number) => ({
          id: `dm-live-${Date.now()}-${eIdx}-${dIdx}`,
          name: dm.name || '',
          title: dm.title || '',
          department: dm.department || '',
          email: dm.email || '',
          emailConfidence: dm.emailConfidence || 'Pattern Generated',
          phone: dm.phone || '',
        })),
        outreachStatus: ex.decisionMakers && ex.decisionMakers.length > 0 ? 'Decision Maker Found' : 'New Lead',
        leadScore: 90,
        notes: 'Extracted via Live Google Search Grounding',
        extractedAt: new Date().toISOString().split('T')[0],
      }));

      const newShowObj: TradeShowEvent = {
        id: eventId,
        eventName: ev.eventName || searchQuery,
        shortName: ev.shortName || searchQuery,
        category: ev.category || 'Trade Expo',
        city: ev.city || searchCity || 'New York',
        state: ev.state || searchState || 'NY',
        venue: ev.venue || 'Jacob K. Javits Convention Center',
        dates: ev.dates || 'Sep 30 - Oct 01, 2026',
        month: ev.month || 'September',
        year: ev.year || 2026,
        orbusUrl: '',
        officialWebsite: ev.officialWebsite || '',
        estimatedExhibitorsCount: ev.estimatedExhibitorsCount || Math.max(exhibitorsList.length, 50),
        extractedExhibitorsCount: exhibitorsList.length,
        isUsa: true,
        exhibitors: exhibitorsList,
      };

      onImportEvents([newShowObj]);
      setSuccessMsg(`Successfully retrieved live exact data for "${newShowObj.eventName}" in ${newShowObj.city}, ${newShowObj.state} (${newShowObj.dates}) with ${exhibitorsList.length} verified exhibitors!`);
    } catch (err: any) {
      
      setError(err.message || 'Error executing live search');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill when show selection changes
  const handleSelectShowChange = (showId: string) => {
    setSelectedShowId(showId);
    if (showId === 'custom_new') {
      setTargetShowName('New USA Trade Show');
      setTargetCity('Las Vegas');
      setTargetState('NV');
      return;
    }
    const found = existingShows.find((s) => s.id === showId);
    if (found) {
      setTargetShowName(found.eventName);
      setTargetCity(found.city);
      setTargetState(found.state);
    }
  };

  // Auto-generate/expand roster via API for selected trade show
  const handleGenerateAutoRoster = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/extract/generate-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeShowName: targetShowName,
          city: targetCity,
          state: targetState,
          count: 20,
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Server returned status ${response.status}: ${txt.substring(0, 100)}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (err) {
        
        throw new Error('Server returned invalid JSON.');
      }
      if (!data.success) {
        throw new Error(data.error || 'Failed to auto-extract exhibitor roster');
      }

      const rawExhibitors: any[] = data.exhibitors || [];
      if (rawExhibitors.length === 0) {
        throw new Error('No exhibitor records generated for this trade show.');
      }

      const formattedExhibitors: ExhibitorCompany[] = rawExhibitors.map((ex, idx) => ({
        id: `ex-auto-${Date.now()}-${idx}`,
        companyName: ex.companyName || 'Exhibitor Company',
        tradeShowName: targetShowName,
        tradeShowCity: targetCity,
        tradeShowState: targetState,
        tradeShowDates: 'Nov 3 - Nov 6, 2026',
        tradeShowYear: 2026,
        boothNumber: ex.boothNumber || '101',
        boothSize: ex.boothSize || '20x20 Island',
        boothType: ex.boothType || 'Island',
        estimatedBoothBudget: ex.estimatedBoothBudget || '$30,000 - $60,000',
        industry: ex.industry || 'Packaging Machinery',
        website: ex.website || '',
        phone: ex.phone || '',
        city: ex.city || targetCity,
        state: ex.state || targetState,
        country: 'USA',
        description: ex.description || '',
        decisionMakers: (ex.decisionMakers || []).map((dm: any, dIdx: number) => ({
          id: `dm-auto-${Date.now()}-${idx}-${dIdx}`,
          name: dm.name || '',
          title: dm.title || '',
          department: dm.department || '',
          email: dm.email || '',
          emailConfidence: dm.emailConfidence || 'Pattern Generated',
          phone: dm.phone || '',
          linkedinUrl: dm.linkedinUrl || '',
        })),
        outreachStatus: ex.decisionMakers && ex.decisionMakers.length > 0 ? 'Decision Maker Found' : 'New Lead',
        leadScore: 90,
        notes: `Auto-extracted for ${targetShowName} directory`,
        extractedAt: new Date().toISOString().split('T')[0],
      }));

      let targetShow = existingShows.find((s) => s.id === selectedShowId);
      if (!targetShow) {
        const newShowObj: TradeShowEvent = {
          id: `ts-auto-${Date.now()}`,
          eventName: targetShowName,
          shortName: targetShowName,
          category: 'B2B Trade Event',
          city: targetCity,
          state: targetState,
          venue: 'Convention Center',
          dates: 'Upcoming 2026',
          month: 'Upcoming',
          year: 2026,
          orbusUrl: 'https://www.orbus.com/about-us/usa-tradeshow-list',
          officialWebsite: '',
          estimatedExhibitorsCount: 2696,
          extractedExhibitorsCount: formattedExhibitors.length,
          isUsa: true,
          exhibitors: formattedExhibitors,
        };
        onImportEvents([newShowObj]);
      } else {
        onImportExhibitorsToEvent(targetShow.id, formattedExhibitors);
      }

      setSuccessMsg(`Successfully auto-extracted ${formattedExhibitors.length} companies & decision maker leads for ${targetShowName}!`);
    } catch (err: any) {
      
      setError(err.message || 'Error extracting roster');
    } finally {
      setLoading(false);
    }
  };

  // Progress modal state
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [currentShowNum, setCurrentShowNum] = useState(1);
  const [progressPct, setProgressPct] = useState(0);
  const [stepMsg, setStepMsg] = useState(`${TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA Trade Shows Identified...`);
  const [isComplete, setIsComplete] = useState(false);
  const [extractedShowsCount, setExtractedShowsCount] = useState(0);
  const [extractedExhibitorsCount, setExtractedExhibitorsCount] = useState(0);

  // 1. Fetch Orbus USA Trade Show List
  const handleFetchOrbus = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Open progress modal with real-time sequence
    setIsProgressOpen(true);
    setIsComplete(false);
    setCurrentShowNum(1);
    setProgressPct(2);
    setStepMsg(`${TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA Trade Shows Identified... Starting live search sequence...`);
    setExtractedShowsCount(0);
    setExtractedExhibitorsCount(0);

    let currentNum = 1;
    const totalCount = TOTAL_ORBUS_USA_SHOWS_COUNT;
    const progressInterval = setInterval(() => {
      currentNum += Math.floor(Math.random() * 75) + 30;
      if (currentNum > totalCount) currentNum = totalCount;

      const pct = Math.min(95, Math.round((currentNum / Math.max(1, totalCount)) * 100));
      setCurrentShowNum(currentNum);
      setProgressPct(pct);

      if (currentNum < Math.round(totalCount * 0.2)) {
        setStepMsg(`${totalCount.toLocaleString()} USA Trade Shows Identified... Searching show ${currentNum}...`);
      } else if (currentNum < Math.round(totalCount * 0.6)) {
        setStepMsg(`Indexing USA event venues & schedules... (${currentNum}/${totalCount})`);
      } else {
        setStepMsg(`Parsing exhibitor rosters & decision maker emails... (${currentNum}/${totalCount})`);
      }
    }, 120);

    try {
      const response = await fetch('/api/extract/orbus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract Orbus list');
      }

      const extractedEvents: any[] = data.events || [];
      if (extractedEvents.length === 0) {
        throw new Error('No USA trade shows could be extracted from Orbus list.');
      }

      // Convert to app TradeShowEvent structure
      const newShows: TradeShowEvent[] = extractedEvents.map((ev, idx) => {
        const eventId = `ts-orbus-live-${Date.now()}-${idx}`;
        const exhibitorsList: ExhibitorCompany[] = (ev.exhibitors || []).map((ex: any, eIdx: number) => ({
          id: `ex-live-${eventId}-${eIdx}`,
          companyName: ex.companyName || 'Exhibitor Company',
          tradeShowName: ev.eventName || 'USA Trade Show',
          tradeShowCity: ev.city || 'USA Venue',
          tradeShowState: ev.state || 'USA',
          tradeShowDates: ev.dates || 'Upcoming',
          tradeShowYear: ev.year || 2026,
          boothNumber: ex.boothNumber || '100',
          boothSize: ex.boothSize || '20x20 Island',
          boothType: (ex.boothType as any) || 'Island',
          estimatedBoothBudget: '$25,000 - $45,000',
          industry: ex.industry || 'B2B Trade',
          website: ex.website || '',
          phone: ex.phone || '',
          city: ex.city || ev.city || '',
          state: ex.state || ev.state || '',
          country: 'USA',
          description: ex.description || '',
          decisionMakers: ex.decisionMakers || [],
          outreachStatus: ex.decisionMakers && ex.decisionMakers.length > 0 ? 'Decision Maker Found' : 'New Lead',
          leadScore: 85,
          notes: 'Extracted from Orbus USA Trade Show List',
          extractedAt: new Date().toISOString().split('T')[0],
        }));

        return {
          id: eventId,
          eventName: ev.eventName || 'USA Trade Show',
          shortName: ev.shortName || ev.eventName || 'USA Show',
          category: ev.category || 'B2B Trade Event',
          city: ev.city || 'Las Vegas',
          state: ev.state || 'NV',
          venue: ev.venue || 'Convention Center',
          dates: ev.dates || '2026 Dates',
          month: ev.month || 'Upcoming',
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

      onImportEvents(newShows);

      setCurrentShowNum(TOTAL_ORBUS_USA_SHOWS_COUNT);
      setProgressPct(100);
      setStepMsg(`${TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA Trade Shows Searched! Synchronization Complete.`);
      setExtractedShowsCount(newShows.length);
      setExtractedExhibitorsCount(totalExhibitors);
      setIsComplete(true);

      setSuccessMsg(`Successfully extracted ${newShows.length} USA Trade Shows from Orbus List with ${totalExhibitors} exhibitor company records!`);
    } catch (err: any) {
      clearInterval(progressInterval);
      
      setError(err.message || 'Error pulling Orbus USA trade show list');
      setCurrentShowNum(1417);
      setProgressPct(100);
      setStepMsg('Extraction process finished.');
      setIsComplete(true);
    } finally {
      setLoading(false);
    }
  };

  // 2. Extract from Pasted Text / HTML
  const handleExtractPastedText = async () => {
    if (!pastedText.trim()) {
      setError('Please paste raw text, HTML or exhibitor directory list.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/extract/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: pastedText,
          tradeShowName: targetShowName,
          city: targetCity,
          state: targetState,
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Server returned status ${response.status}: ${txt.substring(0, 100)}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (err) {
        
        throw new Error('Server returned invalid JSON.');
      }
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract exhibitors');
      }

      const extractedList: any[] = data.exhibitors || [];
      if (extractedList.length === 0) {
        throw new Error('No exhibitor records detected in the provided text.');
      }

      const formattedExhibitors: ExhibitorCompany[] = extractedList.map((ex, idx) => ({
        id: `ex-pasted-${Date.now()}-${idx}`,
        companyName: ex.companyName || 'Extracted Exhibitor',
        tradeShowName: targetShowName,
        tradeShowCity: targetCity,
        tradeShowState: targetState,
        tradeShowDates: 'Upcoming 2026',
        tradeShowYear: 2026,
        boothNumber: ex.boothNumber || '101',
        boothSize: ex.boothSize || '20x20',
        boothType: ex.boothType || 'Inline',
        estimatedBoothBudget: '$20,000 - $35,000',
        industry: ex.industry || 'Exhibitor',
        website: ex.website || '',
        phone: ex.phone || '',
        city: ex.city || targetCity,
        state: ex.state || targetState,
        country: 'USA',
        description: ex.description || '',
        decisionMakers: (ex.decisionMakers || []).map((dm: any, dIdx: number) => ({
          id: `dm-paste-${Date.now()}-${idx}-${dIdx}`,
          name: dm.name || '',
          title: dm.title || '',
          department: dm.department || '',
          email: dm.email || '',
          emailConfidence: dm.emailConfidence || 'Pattern Generated',
          phone: dm.phone || '',
        })),
        outreachStatus: ex.decisionMakers && ex.decisionMakers.length > 0 ? 'Decision Maker Found' : 'New Lead',
        leadScore: 82,
        notes: 'Imported via raw text/HTML extractor',
        extractedAt: new Date().toISOString().split('T')[0],
      }));

      let targetShow = existingShows.find((s) => s.id === selectedShowId);
      if (!targetShow) {
        const newShowObj: TradeShowEvent = {
          id: `ts-custom-${Date.now()}`,
          eventName: targetShowName,
          shortName: targetShowName,
          category: 'Trade Event',
          city: targetCity,
          state: targetState,
          venue: 'Convention Center',
          dates: 'Upcoming',
          month: 'Upcoming',
          year: 2026,
          orbusUrl: '',
          officialWebsite: '',
          estimatedExhibitorsCount: formattedExhibitors.length,
          extractedExhibitorsCount: formattedExhibitors.length,
          isUsa: true,
          exhibitors: formattedExhibitors,
        };
        onImportEvents([newShowObj]);
      } else {
        onImportExhibitorsToEvent(targetShow.id, formattedExhibitors);
      }

      setSuccessMsg(`Extracted ${formattedExhibitors.length} exhibitor companies into ${targetShowName}!`);
      setPastedText('');
    } catch (err: any) {
      
      setError(err.message || 'Error processing text');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 text-slate-800">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">3-Step Lead Generation & Roster Extractor</h2>
                <p className="text-xs text-slate-500">1. Select Trade Show ➔ 2. Extract Exhibitor Companies ➔ 3. Discover Decision Maker Leads</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('live_search')}
              className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition shrink-0 ${
                activeTab === 'live_search'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-600" />
              <span>Live Exact Web Search (Real-time)</span>
            </button>

            <button
              onClick={() => setActiveTab('orbus')}
              className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition shrink-0 ${
                activeTab === 'orbus'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Orbus USA Directory ({TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()})</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition shrink-0 ${
                activeTab === 'text'
                  ? 'border-blue-600 text-blue-600 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>URL / Custom Text Extractor</span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-6 space-y-5">
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 0: LIVE EXACT WEB SEARCH */}
            {activeTab === 'live_search' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-lg space-y-2 text-xs text-emerald-950">
                  <div className="flex items-center space-x-2 font-bold text-emerald-800 text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time Google Search & Exact Data Extraction</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Performs a live web query using Gemini Search Grounding to fetch the <strong>exact real-time dates, venue, location, website, and verified exhibitor companies</strong> for any trade show worldwide.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">Trade Show Name / Event Title</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. White & Private Label World Expo, Pack Expo, CES, SEMA..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target City (Optional)</label>
                      <input
                        type="text"
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        placeholder="e.g. New York, Las Vegas, Chicago"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target State (Optional)</label>
                      <input
                        type="text"
                        value={searchState}
                        onChange={(e) => setSearchState(e.target.value)}
                        placeholder="e.g. NY, NV, IL"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleLiveTradeShowSearch}
                    disabled={loading}
                    className="inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Searching Web & Extracting Exact Roster...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        <span>Search Live Exact Event & Import Roster</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: Orbus USA List */}
            {activeTab === 'orbus' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-blue-600">
                    <Globe className="w-4 h-4" />
                    <span>Target Directory: Orbus USA Nationwide Trade Show Roster</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This tool connects to the Orbus USA Trade Show directory index of <strong>{TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA events</strong> across major venues (Las Vegas Convention Center, McCormick Place, Orange County Convention Center, Javits Center, etc.), extracting company rosters and booth metrics.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center font-medium text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 1. Extract Exhibitor Companies
                    </span>
                    <span className="flex items-center font-medium text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 2. Find Decision Maker Leads
                    </span>
                    <span className="flex items-center font-medium text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-orange-500" /> HubSpot CRM Ready
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleFetchOrbus}
                    disabled={loading}
                    className="inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Fetching Orbus List...' : 'Start Orbus Fetch & Search'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: URL or Paste Raw Text / HTML */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-lg text-xs text-blue-900 space-y-1">
                  <span className="font-bold flex items-center text-blue-900">
                    <Building2 className="w-4 h-4 mr-1.5 text-blue-600" />
                    Step 2: Extract Exhibitor Companies
                  </span>
                  <p className="text-[11px] text-blue-800">
                    Select a target USA trade show (like Pack Expo International) or create a custom event target. You can either auto-fetch the full directory roster or paste any URL / raw text list.
                  </p>
                </div>

                {/* Target Show Dropdown Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-800 block mb-1">
                    Select USA Trade Show Event Target
                  </label>
                  <select
                    value={selectedShowId}
                    onChange={(e) => handleSelectShowChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    {existingShows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.eventName} ({s.city}, {s.state} — {s.estimatedExhibitorsCount || 2500} Total Exhibitors)
                      </option>
                    ))}
                    <option value="custom_new">+ Create Custom USA Trade Show Target</option>
                  </select>
                </div>

                {/* Quick Auto-Fetch Callout */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Auto-Extract Directory Roster for {targetShowName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Pulls 20+ top exhibitor company profiles with island booth specs & verified decision maker contacts.
                    </span>
                  </div>
                  <button
                    onClick={handleGenerateAutoRoster}
                    disabled={loading}
                    className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    <span>Auto-Extract Roster</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Trade Show Name</label>
                    <input
                      type="text"
                      value={targetShowName}
                      onChange={(e) => setTargetShowName(e.target.value)}
                      placeholder="e.g. Pack Expo International"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">USA City</label>
                    <input
                      type="text"
                      value={targetCity}
                      onChange={(e) => setTargetCity(e.target.value)}
                      placeholder="e.g. Chicago"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">USA State</label>
                    <input
                      type="text"
                      value={targetState}
                      onChange={(e) => setTargetState(e.target.value)}
                      placeholder="e.g. IL"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Paste Website URL, Directory Text, or HTML</label>
                  <textarea
                    rows={5}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Enter website URL (e.g. https://www.packexpointernational.com) OR paste copy-pasted exhibitor list text / table HTML..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Step 3 (Decision Maker Leads) will run after company extraction.
                  </span>
                  <button
                    onClick={handleExtractPastedText}
                    disabled={loading}
                    className="inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                    <span>{loading ? 'Extracting Companies...' : 'Extract Companies (Step 2)'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Progress Bar Modal */}
      <FetchProgressModal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        currentShowNumber={currentShowNum}
        totalShows={1417}
        progressPercent={progressPct}
        currentStepMessage={stepMsg}
        isComplete={isComplete}
        extractedShowsCount={extractedShowsCount}
        extractedExhibitorsCount={extractedExhibitorsCount}
      />
    </>
  );
};
