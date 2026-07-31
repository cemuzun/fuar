import React, { useState } from 'react';
import { TradeShowEvent } from '../types';
import { MapPin, Calendar, CheckCircle2, Layers, AlertTriangle, Clock, Database, Search, Sparkles, RefreshCw, Globe } from 'lucide-react';
import { getDaysUntilEvent } from '../utils/dateUtils';
import { TOTAL_ORBUS_USA_SHOWS_COUNT } from '../data/initialShows';

const COUNTRY_TABS = [
  { key: 'usa',     flag: '🇺🇸', label: 'USA' },
  { key: 'germany', flag: '🇩🇪', label: 'Germany' },
  { key: 'uk',      flag: '🇬🇧', label: 'UK' },
  { key: 'turkey',  flag: '🇹🇷', label: 'Turkey' },
  { key: 'uae',     flag: '🇦🇪', label: 'UAE' },
  { key: 'france',  flag: '🇫🇷', label: 'France' },
  { key: 'china',   flag: '🇨🇳', label: 'China' },
  { key: 'italy',   flag: '🇮🇹', label: 'Italy' },
  { key: 'spain',   flag: '🇪🇸', label: 'Spain' },
  { key: 'global',  flag: '🌐', label: 'Global' },
];

interface TradeShowSelectorProps {
  shows: TradeShowEvent[];
  selectedShowId: string | null;
  onSelectShow: (showId: string | null) => void;
  selectedStateFilter: string;
  onStateFilterChange: (state: string) => void;
  leadTimeCutoffDays: number;
  hideShortLeadShows: boolean;
  onToggleHideShortLeadShows: (hide: boolean) => void;
  onOpenSettings: () => void;
  onOpenExtractor: () => void;
  onExtractCompaniesForShow?: (showId: string) => void;
  isExtractingCompanies?: boolean;
  onFetchDirectory: (country: string) => Promise<void>;
  isFetchingDirectory?: boolean;
  activeCountry?: string;
}

