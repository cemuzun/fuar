import React, { useState, useEffect } from 'react';
import { ExhibitorCompany, TradeShowEvent } from '../types';
import { 
  Search, 
  ExternalLink, 
  Mail, 
  Building2, 
  MapPin, 
  DollarSign, 
  Send, 
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Download,
  Calendar,
  Zap,
  CopyX,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { getDaysUntilEvent } from '../utils/dateUtils';
import { downloadXLSFile } from '../utils/excelExport';
import { getCompanyAccuracyReport } from '../utils/companyVerification';

interface ExhibitorListProps {
  exhibitors: ExhibitorCompany[];
  shows?: TradeShowEvent[];
  selectedShowId?: string | null;
  onSelectShow?: (showId: string | null) => void;
  onSelectExhibitor: (exhibitor: ExhibitorCompany) => void;
  onOpenPitchGenerator: (exhibitor: ExhibitorCompany) => void;
  onFindDecisionMakers: (exhibitor: ExhibitorCompany) => void;
  onUpdateStatus: (exhibitorId: string, newStatus: ExhibitorCompany['outreachStatus']) => void;
  onUpdateExhibitor?: (updatedExhibitor: ExhibitorCompany) => void;
  selectedShowName?: string;
  leadTimeCutoffDays: number;
  hideShortLeadShows: boolean;
  onToggleHideShortLeadShows: (hide: boolean) => void;
  onOpenExport?: () => void;
  onDeduplicateCompanies?: () => any;
  onExtractCompaniesForShow?: (showId: string | null, extractAll?: boolean) => void;
  isExtractingCompanies?: boolean;
  extractionProgress?: number;
  extractionStepText?: string;
}

interface SearchableShowSelectorProps {
  shows: TradeShowEvent[];
  selectedShowId: string | null;
  onSelectShow: (showId: string | null) => void;
}

const SearchableShowSelector: React.FC<SearchableShowSelectorProps> = ({
  shows,
  selectedShowId,
  onSelectShow,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedShow = shows.find((s) => s.id === selectedShowId);

  const filteredShows = shows.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const eventName = (s.eventName || '').toLowerCase();
    const shortName = (s.shortName || '').toLowerCase();
    const city = (s.city || '').toLowerCase();
    const state = (s.state || '').toLowerCase();
    const category = (s.category || '').toLowerCase();
    const venue = (s.venue || '').toLowerCase();
    return (
      eventName.includes(q) ||
      shortName.includes(q) ||
      city.includes(q) ||
      state.includes(q) ||
      category.includes(q) ||
      venue.includes(q)
    );
  });

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center space-x-2 shrink-0">
        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Select Exhibition:
        </label>
      </div>

      <div ref={dropdownRef} className="relative flex-1 max-w-2xl">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-slate-300 hover:border-blue-500 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 flex items-center justify-between shadow-xs transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="truncate pr-2">
            {selectedShow ? (
              <span className="flex items-center space-x-2">
                <span className="font-bold text-blue-700">{selectedShow.eventName}</span>
                <span className="text-slate-500 font-normal">
                  — {selectedShow.city}, {selectedShow.state} ({selectedShow.dates})
                </span>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                  {(selectedShow.exhibitors || []).length} exhibitors
                </span>
              </span>
            ) : (
              <span className="text-slate-600 font-medium">
                All Exhibitions ({shows.length} Trade Shows Available) — Click to search or select show
              </span>
            )}
          </span>
          <div className="flex items-center space-x-1.5 shrink-0 text-slate-400">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </div>
        </button>

        {/* Searchable Popover Dropdown */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search Bar */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
              <Search className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search: White Label, Pack Expo, Las Vegas, Chicago..."
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 hover:bg-slate-200 rounded-md text-slate-500 text-xs"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Info & Select All Option */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => {
                  onSelectShow(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                  selectedShowId === null ? 'bg-blue-50/80 font-bold text-blue-800' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>All Exhibitions ({shows.length} Trade Shows Directory)</span>
                </div>
                {selectedShowId === null && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              {filteredShows.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No trade shows found matching &quot;{searchTerm}&quot;
                </div>
              ) : (
                filteredShows.map((show) => {
                  const isSelected = selectedShowId === show.id;
                  const exhibitorCount = (show.exhibitors || []).length;
                  return (
                    <button
                      key={show.id}
                      type="button"
                      onClick={() => {
                        onSelectShow(show.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/90 font-bold text-blue-900 border-l-4 border-blue-600' : 'text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate">{show.eventName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                            {show.city}, {show.state}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>{show.dates}</span>
                          <span>•</span>
                          <span className="truncate">{show.category}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exhibitorCount > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {exhibitorCount} exhibitors
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedShowId && (
        <button
          onClick={() => onSelectShow(null)}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 underline shrink-0 px-1"
        >
          Show All Exhibitions
        </button>
      )}
    </div>
  );
};

export const ExhibitorList: React.FC<ExhibitorListProps> = ({
  exhibitors,
  shows = [],
  selectedShowId = null,
  onSelectShow,
  onSelectExhibitor,
  onOpenPitchGenerator,
  onFindDecisionMakers,
  onUpdateStatus,
  onUpdateExhibitor,
  selectedShowName,
  leadTimeCutoffDays,
  hideShortLeadShows,
  onToggleHideShortLeadShows,
  onOpenExport,
  onDeduplicateCompanies,
  onExtractCompaniesForShow,
  isExtractingCompanies = false,
  extractionProgress = 0,
  extractionStepText = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [boothSizeFilter, setBoothSizeFilter] = useState<string>('ALL');
  const [hasDmOnly, setHasDmOnly] = useState<boolean>(false);

  // Accuracy Inspection Modal State
  const [inspectingExhibitor, setInspectingExhibitor] = useState<ExhibitorCompany | null>(null);
  const [editedWebsite, setEditedWebsite] = useState<string>('');
  const [editedPhone, setEditedPhone] = useState<string>('');

  // Pagination state
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, boothSizeFilter, hasDmOnly, selectedShowId, hideShortLeadShows]);

  // Filtered exhibitor list logic
  const filteredExhibitors = exhibitors.filter((ex) => {
    // Lead time cutoff filter
    if (hideShortLeadShows) {
      const days = getDaysUntilEvent(ex.tradeShowDates, ex.tradeShowYear);
      if (days !== null && days <= leadTimeCutoffDays) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesCompany = (ex.companyName || '').toLowerCase().includes(q);
      const matchesIndustry = (ex.industry || '').toLowerCase().includes(q);
      const matchesBooth = (ex.boothNumber || '').toLowerCase().includes(q);
      const matchesShow = (ex.tradeShowName || '').toLowerCase().includes(q);
      const matchesCity = (ex.tradeShowCity || '').toLowerCase().includes(q);
      const matchesDM = (ex.decisionMakers || []).some(
        (dm) => (dm.name || '').toLowerCase().includes(q) || (dm.email || '').toLowerCase().includes(q) || (dm.title || '').toLowerCase().includes(q)
      );

      if (!matchesCompany && !matchesIndustry && !matchesBooth && !matchesShow && !matchesCity && !matchesDM) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'ALL' && ex.outreachStatus !== statusFilter) {
      return false;
    }

    // Booth size filter
    if (boothSizeFilter !== 'ALL') {
      const sizeStr = (ex.boothSize || '').toLowerCase();
      if (boothSizeFilter === 'ISLAND' && !sizeStr.includes('island') && ex.boothType !== 'Island') {
        return false;
      }
      if (boothSizeFilter === '20x20' && !sizeStr.includes('20x20') && !sizeStr.includes('20x30')) {
        return false;
      }
      if (boothSizeFilter === '10x10' && !sizeStr.includes('10x10') && !sizeStr.includes('10x20')) {
        return false;
      }
    }

    // Has decision maker filter
    if (hasDmOnly && (!ex.decisionMakers || ex.decisionMakers.length === 0)) {
      return false;
    }

    return true;
  });

  const getBoothBadgeStyle = (size: string | null, type: string | null) => {
    const sizeStr = (size || '').toLowerCase();
    if (sizeStr.includes('island') || type === 'Island') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (sizeStr.includes('20x20') || sizeStr.includes('30x30') || sizeStr.includes('20x30')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusBadgeStyle = (status: ExhibitorCompany['outreachStatus']) => {
    switch (status) {
      case 'New Lead':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Decision Maker Found':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Contacted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Meeting Scheduled':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Proposal Sent':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Closed Won':
        return 'bg-emerald-600 text-white border-emerald-700 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Count leads with short lead time
  const shortLeadCount = exhibitors.filter((ex) => {
    const days = getDaysUntilEvent(ex.tradeShowDates, ex.tradeShowYear);
    return days !== null && days <= leadTimeCutoffDays;
  }).length;

  // Pagination calculations
  const totalItems = filteredExhibitors.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / (pageSize as number));
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedExhibitors = pageSize === 'ALL'
    ? filteredExhibitors
    : filteredExhibitors.slice((safeCurrentPage - 1) * (pageSize as number), safeCurrentPage * (pageSize as number));

  const startIdx = pageSize === 'ALL' ? (totalItems > 0 ? 1 : 0) : Math.min((safeCurrentPage - 1) * (pageSize as number) + 1, totalItems);
  const endIdx = pageSize === 'ALL' ? totalItems : Math.min(safeCurrentPage * (pageSize as number), totalItems);

  // Direct XLS Download handler for current filtered list
  const handleExportXLS = () => {
    const filename = selectedShowName
      ? `${selectedShowName.toLowerCase().replace(/[^a-z0-0]/g, '_')}_exhibitors`
      : 'all_usa_trade_show_exhibitors';
    downloadXLSFile(filteredExhibitors, filename);
  };

  return (
    <div id="exhibitor-list-section" className="bg-slate-50 min-h-screen text-slate-800 p-4 sm:p-6 scroll-mt-6">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Control Header & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
          
          {/* Main Title Row & Exhibition Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base font-bold text-slate-800 flex items-center space-x-1.5">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>{selectedShowName ? `${selectedShowName} Exhibitors` : 'All USA Trade Show Exhibitors'}</span>
                </h2>
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
                  {filteredExhibitors.length} companies
                </span>
                {selectedShowId && onSelectShow && (
                  <button
                    onClick={() => onSelectShow(null)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline ml-2"
                  >
                    View All USA Shows
                  </button>
                )}
                {hideShortLeadShows && (
                  <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-amber-600" />
                    Filtered: &gt;{leadTimeCutoffDays}d Lead Time
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target companies, discover event marketing decision-makers, and generate booth sales proposals.
              </p>
            </div>

            {/* Quick Action Controls & Export Buttons */}
            <div className="flex items-center space-x-2.5 flex-wrap">
              {onOpenExport && (
                <button
                  onClick={onOpenExport}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition"
                  title="Sync or Export companies and decision maker leads to HubSpot CRM"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  <span>HubSpot CRM Sync</span>
                </button>
              )}

              <button
                onClick={handleExportXLS}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                title="Export current exhibitor list directly as Microsoft Excel (.xls) file"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                <span>Export as XLS</span>
              </button>

              {onOpenExport && (
                <button
                  onClick={onOpenExport}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition"
                  title="More Export Options (CSV / JSON)"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <span>More Formats</span>
                </button>
              )}

              {onDeduplicateCompanies && (
                <button
                  type="button"
                  onClick={() => onDeduplicateCompanies()}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer"
                  title="Remove duplicate company records and merge decision maker contacts"
                >
                  <CopyX className="w-4 h-4 mr-1.5 text-slate-600" />
                  <span>Remove Duplicates</span>
                </button>
              )}

              {/* Quick Status Pill Counters */}
              <div className="hidden sm:flex items-center space-x-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-md border border-emerald-200">
                  {exhibitors.filter((e) => e.decisionMakers && e.decisionMakers.length > 0).length} DMs Found
                </span>
                {shortLeadCount > 0 && !hideShortLeadShows && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-md border border-amber-200 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                    {shortLeadCount} Imminent Events
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Searchable Exhibition Selection Bar */}
          {shows.length > 0 && onSelectShow && (
            <SearchableShowSelector
              shows={shows}
              selectedShowId={selectedShowId}
              onSelectShow={onSelectShow}
            />
          )}

          {/* Active Extraction Progress Bar (Only visible while extracting) */}
          {isExtractingCompanies && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="font-bold text-amber-300">
                    Extracting Company Roster...
                  </span>
                  <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">
                    {extractionStepText || 'Scraper processing active directories...'}
                  </span>
                </div>
                <span className="font-extrabold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded text-[11px]">
                  {extractionProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: `${Math.max(5, extractionProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Search Input & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, booth #, industry, decision maker, city..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="ALL">All Outreach Statuses</option>
                <option value="New Lead">New Lead</option>
                <option value="Decision Maker Found">Decision Maker Found</option>
                <option value="Contacted">Contacted</option>
                <option value="Meeting Scheduled">Meeting Scheduled</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Closed Won">Closed Won</option>
              </select>
            </div>

            {/* Booth Size Filter */}
            <div className="lg:col-span-2">
              <select
                value={boothSizeFilter}
                onChange={(e) => setBoothSizeFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="ALL">All Booth Sizes</option>
                <option value="ISLAND">Island Booths (Large Budget)</option>
                <option value="20x20">20x20 / 20x30 Mid-Sized</option>
                <option value="10x10">10x10 / 10x20 Inline</option>
              </select>
            </div>

            {/* Filter checkboxes */}
            <div className="lg:col-span-3 flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasDmOnly}
                  onChange={(e) => setHasDmOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                />
                <span>With DM</span>
              </label>

              <label className="flex items-center space-x-1.5 text-xs text-amber-800 font-semibold cursor-pointer select-none bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <input
                  type="checkbox"
                  checked={hideShortLeadShows}
                  onChange={(e) => onToggleHideShortLeadShows(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 bg-white"
                />
                <span>Hide &lt;{leadTimeCutoffDays}d events</span>
              </label>
            </div>
          </div>
        </div>

        {/* Exhibitors Data Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {filteredExhibitors.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <Building2 className="w-12 h-12 text-blue-500 mx-auto" />
              <div>
                <p className="text-base font-bold text-slate-800">No exhibitor companies found for this selection</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {hideShortLeadShows && shortLeadCount > 0
                    ? `Note: ${shortLeadCount} events were hidden because they occur in less than ${leadTimeCutoffDays} days. You can uncheck "Hide <${leadTimeCutoffDays}d events" above.`
                    : 'Click below to discover & extract exhibitor companies and key marketing decision makers for this USA trade show!'}
                </p>
              </div>

              {onExtractCompaniesForShow && (
                <button
                  type="button"
                  onClick={() => onExtractCompaniesForShow(selectedShowId)}
                  disabled={isExtractingCompanies}
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition space-x-2 disabled:opacity-50 cursor-pointer mx-auto"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {selectedShowName
                      ? `Extract Companies & Decision Maker Leads for ${selectedShowName}`
                      : 'Extract Companies & Decision Maker Leads for All USA Shows'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-widest text-[11px]">
                    <th className="py-3 px-4">Company & Industry</th>
                    <th className="py-3 px-4">Trade Show & Lead Time</th>
                    <th className="py-3 px-4">Booth & Est. Budget</th>
                    <th className="py-3 px-4">Decision Makers / Contacts</th>
                    <th className="py-3 px-4">Outreach Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExhibitors.map((ex) => {
                    const primaryDm = ex.decisionMakers && ex.decisionMakers[0];
                    const hasDms = ex.decisionMakers && ex.decisionMakers.length > 0;
                    const daysUntil = getDaysUntilEvent(ex.tradeShowDates, ex.tradeShowYear);
                    const isShortLead = daysUntil !== null && daysUntil <= leadTimeCutoffDays;

                    return (
                      <tr 
                        key={ex.id}
                        className={`hover:bg-slate-50 transition duration-150 group ${isShortLead ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* Company & Industry */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start space-x-2.5">
                            <div className="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <button
                                  onClick={() => onSelectExhibitor(ex)}
                                  className="font-bold text-slate-800 hover:text-blue-600 text-xs text-left transition"
                                >
                                  {ex.companyName}
                                </button>

                                {ex.website && (
                                  <a
                                    href={ex.website.startsWith('http') ? ex.website : `https://${ex.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-blue-600 transition"
                                    title={`Visit official website: ${ex.website}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {(() => {
                                  const targetShow = shows?.find((s) => s.eventName === ex.tradeShowName);
                                  const accuracy = getCompanyAccuracyReport(ex, targetShow);
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectingExhibitor(ex);
                                        setEditedWebsite(ex.website || '');
                                        setEditedPhone(ex.phone || '');
                                      }}
                                      className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                                      title="Click to view company website accuracy verification report"
                                    >
                                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{accuracy.overallConfidence}% Match</span>
                                    </button>
                                  );
                                })()}
                              </div>

                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{ex.industry}</p>
                              {ex.city && ex.state && (
                                <p className="text-[10px] text-slate-400">
                                  HQ: {ex.city}, {ex.state}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Trade Show & Lead Time */}
                        <td className="py-3.5 px-4">
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                 const showObj = shows.find(
                                   (s) => s.eventName === ex.tradeShowName || (s.shortName && s.shortName === ex.tradeShowName)
                                 );
                                 if (showObj && onSelectShow) {
                                   onSelectShow(showObj.id);
                                 } else if (onSelectShow) {
                                   const targetName = (ex.tradeShowName || '').toLowerCase();
                                   const matched = shows.find((s) => {
                                     const sShort = (s.shortName || '').toLowerCase();
                                     const sEvent = (s.eventName || '').toLowerCase();
                                     return (sShort && targetName.includes(sShort)) || (sEvent && targetName.includes(sEvent));
                                   });
                                   if (matched) onSelectShow(matched.id);
                                 }
                              }}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline block text-left transition cursor-pointer"
                              title={`Click to filter and view all companies & leads for ${ex.tradeShowName}`}
                            >
                              {ex.tradeShowName}
                            </button>
                            <div className="flex items-center text-[11px] text-slate-500 mt-0.5">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                              <span>{ex.tradeShowCity}, {ex.tradeShowState}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">{ex.tradeShowDates}</span>

                            {daysUntil !== null && (
                              <div className="mt-1">
                                {isShortLead ? (
                                  <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                                    {daysUntil > 0 ? `${daysUntil}d away (<${leadTimeCutoffDays}d Risk)` : 'Event Imminent'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                    {daysUntil} days away (Safe Lead)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Booth & Est. Budget */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                #{ex.boothNumber}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getBoothBadgeStyle(ex.boothSize, ex.boothType)}`}>
                                {ex.boothSize}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium flex items-center">
                              <DollarSign className="w-3 h-3 mr-0.5 text-emerald-600" />
                              <span>Budget: {ex.estimatedBoothBudget}</span>
                            </div>
                          </div>
                        </td>

                        {/* Decision Makers / Contacts */}
                        <td className="py-3.5 px-4">
                          {hasDms ? (
                            <div className="space-y-1">
                              {ex.decisionMakers.map((dm) => (
                                <div key={dm.id} className="bg-slate-50 border border-slate-200 rounded-md p-1.5 max-w-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-800 text-[11px] truncate">{dm.name}</span>
                                    <span className={`text-[9px] px-1 rounded font-bold ${
                                      dm.emailConfidence === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {dm.emailConfidence}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate">{dm.title}</p>
                                  <div className="flex items-center space-x-2 mt-1 text-[10px] text-blue-600">
                                    <a href={`mailto:${dm.email}`} className="hover:underline flex items-center">
                                      <Mail className="w-2.5 h-2.5 mr-1 text-blue-600" />
                                      <span className="truncate">{dm.email}</span>
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 items-start">
                              <button
                                onClick={() => onFindDecisionMakers(ex)}
                                className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md transition cursor-pointer shadow-2xs"
                                title="Step 3: Find decision makers & leads using 3 distinct discovery methods"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                <span>Step 3: Find Leads (3 Methods)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const name = prompt(`Enter contact name for ${ex.companyName}:`);
                                  if (!name || name.trim() === '') return;
                                  const title = prompt(`Enter job title for ${name}:`, 'VP of Marketing') || 'VP of Marketing';
                                  const defaultEmail = `contact@${ex.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
                                  const email = prompt(`Enter work email for ${name}:`, defaultEmail) || defaultEmail;

                                  const newDm = {
                                    id: `dm-manual-${Date.now()}`,
                                    name,
                                    title,
                                    department: 'Marketing',
                                    email,
                                    emailConfidence: 'Verified' as const,
                                    phone: ex.phone || '',
                                  };

                                  const updatedExhibitor = {
                                    ...ex,
                                    decisionMakers: [...(ex.decisionMakers || []), newDm],
                                    outreachStatus: 'Decision Maker Found' as const,
                                  };

                                  if (onUpdateExhibitor) {
                                    onUpdateExhibitor(updatedExhibitor);
                                  }
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                              >
                                + Add Contact Manually
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Outreach Status */}
                        <td className="py-3.5 px-4">
                          <select
                            value={ex.outreachStatus}
                            onChange={(e) => onUpdateStatus(ex.id, e.target.value as ExhibitorCompany['outreachStatus'])}
                            className={`text-xs font-bold rounded-md px-2.5 py-1 border focus:outline-none cursor-pointer ${getStatusBadgeStyle(ex.outreachStatus)}`}
                          >
                            <option value="New Lead" className="bg-white text-slate-800">New Lead</option>
                            <option value="Decision Maker Found" className="bg-white text-emerald-700">Decision Maker Found</option>
                            <option value="Contacted" className="bg-white text-blue-700">Contacted</option>
                            <option value="Meeting Scheduled" className="bg-white text-purple-700">Meeting Scheduled</option>
                            <option value="Proposal Sent" className="bg-white text-amber-700">Proposal Sent</option>
                            <option value="Closed Won" className="bg-white text-emerald-800 font-bold">Closed Won</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onOpenPitchGenerator(ex)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-slate-200 transition relative"
                              title={isShortLead ? `Warning: Event in <${leadTimeCutoffDays} days` : 'Generate Cold Pitch Email'}
                            >
                              <Send className="w-3.5 h-3.5" />
                              {isShortLead && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                              )}
                            </button>
                            <button
                              onClick={() => onSelectExhibitor(ex)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition"
                              title="View Full Profile & Notes"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span>
                  Showing <strong className="font-bold text-slate-800">{startIdx}</strong> to{' '}
                  <strong className="font-bold text-slate-800">{endIdx}</strong> of{' '}
                  <strong className="font-bold text-slate-800">{totalItems}</strong> companies
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* Rows per page selector */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-500 font-medium">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value="ALL">All ({totalItems})</option>
                  </select>
                </div>

                {/* Page Navigation */}
                {pageSize !== 'ALL' && totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>

      </div>

      {/* Company Information & Website Accuracy Inspector Modal */}
      {inspectingExhibitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <span>Accuracy Verification Inspector</span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Trade Show Directory & Domain Cross-Match Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingExhibitor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {(() => {
                const targetShow = shows?.find((s) => s.eventName === inspectingExhibitor.tradeShowName);
                const report = getCompanyAccuracyReport(inspectingExhibitor, targetShow);

                return (
                  <>
                    {/* Score Banner */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                          Overall Match Confidence
                        </span>
                        <div className="flex items-baseline space-x-2 mt-0.5">
                          <span className="text-2xl font-black text-emerald-700">
                            {report.overallConfidence}%
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            {report.statusLabel}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Exhibitor Company</span>
                        <span className="font-bold text-xs text-slate-900">{inspectingExhibitor.companyName}</span>
                      </div>
                    </div>

                    {/* Verification Checklist */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Verification Criteria Passed
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                        {report.reasons.map((reason, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="text-slate-700 font-medium">{reason}</span>
                            <span className="text-emerald-600 font-bold ml-2 shrink-0">✓ PASSED</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Company Details & Editable Website URL */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center">
                          <Edit3 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Company Website & Contacts
                        </h4>
                        <span className="text-[10px] text-slate-500">Manual Override Available</span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Official Website URL:
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editedWebsite}
                              onChange={(e) => setEditedWebsite(e.target.value)}
                              placeholder="https://www.company.com"
                              className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {editedWebsite && (
                              <a
                                href={editedWebsite.startsWith('http') ? editedWebsite : `https://${editedWebsite}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition"
                                title="Test Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Corporate Phone Number:
                          </label>
                          <input
                            type="text"
                            value={editedPhone}
                            onChange={(e) => setEditedPhone(e.target.value)}
                            placeholder="(800) 555-0199"
                            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500">
                        Trade Show: <strong>{inspectingExhibitor.tradeShowName}</strong>
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setInspectingExhibitor(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateExhibitor) {
                              onUpdateExhibitor({
                                ...inspectingExhibitor,
                                website: editedWebsite,
                                phone: editedPhone,
                              });
                            }
                            setInspectingExhibitor(null);
                          }}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition cursor-pointer flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Confirm Accuracy</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
