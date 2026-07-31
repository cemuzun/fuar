import React, { useState } from 'react';
import { X, Send, Play, Users, Mail, Loader2, Sparkles } from 'lucide-react';
import { ExhibitorCompany, DecisionMaker } from '../types';

interface BatchOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitors: ExhibitorCompany[];
  onUpdateExhibitor: (ex: ExhibitorCompany) => void;
}

export default function BatchOutreachModal({ isOpen, onClose, exhibitors, onUpdateExhibitor }: BatchOutreachModalProps) {
  const [subject, setSubject] = useState('Connecting ahead of {TradeShow}');
  const [body, setBody] = useState('Hi {FirstName},\n\nWe noticed {Company} is exhibiting at {TradeShow} this year.\n\nWe help companies like yours maximize ROI through high-quality custom exhibits and strategic lead capture systems.\n\nWould you be open to a brief chat next week to discuss your plans for {TradeShow}?\n\nBest,\nYour Name');
  
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  

  // Flatten leads
  const allLeads = exhibitors.flatMap(ex => 
    (ex.decisionMakers || []).filter(dm => dm.email).map(dm => ({
      company: ex,
      dm: dm
    }))
  );

  const totalLeads = allLeads.length;

  const handleStartSending = async () => {
    setIsSending(true);
    setSendProgress(0);
    setSentCount(0);
    setIsComplete(false);

    // Group leads by company to update them
    const leadsByCompany = new Map<string, typeof allLeads>();
    allLeads.forEach(lead => {
      if (!leadsByCompany.has(lead.company.id)) leadsByCompany.set(lead.company.id, []);
      leadsByCompany.get(lead.company.id)!.push(lead);
    });

    let currentSent = 0;

    // Simulate sending company by company
    for (const [companyId, leads] of leadsByCompany.entries()) {
      let companyUpdated = false;
      let exToUpdate = leads[0].company;
      
      const updatedDms = [...(exToUpdate.decisionMakers || [])];

      for (const lead of leads) {
        // Simulate sending delay
        await new Promise(r => setTimeout(r, 600));
        
        // Randomly bounce some, especially non-verified ones
        let bounced = false;
        if (lead.dm.emailConfidence !== 'Verified') {
          bounced = Math.random() > 0.4; // 60% chance to bounce
        } else {
          bounced = Math.random() > 0.9; // 10% chance to bounce even verified
        }

        const dmIndex = updatedDms.findIndex(d => d.id === lead.dm.id);
        if (dmIndex !== -1) {
          updatedDms[dmIndex] = {
            ...updatedDms[dmIndex],
            emailStatus: bounced ? 'Bounced' : 'Valid'
          };
          companyUpdated = true;
        }

        currentSent++;
        setSentCount(currentSent);
        setSendProgress(Math.round((currentSent / totalLeads) * 100));
      }

      if (companyUpdated) {
        onUpdateExhibitor({ ...exToUpdate, decisionMakers: updatedDms, outreachStatus: 'Contacted' });
      }
    }

    setIsSending(false);
    setIsComplete(true);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Batch Outreach Campaign</h2>
              <p className="text-sm text-slate-500 font-medium">{totalLeads} verifiable leads selected for outreach</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Template Editor */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                Email Template Setup
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter subject..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email Body</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full h-64 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-xs leading-relaxed"
                    placeholder="Type your email template here..."
                  />
                </div>
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <span className="text-xs font-semibold text-indigo-800 mb-2 block">Supported Variables:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['{FirstName}', '{LastName}', '{Company}', '{TradeShow}', '{Title}', '{Industry}'].map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white border border-indigo-200 text-indigo-600 rounded text-xs font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="space-y-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-slate-500" />
              Live Preview
            </h3>
            
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 overflow-y-auto">
              {allLeads.length > 0 ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3 mb-3">
                    <p className="text-xs text-slate-500 mb-1">To: <span className="font-medium text-slate-800">{allLeads[0].dm.name} &lt;{allLeads[0].dm.email}&gt;</span></p>
                    <p className="text-xs text-slate-500">Subject: <span className="font-medium text-slate-800">{subject.replace(/\{TradeShow\}/g, allLeads[0].company.tradeShowName || 'Trade Show')}</span></p>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {body
                      .replace(/\{FirstName\}/g, allLeads[0].dm.name.split(' ')[0] || '')
                      .replace(/\{LastName\}/g, allLeads[0].dm.name.split(' ').slice(1).join(' ') || '')
                      .replace(/\{Company\}/g, allLeads[0].company.companyName || '')
                      .replace(/\{TradeShow\}/g, allLeads[0].company.tradeShowName || '')
                      .replace(/\{Title\}/g, allLeads[0].dm.title || '')
                      .replace(/\{Industry\}/g, allLeads[0].company.industry || '')
                    }
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No leads selected.</p>
                </div>
              )}
            </div>
            
            {/* Sending Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              {!isSending && !isComplete ? (
                <button
                  onClick={handleStartSending}
                  disabled={totalLeads === 0}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-bold transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Start Sending ({totalLeads} Emails)</span>
                </button>
              ) : isSending ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600"/> Sending...</span>
                    <span>{sentCount} / {totalLeads}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${sendProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Campaign Sent Successfully!</p>
                  <p className="text-xs text-slate-500">Delivered {sentCount} customized emails to decision makers.</p>
                  <button onClick={onClose} className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-bold">
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
