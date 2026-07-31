import { EmailAccountSettings, EmailMessage } from '../types';

export const initialEmailAccount: EmailAccountSettings = {
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
  lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const initialEmailMessages: EmailMessage[] = [];
