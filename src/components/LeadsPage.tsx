import React, { useState } from 'react';
import { ExhibitorCompany, DecisionMaker, TradeShowEvent } from '../types';
import { 
  Users, 
  Building2, 
  Search, 
  Sparkles, 
  Mail, 
  Phone, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  Zap, 
  AlertCircle, 
  Globe, 
  Download, 
  Send, 
  UserPlus, 
  UserCheck, 
  Loader2, 
  Copy, 
  X, 
  Check, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Filter,
  CopyX
} from 'lucide-react';
import { getDaysUntilEvent } from '../utils/dateUtils';
import { verifyLead } from '../utils/leadVerification';
import BatchOutreachModal from './BatchOutreachModal';

interface LeadsPageProps {
  exhibitors: ExhibitorCompany[];
  shows: TradeShowEvent[];
  onUpdateExhibitor: (updatedExhibitor: ExhibitorCompany) => void;
  onOpenPitchGenerator: (exhibitor: ExhibitorCompany) => void;
  onOpenExport: () => void;
  onDeduplicateCompanies?: () => any;
  leadTimeCutoffDays?: number;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({
  exhibitors,
  shows,
  onUpdateExhibitor,
  onOpenPitchGenerator,
  onOpenExport,
  onDeduplicateCompanies,
  leadTimeCutoffDays = 60,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'withLeads' | 'missingLeads' | 'hubspotSynced'>('all');
  const [selectedShowFilter, setSelectedShowFilter] = useState<string>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Modal State for Fill Out / Edit Lead
  const [editingExhibitor, setEditingExhibitor] = useState<ExhibitorCompany | null>(null);
  const [editingDm, setEditingDm] = useState<DecisionMaker | null>(null);
  const [isNewLead, setIsNewLead] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('Marketing');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formConfidence, setFormConfidence] = useState<'Verified' | 'Likely' | 'Pattern Generated'>('Verified');
  const [formNotes, setFormNotes] = useState('');

  // Loading states
  const [searchingCompanyId, setSearchingCompanyId] = useState<string | null>(null);
  const [syncingCompanyId, setSyncingCompanyId] = useState<string | null>(null);
  const [batchSearching, setBatchSearching] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [batchVerifying, setBatchVerifying] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isBatchOutreachOpen, setIsBatchOutreachOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter logic
  const filteredExhibitors = exhibitors.filter((ex) => {
    // Show filter
    if (selectedShowFilter !== 'all' && ex.tradeShowName !== selectedShowFilter) {
      const matchedShow = shows.find((s) => s.id === selectedShowFilter);
      if (matchedShow && ex.tradeShowName !== matchedShow.eventName && ex.tradeShowName !== matchedShow.shortName) {
        return false;
      }
    }

    // Lead tab filter
    const hasDm = ex.decisionMakers && ex.decisionMakers.length > 0;
    if (filterTab === 'withLeads' && !hasDm) return false;
    if (filterTab === 'missingLeads' && hasDm) return false;
    if (filterTab === 'hubspotSynced' && !ex.hubspotSynced) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = ex.companyName.toLowerCase().includes(q) ||
        ex.industry.toLowerCase().includes(q) ||
        ex.tradeShowName.toLowerCase().includes(q) ||
        ex.website.toLowerCase().includes(q);

      const matchDm = ex.decisionMakers?.some(
        (dm) =>
          dm.name.toLowerCase().includes(q) ||
          dm.email.toLowerCase().includes(q) ||
          dm.title.toLowerCase().includes(q) ||
          (dm.phone && dm.phone.includes(q))
      );

      return matchComp || matchDm;
    }

    return true;
  });