export const TradeShowSelector: React.FC<TradeShowSelectorProps> = ({
  shows,
  selectedShowId,
  onSelectShow,
  selectedStateFilter,
  onStateFilterChange,
  leadTimeCutoffDays,
  hideShortLeadShows,
  onToggleHideShortLeadShows,
  onOpenSettings,
  onOpenExtractor,
  onExtractCompaniesForShow,
  isExtractingCompanies = false,
  onFetchDirectory,
  isFetchingDirectory = false,
  activeCountry = 'usa',
}) => {
  const [showSearch, setShowSearch] = useState('');
  const [showLimit, setShowLimit] = useState<number>(10);

  // Extract unique states/regions from the available shows
  const availableStates = Array.from(new Set(shows.map((s) => s.state).filter(Boolean))).sort();

  // Filter shows based on state, search, and lead time cutoff
  const filteredShows = shows.filter((show) => {
    if (selectedStateFilter && show.state !== selectedStateFilter) return false;
    if (showSearch.trim()) {
      const q = showSearch.toLowerCase();
      const matchName = show.eventName.toLowerCase().includes(q) || show.shortName.toLowerCase().includes(q);
      const matchCity = show.city.toLowerCase().includes(q) || (show.state || '').toLowerCase().includes(q);
      const matchCategory = show.category.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchCategory) return false;
    }
    if (hideShortLeadShows) {
      const days = getDaysUntilEvent(show.dates, show.year);
      if (days !== null && days <= leadTimeCutoffDays) return false;
    }
    return true;
  });

  const displayedGridShows = showLimit ? filteredShows.slice(0, showLimit) : filteredShows;

  const totalExhibitorsAllShows = shows.reduce((sum, s) => sum + (s.exhibitors ? s.exhibitors.length : 0), 0);
  const totalLeadsAllShows = shows.reduce((sum, s) =>
    sum + (s.exhibitors ? s.exhibitors.reduce((acc, ex) => acc + (ex.decisionMakers ? ex.decisionMakers.length : 0), 0) : 0), 0);

  const activeTab = COUNTRY_TABS.find(t => t.key === activeCountry) || COUNTRY_TABS[0];

  return (
    <div id="trade-show-selector-section" className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Country Selector Tab Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center mr-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
            Region:
          </div>
          {COUNTRY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFetchDirectory(tab.key)}
              disabled={isFetchingDirectory}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition disabled:opacity-50 ${
                activeCountry === tab.key
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="text-base leading-none">{tab.flag}</span>
              <span>{tab.label}</span>
              {activeCountry === tab.key && isFetchingDirectory && (
                <RefreshCw className="w-3 h-3 animate-spin ml-0.5" />
              )}
            </button>
          ))}

          {/* Refresh button for active country */}
          <button
            onClick={() => onFetchDirectory(activeCountry)}
            disabled={isFetchingDirectory}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 transition disabled:opacity-50"
            title={`Re-fetch ${activeTab.label} trade show directory`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingDirectory ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
            {isFetchingDirectory ? 'Loading...' : `Refresh ${activeTab.flag} ${activeTab.label}`}
          </button>
        </div>

        {/* Section Info Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                  {activeTab.flag} {activeTab.label} Trade Show Directory
                </h2>
                <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200">
                  {shows.length} Shows Loaded
                  {activeCountry === 'usa' && ` (${TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA Roster Index)`}
                </span>
                <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200 flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                  Cutoff: {leadTimeCutoffDays} Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Click a country tab above to load its trade show directory. Then click <strong>Extract Companies & Leads</strong> on any show.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition">
              <input
                type="checkbox"
                checked={hideShortLeadShows}
                onChange={(e) => onToggleHideShortLeadShows(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
              />
              <span>Exclude events &lt; {leadTimeCutoffDays} days away</span>
            </label>
            <button
              onClick={onOpenSettings}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline flex items-center"
            >
              Configure Cutoff
            </button>
          </div>
        </div>

        {/* Filters Bar: Search & State Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={showSearch}
                onChange={(e) => setShowSearch(e.target.value)}
                placeholder="Search trade show name, city, or category..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {availableStates.length > 0 && (
              <>
                <span className="text-xs text-slate-500 font-medium">Filter Region:</span>
                <select
                  value={selectedStateFilter}
                  onChange={(e) => onStateFilterChange(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
                >
                  <option value="">All ({shows.length} shows)</option>
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st} ({shows.filter((s) => s.state === st).length} shows)
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={onOpenExtractor}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Fetch Any Show
            </button>
          </div>
        </div>

        {/* Trade Show Event Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          
          {/* All Shows Tile */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectShow(null);
              const elem = document.getElementById('exhibitor-list-section');
              if (elem) {
                elem.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectShow(null);
                const elem = document.getElementById('exhibitor-list-section');
                if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`p-3 rounded-lg text-left border transition duration-150 flex flex-col justify-between cursor-pointer ${
              selectedShowId === null
                ? 'bg-white border-2 border-blue-600 shadow-sm ring-2 ring-blue-100'
                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  ALL USA PIPELINE
                </span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-800">All USA Trade Shows</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Full exhibitor directory</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Exhibitors:</span>
                <span className="font-bold text-slate-800">{totalExhibitorsAllShows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Leads:</span>
                <span className="font-bold text-blue-600">{totalLeadsAllShows.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Individual Trade Show Cards */}
          {displayedGridShows.map((show) => {
            const isSelected = selectedShowId === show.id;
            const exhibitorCount = show.exhibitors ? show.exhibitors.length : 0;
            const leadsCount = show.exhibitors
              ? show.exhibitors.reduce(
                  (sum, ex) => sum + (ex.decisionMakers ? ex.decisionMakers.length : 0),
                  0
                )
              : 0;
            const daysUntil = getDaysUntilEvent(show.dates, show.year);
            const isShortLead = daysUntil !== null && daysUntil <= leadTimeCutoffDays;

            return (
              <div
                key={show.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectShow(show.id);
                  const elem = document.getElementById('exhibitor-list-section');
                  if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectShow(show.id);
                    const elem = document.getElementById('exhibitor-list-section');
                    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`p-3 rounded-lg text-left border transition duration-150 flex flex-col justify-between relative group cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-blue-600 shadow-md ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-400 text-slate-700 shadow-xs'
                }`}
              >
                <div>
                  {/* Category & Lead Time Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[100px]">
                      {show.category}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {show.state}
                    </span>
                  </div>

                  {/* Show Name */}
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {show.shortName || show.eventName}
                  </h3>

                  {/* Dates & Location */}
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                    <div className="flex items-center truncate">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                      <span className="truncate">{show.dates}</span>
                    </div>
                    <div className="flex items-center truncate">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                      <span className="truncate">{show.city}, {show.state}</span>
                    </div>
                  </div>
                </div>

                {/* Lead Time Cutoff Status Tag & Metrics */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Exhibitors:</span>
                    <span className={`font-bold ${exhibitorCount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                      {exhibitorCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Leads:</span>
                    <span className={`font-bold ${leadsCount > 0 ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                      {leadsCount.toLocaleString()}
                    </span>
                  </div>

                  {daysUntil !== null && (
                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center justify-between ${
                      isShortLead
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <span className="flex items-center">
                        {isShortLead ? (
                          <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600 shrink-0" />
                        )}
                        {daysUntil > 0 ? `${daysUntil}d away` : 'Active / Passed'}
                      </span>
                      <span>{isShortLead ? `<${leadTimeCutoffDays}d Risk` : 'Safe Lead'}</span>
                    </div>
                  )}

                  {/* Extract Action Button */}
                  {onExtractCompaniesForShow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectShow(show.id);
                        onExtractCompaniesForShow(show.id);
                        const elem = document.getElementById('exhibitor-list-section');
                        if (elem) {
                          elem.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="mt-2 w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-[10px] rounded-md border border-blue-200 hover:border-blue-600 transition flex items-center justify-center space-x-1 shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Extract Companies & Leads</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}

        </div>

        {/* View Count Controls */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 font-medium">
            Showing top {displayedGridShows.length} of {filteredShows.length} trade shows
          </span>

          {filteredShows.length > 10 && (
            <button
              onClick={() => setShowLimit(showLimit === 10 ? 0 : 10)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-white px-3 py-1 rounded-md border border-slate-200 shadow-xs transition"
            >
              {showLimit === 10 ? `Show All ${filteredShows.length} Trade Shows` : 'Show First 10 Shows Only'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
