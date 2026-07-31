import React, { useState } from 'react';
import { EmailAccountSettings, ExhibitorCompany } from '../types';
import { 
  X, 
  Send, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Phone, 
  Building2, 
  User, 
  AlertTriangle,
  Clock,
  MailCheck,
  AlertCircle
} from 'lucide-react';
import { getDaysUntilEvent } from '../utils/dateUtils';

interface OutreachGeneratorModalProps {
  exhibitor: ExhibitorCompany | null;
  onClose: () => void;
  onMarkContacted: (exhibitorId: string) => void;
  leadTimeCutoffDays?: number;
  emailAccount?: EmailAccountSettings;
}

export const OutreachGeneratorModal: React.FC<OutreachGeneratorModalProps> = ({
  exhibitor,
  onClose,
  onMarkContacted,
  leadTimeCutoffDays = 60,
  emailAccount,
}) => {
  if (!exhibitor) return null;

  const primaryDm = exhibitor.decisionMakers[0];
  const daysUntil = getDaysUntilEvent(exhibitor.tradeShowDates, exhibitor.tradeShowYear);
  const isShortLead = daysUntil !== null && daysUntil <= leadTimeCutoffDays;

  const [valuePropOption, setValuePropOption] = useState<
    'Turnkey Booth Rental & Fabrication' | 'Modular Reusable Displays' | 'Emergency Graphic Printing & I&D' | 'Full Custom Double-Deck Exhibit'
  >('Turnkey Booth Rental & Fabrication');

  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  const [pitchResult, setPitchResult] = useState<{
    selectedSubjectLine?: string;
    emailBody?: string;
    callToAction?: string;
    phoneCallScript?: string;
  } | null>(null);

  const handleSendDirectEmail = async () => {
    if (!pitchResult?.selectedSubjectLine || !pitchResult?.emailBody || !exhibitor) return;
    const recipientEmail = primaryDm?.email || 'cem.uzun@capitalevents.us';

    setIsSendingEmail(true);
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: emailAccount?.smtpHost || 'smtp.office365.com',
          smtpPort: emailAccount?.smtpPort || 587,
          username: emailAccount?.username || 'cem.uzun@capitalevents.us',
          password: emailAccount?.password || 'C)793639767875aq',
          useSsl: emailAccount?.useSsl || false,
          fromName: emailAccount?.displayName || 'Cem Uzun',
          fromEmail: emailAccount?.emailAddress || 'cem.uzun@capitalevents.us',
          toName: primaryDm?.name || exhibitor.companyName,
          toEmail: recipientEmail,
          subject: pitchResult.selectedSubjectLine,
          body: pitchResult.emailBody,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSendSuccessMsg(`Email successfully sent to ${recipientEmail} via ${emailAccount?.smtpHost || 'smtp.office365.com'}!`);
        onMarkContacted(exhibitor.id);
      } else {
        setSendErrorMsg(data.error || data.details || 'SMTP delivery failed.');
      }
    } catch (err: any) {
      setSendErrorMsg(err.message || 'Failed to send email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGeneratePitch = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: exhibitor.companyName,
          decisionMakerName: primaryDm?.name || 'Event Marketing Director',
          decisionMakerTitle: primaryDm?.title || 'Marketing Director',
          tradeShowName: exhibitor.tradeShowName,
          boothSize: exhibitor.boothSize,
          valueProp: valuePropOption,
          customInstructions: `${customPrompt} ${isShortLead ? `Note: The event is in ${daysUntil} days (within the ${leadTimeCutoffDays}-day lead time threshold), so offer rapid-turnaround modular displays and fast-track I&D logistics.` : ''}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.pitch) {
        setPitchResult(data.pitch);
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleCopySubject = () => {
    if (pitchResult?.selectedSubjectLine) {
      navigator.clipboard.writeText(pitchResult.selectedSubjectLine);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    }
  };

  const handleCopyBody = () => {
    if (pitchResult?.emailBody) {
      navigator.clipboard.writeText(pitchResult.emailBody);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Booth Production Sales Pitch Generator
              </h2>
              <p className="text-xs text-slate-500">
                Craft personalized B2B cold email & phone follow-up script for {exhibitor.companyName}.
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

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Short Lead Time Warning Banner */}
          {isShortLead && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-lg text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lead Time Warning Notice ({daysUntil} Days Remaining)</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                This event starts on <strong>{exhibitor.tradeShowDates}</strong> (in {daysUntil} days), which is within your configured <strong>{leadTimeCutoffDays}-day lead time cutoff</strong> threshold. Ensure fast-track fabrication, graphic rush printing, or stock modular rental solutions are pitched.
              </p>
            </div>
          )}

          {/* Target Profile Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800">{exhibitor.companyName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-medium">{exhibitor.tradeShowName} ({exhibitor.boothSize})</span>
            </div>
            {primaryDm && (
              <div className="flex items-center space-x-2 text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-medium">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{primaryDm.name} ({primaryDm.title})</span>
              </div>
            )}
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Select Primary Booth Production Offer:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(
                [
                  'Turnkey Booth Rental & Fabrication',
                  'Modular Reusable Displays',
                  'Emergency Graphic Printing & I&D',
                  'Full Custom Double-Deck Exhibit',
                ] as const
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValuePropOption(opt)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    valuePropOption === opt
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Focus Prompt */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Custom Angle or Special Focus (Optional):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Offer complimentary 3D booth design render for their 20x20 space in Las Vegas..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePitch}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Writing Customized Cold Pitch...' : 'Generate Cold Outreach Pitch'}</span>
          </button>

          {/* Pitch Result View */}
          {pitchResult && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              
              {/* Subject Line */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Subject Line:</span>
                  <button
                    onClick={handleCopySubject}
                    className="text-xs text-blue-600 hover:underline flex items-center font-semibold"
                  >
                    {copiedSubject ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    <span>{copiedSubject ? 'Copied' : 'Copy Subject'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800">
                  {pitchResult.selectedSubjectLine}
                </div>
              </div>

              {/* Email Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Email Body:</span>
                  <button
                    onClick={handleCopyBody}
                    className="text-xs text-blue-600 hover:underline flex items-center font-semibold"
                  >
                    {copiedBody ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    <span>{copiedBody ? 'Copied' : 'Copy Email Body'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {pitchResult.emailBody}
                </div>
              </div>

              {/* Phone Follow-up Script */}
              {pitchResult.phoneCallScript && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600 flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 30-Second Follow-up Phone Script:
                  </span>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-700 italic">
                    "{pitchResult.phoneCallScript}"
                  </div>
                </div>
              )}

              {/* Send Status Notices */}
              {sendSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-center space-x-2">
                  <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{sendSuccessMsg}</span>
                </div>
              )}
              {sendErrorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>SMTP Delivery Failed</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed font-mono bg-red-100/50 p-2 rounded">
                    {sendErrorMsg}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Close
          </button>

          {pitchResult && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSendDirectEmail}
                disabled={isSendingEmail}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-spin' : ''}`} />
                <span>{isSendingEmail ? 'Sending via SMTP...' : `Send Email Direct to ${primaryDm?.email ? primaryDm.name : exhibitor.companyName}`}</span>
              </button>

              <button
                onClick={() => {
                  onMarkContacted(exhibitor.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
              >
                Mark Status as 'Contacted'
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
