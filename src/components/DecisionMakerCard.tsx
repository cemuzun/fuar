import React, { useState } from 'react';
import { ExhibitorCompany, DecisionMaker } from '../types';
import { 
  X, 
  Sparkles, 
  Mail, 
  Phone, 
  UserCheck, 
  Building2, 
  Globe, 
  Plus, 
  CheckCircle2, 
  Send, 
  AlertCircle,
  AlertTriangle,
  Copy,
  Linkedin
} from 'lucide-react';
import { getDaysUntilEvent } from '../utils/dateUtils';

interface DecisionMakerCardProps {
  exhibitor: ExhibitorCompany | null;
  onClose: () => void;
  onUpdateExhibitor: (updatedExhibitor: ExhibitorCompany) => void;
  onOpenPitchGenerator: (exhibitor: ExhibitorCompany) => void;
  leadTimeCutoffDays?: number;
}

export const DecisionMakerCard: React.FC<DecisionMakerCardProps> = ({
  exhibitor,
  onClose,
  onUpdateExhibitor,
  onOpenPitchGenerator,
  leadTimeCutoffDays = 60,
}) => {
  if (!exhibitor) return null;

  const daysUntil = getDaysUntilEvent(exhibitor.tradeShowDates, exhibitor.tradeShowYear);
  const isShortLead = daysUntil !== null && daysUntil <= leadTimeCutoffDays;

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notesText, setNotesText] = useState(exhibitor.notes || '');

  // State for adding a new manual decision maker
  const [showAddDmForm, setShowAddDmForm] = useState(false);
  const [newDmName, setNewDmName] = useState('');
  const [newDmTitle, setNewDmTitle] = useState('');
  const [newDmEmail, setNewDmEmail] = useState('');
  const [newDmPhone, setNewDmPhone] = useState('');

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Run live Gemini Search Grounding on server to find decision makers
  const handleFindDecisionMakers = async () => {
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

      const updatedExhibitor: ExhibitorCompany = {
        ...exhibitor,
        description: result.companyOverview || exhibitor.description,
        notes: result.estimatedBoothNeeds ? `${exhibitor.notes ? exhibitor.notes + '\n' : ''}Booth Recommendation: ${result.estimatedBoothNeeds}` : exhibitor.notes,
        outreachStatus: newDms.length > 0 ? 'Decision Maker Found' : exhibitor.outreachStatus,
        decisionMakers: [...exhibitor.decisionMakers, ...newDms],
      };

      onUpdateExhibitor(updatedExhibitor);
    } catch (err: any) {
      
      setSearchError(err.message || 'Error running decision maker search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddManualDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDmName || !newDmEmail) return;

    const newDm: DecisionMaker = {
      id: `dm-manual-${Date.now()}`,
      name: newDmName,
      title: newDmTitle || 'Trade Show Coordinator',
      department: 'Marketing / Events',
      email: newDmEmail,
      emailConfidence: 'Verified',
      phone: newDmPhone || exhibitor.phone,
    };

    const updated = {
      ...exhibitor,
      outreachStatus: 'Decision Maker Found' as const,
      decisionMakers: [...exhibitor.decisionMakers, newDm],
    };

    onUpdateExhibitor(updated);
    setNewDmName('');
    setNewDmTitle('');
    setNewDmEmail('');
    setNewDmPhone('');
    setShowAddDmForm(false);
  };

  const handleSaveNotes = () => {
    const updated = {
      ...exhibitor,
      notes: notesText,
    };
    onUpdateExhibitor(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-white border-l border-slate-200 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-y-auto text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{exhibitor.companyName}</h2>
              <p className="text-xs text-slate-500">{exhibitor.industry}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Imminent Event Lead Time Warning */}
          {isShortLead && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Lead Time Alert:</strong> Event is in {daysUntil} days (within your configured {leadTimeCutoffDays}-day lead cutoff). Contacting now requires express booth fabrication.
              </span>
            </div>
          )}

          {/* Quick Trade Show Info Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Trade Show Event</span>
              <span className="font-semibold text-slate-800">{exhibitor.tradeShowName}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Location & Dates</span>
              <span className="font-semibold text-slate-800">
                {exhibitor.tradeShowCity}, {exhibitor.tradeShowState} ({exhibitor.tradeShowDates})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Booth Number & Size</span>
              <span className="font-mono font-bold text-blue-600">
                #{exhibitor.boothNumber} ({exhibitor.boothSize})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Est. Booth Budget</span>
              <span className="font-semibold text-emerald-600">{exhibitor.estimatedBoothBudget}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Lead Score</span>
              <span className="font-bold text-slate-800">{exhibitor.leadScore} / 100</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Website</span>
              {exhibitor.website ? (
                <a
                  href={exhibitor.website.startsWith('http') ? exhibitor.website : `https://${exhibitor.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center mt-0.5 truncate font-medium"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  <span className="truncate">{exhibitor.website}</span>
                </a>
              ) : (
                <span className="text-slate-400">Not listed</span>
              )}
            </div>
          </div>

          {/* Company Overview */}
          {exhibitor.description && (
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Company Overview</h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {exhibitor.description}
              </p>
            </div>
          )}

          {/* Decision Makers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-emerald-600" />
                  Trade Show Decision Makers ({exhibitor.decisionMakers.length})
                </h3>
                <p className="text-xs text-slate-500">Contacts responsible for marketing, event operations, and booth budgets.</p>
              </div>

              <button
                onClick={handleFindDecisionMakers}
                disabled={isSearching}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isSearching ? 'animate-spin text-white' : ''}`} />
                {isSearching ? 'AI Search Running...' : 'Find DMs via AI'}
              </button>
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* List of Decision Makers */}
            {exhibitor.decisionMakers.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center space-y-2">
                <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No decision makers found yet</p>
                <p className="text-[11px] text-slate-500">
                  Click 'Find DMs via AI' to run a live web search for Marketing Directors & Event Managers at {exhibitor.companyName}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exhibitor.decisionMakers.map((dm) => (
                  <div key={dm.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 relative group hover:border-slate-300 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-slate-800">{dm.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            dm.emailConfidence === 'Verified' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {dm.emailConfidence} Email
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 font-semibold">{dm.title}</p>
                      </div>

                      {dm.linkedinUrl && (
                        <a
                          href={dm.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-600 p-1"
                          title="LinkedIn Profile"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                      {/* Email */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-md border border-slate-200">
                        <div className="flex items-center space-x-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{dm.email}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(dm.email, `email-${dm.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Copy email"
                        >
                          {copiedField === `email-${dm.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-md border border-slate-200">
                        <div className="flex items-center space-x-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{dm.phone}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(dm.phone, `phone-${dm.id}`)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Copy phone"
                        >
                          {copiedField === `phone-${dm.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {dm.notes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
                        "{dm.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Manual Contact Add Trigger */}
            {!showAddDmForm ? (
              <button
                onClick={() => setShowAddDmForm(true)}
                className="w-full py-2 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center justify-center space-x-1 transition bg-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact Manually</span>
              </button>
            ) : (
              <form onSubmit={handleAddManualDm} className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add Decision Maker</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    required
                    value={newDmName}
                    onChange={(e) => setNewDmName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Title (e.g. VP Marketing)"
                    value={newDmTitle}
                    onChange={(e) => setNewDmTitle(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    required
                    value={newDmEmail}
                    onChange={(e) => setNewDmEmail(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newDmPhone}
                    onChange={(e) => setNewDmPhone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDmForm(false)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Booth Production Notes */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Booth Requirements & Production Notes</h3>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add notes (e.g., Needs 20x20 backlit hanging sign, modular rental counters, Las Vegas local I&D crew)..."
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
              >
                Save Notes
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPitchGenerator(exhibitor);
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
          >
            <Send className="w-4 h-4 mr-2" />
            Generate Booth Sales Pitch
          </button>
        </div>

      </div>
    </div>
  );
};
