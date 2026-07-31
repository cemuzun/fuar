import React, { useState } from 'react';
import { TOTAL_ORBUS_USA_SHOWS_COUNT } from '../data/initialShows';
import { 
  X, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  Check, 
  Sliders, 
  Database, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart3, 
  CheckCircle2,
  Sparkles,
  Target,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { MetricConfig, DecisionSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionSettings: DecisionSettings;
  onUpdateDecisionSettings: (newSettings: DecisionSettings) => void;
  metrics: MetricConfig[];
  onUpdateMetrics: (newMetrics: MetricConfig[]) => void;
  emailAccount?: any;
  onUpdateEmailAccount?: (updatedAccount: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  decisionSettings,
  onUpdateDecisionSettings,
  metrics,
  onUpdateMetrics,
  emailAccount = {
    displayName: 'Cem Uzun',
    emailAddress: 'cem.uzun@capitalevents.us',
    username: 'cem.uzun@capitalevents.us',
    password: 'C)793639767875aq',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    useSsl: false,
    isConnected: true,
  },
  onUpdateEmailAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'DECISION_RULES' | 'METRICS_MANAGER' | 'DIRECTORY_SCOPE' | 'EMAIL_CONFIG'>('EMAIL_CONFIG');

  const [displayName, setDisplayName] = useState(emailAccount.displayName || 'Cem Uzun');
  const [emailAddress, setEmailAddress] = useState(emailAccount.emailAddress || 'cem.uzun@capitalevents.us');
  const [username, setUsername] = useState(emailAccount.username || 'cem.uzun@capitalevents.us');
  const [password, setPassword] = useState(emailAccount.password || 'C)793639767875aq');
  const [smtpHost, setSmtpHost] = useState(!emailAccount.smtpHost || emailAccount.smtpHost === 'mail.capitalevents.us' ? 'smtp.office365.com' : emailAccount.smtpHost);
  const [smtpPort, setSmtpPort] = useState(emailAccount.smtpPort || 587);
  const [imapHost, setImapHost] = useState(!emailAccount.imapHost || emailAccount.imapHost === 'mail.capitalevents.us' ? 'outlook.office365.com' : emailAccount.imapHost);
  const [imapPort, setImapPort] = useState(emailAccount.imapPort || 993);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);

  const handleTestSmtp = async (overrideHost?: any) => {
    setIsVerifyingSmtp(true);
    setTestStatus(null);
    setTestError(null);

    const activeHost = (typeof overrideHost === 'string' && overrideHost.trim()) 
      ? overrideHost.trim() 
      : (smtpHost || 'smtp.office365.com');

    try {
      const res = await fetch('/api/email/verify-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: activeHost,
          smtpPort: Number(smtpPort),
          username,
          password,
          useSsl: Number(smtpPort) === 465,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus(`Connected & authenticated successfully with ${activeHost}:${smtpPort}!`);
      } else {
        setTestError(data.error || 'SMTP Authentication failed');
      }
    } catch (e: any) {
      setTestError(e.message || 'Error connecting to SMTP server');
    } finally {
      setIsVerifyingSmtp(false);
    }
  };

  const handleSaveEmailAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateEmailAccount) {
      onUpdateEmailAccount({
        displayName,
        emailAddress,
        username,
        password,
        smtpHost,
        smtpPort: Number(smtpPort),
        imapHost,
        imapPort: Number(imapPort),
        useSsl: true,
        isConnected: true,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
    setTestStatus('Mailbox credentials saved successfully!');
  };

  // State for adding a new custom metric
  const [newMetricLabel, setNewMetricLabel] = useState('');
  const [newMetricValue, setNewMetricValue] = useState('');
  const [newMetricCategory, setNewMetricCategory] = useState<'both' | 'header' | 'analytics'>('both');

  

  const presetDays = [15, 30, 45, 60, 90, 120];

  const handleToggleMetric = (id: string) => {
    const updated = metrics.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateMetrics(updated);
  };

  const handleAddCustomMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricLabel.trim() || !newMetricValue.trim()) return;

    const newMetric: MetricConfig = {
      id: `custom-metric-${Date.now()}`,
      label: newMetricLabel.trim(),
      enabled: true,
      type: 'custom',
      customValue: newMetricValue.trim(),
      category: newMetricCategory,
    };

    onUpdateMetrics([...metrics, newMetric]);
    setNewMetricLabel('');
    setNewMetricValue('');
  };

  const handleRemoveCustomMetric = (id: string) => {
    onUpdateMetrics(metrics.filter((m) => m.id !== id));
  };

  const handleResetDefaultMetrics = () => {
    const defaultMetrics: MetricConfig[] = [
      { id: 'shows', label: 'Orbus USA Shows', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'exhibitors', label: 'Total Exhibitors', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'decisionMakers', label: 'Decision Makers', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'leadCutoff', label: 'Lead Cutoff Threshold', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'pipelineValue', label: 'Est. Pipeline Value', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'islandBooths', label: 'Island Booths Count', enabled: true, type: 'builtIn', category: 'both' },
      { id: 'imminentRisk', label: 'Short-Lead Risk Shows', enabled: true, type: 'builtIn', category: 'both' },
    ];
    onUpdateMetrics(defaultMetrics);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 text-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Sales Operations & Decision Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure lead time cutoffs, customizable header metrics, and sales rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-5 pt-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EMAIL_CONFIG')}
            className={`py-2 px-4 rounded-t-lg transition border-t border-x ${
              activeTab === 'EMAIL_CONFIG'
                ? 'bg-white border-slate-200 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />
            Email Setup (Cem Uzun)
          </button>

          <button
            onClick={() => setActiveTab('DECISION_RULES')}
            className={`py-2 px-4 rounded-t-lg transition border-t border-x ${
              activeTab === 'DECISION_RULES'
                ? 'bg-white border-slate-200 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />
            Decision Rules & Cutoffs
          </button>

          <button
            onClick={() => setActiveTab('METRICS_MANAGER')}
            className={`py-2 px-4 rounded-t-lg transition border-t border-x ${
              activeTab === 'METRICS_MANAGER'
                ? 'bg-white border-slate-200 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />
            Metrics Manager
          </button>

          <button
            onClick={() => setActiveTab('DIRECTORY_SCOPE')}
            className={`py-2 px-4 rounded-t-lg transition border-t border-x ${
              activeTab === 'DIRECTORY_SCOPE'
                ? 'bg-white border-slate-200 text-blue-600 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />
            {TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA Shows Directory
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* TAB: EMAIL CONFIGURATION */}
          {activeTab === 'EMAIL_CONFIG' && (
            <form onSubmit={handleSaveEmailAccount} className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Outreach & Mailbox Credentials</span>
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Configured for CAPITAL EVENTS mail server to dispatch cold emails and receive prospect responses.
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40 px-2.5 py-1 rounded-full">
                  STATUS: VERIFIED
                </span>
              </div>

              {testStatus && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testStatus}</span>
                </div>
              )}

              {testError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center space-x-1.5 text-red-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>SMTP Test Connection Failed</span>
                  </div>
                  <p className="font-semibold text-xs text-red-700">{testError}</p>
                  {(testError.includes('ENOTFOUND') || testError.includes('mail.capitalevents.us')) && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Quick Fix for DNS ENOTFOUND Error:
                      </p>
                      <p className="text-amber-800">
                        The hostname <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">mail.capitalevents.us</code> is an example placeholder. Click one of the <strong>Quick Provider Presets</strong> below (e.g. <strong>Gmail</strong> or <strong>Office 365</strong>) or enter your provider's actual SMTP host (e.g. <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">smtp.gmail.com</code>).
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">User Name / Login</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mailbox Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Mail Server Connection Details</h4>
                  <span className="text-[10px] text-slate-500">Quick Provider Presets:</span>
                </div>

                {/* Provider Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHost('smtp.gmail.com');
                      setSmtpPort(587);
                      setImapHost('imap.gmail.com');
                      setImapPort(993);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                      smtpHost === 'smtp.gmail.com'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    ✉️ Google Workspace / Gmail
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHost('smtp.office365.com');
                      setSmtpPort(587);
                      setImapHost('outlook.office365.com');
                      setImapPort(993);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                      smtpHost === 'smtp.office365.com'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    💼 Office 365 / Outlook
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHost('smtp.sendgrid.net');
                      setSmtpPort(587);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                      smtpHost === 'smtp.sendgrid.net'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    🚀 SendGrid
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHost('smtp.mail.yahoo.com');
                      setSmtpPort(465);
                      setImapHost('imap.mail.yahoo.com');
                      setImapPort(993);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                      smtpHost === 'smtp.mail.yahoo.com'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    📬 Yahoo
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-600 mb-1">SMTP Server (Outgoing)</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-600 mb-1">IMAP Server (Incoming)</label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Port</label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestSmtp()}
                  disabled={isVerifyingSmtp}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isVerifyingSmtp ? 'Testing SMTP Connection...' : 'Test SMTP Connection'}</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Email Settings
                </button>
              </div>
            </form>
          )}
          
          {/* TAB 1: DECISION RULES & CUTOFFS */}
          {activeTab === 'DECISION_RULES' && (
            <div className="space-y-6">
              
              {/* Lead Time Cutoff */}
              <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <Clock className="w-4 h-4 mr-1.5 text-blue-600" />
                      Trade Show Lead Time Cutoff Threshold
                    </label>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Events happening in less than <span className="font-bold text-blue-600">{decisionSettings.leadTimeCutoffDays} days</span> will be flagged with a lead time warning tag. Tradeshow booth fabrication, graphic printing, and logistics require sufficient lead time.
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">Select Cutoff Preset:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {presetDays.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() =>
                          onUpdateDecisionSettings({ ...decisionSettings, leadTimeCutoffDays: days })
                        }
                        className={`py-2 px-3 rounded-lg border text-xs font-bold transition text-center ${
                          decisionSettings.leadTimeCutoffDays === days
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input */}
                <div className="flex items-center space-x-3 pt-2">
                  <span className="text-xs text-slate-600 font-medium">Custom Cutoff Days:</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={decisionSettings.leadTimeCutoffDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        onUpdateDecisionSettings({ ...decisionSettings, leadTimeCutoffDays: val });
                      }
                    }}
                    className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="text-xs text-slate-500 font-medium">days prior to trade show start date</span>
                </div>
              </div>

              {/* Action Rules on Short-Lead Shows */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                  Lead Time Cutoff Rules & Safeguards
                </h3>

                <div className="space-y-2.5 bg-white border border-slate-200 rounded-xl p-4">
                  <label className="flex items-start space-x-3 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={decisionSettings.hideShortLeadShows}
                      onChange={(e) =>
                        onUpdateDecisionSettings({ ...decisionSettings, hideShortLeadShows: e.target.checked })
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                        Exclude / Hide trade shows happening within {decisionSettings.leadTimeCutoffDays} days
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Filters out trade show events and their exhibitors if the event starts in less than {decisionSettings.leadTimeCutoffDays} days.
                      </p>
                    </div>
                  </label>

                  <div className="h-px bg-slate-100 my-2" />

                  <label className="flex items-start space-x-3 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={decisionSettings.blockOutreachShortLead}
                      onChange={(e) =>
                        onUpdateDecisionSettings({ ...decisionSettings, blockOutreachShortLead: e.target.checked })
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                        Strict Block: Prevent sales outreach for shows &lt; {decisionSettings.leadTimeCutoffDays} days away
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Blocks sales reps from sending cold pitches or drafting proposals when lead time is too short for production logistics.
                      </p>
                    </div>
                  </label>

                  <div className="h-px bg-slate-100 my-2" />

                  <label className="flex items-start space-x-3 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={decisionSettings.warnOnOutreach}
                      onChange={(e) =>
                        onUpdateDecisionSettings({ ...decisionSettings, warnOnOutreach: e.target.checked })
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                        Display warning notice in pitch generator for &lt; {decisionSettings.leadTimeCutoffDays} day events
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Shows an alert banner in the cold pitch generator reminding reps to suggest modular stock display rentals.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quality & Lead Scoring Criteria */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <Target className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Lead Qualification & Decision Maker Criteria
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-slate-200 rounded-xl p-4">
                  
                  {/* Lead Score Priority */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Priority Lead Score Cutoff:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={5}
                        value={decisionSettings.minLeadScorePriority}
                        onChange={(e) =>
                          onUpdateDecisionSettings({
                            ...decisionSettings,
                            minLeadScorePriority: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-blue-600"
                      />
                      <span className="text-xs font-bold text-blue-600 w-12 text-right">
                        {decisionSettings.minLeadScorePriority}+
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Leads above {decisionSettings.minLeadScorePriority} will be highlighted as top tier accounts.
                    </p>
                  </div>

                  {/* Require Verified Email */}
                  <div className="flex flex-col justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={decisionSettings.requireVerifiedEmailForOutreach}
                        onChange={(e) =>
                          onUpdateDecisionSettings({
                            ...decisionSettings,
                            requireVerifiedEmailForOutreach: e.target.checked,
                          })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Require Verified Email for Pitching
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Only allow pitch generation when decision maker email is verified.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: METRICS MANAGER (ADD/REMOVE METRICS) */}
          {activeTab === 'METRICS_MANAGER' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Header & Analytics Metric Cards
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select which metrics appear in the header KPI strip and dashboard. You can add or remove custom metrics.
                  </p>
                </div>

                <button
                  onClick={handleResetDefaultMetrics}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Active Metrics List */}
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleMetric(m.id)}
                        className={`p-1.5 rounded-md transition ${
                          m.enabled
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                        title={m.enabled ? 'Click to hide metric' : 'Click to show metric'}
                      >
                        {m.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <div>
                        <span className={`text-xs font-bold ${m.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {m.label}
                        </span>
                        {m.type === 'custom' && (
                          <span className="ml-2 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                            Custom: {m.customValue}
                          </span>
                        )}
                        <span className="ml-2 text-[10px] text-slate-400">
                          ({m.category || 'both'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        m.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.enabled ? 'Visible' : 'Hidden'}
                      </span>

                      {m.type === 'custom' && (
                        <button
                          onClick={() => handleRemoveCustomMetric(m.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Remove custom metric"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Custom Metric Form */}
              <form onSubmit={handleAddCustomMetric} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add New Custom Metric Card</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Metric Label:</label>
                    <input
                      type="text"
                      placeholder="e.g., Monthly Sales Target"
                      required
                      value={newMetricLabel}
                      onChange={(e) => setNewMetricLabel(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Custom Value / Target:</label>
                    <input
                      type="text"
                      placeholder="e.g., $250,000 / mo"
                      required
                      value={newMetricValue}
                      onChange={(e) => setNewMetricValue(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Display Location:</label>
                    <select
                      value={newMetricCategory}
                      onChange={(e) => setNewMetricCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="both">Both Header & Analytics</option>
                      <option value="header">Header Only</option>
                      <option value="analytics">Analytics Dashboard Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Metric</span>
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 3: DIRECTORY SCOPE */}
          {activeTab === 'DIRECTORY_SCOPE' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-sm font-bold text-blue-900">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Orbus USA Trade Show Source Directory ({TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} Events Indexed)</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  The complete database covers <strong>{TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} USA trade shows</strong> across all 50 US states (including major hubs like Las Vegas, Orlando, Chicago, Atlanta, New York, Dallas, and Anaheim).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                  <div className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                    <span className="text-slate-500 block">Total USA Directory</span>
                    <span className="text-base font-bold text-slate-800">{TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} Shows</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                    <span className="text-slate-500 block">USA States Covered</span>
                    <span className="text-base font-bold text-blue-600">50 States</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                    <span className="text-slate-500 block">Lead Cutoff Rule</span>
                    <span className="text-base font-bold text-amber-600">{decisionSettings.leadTimeCutoffDays} Days</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-blue-200/60">
                  Tip: Use the "Fetch Orbus List" or "Extract Exhibitors" tool in the navigation header at any time to pull fresh directories for any of the {TOTAL_ORBUS_USA_SHOWS_COUNT.toLocaleString()} events nationwide.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Cutoff: <strong className="text-blue-600">{decisionSettings.leadTimeCutoffDays} Days</strong> • Metrics Configured: <strong className="text-slate-800">{metrics.filter((m) => m.enabled).length} Active</strong>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
};
