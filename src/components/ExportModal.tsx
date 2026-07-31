import React, { useState } from 'react';
import { ExhibitorCompany } from '../types';
import { X, Download, FileSpreadsheet, FileCode, CheckCircle2, Copy, Table, Zap, Loader2, Share2, Check } from 'lucide-react';
import { generateXLSContent, downloadXLSFile } from '../utils/excelExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitors: ExhibitorCompany[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  exhibitors,
}) => {
  

  const [exportFormat, setExportFormat] = useState<'xls' | 'csv' | 'json' | 'hubspot'>('hubspot');
  const [includeDecisionMakersOnly, setIncludeDecisionMakersOnly] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [hubspotToken, setHubspotToken] = useState('');
  const [syncingHubspot, setSyncingHubspot] = useState(false);
  const [hubspotStatusMsg, setHubspotStatusMsg] = useState<string | null>(null);

  const filtered = includeDecisionMakersOnly
    ? exhibitors.filter((e) => e.decisionMakers && e.decisionMakers.length > 0)
    : exhibitors;

  // Handle HubSpot Direct API Sync or Formatted Export
  const handleHubSpotSync = async () => {
    setSyncingHubspot(true);
    setHubspotStatusMsg(null);

    try {
      const response = await fetch('/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibitors: filtered,
          hubspotToken: hubspotToken.trim(),
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'HubSpot sync failed');
      }

      if (data.mode === 'hubspot_api_live') {
        setHubspotStatusMsg(data.message || `Successfully synced ${filtered.length} exhibitor records directly into your HubSpot CRM!`);
      } else {
        // Download pre-formatted HubSpot import CSV
        const blob = new Blob([data.csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `hubspot_crm_import_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setHubspotStatusMsg(`Downloaded pre-formatted HubSpot CRM Import CSV file for ${filtered.length} exhibitor companies!`);
      }
    } catch (err: any) {
      
      setHubspotStatusMsg(`Error: ${err.message || 'Failed to sync with HubSpot CRM'}`);
    } finally {
      setSyncingHubspot(false);
    }
  };

  // Convert to CSV string
  const generateCSV = () => {
    const headers = [
      'Company Name',
      'Industry',
      'Website',
      'Company Phone',
      'Trade Show Name',
      'Trade Show City',
      'Trade Show State',
      'Trade Show Dates',
      'Booth Number',
      'Booth Size',
      'Booth Type',
      'Est Booth Budget',
      'Decision Maker Name',
      'Decision Maker Title',
      'Decision Maker Email',
      'Email Confidence',
      'Decision Maker Phone',
      'Outreach Status',
      'Notes',
    ];

    const rows: string[][] = [];

    filtered.forEach((ex) => {
      if (ex.decisionMakers && ex.decisionMakers.length > 0) {
        ex.decisionMakers.forEach((dm) => {
          rows.push([
            ex.companyName,
            ex.industry,
            ex.website,
            ex.phone,
            ex.tradeShowName,
            ex.tradeShowCity,
            ex.tradeShowState,
            ex.tradeShowDates,
            ex.boothNumber,
            ex.boothSize,
            ex.boothType,
            ex.estimatedBoothBudget,
            dm.name,
            dm.title,
            dm.email,
            dm.emailConfidence,
            dm.phone,
            ex.outreachStatus,
            ex.notes || '',
          ]);
        });
      } else {
        rows.push([
          ex.companyName,
          ex.industry,
          ex.website,
          ex.phone,
          ex.tradeShowName,
          ex.tradeShowCity,
          ex.tradeShowState,
          ex.tradeShowDates,
          ex.boothNumber,
          ex.boothSize,
          ex.boothType,
          ex.estimatedBoothBudget,
          '',
          '',
          '',
          '',
          '',
          ex.outreachStatus,
          ex.notes || '',
        ]);
      }
    });

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    return csvContent;
  };

  const handleDownload = () => {
    if (exportFormat === 'xls') {
      downloadXLSFile(filtered, 'orbus_usa_exhibitors');
    } else if (exportFormat === 'csv') {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `orbus_usa_exhibitor_leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const jsonStr = JSON.stringify(filtered, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `orbus_usa_exhibitor_leads_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyClipboard = () => {
    const text = exportFormat === 'json' ? JSON.stringify(filtered, null, 2) : generateCSV();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden my-8 text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Export Exhibitor Lead Data</h2>
              <p className="text-xs text-slate-500">Export structured exhibitor companies and decision maker contacts into XLS Excel, CSV, or JSON.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          
          {/* Format Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Choose Destination / Export Format:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* HubSpot Option */}
              <button
                type="button"
                onClick={() => setExportFormat('hubspot')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition ${
                  exportFormat === 'hubspot'
                    ? 'bg-orange-50 border-orange-500 text-orange-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Zap className="w-5 h-5 text-orange-600 mb-1" />
                <span className="text-xs block font-bold">HubSpot CRM</span>
                <span className="text-[10px] text-orange-700 font-normal">Direct Sync or CSV</span>
              </button>

              {/* XLS Excel Option */}
              <button
                type="button"
                onClick={() => setExportFormat('xls')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition ${
                  exportFormat === 'xls'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Table className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs block font-bold">XLS Excel</span>
                <span className="text-[10px] text-slate-500 font-normal">Microsoft Excel (.xls)</span>
              </button>

              {/* CSV Option */}
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition ${
                  exportFormat === 'csv'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xs block font-bold">CSV File</span>
                <span className="text-[10px] text-slate-500 font-normal">Generic CSV</span>
              </button>

              {/* JSON Option */}
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition ${
                  exportFormat === 'json'
                    ? 'bg-purple-50 border-purple-600 text-purple-700 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <FileCode className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-xs block font-bold">JSON Format</span>
                <span className="text-[10px] text-slate-500 font-normal">Developers / API</span>
              </button>
            </div>
          </div>

          {/* HubSpot Settings Box */}
          {exportFormat === 'hubspot' && (
            <div className="bg-orange-50/60 border border-orange-200 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 flex items-center">
                  <Zap className="w-4 h-4 mr-1.5 text-orange-600" />
                  HubSpot CRM Sync Setup
                </span>
                <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold">
                  HubSpot Contacts & Companies
                </span>
              </div>
              <p className="text-xs text-orange-800 leading-relaxed">
                Automatically maps extracted exhibitor companies, booth sizes, decision maker names, emails, titles, and phone numbers into HubSpot CRM fields.
              </p>
              <div>
                <label className="text-[11px] font-semibold text-orange-900 block mb-1">
                  HubSpot Private App Access Token (Optional for direct API push):
                </label>
                <input
                  type="password"
                  value={hubspotToken}
                  onChange={(e) => setHubspotToken(e.target.value)}
                  placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (Leave empty for 1-click HubSpot CSV Import)"
                  className="w-full bg-white border border-orange-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                />
              </div>

              {hubspotStatusMsg && (
                <div className={`p-2.5 rounded text-xs flex items-center ${
                  hubspotStatusMsg.startsWith('Error') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                }`}>
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
                  <span>{hubspotStatusMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={includeDecisionMakersOnly}
                onChange={(e) => setIncludeDecisionMakersOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Export ONLY leads with verified decision-maker contact details</span>
            </label>
            <p className="text-[11px] text-slate-500 pl-5">
              Will export {filtered.length} out of {exhibitors.length} total exhibitor records.
            </p>
          </div>

        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleCopyClipboard}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs flex items-center space-x-1.5"
          >
            {copiedText ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedText ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>

          {exportFormat === 'hubspot' ? (
            <button
              onClick={handleHubSpotSync}
              disabled={syncingHubspot}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
            >
              {syncingHubspot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{syncingHubspot ? 'Syncing to HubSpot...' : hubspotToken.trim() ? 'Sync Direct to HubSpot API' : 'Download HubSpot Import CSV'}</span>
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-xs transition flex items-center space-x-2 ${
                exportFormat === 'xls' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download {exportFormat.toUpperCase()} File</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
