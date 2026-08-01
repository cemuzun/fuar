import React from 'react';
import { 
  Building2, 
  Search, 
  Users, 
  Download, 
  PlusCircle, 
  TrendingUp, 
  RefreshCw,
  BarChart2,
  Sparkles,
  Settings,
  Clock,
  Database,
  ShieldAlert,
  Bug,
  Award,
  Mail
} from 'lucide-react';
import { MetricConfig, DecisionSettings } from '../types';

interface HeaderProps {
  totalShows: number;
  totalExhibitors: number;
  decisionMakersCount: number;
  pipelineValue: string;
  islandBoothsCount?: number;
  unreadEmailCount?: number;
  userEmail?: string;
  decisionSettings: DecisionSettings;
  metrics: MetricConfig[];
  activeView?: 'shows' | 'leads' | 'inbox' | 'scraper-debug';
  onViewChange?: (view: 'shows' | 'leads' | 'inbox' | 'scraper-debug') => void;
  onOpenExtractor: () => void;
  onOpenExport: () => void;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
  onRefreshOrbus: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalShows,
  totalExhibitors,
  decisionMakersCount,
  pipelineValue,
  islandBoothsCount = 0,
  unreadEmailCount = 0,
  userEmail = 'cem.uzun@capitalevents.us',
  decisionSettings,
  metrics,
  activeView = 'shows',
  onViewChange,
  onOpenExtractor,
  onOpenExport,
  onOpenAnalytics,
  onOpenSettings,
  onRefreshOrbus,
  isSyncing,
}) => {
  // Filter metrics that should appear in header
  const visibleHeaderMetrics = metrics.filter(
    (m) => m.enabled && (m.category === 'header' || m.category === 'both' || !m.category)
  );

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Logo & Brand Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="h-9 w-9 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 font-sans">
                ExhibitorNexus <span className="text-blue-600 font-normal text-sm">v2.6</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Database className="w-3 h-3 mr-1 text-blue-600" />
                {totalShows.toLocaleString()} USA Shows Directory
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Orbus USA Trade Show Scraper & Decision Maker Intelligence Engine
            </p>
          </div>
        </div>

        {/* Dynamic Customizable Metrics Strip */}
        <div className="hidden lg:flex items-center space-x-3.5 border-x border-slate-200 px-3.5 py-1 overflow-x-auto max-w-2xl shrink-0">
          {visibleHeaderMetrics.map((metric, idx) => {
            return (
              <React.Fragment key={metric.id}>
                {idx > 0 && <div className="h-7 w-px bg-slate-200 shrink-0" />}

                {metric.id === 'shows' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Orbus USA Shows</span>
                    <span className="text-sm font-bold text-slate-800">
                      {totalShows.toLocaleString()} <span className="text-[11px] font-normal text-blue-600">active</span>
                    </span>
                  </div>
                )}

                {metric.id === 'exhibitors' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Exhibitors</span>
                    <span className="text-sm font-bold text-blue-600">{totalExhibitors}</span>
                  </div>
                )}

                {metric.id === 'decisionMakers' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Decision Makers</span>
                    <span className="text-sm font-bold text-emerald-600">{decisionMakersCount}</span>
                  </div>
                )}

                {metric.id === 'leadCutoff' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium font-mono">Lead Cutoff</span>
                    <button
                      onClick={onOpenSettings}
                      className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-blue-600 transition cursor-pointer"
                      title="Click to change Lead Time Cutoff threshold"
                    >
                      <Clock className="w-3 h-3 mr-1 text-amber-600" />
                      {decisionSettings.leadTimeCutoffDays} Days
                    </button>
                  </div>
                )}

                {metric.id === 'pipelineValue' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Pipeline Value</span>
                    <span className="text-sm font-bold text-slate-800">{pipelineValue}</span>
                  </div>
                )}

                {metric.id === 'islandBooths' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">Island Booths</span>
                    <span className="text-sm font-bold text-purple-600">{islandBoothsCount}</span>
                  </div>
                )}

                {metric.type === 'custom' && (
                  <div className="text-center shrink-0">
                    <span className="text-xs text-slate-500 block font-medium">{metric.label}</span>
                    <span className="text-sm font-bold text-blue-600">{metric.customValue || '—'}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={onRefreshOrbus}
            disabled={isSyncing}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition disabled:opacity-50 shadow-xs shrink-0"
            title="Sync Orbus USA Trade Show List directly"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            {isSyncing ? 'Syncing Orbus...' : 'Fetch Orbus List'}
          </button>

          <button
            onClick={onOpenExtractor}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition shrink-0"
            title="3-Step Lead Extraction Wizard (Find Trade Show ➔ Extract Companies ➔ Discover Decision Maker Leads)"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
            3-Step Lead Extractor
          </button>

          <button
            onClick={onOpenAnalytics}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-xs shrink-0"
          >
            <BarChart2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Analytics
          </button>

          <button
            onClick={onOpenExport}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </button>

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-xs transition shrink-0"
            title="Configure lead time cutoff, email settings, & metrics"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Settings
          </button>
        </div>

      </div>

      {/* Main View Switcher Navigation Tab Bar */}
      {onViewChange && (
        <div className="bg-slate-100/80 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 py-1.5 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onViewChange('shows')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-2 shrink-0 whitespace-nowrap ${
                  activeView === 'shows'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Trade Shows & Exhibitors Directory</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.2 text-[10px] rounded-full font-extrabold border border-blue-200">
                  {totalExhibitors}
                </span>
              </button>

              <button
                onClick={() => onViewChange('leads')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-2 shrink-0 whitespace-nowrap ${
                  activeView === 'leads'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Leads & Decision Maker Page</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.2 text-[10px] rounded-full font-extrabold border border-emerald-200">
                  {decisionMakersCount} Leads
                </span>
              </button>

              <button
                onClick={() => onViewChange('inbox')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-2 shrink-0 whitespace-nowrap ${
                  activeView === 'inbox'
                    ? 'bg-slate-900 text-white shadow-xs border border-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Mail className={`w-4 h-4 shrink-0 ${activeView === 'inbox' ? 'text-blue-400' : 'text-blue-600'}`} />
                <span>Mailbox ({userEmail.split('@')[0]})</span>
                <span className={`px-2 py-0.2 text-[10px] rounded-full font-extrabold border ${
                  activeView === 'inbox'
                    ? 'bg-blue-500 text-white border-blue-400'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {unreadEmailCount > 0 ? `${unreadEmailCount} Unread` : 'Inbox Active'}
                </span>
              </button>

              <button
                onClick={() => onViewChange && onViewChange('scraper-debug')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-2 shrink-0 whitespace-nowrap ${
                  activeView === 'scraper-debug'
                    ? 'bg-slate-900 text-white shadow-xs border border-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Bug className={`w-4 h-4 shrink-0 ${activeView === 'scraper-debug' ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>Debug Logs</span>
              </button>

              <button
                onClick={onOpenSettings}
                className="px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 bg-slate-800 text-white hover:bg-slate-700 shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
                title="Configure lead time cutoff, email settings, & metrics"
              >
                <Settings className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
