import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Inbox, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Building2, 
  User, 
  Clock, 
  ChevronRight, 
  Tag, 
  ArrowLeft,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  PlusCircle,
  CornerUpLeft
} from 'lucide-react';
import { EmailAccountSettings, EmailMessage, ExhibitorCompany } from '../types';

interface MailboxPageProps {
  account: EmailAccountSettings;
  messages: EmailMessage[];
  onSendMessage: (newMessage: EmailMessage) => void;
  onRefreshInbox: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  exhibitors: ExhibitorCompany[];
}

export const MailboxPage: React.FC<MailboxPageProps> = ({
  account,
  messages,
  onSendMessage,
  onRefreshInbox,
  isSyncing,
  onOpenSettings,
  exhibitors,
}) => {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(messages[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Reply state
  const [replyBody, setReplyBody] = useState('');
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // New Compose Email Form State
  const [composeToEmail, setComposeToEmail] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedExhibitorForCompose, setSelectedExhibitorForCompose] = useState<string>('');

  // Filter messages by active folder and search query
  const filteredMessages = messages.filter((msg) => {
    const matchesFolder = msg.folder === activeFolder;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesFolder;

    const matchesSearch = 
      msg.subject.toLowerCase().includes(query) ||
      msg.fromName.toLowerCase().includes(query) ||
      msg.fromEmail.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query) ||
      (msg.exhibitorName && msg.exhibitorName.toLowerCase().includes(query)) ||
      (msg.tradeShowName && msg.tradeShowName.toLowerCase().includes(query));

    return matchesFolder && matchesSearch;
  });

  const selectedMessage = messages.find((m) => m.id === selectedMessageId) || filteredMessages[0] || null;

  const unreadCount = messages.filter((m) => m.folder === 'inbox' && !m.isRead).length;

  // AI Quick Reply Generator
  const handleGenerateAiReply = async () => {
    if (!selectedMessage) return;
    setIsGeneratingAiReply(true);

    try {
      const res = await fetch('/api/gemini/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: selectedMessage.exhibitorName || selectedMessage.fromName,
          decisionMakerName: selectedMessage.fromName,
          tradeShowName: selectedMessage.tradeShowName || 'Upcoming Trade Show',
          boothSize: selectedMessage.boothNumber ? `Booth ${selectedMessage.boothNumber}` : '20x20 Booth',
          valueProp: 'Turnkey Booth Rental & Fabrication',
          customInstructions: `Write a direct, professional reply to this prospect email: "${selectedMessage.body}". Address their questions concisely, offer a quick 10-minute discovery call or 3D booth concept layout, and sign off warmly as ${account.displayName} from Capital Events (${account.emailAddress}).`,
        }),
      });

      const data = await res.json();
      if (data.success && data.pitch?.emailBody) {
        setReplyBody(data.pitch.emailBody);
      } else {
        setReplyBody(`Hi ${selectedMessage.fromName.split(' ')[0]},\n\nThank you for your message regarding ${selectedMessage.tradeShowName || 'the upcoming show'}.\n\nWe would be delighted to provide custom 3D layout options and turnkey booth pricing tailored to your space (${selectedMessage.boothNumber || 'Booth'}).\n\nAre you available for a brief 10-minute call tomorrow at 11:00 AM CST to discuss?\n\nBest regards,\n${account.displayName}\nCapital Events | ${account.emailAddress}`);
      }
    } catch {
      setReplyBody(`Hi ${selectedMessage.fromName.split(' ')[0]},\n\nThank you for reaching out! We can certainly handle your booth requirements for ${selectedMessage.tradeShowName || 'Pack Expo'}.\n\nI will send over our catalog and pricing sheet shortly. Let me know if you would like to schedule a 10-minute call this week.\n\nBest regards,\n${account.displayName}\nCapital Events | ${account.emailAddress}`);
    } finally {
      setIsGeneratingAiReply(false);
    }
  };

  // Handle Sending Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyBody.trim()) return;

    setIsSending(true);
    setSendError(null);
    setSendSuccessNotice(null);

    const subject = selectedMessage.subject.startsWith('RE:') ? selectedMessage.subject : `RE: ${selectedMessage.subject}`;

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          username: account.username,
          password: account.password,
          useSsl: account.useSsl,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: selectedMessage.fromName,
          toEmail: selectedMessage.fromEmail,
          subject,
          body: replyBody.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const replyMsg: EmailMessage = {
          id: `msg-${Date.now()}`,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: selectedMessage.fromName,
          toEmail: selectedMessage.fromEmail,
          subject,
          body: replyBody.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
          folder: 'sent',
          exhibitorName: selectedMessage.exhibitorName,
          tradeShowName: selectedMessage.tradeShowName,
          boothNumber: selectedMessage.boothNumber,
          statusTag: 'Delivered (SMTP)',
        };

        onSendMessage(replyMsg);
        setReplyBody('');
        setSendSuccessNotice(`Reply email successfully delivered to ${selectedMessage.fromEmail}!`);
      } else {
        const errorMsg = data.details || data.error || 'SMTP Delivery Failed';
        setSendError(errorMsg);

        const failedMsg: EmailMessage = {
          id: `msg-${Date.now()}`,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: selectedMessage.fromName,
          toEmail: selectedMessage.fromEmail,
          subject,
          body: `${replyBody.trim()}\n\n--- DELIVERY STATUS REPORT ---\nStatus: Undelivered\nReason: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
          folder: 'sent',
          exhibitorName: selectedMessage.exhibitorName,
          tradeShowName: selectedMessage.tradeShowName,
          boothNumber: selectedMessage.boothNumber,
          statusTag: 'Undelivered (SMTP Error)',
        };
        onSendMessage(failedMsg);
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error connecting to email dispatch server.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle New Email Compose
  const handleSendNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeToEmail.trim() || !composeSubject.trim() || !composeBody.trim()) return;

    setIsSending(true);
    setSendError(null);
    setSendSuccessNotice(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          username: account.username,
          password: account.password,
          useSsl: account.useSsl,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: composeToName || composeToEmail,
          toEmail: composeToEmail.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newMsg: EmailMessage = {
          id: `msg-${Date.now()}`,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: composeToName || composeToEmail,
          toEmail: composeToEmail.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
          folder: 'sent',
          exhibitorName: selectedExhibitorForCompose || 'Prospect',
          statusTag: 'Delivered (SMTP)',
        };

        onSendMessage(newMsg);
        setIsComposeOpen(false);
        setComposeToEmail('');
        setComposeToName('');
        setComposeSubject('');
        setComposeBody('');
        setSendSuccessNotice(`Email successfully delivered to ${composeToEmail.trim()}!`);
      } else {
        const errorMsg = data.details || data.error || 'SMTP Delivery Failed';
        setSendError(errorMsg);

        const failedMsg: EmailMessage = {
          id: `msg-${Date.now()}`,
          fromName: account.displayName,
          fromEmail: account.emailAddress,
          toName: composeToName || composeToEmail,
          toEmail: composeToEmail.trim(),
          subject: composeSubject.trim(),
          body: `${composeBody.trim()}\n\n--- DELIVERY STATUS REPORT ---\nStatus: Undelivered\nReason: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
          folder: 'sent',
          exhibitorName: selectedExhibitorForCompose || 'Prospect',
          statusTag: 'Undelivered (SMTP Error)',
        };
        onSendMessage(failedMsg);
      }
    } catch (err: any) {
      setSendError(err.message || 'Error connecting to email dispatch server');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectExhibitorForCompose = (exhibitorId: string) => {
    setSelectedExhibitorForCompose(exhibitorId);
    const ex = exhibitors.find((e) => e.id === exhibitorId);
    if (ex) {
      const dm = ex.decisionMakers && ex.decisionMakers[0];
      if (dm) {
        setComposeToName(dm.name);
        setComposeToEmail(dm.email);
        setComposeSubject(`Turnkey Exhibit Rental & Fabrication for ${ex.companyName} @ ${ex.tradeShowName}`);
        setComposeBody(`Hi ${dm.name.split(' ')[0]},\n\nCongratulations on exhibiting at ${ex.tradeShowName} (Booth ${ex.boothNumber})!\n\nAt Capital Events, we provide full turnkey 3D booth rentals, LED illuminated walls, custom graphic printing, and local I&D labor.\n\nWould you be open to reviewing a 3D booth concept layout for your ${ex.boothSize} booth space?\n\nBest regards,\n${account.displayName}\nCapital Events | ${account.emailAddress}`);
      } else {
        setComposeToName(ex.companyName);
        setComposeToEmail(`contact@${ex.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
        setComposeSubject(`Trade Show Booth Production & Rental for ${ex.companyName}`);
        setComposeBody(`Hello ${ex.companyName} Marketing Team,\n\nI noticed you are exhibiting at ${ex.tradeShowName}.\n\nCapital Events offers complete turnkey exhibit design, custom display rentals, and nationwide I&D labor.\n\nLet me know if we can assist with your booth layout or pricing sheet.\n\nBest regards,\n${account.displayName}\nCapital Events | ${account.emailAddress}`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Banner: Active Mailbox Credential Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-4 text-white shadow-md mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-inner">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{account.displayName}</span>
                <span className="text-xs text-blue-300 font-mono font-normal">({account.emailAddress})</span>
              </h2>
              <span className="inline-flex items-center text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                CAPITAL EVENTS MAIL SERVER CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              SMTP: <span className="font-mono text-slate-200">{account.smtpHost}:{account.smtpPort}</span> | IMAP: <span className="font-mono text-slate-200">{account.imapHost}:{account.imapPort}</span> (SSL)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefreshInbox}
            disabled={isSyncing}
            className="inline-flex items-center text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
            title="Check mail.capitalevents.us for incoming trade show prospect emails"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            {isSyncing ? 'Checking Mail server...' : 'Sync Mailbox'}
          </button>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Compose New Pitch
          </button>

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-2 rounded-lg transition cursor-pointer"
            title="Configure mail server credentials"
          >
            Email Config
          </button>
        </div>
      </div>

      {/* Main Mailbox Interface Layout */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[620px]">
        
        {/* Left Sidebar - Folders & Prospect Shortcuts */}
        <div className="w-full md:w-60 bg-slate-50 border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Mailbox Folders
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveFolder('inbox')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFolder === 'inbox'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    activeFolder === 'inbox' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFolder('sent')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFolder === 'sent'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Send className="w-4 h-4" />
                  <span>Sent Messages</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">
                  {messages.filter((m) => m.folder === 'sent').length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('drafts')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFolder === 'drafts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4" />
                  <span>Draft Pitches</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">
                  {messages.filter((m) => m.folder === 'drafts').length}
                </span>
              </button>
            </nav>

            {/* Trade Show Prospect Quick Contacts List */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Top Leads Quick Mail</span>
                <span className="text-[10px] text-blue-600 font-semibold">{exhibitors.length}</span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {exhibitors.slice(0, 6).map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setIsComposeOpen(true);
                      handleSelectExhibitorForCompose(ex.id);
                    }}
                    className="w-full text-left p-1.5 rounded-md hover:bg-slate-200/70 transition flex items-center justify-between text-xs text-slate-700 cursor-pointer"
                    title={`Click to draft cold email to ${ex.companyName}`}
                  >
                    <div className="truncate pr-1">
                      <div className="font-semibold text-slate-800 truncate">{ex.companyName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{ex.tradeShowName}</div>
                    </div>
                    <Mail className="w-3 h-3 text-blue-600 shrink-0 opacity-70 hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mailbox Status Footer */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-600 font-bold mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SSL/TLS Encrypted</span>
            </div>
            <div className="truncate font-mono text-[10px]">cem.uzun@capitalevents.us</div>
          </div>
        </div>

        {/* Middle Column - Messages List Pane */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0">
          
          {/* Search Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inbox, companies, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of Messages */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No emails in {activeFolder}</p>
                <p className="text-[11px] mt-1">Try searching or click "Sync Mailbox" to refresh incoming responses.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = msg.id === selectedMessage?.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
                    } ${!msg.isRead && activeFolder === 'inbox' ? 'font-semibold bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`truncate max-w-[170px] ${!msg.isRead ? 'text-slate-900 font-bold' : 'text-slate-700 font-medium'}`}>
                        {activeFolder === 'sent' ? `To: ${msg.toName}` : msg.fromName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0">{msg.timestamp}</span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 truncate mb-1">
                      {msg.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed font-normal">
                      {msg.body}
                    </p>

                    <div className="flex items-center justify-between flex-wrap gap-1">
                      {msg.exhibitorName && (
                        <span className="inline-flex items-center text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          <Building2 className="w-2.5 h-2.5 mr-1 text-slate-500" />
                          {msg.exhibitorName}
                        </span>
                      )}

                      {msg.statusTag && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          msg.statusTag === 'Quote Requested' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          msg.statusTag === 'Meeting Scheduled' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          msg.statusTag === 'Interested' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {msg.statusTag}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Reading & Response Pane */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
              
              {/* Message Context Header */}
              <div className="pb-4 border-b border-slate-200 mb-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedMessage.subject}
                  </h3>
                  {selectedMessage.statusTag && (
                    <span className="inline-flex items-center text-xs font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 shrink-0">
                      <Tag className="w-3 h-3 mr-1 text-blue-600" />
                      {selectedMessage.statusTag}
                    </span>
                  )}
                </div>

                {/* Sender & Recipient Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedMessage.fromName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{selectedMessage.fromName}</span>
                        <span className="text-slate-400 font-normal">&lt;{selectedMessage.fromEmail}&gt;</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: <span className="font-semibold text-slate-700">{selectedMessage.toName}</span> &lt;{selectedMessage.toEmail}&gt;
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    <div>{selectedMessage.timestamp}</div>
                    {selectedMessage.tradeShowName && (
                      <div className="font-semibold text-blue-700">{selectedMessage.tradeShowName} {selectedMessage.boothNumber ? `(${selectedMessage.boothNumber})` : ''}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body Reader */}
              <div className="flex-1 space-y-4 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-white p-4 rounded-lg border border-slate-100 shadow-2xs mb-6">
                {selectedMessage.body}
              </div>

              {/* Quick AI Response Writer Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shrink-0 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <CornerUpLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reply as {account.displayName} ({account.emailAddress})</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleGenerateAiReply}
                    disabled={isGeneratingAiReply}
                    className="inline-flex items-center text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                    {isGeneratingAiReply ? 'Generating Pitch Reply...' : 'Auto-Generate AI Pitch Reply'}
                  </button>
                </div>

                {/* Banners for send status */}
                {sendSuccessNotice && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between">
                    <span>{sendSuccessNotice}</span>
                    <button onClick={() => setSendSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
                  </div>
                )}

                {sendError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <span>⚠️ Delivery Error / Undelivered</span>
                    </div>
                    <p>{sendError}</p>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Type your reply message or click 'Auto-Generate AI Pitch Reply' above..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full p-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sending via SMTP <span className="font-mono text-slate-700">{account.smtpHost}</span></span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSending || !replyBody.trim()}
                      className="inline-flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {isSending ? 'Sending Email...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400">
              <div>
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Select an email to view details</p>
                <p className="text-xs text-slate-400 mt-1">Or click "Compose New Pitch" to reach out to trade show decision makers.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Compose New Pitch Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-800">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">New Outreach Email — {account.displayName}</h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNewEmail} className="p-6 space-y-4">
              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium space-y-1">
                  <div className="font-bold">⚠️ SMTP Dispatch Error / Delivery Failed</div>
                  <p>{sendError}</p>
                </div>
              )}

              {sendSuccessNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                  {sendSuccessNotice}
                </div>
              )}

              {/* Sender info */}
              <div className="text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">From:</span>
                <span className="font-bold text-slate-800 font-mono">{account.displayName} &lt;{account.emailAddress}&gt;</span>
              </div>

              {/* Select from loaded exhibitors */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quick Select Trade Show Exhibitor Company
                </label>
                <select
                  value={selectedExhibitorForCompose}
                  onChange={(e) => handleSelectExhibitorForCompose(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose an exhibitor to auto-fill recipient & proposal pitch --</option>
                  {exhibitors.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.companyName} ({ex.tradeShowName} - Booth {ex.boothNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To (Recipient Email) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={composeToEmail}
                    onChange={(e) => setComposeToEmail(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe (VP Marketing)"
                    value={composeToName}
                    onChange={(e) => setComposeToName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Turnkey Booth Fabrication & Rental Concept for Pack Expo"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Message Body *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write cold outreach or booth pitch..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full text-xs p-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Mail Server: <span className="font-mono text-slate-700">mail.capitalevents.us:587</span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="inline-flex items-center text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {isSending ? 'Dispatching Email...' : 'Send Pitch Email'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
