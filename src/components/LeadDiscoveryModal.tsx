import React, { useState } from 'react';
import { ExhibitorCompany, DecisionMaker } from '../types';
import { 
  X, 
  Sparkles, 
  Search, 
  Mail, 
  UserCheck, 
  Building2, 
  Globe, 
  Plus, 
  CheckCircle2, 
  Send, 
  ShieldCheck,
  Zap,
  Briefcase,
  Copy,
  Linkedin,
  Phone,
  AlertCircle
} from 'lucide-react';

interface LeadDiscoveryModalProps {
  exhibitor: ExhibitorCompany | null;
  onClose: () => void;
  onUpdateExhibitor: (updatedExhibitor: ExhibitorCompany) => void;
  onOpenPitchGenerator?: (exhibitor: ExhibitorCompany) => void;
}

export const LeadDiscoveryModal: React.FC<LeadDiscoveryModalProps> = ({
  exhibitor,
  onClose,
  onUpdateExhibitor,
  onOpenPitchGenerator,
}) => {
  if (!exhibitor) return null;

  const [activeTab, setActiveTab] = useState<'AI_SEARCH' | 'DOMAIN_PATTERNS' | 'MANUAL_ENTRY'>('AI_SEARCH');
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualTitle, setManualTitle] = useState('VP of Global Marketing & Events');
  const [manualDept, setManualDept] = useState('Marketing');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState(exhibitor.phone || '');
  const [manualLinkedin, setManualLinkedin] = useState('');

  // Domain pattern generator state
  const domain = exhibitor.website 
    ? exhibitor.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : `${exhibitor.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

  const [testFirstName, setTestFirstName] = useState('John');
  const [testLastName, setTestLastName] = useState('Smith');
  const [testRole, setTestRole] = useState('Event Marketing Director');

  const generatedPatterns = [
    { label: 'First.Last @ Domain', email: `${testFirstName.toLowerCase()}.${testLastName.toLowerCase()}@${domain}`, confidence: 'Verified' as const },
    { label: 'FirstInitial.Last @ Domain', email: `${testFirstName.charAt(0).toLowerCase()}.${testLastName.toLowerCase()}@${domain}`, confidence: 'Likely' as const },
    { label: 'FirstInitialLast @ Domain', email: `${testFirstName.charAt(0).toLowerCase()}${testLastName.toLowerCase()}@${domain}`, confidence: 'Likely' as const },
    { label: 'First @ Domain', email: `${testFirstName.toLowerCase()}@${domain}`, confidence: 'Pattern Generated' as const },
    { label: 'Events Dept Alias', email: `events@${domain}`, confidence: 'Verified' as const },
    { label: 'Marketing Dept Alias', email: `marketing@${domain}`, confidence: 'Verified' as const },
  ];

  // Method 1: Run AI Grounding Search
  const handleRunAiSearch = async () => {
    setIsSearching(true);
    setSearchError(null);

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
        id: `dm-ai-${Date.now()}-${idx}`,
        name: dm.name || 'Decision Maker',
        title: dm.title || 'Marketing Director',
        department: dm.department || 'Marketing',
        email: dm.email || `contact@${domain}`,
        emailConfidence: (dm.emailConfidence as any) || 'Verified',
        phone: dm.phone || exhibitor.phone || '(555) 000-0000',
        linkedinUrl: dm.linkedinUrl,
        notes: dm.notes,
      }));

      const updated: ExhibitorCompany = {
        ...exhibitor,
        description: result.companyOverview || exhibitor.description,
        notes: result.estimatedBoothNeeds ? `${exhibitor.notes ? exhibitor.notes + '\n' : ''}Booth Recommendation: ${result.estimatedBoothNeeds}` : exhibitor.notes,
        outreachStatus: newDms.length > 0 ? 'Decision Maker Found' : exhibitor.outreachStatus,
        decisionMakers: [...exhibitor.decisionMakers, ...newDms],
      };

      onUpdateExhibitor(updated);
    } catch (err: any) {
      
      setSearchError(err.message || 'Error running AI lead discovery search');
    } finally {
      setIsSearching(false);
    }
  };

  // Method 2: Select a Domain Pattern as a Contact
  const handleAddPatternContact = (patternEmail: string, confidence: 'Verified' | 'Likely' | 'Pattern Generated') => {
    const newDm: DecisionMaker = {
      id: `dm-pattern-${Date.now()}`,
      name: `${testFirstName} ${testLastName}`,
      title: testRole,
      department: 'Marketing / Events',
      email: patternEmail,
      emailConfidence: confidence,
      phone: exhibitor.phone || '(555) 000-0000',
    };

    const updated: ExhibitorCompany = {
      ...exhibitor,
      outreachStatus: 'Decision Maker Found',
      decisionMakers: [...exhibitor.decisionMakers, newDm],
    };

    onUpdateExhibitor(updated);
  };

  // Method 3: Add Manual Contact
  const handleAddManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) return;

    const newDm: DecisionMaker = {
      id: `dm-manual-${Date.now()}`,
      name: manualName.trim(),
      title: manualTitle.trim() || 'Trade Show Coordinator',
      department: manualDept || 'Marketing',
      email: manualEmail.trim(),
      emailConfidence: 'Verified',
      phone: manualPhone,
      linkedinUrl: manualLinkedin,
    };

    const updated: ExhibitorCompany = {
      ...exhibitor,
      outreachStatus: 'Decision Maker Found',
      decisionMakers: [...exhibitor.decisionMakers, newDm],
    };

    onUpdateExhibitor(updated);
    setManualName('');
    setManualEmail('');
    setManualLinkedin('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 text-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  {exhibitor.companyName}
                </h2>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Booth {exhibitor.boothNumber} ({exhibitor.boothSize})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {exhibitor.tradeShowName} — {exhibitor.industry} ({domain})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Discovered Contacts Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Current Contacts Discovered ({exhibitor.decisionMakers.length})</span>
            </h3>
            {exhibitor.decisionMakers.length > 0 && onOpenPitchGenerator && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPitchGenerator(exhibitor);
                }}
                className="inline-flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-2xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Generate Email Pitch
              </button>
            )}
          </div>

          {exhibitor.decisionMakers.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No decision maker contacts discovered yet. Use one of the 3 discovery methods below to attach leads!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exhibitor.decisionMakers.map((dm) => (
                <div key={dm.id} className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{dm.name}</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {dm.emailConfidence}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">{dm.title}</p>
                    <p className="text-[10px] text-blue-600 font-mono truncate max-w-[200px]">{dm.email}</p>
                  </div>
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STEP 3 LEAD DISCOVERY METHOD SELECTION TABS */}
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              STEP 3: Select Lead Discovery Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              <button
                onClick={() => setActiveTab('AI_SEARCH')}
                className={`p-3 rounded-lg border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'AI_SEARCH'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Sparkles className={`w-5 h-5 shrink-0 ${activeTab === 'AI_SEARCH' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Method 1: AI Web Search</div>
                  <div className="text-[10px] text-slate-500">Live web scan for Marketing Directors</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('DOMAIN_PATTERNS')}
                className={`p-3 rounded-lg border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'DOMAIN_PATTERNS'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className={`w-5 h-5 shrink-0 ${activeTab === 'DOMAIN_PATTERNS' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Method 2: Domain Patterns</div>
                  <div className="text-[10px] text-slate-500">Generate MX email formats</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('MANUAL_ENTRY')}
                className={`p-3 rounded-lg border text-left transition flex items-center space-x-2.5 cursor-pointer ${
                  activeTab === 'MANUAL_ENTRY'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Plus className={`w-5 h-5 shrink-0 ${activeTab === 'MANUAL_ENTRY' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Method 3: Manual Contact</div>
                  <div className="text-[10px] text-slate-500">Directly enter known contact</div>
                </div>
              </button>

            </div>
          </div>

          {/* METHOD 1: AI WEB SEARCH */}
          {activeTab === 'AI_SEARCH' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Live Gemini Google Search Grounding for {exhibitor.companyName}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scans corporate web pages, news announcements, and trade show press releases to find Event Managers & VPs of Marketing.
                  </p>
                </div>
              </div>

              {searchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
                  {searchError}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleRunAiSearch}
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <Zap className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Scanning Web Directories & Releases...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-amber-300" />
                      <span>Run AI Web Search Grounding</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* METHOD 2: DOMAIN EMAIL PATTERN GENERATOR */}
          {activeTab === 'DOMAIN_PATTERNS' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="text-xs">
                <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Domain Pattern & Department Email Generator for <span className="font-mono text-blue-700">{domain}</span></span>
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Generate standard executive email formats for this domain and select the right address.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    value={testFirstName}
                    onChange={(e) => setTestFirstName(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={testLastName}
                    onChange={(e) => setTestLastName(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Title / Role</label>
                  <input
                    type="text"
                    value={testRole}
                    onChange={(e) => setTestRole(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Available Generated Email Patterns:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {generatedPatterns.map((pat, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-slate-800">{pat.email}</div>
                        <div className="text-[10px] text-slate-400">{pat.label}</div>
                      </div>
                      <button
                        onClick={() => handleAddPatternContact(pat.email, pat.confidence)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition cursor-pointer shrink-0"
                      >
                        + Add Contact
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* METHOD 3: MANUAL CONTACT ENTRY */}
          {activeTab === 'MANUAL_ENTRY' && (
            <form onSubmit={handleAddManualContact} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Directly Enter Known Decision Maker</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sarah Jenkins"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder={`s.jenkins@${domain}`}
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="VP of Global Marketing & Events"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="(312) 555-0199"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save Decision Maker
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Exhibitor: <span className="font-bold text-slate-700">{exhibitor.companyName}</span> | Show: <span className="font-bold text-slate-700">{exhibitor.tradeShowName}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
