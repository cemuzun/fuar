import React from 'react';
import { 
  Search, 
  Building2, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  Database
} from 'lucide-react';
import { TradeShowEvent } from '../types';

interface WorkflowStepperProps {
  selectedShow: TradeShowEvent | undefined;
  showsCount: number;
  totalExhibitorsCount: number;
  totalDecisionMakersCount: number;
  onSelectShowClick: () => void;
  onExtractCompaniesClick: (showId: string | null, extractAll: boolean) => void;
  onExtractLeadsClick: () => void;
  isExtractingCompanies: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  selectedShow,
  showsCount,
  totalExhibitorsCount,
  totalDecisionMakersCount,
  onSelectShowClick,
  onExtractCompaniesClick,
  onExtractLeadsClick,
  isExtractingCompanies,
}) => {
  const showName = selectedShow ? selectedShow.eventName : 'All USA Trade Shows';
  const exhibitorsCount = selectedShow ? (selectedShow.exhibitors?.length || 0) : totalExhibitorsCount;
  const dmCount = selectedShow
    ? (selectedShow.exhibitors || []).reduce((acc, ex) => acc + (ex.decisionMakers?.length || 0), 0)
    : totalDecisionMakersCount;

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs py-3.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              ORDER OF OPERATIONS
            </span>
            <h3 className="text-xs font-bold text-slate-800">
              3-Step Lead Generation Pipeline
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Follow the 3 sequential steps below to find trade shows, extract companies, and discover decision maker leads.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* STEP 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-blue-300 transition shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                  STEP 1
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {showsCount.toLocaleString()} USA Shows Index
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">1. Select Trade Show</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 font-medium truncate">
                Active: <strong className="text-blue-700">{showName}</strong>
              </p>
            </div>

            <button
              onClick={onSelectShowClick}
              className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <span>Browse / Change Show</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* STEP 2 */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-blue-400 transition shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                  STEP 2
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">
                  {exhibitorsCount.toLocaleString()} Companies
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">2. Extract Companies</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Pull exhibitor companies & booth specs for selected show or all shows.
              </p>
            </div>

            <div className="mt-3 space-y-1.5">
              {selectedShow ? (
                <>
                  <button
                    onClick={() => onExtractCompaniesClick(selectedShow.id, false)}
                    disabled={isExtractingCompanies}
                    className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="truncate">
                      {isExtractingCompanies
                        ? 'Extracting Companies...'
                        : `Extract for ${selectedShow.shortName || 'Selected Show'}`}
                    </span>
                  </button>

                  <button
                    onClick={() => onExtractCompaniesClick(null, true)}
                    disabled={isExtractingCompanies}
                    className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <Database className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Extract for ALL {showsCount.toLocaleString()} USA Shows</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onExtractCompaniesClick(null, true)}
                  disabled={isExtractingCompanies}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    {isExtractingCompanies
                      ? 'Extracting Companies...'
                      : `Extract Companies for ALL ${showsCount.toLocaleString()} Shows`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* STEP 3 */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-400 transition shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white">
                  STEP 3
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {dmCount} Decision Makers
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">3. Extract Decision Maker Leads</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Discover VP Marketing / Sales leads with emails & phone.
              </p>
            </div>

            <button
              onClick={onExtractLeadsClick}
              className="mt-3 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Extract Decision Maker Contacts</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
