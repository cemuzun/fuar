import React from 'react';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  X, 
  Building2, 
  Loader2, 
  Pause, 
  Play, 
  Square, 
  Zap, 
  Layers, 
  Users, 
  MapPin,
  ShieldCheck
} from 'lucide-react';

export interface LogEntry {
  showName: string;
  count: number;
  leadsCount: number;
  city?: string;
  isExisting?: boolean;
}

interface FetchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShowNumber: number;
  totalShows: number;
  progressPercent: number;
  currentStepMessage: string;
  isComplete: boolean;
  extractedShowsCount?: number;
  extractedExhibitorsCount?: number;
  extractedLeadsCount?: number;
  currentShowTitle?: string;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  onStop?: () => void;
  processedLog?: LogEntry[];
}

export const FetchProgressModal: React.FC<FetchProgressModalProps> = ({
  isOpen,
  onClose,
  currentShowNumber,
  totalShows,
  progressPercent,
  currentStepMessage,
  isComplete,
  extractedShowsCount = 0,
  extractedExhibitorsCount = 0,
  extractedLeadsCount = 0,
  currentShowTitle,
  isPaused = false,
  onPauseToggle,
  onStop,
  processedLog = [],
}) => {
  

  // Generate recent search trail
  const generateTrail = () => {
    const numbers: number[] = [];
    const count = 7;
    for (let i = count - 1; i >= 0; i--) {
      const num = currentShowNumber - i;
      if (num > 0) numbers.push(num);
    }
    return numbers;
  };

  const trail = generateTrail();

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-800 my-6 transform transition-all flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              isComplete
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                : isPaused
                ? 'bg-amber-100 text-amber-600 border border-amber-200'
                : 'bg-blue-600 text-white shadow-sm animate-pulse'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : isPaused ? (
                <Pause className="w-5 h-5 text-amber-600" />
              ) : (
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isComplete
                    ? 'All USA Trade Shows Extraction Completed'
                    : isPaused
                    ? 'Exhibitor Batch Extractor Paused'
                    : 'Live USA Trade Shows Exhibitor Scraper Queue'}
                </h3>
                {!isComplete && (
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                    isPaused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800 animate-pulse'
                  }`}>
                    {isPaused ? 'Paused' : '100% ACCURATE SEQUENTIAL MODE'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isComplete
                  ? 'Complete exhibitor rosters & decision maker leads extracted across trade shows.'
                  : `Crawling & extracting complete exhibitor rosters across ${totalShows.toLocaleString()} USA trade shows with zero skipping.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isComplete && onPauseToggle && (
              <button
                onClick={onPauseToggle}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition border ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300'
                }`}
                title={isPaused ? 'Resume extraction' : 'Pause extraction'}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}

            {!isComplete && onStop && (
              <button
                onClick={onStop}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition flex items-center space-x-1"
                title="Stop queue and keep current results"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}

            {isComplete && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          
          {/* Main Progress Metric Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            
            {/* Top Stat Line */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Processing Queue ({totalShows.toLocaleString()} Total USA Shows)
                </span>
                <span className="text-lg font-black text-slate-900">
                  Processing Show {currentShowNumber.toLocaleString()} <span className="text-xs font-normal text-slate-500">of {totalShows.toLocaleString()}</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-blue-600">
                  {Math.min(100, Math.round(progressPercent))}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-300">
              <div
                className={`h-full rounded-full transition-all duration-300 flex items-center justify-end pr-1.5 text-[9px] font-extrabold text-white ${
                  isComplete
                    ? 'bg-emerald-500'
                    : isPaused
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 animate-pulse'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
              >
                {progressPercent > 12 && `${Math.round(progressPercent)}%`}
              </div>
            </div>

            {/* Active Show Highlight Card */}
            {currentShowTitle && !isComplete && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 flex items-start space-x-3">
                <div className="p-1.5 bg-blue-600 text-white rounded-md mt-0.5 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Currently Extracting</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">Show #{currentShowNumber}</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                    {currentShowTitle}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex items-center">
                    <Loader2 className="w-3 h-3 mr-1 text-blue-600 animate-spin shrink-0" />
                    <span>{currentStepMessage}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Live Sequence Trail */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-sans font-semibold flex items-center text-slate-700">
                  <Search className="w-3 h-3 mr-1 text-blue-600" />
                  Live Indexing Sequence:
                </span>
                <span className="text-blue-600 font-bold">
                  {currentShowNumber} / {totalShows}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none text-slate-600">
                <span className="text-slate-400 font-bold">Batch:</span>
                {trail.map((num, idx) => (
                  <React.Fragment key={num}>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        idx === trail.length - 1
                          ? 'bg-blue-600 text-white shadow-xs animate-bounce'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      #{num}
                    </span>
                    {idx < trail.length - 1 && <span className="text-slate-300">-</span>}
                  </React.Fragment>
                ))}
                {!isComplete && !isPaused && (
                  <span className="text-blue-600 font-bold animate-pulse">...</span>
                )}
              </div>
            </div>

          </div>

          {/* Accuracy & Deduplication Guarantee Notice (No Speed Selector) */}
          {!isComplete && (
            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-lg space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">
                  Thorough Sequential Extraction Engine (0 Skipped)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full ml-auto">
                  Deduplication Shield Active
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-normal pl-6">
                Crawling each trade show <strong>one-by-one with 100% precision</strong>. Shows previously extracted are automatically detected and verified so we <strong>never re-crawl or duplicate existing work</strong>.
              </p>
            </div>
          )}

          {/* Aggregate Live Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-slate-500 block font-medium">Shows Processed</span>
              <span className="text-lg font-black text-slate-800">
                {extractedShowsCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {totalShows.toLocaleString()}</span>
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-blue-700 block font-medium">Exhibitor Companies</span>
              <span className="text-lg font-black text-blue-700">
                +{extractedExhibitorsCount.toLocaleString()}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
              <span className="text-[11px] text-emerald-700 block font-medium">Decision Maker Leads</span>
              <span className="text-lg font-black text-emerald-700">
                +{extractedLeadsCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Processed Show Activity Log Feed */}
          {processedLog.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Live Stream Extraction Feed
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Showing last {Math.min(20, processedLog.length)} events
                </span>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-800/60 scrollbar-thin">
                {processedLog.slice(-20).reverse().map((log, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span className={log.isExisting ? "text-amber-400 font-bold shrink-0" : "text-emerald-400 font-bold shrink-0"}>
                        {log.isExisting ? '⚡' : '✓'}
                      </span>
                      <span className="text-slate-200 font-semibold truncate">{log.showName}</span>
                      {log.city && <span className="text-slate-500 text-[10px]">({log.city})</span>}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {log.isExisting ? (
                        <span className="text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800/80 text-[10px]">
                          Already Extracted (Up to Date)
                        </span>
                      ) : (
                        <>
                          <span className="text-blue-300 font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                            +{log.count} exhibitors
                          </span>
                          {log.leadsCount > 0 && (
                            <span className="text-emerald-300 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                              +{log.leadsCount} DMs
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Live Scraper Queue: Orbus USA National Trade Show Directory
          </span>

          {isComplete ? (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              Done & View All Extracted Exhibitors
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>{isPaused ? 'Queue Paused' : 'Processing Batches...'}</span>
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

