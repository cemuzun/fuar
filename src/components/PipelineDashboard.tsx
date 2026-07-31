import React from 'react';
import { ExhibitorCompany, TradeShowEvent } from '../types';
import { 
  X, 
  BarChart2, 
  TrendingUp, 
  Building2, 
  Users, 
  DollarSign, 
  MapPin, 
  PieChart, 
  CheckCircle2, 
  Award,
  Sparkles
} from 'lucide-react';

interface PipelineDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitors: ExhibitorCompany[];
  shows: TradeShowEvent[];
}

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({
  isOpen,
  onClose,
  exhibitors,
  shows,
}) => {
  

  const totalExhibitors = exhibitors.length;
  const dmsFound = exhibitors.filter((e) => e.decisionMakers.length > 0).length;
  const dmCoverageRate = totalExhibitors > 0 ? Math.round((dmsFound / totalExhibitors) * 100) : 0;

  // Breakdown by state
  const stateCounts: Record<string, number> = {};
  shows.forEach((s) => {
    stateCounts[s.state] = (stateCounts[s.state] || 0) + (s.exhibitors ? s.exhibitors.length : 0);
  });

  // Breakdown by booth type/size
  const islandCount = exhibitors.filter((e) => e.boothSize.toLowerCase().includes('island') || e.boothType === 'Island').length;
  const midCount = exhibitors.filter((e) => e.boothSize.includes('20x20') || e.boothSize.includes('20x30')).length;
  const inlineCount = totalExhibitors - islandCount - midCount;

  // Outreach status breakdown
  const statusCounts = {
    newLead: exhibitors.filter((e) => e.outreachStatus === 'New Lead').length,
    dmFound: exhibitors.filter((e) => e.outreachStatus === 'Decision Maker Found').length,
    contacted: exhibitors.filter((e) => e.outreachStatus === 'Contacted').length,
    meeting: exhibitors.filter((e) => e.outreachStatus === 'Meeting Scheduled').length,
    proposal: exhibitors.filter((e) => e.outreachStatus === 'Proposal Sent').length,
    won: exhibitors.filter((e) => e.outreachStatus === 'Closed Won').length,
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <BarChart2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">USA Trade Show Lead Intelligence Analytics</h2>
              <p className="text-xs text-slate-500">Overview of extracted trade shows, decision makers, and booth sales pipeline.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics Body */}
        <div className="p-6 space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs text-slate-500 font-medium block">Total USA Trade Shows</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{shows.length} Events</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Orbus USA Directory</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs text-slate-500 font-medium block">Extracted Exhibitor Leads</span>
              <span className="text-2xl font-bold text-blue-600 mt-1 block">{totalExhibitors} Companies</span>
              <span className="text-[11px] text-slate-500 mt-1 block">US Verified Companies</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs text-slate-500 font-medium block">Decision Maker Coverage</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">{dmCoverageRate}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">{dmsFound} with direct emails</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs text-slate-500 font-medium block">Est. High-Value Island Booths</span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">{islandCount} Islands</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Budget $45,000+ per booth</span>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Geographic Distribution */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                Exhibitors by USA State
              </h3>
              <div className="space-y-2">
                {Object.entries(stateCounts).map(([st, count]) => {
                  const pct = totalExhibitors > 0 ? Math.round((count / totalExhibitors) * 100) : 0;
                  return (
                    <div key={st} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-800">{st} State Events</span>
                        <span className="text-slate-500">{count} leads ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales Pipeline Funnel */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" />
                Sales Pipeline Stage
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">New Leads</span>
                  <span className="text-base font-bold text-slate-800">{statusCounts.newLead}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">DMs Discovered</span>
                  <span className="text-base font-bold text-emerald-600">{statusCounts.dmFound}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Cold Pitches Sent</span>
                  <span className="text-base font-bold text-blue-600">{statusCounts.contacted}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-slate-500 block text-[11px] font-medium">Meetings / Proposals</span>
                  <span className="text-base font-bold text-amber-600">{statusCounts.meeting + statusCounts.proposal}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