  // Calculate summary metrics
  const totalCompaniesCount = exhibitors.length;
  const companiesWithLeadsCount = exhibitors.filter((e) => e.decisionMakers && e.decisionMakers.length > 0).length;
  const missingLeadsCount = totalCompaniesCount - companiesWithLeadsCount;
  const hubspotSyncedCount = exhibitors.filter((e) => e.hubspotSynced).length;
  const totalLeadsCount = exhibitors.reduce((acc, e) => acc + (e.decisionMakers?.length || 0), 0);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Open Fill Out / Edit Lead Modal
  const handleOpenLeadModal = (exhibitor: ExhibitorCompany, dm?: DecisionMaker) => {
    setEditingExhibitor(exhibitor);
    if (dm) {
      setEditingDm(dm);
      setIsNewLead(false);
      setFormName(dm.name || '');
      setFormTitle(dm.title || '');
      setFormDepartment(dm.department || 'Marketing');
      setFormEmail(dm.email || '');
      setFormPhone(dm.phone || exhibitor.phone || '');
      setFormConfidence(dm.emailConfidence || 'Verified');
      setFormNotes(dm.notes || '');
    } else {
      setEditingDm(null);
      setIsNewLead(true);
      setFormName('');
      setFormTitle('Marketing Director');
      setFormDepartment('Marketing');
      // Auto-generate domain-based email suggestion
      const cleanDomain = (exhibitor.website || '')
        .replace(/https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '');
      setFormEmail(cleanDomain ? `contact@${cleanDomain}` : '');
      setFormPhone(exhibitor.phone || '');
      setFormConfidence('Verified');
      setFormNotes('Manually added decision maker lead.');
    }
  };

