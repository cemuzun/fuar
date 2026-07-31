import { DecisionMaker, ExhibitorCompany } from '../types';

export interface LeadVerificationResult {
  passed: boolean;
  confidence: 'Verified' | 'Likely' | 'Pattern Generated';
  reasons: string[];
}

const DISPOSABLE_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
const MARKETING_TITLES = ['marketing', 'sales', 'growth', 'event', 'exhibit', 'brand', 'ceo', 'founder', 'president', 'director', 'manager'];

export function verifyLead(dm: DecisionMaker, company: ExhibitorCompany): LeadVerificationResult {
  const reasons: string[] = [];
  let score = 0; // 0 to 100

  // 1. Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!dm.email || !emailRegex.test(dm.email)) {
    reasons.push('Invalid email format.');
    return { passed: false, confidence: 'Pattern Generated', reasons };
  }
  score += 20;

  const emailDomain = dm.email.split('@')[1].toLowerCase();
  
  // 2. Disposable email check
  if (DISPOSABLE_DOMAINS.includes(emailDomain)) {
    reasons.push('Uses a generic/disposable email domain.');
  } else {
    score += 20;
    reasons.push('Uses a professional business email domain.');
  }

  // 3. Domain match check
  let companyDomain = '';
  if (company.website) {
    try {
      companyDomain = new URL(company.website).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      companyDomain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    }
  }

  if (companyDomain && emailDomain === companyDomain) {
    score += 40;
    reasons.push('Email domain perfectly matches company website.');
  } else if (companyDomain && companyDomain.includes(emailDomain.split('.')[0])) {
    score += 20;
    reasons.push('Email domain partially matches company website.');
  } else if (companyDomain) {
    reasons.push(`Email domain (${emailDomain}) differs from company website (${companyDomain}).`);
  } else {
    reasons.push('No company website provided to match email domain against.');
  }

  // 4. Role relevance
  const titleStr = dm.title.toLowerCase();
  if (MARKETING_TITLES.some(keyword => titleStr.includes(keyword))) {
    score += 20;
    reasons.push('Title indicates high relevance for trade show outreach.');
  } else {
    reasons.push('Title may not be the primary decision maker for events.');
  }

  // 5. Name check
  if (dm.name.toLowerCase() === 'decision maker' || dm.name.toLowerCase() === 'marketing lead' || dm.name.split(' ').length < 2) {
    reasons.push('Name appears generic or incomplete.');
    score -= 10;
  } else {
    reasons.push('Name appears to be a valid individual.');
  }

  let confidence: 'Verified' | 'Likely' | 'Pattern Generated' = 'Pattern Generated';
  let passed = false;

  if (score >= 80) {
    confidence = 'Verified';
    passed = true;
  } else if (score >= 50) {
    confidence = 'Likely';
    passed = true;
  } else {
    confidence = 'Pattern Generated';
  }

  return {
    passed,
    confidence,
    reasons
  };
}
