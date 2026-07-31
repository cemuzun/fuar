import React, { useState, useEffect } from 'react';
import { TradeShowEvent } from '../types';
import { AlertCircle, Play, Code, FileText, RefreshCw, Trash2, Maximize2, Minimize2, Check } from 'lucide-react';

interface ScraperLog {
  filename: string;
  size: number;
  mtime: number;
  content: string;
}

interface ScraperDebugDashboardProps {
  shows?: TradeShowEvent[];
  setShows?: (shows: React.SetStateAction<TradeShowEvent[]>) => void;
}
export const ScraperDebugDashboard: React.FC<ScraperDebugDashboardProps> = ({ shows = [], setShows }) => {
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ScraperLog | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [retryShowId, setRetryShowId] = useState('');
  const [retryStatus, setRetryStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [retryMessage, setRetryMessage] = useState('');

  const handleRetry = async () => {
    if (!retryShowId.trim()) return;
    const targetShow = shows.find(s => s.id === retryShowId.trim());
    if (!targetShow) {
      setRetryStatus('error');
      setRetryMessage('Show ID not found in local database.');
      return;
    }

    setRetryStatus('pending');
    setRetryMessage('Starting job...');

    try {
      const res = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shows: [targetShow] }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('Failed to start job');
      
      const jobId = data.jobId;
      setRetryMessage(`Pending (Job ${jobId})...`);

      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/status/${jobId}`);
          const statusData = await statusRes.json();
          if (statusData.job) {
             if (statusData.job.status === 'completed' || statusData.job.status === 'failed') {
               clearInterval(interval);
               if (statusData.job.status === 'completed') {
                 setRetryStatus('success');
                 setRetryMessage('Job completed successfully!');
                 if (setShows && statusData.job.results && statusData.job.results.length > 0) {
                   const resShow = statusData.job.results[0];
                   setShows(prevShows => prevShows.map(s => {
                     if (s.id === resShow.showId) {
                        return {
                          ...s,
                          extractedExhibitorsCount: resShow.exhibitors?.length || 0,
                          exhibitors: resShow.exhibitors || []
                        };
                     }
                     return s;
                   }));
                 }
               } else {
                 setRetryStatus('error');
                 setRetryMessage('Job failed to process.');
               }
               fetchLogs();
             }
          }
        } catch (e) {
          // ignore network errors while polling
        }
      }, 2000);

    } catch (e: any) {
      setRetryStatus('error');
      setRetryMessage(e.message || 'Error starting retry.');
    }
  };


  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scraper-logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        if (data.logs.length > 0 && !selectedLog) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (selectedLog) {
      navigator.clipboard.writeText(selectedLog.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Code className="h-6 w-6 text-slate-600" />
            Scraper Debug Logs
          </h2>
          <p className="text-slate-500 mt-1">
            Raw HTML and JSON responses from recent failed or incomplete extractions.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Manual Extraction Retry</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter Show ID (e.g. show-123)..."
            value={retryShowId}
            onChange={(e) => setRetryShowId(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={retryStatus === 'pending'}
          />
          <button
            onClick={handleRetry}
            disabled={!retryShowId.trim() || retryStatus === 'pending'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {retryStatus === 'pending' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Retry Extraction
          </button>
        </div>
        {retryStatus !== 'idle' && (
          <div className={`mt-3 text-sm font-medium ${retryStatus === 'error' ? 'text-red-600' : retryStatus === 'success' ? 'text-emerald-600' : 'text-blue-600'}`}>
            Status: {retryStatus === 'pending' ? 'Pending' : retryStatus === 'success' ? 'Completed' : 'Error'} - {retryMessage}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {logs.length === 0 && !loading && !error ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No logs found</h3>
          <p className="text-slate-500">Run an extraction to generate debug logs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar list */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-slate-700 uppercase tracking-wider text-xs px-2">Recent Logs</h3>
            {logs.map((log) => (
              <button
                key={log.filename}
                onClick={() => setSelectedLog(log)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedLog?.filename === log.filename
                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono text-xs text-slate-800 break-all mb-1">
                  {log.filename}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{formatSize(log.size)}</span>
                  <span>{new Date(log.mtime).toLocaleTimeString()}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Log Viewer */}
          {selectedLog && (
            <div className={`lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col ${isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'h-[700px]'}`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <div className="font-mono text-sm font-semibold text-slate-700">
                  {selectedLog.filename}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                    title="Copy content"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <FileText className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto bg-slate-900 text-slate-200 font-mono text-xs rounded-b-2xl">
                <pre className="whitespace-pre-wrap break-words">{selectedLog.content}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