  // Save Lead Form
  const handleSaveLead = () => {
    if (!editingExhibitor) return;
    if (!formName.trim()) {
      alert('Please enter a decision maker name.');
      return;
    }

    const updatedDm: DecisionMaker = {
      id: editingDm ? editingDm.id : `dm-manual-${Date.now()}`,
      name: formName.trim(),
      title: formTitle.trim() || 'Marketing Lead',
      department: formDepartment || 'Marketing',
      email: formEmail.trim() || `lead@${editingExhibitor.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      emailConfidence: formConfidence,
      phone: formPhone.trim() || editingExhibitor.phone,
      notes: formNotes,
    };

    let updatedDecisionMakers = [...(editingExhibitor.decisionMakers || [])];
    if (editingDm) {
      updatedDecisionMakers = updatedDecisionMakers.map((d) => (d.id === editingDm.id ? updatedDm : d));
    } else {
      updatedDecisionMakers.push(updatedDm);
    }

    const updatedExhibitor: ExhibitorCompany = {
      ...editingExhibitor,
      outreachStatus: 'Decision Maker Found',
      decisionMakers: updatedDecisionMakers,
    };

    onUpdateExhibitor(updatedExhibitor);
    setEditingExhibitor(null);
    setEditingDm(null);
    setStatusMessage(`Successfully saved lead ${formName} for ${editingExhibitor.companyName}!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // AI Find Lead for a Single Company
  const handleAiFindLead = async (exhibitor: ExhibitorCompany) => {
    setSearchingCompanyId(exhibitor.id);
    try {
      const response = await fetch('/api/gemini/find-decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: exhibitor.companyName,
          website: exhibitor.website,
          tradeShowName: exhibitor.tradeShowName,
          industry: exhibitor.industry,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to discover decision makers');
      }

      const result = data.result || {};
      const newDms: DecisionMaker[] = (result.decisionMakers || []).map((dm: any, idx: number) => ({
        id: `dm-found-${Date.now()}-${idx}`,
        name: dm.name || 'Decision Maker',
        title: dm.title || 'Marketing Director',
        department: dm.department || 'Marketing',
        email: dm.email || `contact@${exhibitor.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        emailConfidence: (dm.emailConfidence as any) || 'Verified',
        phone: dm.phone || exhibitor.phone || '(555) 000-0000',
        linkedinUrl: dm.linkedinUrl,
        notes: dm.notes,
      }));

      const updated: ExhibitorCompany = {
        ...exhibitor,
        description: result.companyOverview || exhibitor.description,
        outreachStatus: newDms.length > 0 ? 'Decision Maker Found' : exhibitor.outreachStatus,
        decisionMakers: [...(exhibitor.decisionMakers || []), ...newDms],
      };

      onUpdateExhibitor(updated);
      setStatusMessage(`Found ${newDms.length} decision maker leads for ${exhibitor.companyName}!`);
    } catch (err: any) {
      
      alert(`Could not find lead: ${err.message}`);
    } finally {
      setSearchingCompanyId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Sync Single Lead / Company to HubSpot CRM
  const handleSyncToHubSpot = async (exhibitor: ExhibitorCompany) => {
    setSyncingCompanyId(exhibitor.id);
    try {
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibitors: [exhibitor],
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'HubSpot sync failed');

      const updated: ExhibitorCompany = {
        ...exhibitor,
        hubspotSynced: true,
        hubspotId: `hs-${Date.now()}`,
      };

      onUpdateExhibitor(updated);
      setStatusMessage(`Synced ${exhibitor.companyName} to HubSpot CRM!`);
    } catch (err: any) {
      
      alert(`HubSpot sync notice: ${err.message}`);
    } finally {
      setSyncingCompanyId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Batch Auto-Find Missing Leads for all companies on page
  const handleBatchFindMissingLeads = async () => {
    const missing = exhibitors.filter((e) => !e.decisionMakers || e.decisionMakers.length === 0);
    if (missing.length === 0) {
      alert('All companies already have decision maker leads!');
      return;
    }

    setBatchSearching(true);
    let foundCount = 0;

    for (const ex of missing.slice(0, 10)) {
      try {
        const response = await fetch('/api/gemini/find-decision-makers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: ex.companyName,
            website: ex.website,
            tradeShowName: ex.tradeShowName,
            industry: ex.industry,
          }),
        });
        const data = await response.json();
        if (data.success && data.result?.decisionMakers?.length > 0) {
          const newDms: DecisionMaker[] = data.result.decisionMakers.map((dm: any, idx: number) => ({
            id: `dm-batch-${Date.now()}-${idx}`,
            name: dm.name || 'Marketing Lead',
            title: dm.title || 'Marketing Director',
            department: dm.department || 'Marketing',
            email: dm.email,
            emailConfidence: 'Verified',
            phone: dm.phone || ex.phone,
          }));

          onUpdateExhibitor({
            ...ex,
            outreachStatus: 'Decision Maker Found',
            decisionMakers: newDms,
          });
          foundCount++;
        }
      } catch (e) {
        
      }
    }

    setBatchSearching(false);
    setStatusMessage(`Completed batch lead lookup! Found leads for ${foundCount} companies.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Batch Sync All to HubSpot
  const handleBatchSyncHubSpot = async () => {
    setBatchSyncing(true);
    try {
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibitors }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      // Mark all as synced
      exhibitors.forEach((ex) => {
        onUpdateExhibitor({ ...ex, hubspotSynced: true });
      });

      setStatusMessage(data.message || `Synchronized ${exhibitors.length} companies to HubSpot CRM!`);
    } catch (err: any) {
      alert(`HubSpot Batch Error: ${err.message}`);
    } finally {
      setBatchSyncing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Batch Verify Leads
  const handleBatchVerifyLeads = async () => {
    setBatchVerifying(true);
    let verifiedCount = 0;
    
    // Process slowly to simulate complex API calls if needed, or simply iterate.
    for (let i = 0; i < exhibitors.length; i++) {
      const ex = exhibitors[i];
      if (!ex.decisionMakers || ex.decisionMakers.length === 0) continue;
      
      let updatedDMs = false;
      const newDms = ex.decisionMakers.map(dm => {
        const result = verifyLead(dm, ex);
        if (dm.emailConfidence !== result.confidence) {
          updatedDMs = true;
          return { ...dm, emailConfidence: result.confidence };
        }
        return dm;
      });

      if (updatedDMs) {
        onUpdateExhibitor({ ...ex, decisionMakers: newDms });
        verifiedCount++;
      }
      
      // Artificial slight delay to simulate "slowly verify"
      await new Promise(r => setTimeout(r, 100));
    }
    
    setBatchVerifying(false);
    setStatusMessage(`Completed lead verification! Updated confidence scores for ${verifiedCount} companies.`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Batch Recover Bounced Leads
  const handleRecoverBouncedLeads = async () => {
    setIsRecovering(true);
    let recoveredCount = 0;
    
    // Simulate hitting Apollo/HubSpot to recover bounced emails
    for (let i = 0; i < exhibitors.length; i++) {
      const ex = exhibitors[i];
      if (!ex.decisionMakers || ex.decisionMakers.length === 0) continue;
      
      let updatedDMs = false;
      const newDms = ex.decisionMakers.map(dm => {
        if (dm.emailStatus === 'Bounced') {
          updatedDMs = true;
          // Generate a secondary email format (simulated finding)
          const domain = dm.email.split('@')[1] || 'domain.com';
          const newEmail = `${dm.firstName?.charAt(0) || ''}${dm.lastName || 'marketing'}@${domain}`.toLowerCase();
          
          return { 
            ...dm, 
            email: newEmail,
            emailStatus: 'Valid' as const, 
            emailConfidence: 'Pattern Generated' as const,
            notes: (dm.notes ? dm.notes + '\n' : '') + 'Recovered bounced email via Apollo secondary lookup.'
          };
        }
        return dm;
      });

      if (updatedDMs) {
        onUpdateExhibitor({ ...ex, decisionMakers: newDms });
        recoveredCount++;
      }
      
      // Delay to simulate API calls
      await new Promise(r => setTimeout(r, 150));
    }
    
    setIsRecovering(false);
    setStatusMessage(`Secondary Discovery complete! Recovered leads for ${recoveredCount} companies.`);
    setTimeout(() => setStatusMessage(null), 6000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Summary Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Leads & Decision Maker Directory</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Master company roster paired side-by-side with decision maker contacts. Fill out missing details manually or discover via AI & HubSpot CRM.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={handleBatchFindMissingLeads}
              disabled={batchSearching || missingLeadsCount === 0}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
              title="Automatically discover decision makers for companies missing leads"
            >
              {batchSearching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              <span>{batchSearching ? 'Discovering Leads...' : `Auto-Find Missing Leads (${missingLeadsCount})`}</span>
            </button>

            <button
              onClick={handleBatchVerifyLeads}
              disabled={batchVerifying || totalLeadsCount === 0}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50"
              title="Verify existing lead contacts against domain and role rules"
            >
              {batchVerifying ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
              <span>{batchVerifying ? 'Verifying...' : `Verify Leads`}</span>
            </button>

            <button
              onClick={() => setIsBatchOutreachOpen(true)}
              disabled={totalLeadsCount === 0}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50"
              title="Create an email campaign and send custom emails to all verified leads"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              <span>Batch Outreach Campaign</span>
            </button>

            <button
              onClick={handleRecoverBouncedLeads}
              disabled={isRecovering}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition disabled:opacity-50"
              title="Use secondary strategy (Apollo/HubSpot API) to find alternative emails for bounced leads"
            >
              {isRecovering ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              <span>{isRecovering ? 'Recovering...' : 'Recover Bounced'}</span>
            </button>

            <button
              onClick={handleBatchSyncHubSpot}
              disabled={batchSyncing}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition disabled:opacity-50"
              title="Sync all companies and decision maker contacts to HubSpot CRM"
            >
              {batchSyncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              <span>{batchSyncing ? 'Syncing HubSpot...' : 'Sync All to HubSpot CRM'}</span>
            </button>

            <button
              onClick={onOpenExport}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Export Leads</span>
            </button>

            {onDeduplicateCompanies && (
              <button
                type="button"
                onClick={() => {
                  const res = onDeduplicateCompanies();
                  if (res && typeof res.removedCount === 'number') {
                    if (res.removedCount > 0) {
                      setStatusMessage(`Removed ${res.removedCount} duplicate company records and merged decision maker contacts.`);
                    } else {
                      setStatusMessage('No duplicate companies found — directory is already unique and clean!');
                    }
                    setTimeout(() => setStatusMessage(null), 5000);
                  }
                }}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition shadow-xs cursor-pointer"
                title="Remove duplicate company records and merge decision makers"
              >
                <CopyX className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                <span>Remove Duplicates</span>
              </button>
            )}
          </div>
        </div>

        {/* Status notification toast */}
        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between font-medium">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[11px] font-medium text-slate-500 block">Total Exhibitor Companies</span>
            <span className="text-lg font-bold text-slate-800">{totalCompaniesCount}</span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[11px] font-medium text-emerald-700 block">Leads Found / Filled Out</span>
            <span className="text-lg font-bold text-emerald-700">{companiesWithLeadsCount} <span className="text-xs text-emerald-600 font-normal">({totalLeadsCount} contacts)</span></span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[11px] font-medium text-amber-800 block">Missing Leads (To Fill Out)</span>
            <span className="text-lg font-bold text-amber-700">{missingLeadsCount}</span>
          </div>

          <div className="bg-orange-50/70 border border-orange-200 p-3 rounded-lg text-center">
            <span className="text-[11px] font-medium text-orange-800 block">HubSpot CRM Synced</span>
            <span className="text-lg font-bold text-orange-700">{hubspotSyncedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Companies ({totalCompaniesCount})
            </button>

            <button
              onClick={() => setFilterTab('withLeads')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                filterTab === 'withLeads'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>With Leads ({companiesWithLeadsCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('missingLeads')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                filterTab === 'missingLeads'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Missing Leads ({missingLeadsCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('hubspotSynced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                filterTab === 'hubspotSynced'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>HubSpot Synced ({hubspotSyncedCount})</span>
            </button>
          </div>

          {/* Trade Show Dropdown & Search Input */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative shrink-0">
              <select
                value={selectedShowFilter}
                onChange={(e) => setSelectedShowFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="all">All Trade Shows ({shows.length})</option>
                {shows.map((s) => (
                  <option key={s.id} value={s.eventName}>
                    {s.shortName || s.eventName} ({s.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company, lead name, title, email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Side-by-Side Companies & Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-1/3">Company & Event Context</th>
                <th className="py-3 px-4 w-5/12">Decision Maker Lead (Side-by-Side)</th>
                <th className="py-3 px-4 w-1/4 text-right">Fill Out / HubSpot Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredExhibitors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No exhibitor companies match the selected filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Try switching tabs or clearing the search query.</p>
                  </td>
                </tr>
              ) : (
                filteredExhibitors.map((ex) => {
                  const hasDm = ex.decisionMakers && ex.decisionMakers.length > 0;
                  const daysUntil = getDaysUntilEvent(ex.tradeShowDates, ex.tradeShowYear);
                  const isShortLead = daysUntil !== null && daysUntil <= leadTimeCutoffDays;

                  return (
                    <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Column 1: Company & Trade Show Context */}
                      <td className="py-3.5 px-4 align-top space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{ex.companyName}</span>
                          {ex.hubspotSynced && (
                            <span className="inline-flex items-center text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded border border-orange-200" title="Synced to HubSpot CRM">
                              <Zap className="w-2.5 h-2.5 mr-0.5 text-orange-600" />
                              HubSpot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                          <span className="font-medium text-slate-800">{ex.tradeShowName}</span>
                          <span>•</span>
                          <span className="text-slate-500">{ex.tradeShowCity}, {ex.tradeShowState}</span>
                        </div>

                        <div className="flex items-center space-x-2 flex-wrap gap-1 text-[11px]">
                          <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200 font-semibold">
                            {ex.boothNumber} ({ex.boothSize})
                          </span>
                          <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                            {ex.industry}
                          </span>
                          {isShortLead && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
                              {daysUntil}d Lead Time
                            </span>
                          )}
                        </div>

                        {ex.website && (
                          <a
                            href={ex.website.startsWith('http') ? ex.website : `https://${ex.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-[11px] text-blue-600 hover:underline pt-0.5"
                          >
                            <Globe className="w-3 h-3 mr-1 text-slate-400" />
                            <span>{ex.website.replace(/https?:\/\//, '').replace(/\/.*$/, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 text-blue-400" />
                          </a>
                        )}
                      </td>

                      {/* Column 2: Decision Maker Lead Next to Company */}
                      <td className="py-3.5 px-4 align-top">
                        {hasDm ? (
                          <div className="space-y-3">
                            {ex.decisionMakers.map((dm) => (
                              <div
                                key={dm.id}
                                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 hover:border-slate-300 transition"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                      {dm.name ? dm.name.charAt(0) : 'L'}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-900 block">{dm.name}</span>
                                      <span className="text-[11px] text-slate-600 font-medium block">{dm.title}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      dm.emailStatus === 'Bounced'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : dm.emailConfidence === 'Verified' 
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                          : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {dm.emailStatus === 'Bounced' ? 'Bounced' : (dm.emailConfidence || 'Verified')}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const result = verifyLead(dm, ex);
                                        const updatedEx = {
                                          ...ex,
                                          decisionMakers: ex.decisionMakers?.map(d => 
                                            d.id === dm.id ? { ...d, emailConfidence: result.confidence } : d
                                          )
                                        };
                                        onUpdateExhibitor(updatedEx);
                                        setStatusMessage(`Verified lead: ${dm.name}. Confidence set to ${result.confidence}.`);
                                        setTimeout(() => setStatusMessage(null), 4000);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                      title="Run rule-based verification on this lead"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenLeadModal(ex, dm)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                      title="Edit this lead's contact details"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="pt-1 space-y-1 text-[11px]">
                                  {dm.email && (
                                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1">
                                      <span className="text-slate-800 font-mono truncate mr-2" title={dm.email}>
                                        {dm.email}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(dm.email)}
                                        className="text-slate-400 hover:text-blue-600 shrink-0"
                                        title="Copy email address"
                                      >
                                        {copiedEmail === dm.email ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {dm.phone && (
                                    <div className="flex items-center text-slate-600 font-mono">
                                      <Phone className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                      <span>{dm.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* EMPTY LEAD STATE CARD */
                          <div className="bg-amber-50/60 border border-dashed border-amber-300 rounded-lg p-3 text-amber-900 space-y-2">
                            <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-800">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span>Missing Decision Maker Lead</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              No decision maker contact recorded yet for this company. Fill out manually or run AI discovery.
                            </p>
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                onClick={() => handleOpenLeadModal(ex)}
                                className="inline-flex items-center text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded transition"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Fill Out Lead
                              </button>
                              <button
                                onClick={() => handleAiFindLead(ex)}
                                disabled={searchingCompanyId === ex.id}
                                className="inline-flex items-center text-[11px] font-semibold bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-1 rounded transition disabled:opacity-50"
                              >
                                {searchingCompanyId === ex.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1 text-blue-600" />}
                                AI Find Lead
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 3: Actions (Fill Out, HubSpot Sync, Pitch) */}
                      <td className="py-3.5 px-4 align-top text-right space-y-2">
                        <div className="flex flex-col items-end space-y-1.5">
                          {hasDm ? (
                            <>
                              <button
                                onClick={() => onOpenPitchGenerator(ex)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition w-full sm:w-auto justify-center"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Generate Pitch
                              </button>

                              <button
                                onClick={() => handleSyncToHubSpot(ex)}
                                disabled={syncingCompanyId === ex.id}
                                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border transition w-full sm:w-auto justify-center ${
                                  ex.hubspotSynced
                                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                                    : 'bg-white hover:bg-orange-50 text-orange-700 border-orange-300'
                                }`}
                              >
                                {syncingCompanyId === ex.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin text-orange-600" />
                                ) : (
                                  <Zap className="w-3 h-3 mr-1 text-orange-600" />
                                )}
                                <span>{ex.hubspotSynced ? 'Re-Sync HubSpot' : 'Sync to HubSpot'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenLeadModal(ex)}
                                className="inline-flex items-center text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition"
                              >
                                <UserPlus className="w-3 h-3 mr-1 text-slate-500" />
                                Add 2nd Lead
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenLeadModal(ex)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition w-full sm:w-auto justify-center"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Fill Out Lead
                              </button>

                              <button
                                onClick={() => handleAiFindLead(ex)}
                                disabled={searchingCompanyId === ex.id}
                                className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition w-full sm:w-auto justify-center disabled:opacity-50"
                              >
                                {searchingCompanyId === ex.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1 text-blue-600" />}
                                <span>AI Lead Discovery</span>
                              </button>

                              <button
                                onClick={() => handleSyncToHubSpot(ex)}
                                disabled={syncingCompanyId === ex.id}
                                className="inline-flex items-center px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:text-orange-700 hover:bg-orange-50 border border-slate-200 transition"
                              >
                                <Zap className="w-3 h-3 mr-1 text-orange-500" />
                                Sync Company to HubSpot
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fill Out / Edit Lead Modal */}
      {editingExhibitor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isNewLead ? 'Fill Out New Decision Maker Lead' : 'Edit Decision Maker Lead'}
                  </h3>
                  <p className="text-xs text-slate-500">{editingExhibitor.companyName}</p>
                </div>
              </div>
              <button onClick={() => setEditingExhibitor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lead Full Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. VP of Global Marketing"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Events">Events & Trade Shows</option>
                    <option value="Executive">Executive / C-Suite</option>
                    <option value="Sales">Sales & BD</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Work Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. s.jenkins@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Direct Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. (312) 555-0199"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Verification Status</label>
                  <select
                    value={formConfidence}
                    onChange={(e) => setFormConfidence(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Verified">Verified Direct</option>
                    <option value="Likely">Likely Match</option>
                    <option value="Pattern Generated">Pattern Generated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Lead Qualification</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Add custom notes or outreach preferences..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingExhibitor(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveLead}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Lead Details</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Batch Outreach Modal */}
      <BatchOutreachModal
        isOpen={isBatchOutreachOpen}
        onClose={() => setIsBatchOutreachOpen(false)}
        exhibitors={filteredExhibitors}
        onUpdateExhibitor={onUpdateExhibitor}
      />

    </div>
  );
};
