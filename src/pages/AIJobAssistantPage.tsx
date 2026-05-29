import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellRing,
  Briefcase,
  Building2,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';

type SearchLink = {
  label: string;
  url: string;
  note?: string;
  image?: string;
  category?: 'jobs' | 'social' | 'government' | 'nearby';
};

type SavedCategory = 'career_plan' | 'cv_advice' | 'application_message' | 'research';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pinned?: boolean;
  saved?: boolean;
  savedCategory?: SavedCategory;
};

type Reminder = {
  id: string;
  role: string;
  location: string;
  frequency: string;
  createdAt: string;
};

type TemplateKind = 'email' | 'message';

type ApplyPurpose =
  | 'apply'
  | 'follow-up'
  | 'cold-opportunity'
  | 'networking'
  | 'thank-you';

type ApplyTemplate = {
  id: string;
  kind: TemplateKind;
  purpose: ApplyPurpose;
  title: string;
  subject?: string;
  body: string;
};

type ApplyPreview = {
  kind: TemplateKind;
  title: string;
  subject?: string;
  body: string;
  source: 'template' | 'ai' | 'fallback';
};

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Saved career plan',
  cv_advice: 'Saved CV advice',
  application_message: 'Saved application message',
  research: 'Saved research',
};

function clean(value: string) {
  return String(value || '').trim();
}

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function encodeSearchQuery(parts: string[]) {
  return encodeURIComponent(parts.filter(Boolean).join(' ').trim() || 'jobs vacancies near me');
}

function normalizeTier(tier?: string | null) {
  return String(tier || 'free').toLowerCase();
}

function isCreatorPlusTier(tier: string, hasTier?: (tier: string) => boolean) {
  return Boolean(
    hasTier?.('creator') ||
      hasTier?.('business') ||
      hasTier?.('exclusive') ||
      tier === 'creator' ||
      tier === 'business' ||
      tier === 'exclusive'
  );
}

/**
 * FaceMeX Career Workspace usage model:
 * Free: 5 email templates + 5 message templates + safe built-in answers.
 * Pro: 10 AI actions per day for research, emails, messages, and answers.
 * Creator/Business/Exclusive: unlimited AI actions.
 */
function getDeepSeekDailyLimit(tier: string, hasTier?: (tier: string) => boolean) {
  if (isCreatorPlusTier(tier, hasTier)) return null;
  if (tier === 'pro') return 10;
  return 0;
}

function getDeepSeekUsageKey(tier: string) {
  return `facemex_deepseek_workspace_usage_${tier || 'free'}_${todayKey()}`;
}

function getDeepSeekUsage(tier: string) {
  try {
    return Number(localStorage.getItem(getDeepSeekUsageKey(tier)) || 0);
  } catch {
    return 0;
  }
}

function increaseDeepSeekUsage(tier: string) {
  try {
    const key = getDeepSeekUsageKey(tier);
    const current = Number(localStorage.getItem(key) || 0);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
}

function faviconFor(url: string) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=128`;
  } catch {
    return '';
  }
}

function stripMarkdownSymbols(text: string) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/##/g, '')
    .replace(/#/g, '')
    .trim();
}

function detectIntent(text: string) {
  const t = text.toLowerCase();

  if (
    /(investor|investors|funding|funder|funders|venture|angel|vc|raise capital|capital|startup|pitch|business opportunity|business opportunities|partnership|network with tech|networking|accelerator|incubator)/i.test(
      t
    )
  ) {
    return 'investors-and-networking';
  }

  if (
    /(fake|scam|legit|legitimate|verify|safe|pay money|registration fee|upfront|is this real|is it real|risky|check job)/i.test(
      t
    )
  ) {
    return 'verify-opportunity';
  }

  if (/(email|mail|cover letter|application email|send cv|send my cv|email cv)/i.test(t)) {
    return 'email-application';
  }

  if (/(whatsapp|message|dm|sms|text|apply message)/i.test(t)) {
    return 'message-application';
  }

  if (/(interview|tell me about yourself|questions|prepare|hiring manager)/i.test(t)) {
    return 'interview-prep';
  }

  if (/(cv|resume|profile|linkedin|headline|summary|ats)/i.test(t)) {
    return 'cv-profile';
  }

  if (
    /(job|jobs|vacancy|vacancies|hiring|opportunities|opportunity|learnership|internship|work|latest job|latest jobs)/i.test(
      t
    )
  ) {
    return 'job-search';
  }

  if (/(research|find out|company|market|industry|business idea|analyse|analyze)/i.test(t)) {
    return 'research';
  }

  return 'general-opportunity-help';
}

function savedCategoryFromIntent(intent: string): SavedCategory {
  if (intent === 'cv-profile') return 'cv_advice';
  if (intent === 'email-application' || intent === 'message-application') return 'application_message';
  if (intent === 'research' || intent === 'investors-and-networking') return 'research';
  return 'career_plan';
}

function buildVacancySources(input: {
  role: string;
  location: string;
  industry: string;
  workMode: string;
}) {
  const role = clean(input.role) || 'jobs';
  const location = clean(input.location) || 'South Africa';
  const industry = clean(input.industry);
  const workMode = clean(input.workMode);

  const query = encodeSearchQuery([role, industry, location, workMode, 'vacancies hiring apply']);
  const recentQuery = encodeSearchQuery([role, industry, location, workMode, 'vacancies apply now']);

  const links: SearchLink[] = [
    {
      label: 'Indeed',
      url: `https://za.indeed.com/jobs?q=${query}`,
      note: 'General jobs, admin, retail, driver, office, and entry-level roles.',
      category: 'jobs',
    },
    {
      label: 'PNet',
      url: `https://www.pnet.co.za/jobs/${query}`,
      note: 'Formal company vacancies and professional roles.',
      category: 'jobs',
    },
    {
      label: 'Careers24',
      url: `https://www.careers24.com/jobs/?query=${query}`,
      note: 'South African job listings across provinces.',
      category: 'jobs',
    },
    {
      label: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}`,
      note: 'Office, tech, sales, internships, admin, and professional roles.',
      category: 'jobs',
    },
    {
      label: 'Google Jobs',
      url: `https://www.google.com/search?q=${recentQuery}&tbs=qdr:w`,
      note: 'Recent vacancies from company pages, agencies, and job boards.',
      category: 'jobs',
    },
    {
      label: 'DPSA',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official South African government vacancy circular.',
      category: 'government',
    },
    {
      label: 'Facebook Posts',
      url: `https://www.facebook.com/search/posts/?q=${query}`,
      note: 'Local businesses, community vacancies, urgent posts, and small companies.',
      category: 'social',
    },
    {
      label: 'Facebook Groups',
      url: `https://www.facebook.com/search/groups/?q=${query}`,
      note: 'Join local groups and check pinned posts daily.',
      category: 'social',
    },
  ];

  return links.map((link) => ({ ...link, image: faviconFor(link.url) }));
}

function buildApplicationTemplates(input: {
  role: string;
  company: string;
  contactPerson: string;
  location: string;
  industry: string;
  experienceLevel: string;
}) {
  const role = clean(input.role) || '[role / opportunity]';
  const company = clean(input.company) || '[company name]';
  const person = clean(input.contactPerson);
  const location = clean(input.location) || '[location]';
  const industry = clean(input.industry) || '[industry]';

  const greetingEmail = `Good day${person ? ` ${person}` : ''},`;
  const greetingMessage = `Good day${person ? ` ${person}` : ''}.`;

  const emails: ApplyTemplate[] = [
    {
      id: 'email-apply',
      kind: 'email',
      purpose: 'apply',
      title: 'Apply for a vacancy',
      subject: `Application for ${role}`,
      body: `${greetingEmail}

I hope you are well.

I would like to apply for the ${role} opportunity at ${company}. I am interested in this role because I believe my skills, attitude, and willingness to learn can add value to your team.

Please may you advise if I can send my CV for consideration, or confirm the correct process to apply?

Kind regards,
[Your Name]`,
    },
    {
      id: 'email-follow-up',
      kind: 'email',
      purpose: 'follow-up',
      title: 'Follow up after applying',
      subject: `Follow-up: ${role} application`,
      body: `${greetingEmail}

I hope you are well.

I am following up regarding my application for the ${role} opportunity at ${company}.

I would appreciate any update regarding the recruitment process when available.

Thank you for your time and consideration.

Kind regards,
[Your Name]`,
    },
    {
      id: 'email-cold-opportunity',
      kind: 'email',
      purpose: 'cold-opportunity',
      title: 'Ask if they are hiring',
      subject: `Opportunity enquiry - ${role}`,
      body: `${greetingEmail}

I hope you are well.

I am currently looking for opportunities related to ${role} in ${location}. I would like to ask if ${company} has any current or upcoming opportunities where I may submit my CV.

I am open to roles in ${industry}, and I am willing to learn and grow.

Kind regards,
[Your Name]`,
    },
    {
      id: 'email-networking',
      kind: 'email',
      purpose: 'networking',
      title: 'Networking request',
      subject: 'Request for career advice',
      body: `${greetingEmail}

I hope you are well.

I am currently building my career around ${role}, and I would appreciate a short piece of advice from someone with experience in this space.

I am not asking for a job directly. I would simply appreciate guidance on what skills, platforms, or opportunities I should focus on next.

Kind regards,
[Your Name]`,
    },
    {
      id: 'email-thank-you',
      kind: 'email',
      purpose: 'thank-you',
      title: 'Thank you after interview',
      subject: 'Thank you for the interview',
      body: `${greetingEmail}

Thank you for taking the time to speak with me regarding the ${role} opportunity at ${company}.

I appreciate the opportunity to learn more about the role and your team. I remain interested and available should you need any further information from me.

Kind regards,
[Your Name]`,
    },
  ];

  const messages: ApplyTemplate[] = [
    {
      id: 'message-apply',
      kind: 'message',
      purpose: 'apply',
      title: 'WhatsApp application',
      body: `${greetingMessage} I hope you are well. I am interested in the ${role} opportunity at ${company}. Please may I ask where I can send my CV or how I can apply? Thank you.`,
    },
    {
      id: 'message-follow-up',
      kind: 'message',
      purpose: 'follow-up',
      title: 'WhatsApp follow-up',
      body: `${greetingMessage} I hope you are well. I am following up regarding my application for the ${role} opportunity at ${company}. I would appreciate any update when available. Thank you.`,
    },
    {
      id: 'message-cold-opportunity',
      kind: 'message',
      purpose: 'cold-opportunity',
      title: 'Ask if hiring',
      body: `${greetingMessage} I hope you are well. I am looking for ${role} opportunities around ${location}. Please may I ask if ${company} is hiring or accepting CVs?`,
    },
    {
      id: 'message-networking',
      kind: 'message',
      purpose: 'networking',
      title: 'Networking message',
      body: `${greetingMessage} I hope you are well. I am trying to grow in ${role} and would appreciate any advice on where to find opportunities or improve my chances. Thank you.`,
    },
    {
      id: 'message-thank-you',
      kind: 'message',
      purpose: 'thank-you',
      title: 'Thank you message',
      body: `${greetingMessage} Thank you for taking the time to speak with me about the ${role} opportunity at ${company}. I appreciate it and I remain available if you need anything else from me.`,
    },
  ];

  return { emails, messages, all: [...emails, ...messages] };
}

function pickTemplate(templates: ApplyTemplate[], kind: TemplateKind, purpose: ApplyPurpose) {
  return (
    templates.find((item) => item.kind === kind && item.purpose === purpose) ||
    templates.find((item) => item.kind === kind)
  );
}

function extractEmailParts(text: string) {
  const raw = clean(text);
  const subjectMatch = raw.match(/^subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim();

  const body = raw
    .replace(/^subject:\s*.+$/im, '')
    .replace(/^email:\s*/im, '')
    .trim();

  return { subject, body: body || raw };
}

function buildAssistantInstruction(intent: string) {
  return `
You are FaceMeX Career Workspace, a practical AI assistant for South African users.

You help with:
- jobs
- CVs
- interviews
- applications
- WhatsApp messages
- email writing
- research
- business opportunities
- investors
- funding
- networking
- startup growth
- fake job checks
- opportunity safety

Important rules:
1. First understand the user's intent.
2. If the user asks about investors, funding, startup networking, business opportunities, partnerships, or business growth, do not answer as if they are asking for a job.
3. If the user asks for latest jobs, explain where to search and how to apply. Do not invent fake live vacancies.
4. If the user asks for email, write an email.
5. If the user asks for WhatsApp/message, write a short message.
6. If the user asks for apply message, give both a WhatsApp message and an email.
7. Every answer must include:
   - Direct answer
   - Action plan
   - Copy-ready message/email/script
   - Safety check when money, jobs, documents, or opportunities are involved
8. Use simple English.
9. Focus on South Africa where relevant.
10. Do not use markdown symbols like **, ###, or tables.
11. Do not mention ChatGPT, Claude, or DeepSeek.
12. Do not invent fake jobs, fake investors, fake companies, fake events, or fake contacts.

Current detected intent: ${intent}
`;
}

function buildLocalFallbackAnswer(input: {
  prompt: string;
  intent: string;
  role: string;
  location: string;
  company: string;
  contactPerson: string;
  industry: string;
}) {
  const role = clean(input.role) || 'the opportunity';
  const location = clean(input.location) || 'South Africa';
  const company = clean(input.company) || 'the company';
  const person = clean(input.contactPerson);
  const greeting = `Good day${person ? ` ${person}` : ''}`;

  if (input.intent === 'investors-and-networking') {
    return `Direct answer:
You can network with tech investors in South Africa through LinkedIn outreach, startup events, accelerators, warm introductions, and online founder communities.

Action plan:
1. Prepare a one-page startup summary.
2. Fix your LinkedIn profile so it clearly says what you are building.
3. Search for angel investors, VC partners, startup founders, accelerator managers, and innovation hub leaders.
4. Message 10 people per day.
5. Ask for advice first, not money first.

Copy-ready message:
Hi [Name], I’m building [startup name], a South African platform focused on [problem]. I’m not asking for funding immediately. I’d appreciate 10 minutes of advice on how to position this properly for investors. Would you be open to a short conversation?

Safety check:
Do not pay anyone who promises guaranteed funding. Real investors review traction, team, market, numbers, and risk.`;
  }

  if (input.intent === 'verify-opportunity') {
    return `Direct answer:
This opportunity must be verified before you send money, ID copies, bank details, or certificates.

Action plan:
1. Check the official company name.
2. Check if the email address matches the company domain.
3. Ask for the full job description, salary range, location, and interview process.
4. Search the company online and check LinkedIn, website, reviews, and address.
5. Never pay for a job, interview, uniform, training, or placement.

Copy-ready message:
Good day. Thank you for the opportunity. Before I continue, please may you confirm the official company name, job title, location, job description, salary range, and the official email address I should use for my application?

Safety check:
If they rush you, ask for money, or refuse to give clear company details, treat it as risky.`;
  }

  if (input.intent === 'email-application') {
    return `Direct answer:
Here is a professional email you can send.

Action plan:
1. Add the real company name.
2. Attach your CV.
3. Add your phone number.
4. Send it during working hours.
5. Follow up after 3 to 5 working days.

Copy-ready email:
Subject: Application for ${role}

${greeting},

I hope you are well.

I would like to apply for the ${role} opportunity at ${company}. I am interested in this opportunity and would appreciate the chance to submit my CV for consideration.

Please may you confirm the correct email address or application process?

Kind regards,
[Your Name]
[Your Phone Number]

Safety check:
Only send your ID or sensitive documents after confirming the opportunity is legitimate.`;
  }

  if (input.intent === 'message-application') {
    return `Direct answer:
Here is a short message you can send.

Action plan:
1. Send the message politely.
2. Wait for the correct application process.
3. Send your CV only when they confirm where to send it.
4. Follow up after 3 to 5 working days.

Copy-ready message:
${greeting}. I hope you are well. I am interested in the ${role} opportunity at ${company}. Please may I ask where I can send my CV or how I can apply? Thank you.

Safety check:
Do not pay any application fee.`;
  }

  if (input.intent === 'interview-prep') {
    return `Direct answer:
Prepare for the interview by practicing your introduction, strengths, examples, and questions.

Action plan:
1. Prepare a 30-second introduction.
2. Prepare 3 strengths.
3. Prepare one example of solving a problem.
4. Prepare one example of working under pressure.
5. Prepare one smart question to ask the interviewer.

Copy-ready interview answer:
Thank you for the opportunity. My name is [Name]. I am interested in ${role}. I am reliable, willing to learn, and focused on adding value to the team. I believe I can do well in this role because I am disciplined, respectful, and ready to improve every day.

Safety check:
Never pay for an interview or placement.`;
  }

  if (input.intent === 'cv-profile') {
    return `Direct answer:
Your CV/profile must show your role, location, skills, and proof that you can do the work.

Action plan:
1. Add a clear headline.
2. Add a short profile summary.
3. Add 5 to 8 relevant skills.
4. Add work experience, projects, volunteering, or school achievements.
5. Keep the CV clean and easy to read.

Copy-ready CV headline:
${role} candidate | ${location} | Reliable, fast learner, ready to contribute

Copy-ready profile summary:
I am a motivated candidate looking for opportunities in ${role}. I am reliable, willing to learn, and able to work with people professionally. I am looking for a role where I can grow, contribute, and build strong work experience.

Safety check:
Do not include ID numbers or bank details on your CV.`;
  }

  if (input.intent === 'job-search') {
    return `Direct answer:
To find ${role} opportunities around ${location}, use job boards, company websites, Facebook groups, and direct messages to businesses.

Action plan:
1. Search daily on Indeed, LinkedIn Jobs, Careers24, PNet, DPSA, Facebook groups, and company websites.
2. Apply within 24 to 48 hours.
3. Message local businesses directly.
4. Track every application.
5. Follow up after 3 to 5 working days.

Copy-ready message:
Good day. I am looking for ${role} opportunities around ${location}. Please may I ask if you are hiring or accepting CVs? I am available to send my CV. Thank you.

Safety check:
Avoid job posts that ask for upfront money, banking details, or ID copies before you verify the company.`;
  }

  if (input.intent === 'research') {
    return `Direct answer:
Research properly by checking official websites, job platforms, company pages, LinkedIn, and trusted local sources.

Action plan:
1. Write down exactly what you want to find.
2. Search official company websites first.
3. Check LinkedIn and job platforms.
4. Compare at least 3 sources.
5. Save the useful result and take one action.

Copy-ready research prompt:
Please help me research [company/opportunity/topic]. I want to know what it does, who it helps, what opportunities exist, what risks I should check, and what action I should take today.

Safety check:
Do not trust screenshots only. Verify opportunities from official sources before paying or sending documents.`;
  }

  return `Direct answer:
Here is the simplest practical way to move forward.

Action plan:
1. Be clear about what you want.
2. Take one action today.
3. Send one message, apply for one opportunity, improve one CV section, or contact one company.
4. Track the result.
5. Follow up in 3 to 5 working days.

Copy-ready message:
Good day. I am interested in [opportunity]. Please may you advise the correct process or contact person? Thank you.

Safety check:
Always verify opportunities before paying money or sending sensitive documents.`;
}

function ensureActionableAnswer(answer: string, fallbackAnswer: string) {
  const raw = stripMarkdownSymbols(answer) || fallbackAnswer;
  const lower = raw.toLowerCase();

  const hasDirect = lower.includes('direct answer');
  const hasAction = lower.includes('action plan');
  const hasCopy =
    lower.includes('copy-ready') ||
    lower.includes('copy this message') ||
    lower.includes('copy-ready message') ||
    lower.includes('copy-ready email');

  const isLongEnough = raw.length > 500;

  if ((hasAction && hasCopy) || (hasDirect && isLongEnough)) return raw;

  return `${raw}

Action plan:
1. Take one clear action today.
2. Save the useful information.
3. Contact the right person or company.
4. Track who you contacted.
5. Follow up in 3 to 5 working days.

Copy-ready message:
Good day. I am interested in this opportunity. Please may you advise the correct process or contact person? Thank you.`;
}

const premiumCard =
  'w-full overflow-hidden rounded-[24px] border border-black/5 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]';

const premiumInput =
  'h-11 w-full rounded-2xl border-black/10 bg-white px-3 text-sm shadow-inner placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

const premiumSelect =
  'h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

const premiumOutlineButton =
  'h-10 rounded-2xl border-black/10 bg-white/80 px-3 text-sm font-medium shadow-sm transition hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]';

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { tier, hasTier } = useUserStore();

  const currentTier = normalizeTier(tier);
  const creatorPlus = isCreatorPlusTier(currentTier, hasTier);
  const deepSeekLimit = getDeepSeekDailyLimit(currentTier, hasTier);

  const [deepSeekUsage, setDeepSeekUsage] = useState(0);
  const [prompt, setPrompt] = useState('');

  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SearchLink[]>([]);
  const [radarCards, setRadarCards] = useState<SearchLink[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const [busy, setBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyPreview, setApplyPreview] = useState<ApplyPreview | null>(null);

  const [geoBusy, setGeoBusy] = useState(false);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [geoLabel, setGeoLabel] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedFilter, setSavedFilter] = useState<SavedCategory | 'all'>('all');

  const canUseDeepSeek = useMemo(() => {
    if (deepSeekLimit === null) return true;
    return deepSeekUsage < deepSeekLimit;
  }, [deepSeekLimit, deepSeekUsage]);

  const remainingDeepSeekUses = useMemo(() => {
    if (deepSeekLimit === null) return null;
    return Math.max(0, deepSeekLimit - deepSeekUsage);
  }, [deepSeekLimit, deepSeekUsage]);

  const templates = useMemo(
    () =>
      buildApplicationTemplates({
        role,
        company,
        contactPerson,
        location,
        industry,
        experienceLevel,
      }),
    [role, company, contactPerson, location, industry, experienceLevel]
  );

  const activeRadarCard = radarCards[activeCard];

  const savedMessages = useMemo(() => {
    return messages.filter((message) => message.saved && message.savedCategory);
  }, [messages]);

  const savedStats = useMemo(() => {
    return {
      career_plan: savedMessages.filter((message) => message.savedCategory === 'career_plan').length,
      cv_advice: savedMessages.filter((message) => message.savedCategory === 'cv_advice').length,
      application_message: savedMessages.filter((message) => message.savedCategory === 'application_message').length,
      research: savedMessages.filter((message) => message.savedCategory === 'research').length,
    };
  }, [savedMessages]);

  const visibleSavedMessages = useMemo(() => {
    if (savedFilter === 'all') return savedMessages;
    return savedMessages.filter((message) => message.savedCategory === savedFilter);
  }, [savedFilter, savedMessages]);

  useEffect(() => {
    setDeepSeekUsage(getDeepSeekUsage(currentTier));

    try {
      const rawAlerts = localStorage.getItem('facemex_opportunities_alerts');
      setReminders(rawAlerts ? JSON.parse(rawAlerts) : []);

      const rawMessages = localStorage.getItem('facemex_opportunities_workspace_messages');
      setMessages(rawMessages ? JSON.parse(rawMessages) : []);
    } catch {
      setReminders([]);
      setMessages([]);
    }

    const firstCards = buildVacancySources({
      role: 'jobs',
      location: 'South Africa',
      industry: '',
      workMode: '',
    });

    setRadarCards(firstCards);
    setSourceLinks(firstCards);
  }, [currentTier]);

  useEffect(() => {
    try {
      localStorage.setItem('facemex_opportunities_workspace_messages', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (!radarCards.length) return;

    const timer = window.setInterval(() => {
      setActiveCard((prev) => (prev + 1) % radarCards.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [radarCards.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, workspaceOpen]);

  const recordDeepSeekUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const refreshSources = () => {
    const links = buildVacancySources({ role, location, industry, workMode });
    setSourceLinks(links);
    setRadarCards(links);
    setActiveCard(0);

    toast({ title: 'Radar refreshed', description: 'Opportunity sources updated.' });
  };

  const saveReminders = (next: Reminder[]) => {
    setReminders(next);
    try {
      localStorage.setItem('facemex_opportunities_alerts', JSON.stringify(next));
    } catch {}
  };

  const deleteReminder = (id: string) => {
    saveReminders(reminders.filter((item) => item.id !== id));
    toast({ title: 'Alert deleted', description: 'Saved opportunity alert removed.' });
  };

  const enableNearbyJobs = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not supported',
        description: 'Your browser does not support location tracking.',
        variant: 'destructive',
      });
      return;
    }

    setGeoBusy(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setNearbyEnabled(true);
        setGeoLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocation(location || 'near me');

        toast({ title: 'Nearby enabled', description: 'Radar will prioritize your area.' });
        setGeoBusy(false);
      },
      () => {
        toast({
          title: 'Location denied',
          description: 'You can still type your town manually.',
          variant: 'destructive',
        });
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enableVacancyAlerts = async () => {
    const reminder: Reminder = {
      id: safeId(),
      role: role || 'opportunities',
      location: location || 'South Africa',
      frequency: 'daily',
      createdAt: new Date().toISOString(),
    };

    saveReminders([reminder, ...reminders]);

    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          new Notification('FaceMeX opportunity alerts enabled', {
            body: `We’ll prioritize ${reminder.role} around ${reminder.location}.`,
          });

          setAlertEnabled(true);
        }
      } catch {}
    }

    toast({ title: 'Alert saved', description: 'Your opportunity alert has been saved.' });
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const cleanPrompt = clean(overridePrompt || prompt);

    if (!cleanPrompt) {
      toast({
        title: 'Ask something first',
        description: 'Type your question in the workspace.',
      });
      return;
    }

    const intent = detectIntent(cleanPrompt);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

    setWorkspaceOpen(true);

    setMessages((prev) => [
      ...prev,
      {
        id: safeId(),
        role: 'user',
        content: cleanPrompt,
        createdAt: new Date().toISOString(),
      },
    ]);

    setPrompt('');
    setBusy(true);

    const fallbackAnswer = buildLocalFallbackAnswer({
      prompt: cleanPrompt,
      intent,
      role,
      location,
      company,
      contactPerson,
      industry,
    });

    if (!canUseDeepSeek) {
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: fallbackAnswer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
        },
      ]);

      toast({
        title: currentTier === 'free' ? 'Free answer used' : 'AI limit reached',
        description:
          currentTier === 'free'
            ? 'Free users can use templates and basic workspace answers.'
            : 'Your Pro AI limit is finished for today. Template fallback was used.',
      });

      setBusy(false);
      return;
    }

    try {
      const res = (await api.post('/api/ai/pro/job-assistant', {
        prompt: cleanPrompt,
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        company,
        contactPerson,
        tier: currentTier,
        intent,
        instruction: buildAssistantInstruction(intent),
      })) as any;

      const rawAnswer =
        res?.answer ||
        res?.message ||
        res?.text ||
        (Array.isArray(res?.suggestions) ? res.suggestions.join('\n\n') : '') ||
        fallbackAnswer;

      const answer = ensureActionableAnswer(rawAnswer, fallbackAnswer);

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
        },
      ]);

      recordDeepSeekUse();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: fallbackAnswer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
        },
      ]);

      toast({
        title: 'AI fallback used',
        description: 'Live AI was unavailable, so FaceMeX used a safe built-in answer.',
      });
    } finally {
      setBusy(false);
    }
  };

  const generateApplyContent = async (kind: TemplateKind, purpose: ApplyPurpose) => {
    const template = pickTemplate(templates.all, kind, purpose);

    if (!template) {
      toast({
        title: 'Template missing',
        description: 'Please try another option.',
        variant: 'destructive',
      });
      return;
    }

    const templatePreview: ApplyPreview = {
      kind,
      title: template.title,
      subject: template.subject,
      body: template.body,
      source: 'template',
    };

    setApplyBusy(true);

    if (!canUseDeepSeek) {
      setApplyPreview({
        ...templatePreview,
        source: currentTier === 'free' ? 'template' : 'fallback',
      });

      toast({
        title: currentTier === 'free' ? 'Free template ready' : 'AI limit reached',
        description:
          currentTier === 'free'
            ? 'Free users get 5 email templates and 5 message templates.'
            : 'Your Pro AI limit is finished for today. Template fallback was used.',
      });

      setApplyBusy(false);
      return;
    }

    try {
      const instruction =
        kind === 'email'
          ? 'Write a professional South African job/career email. Include "Subject:" on the first line, then the email body. Keep it clear, polite, and copy-ready. Do not use markdown.'
          : 'Write a short professional WhatsApp/message for South African job/career communication. Do not include a subject line. Keep it copy-ready. Do not use markdown.';

      const res = (await api.post('/api/ai/pro/job-assistant', {
        prompt: `Create a ${kind} for this purpose: ${purpose}. Role/opportunity: ${role || '[role]'}. Company: ${company || '[company]'}. Contact person: ${contactPerson || '[contact person]'}. Location: ${location || '[location]'}. Industry: ${industry || '[industry]'}. Experience level: ${experienceLevel || '[experience level]'}.`,
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        company,
        contactPerson,
        tier: currentTier,
        intent: `${kind}-${purpose}`,
        instruction: `${buildAssistantInstruction(`${kind}-${purpose}`)}\n\n${instruction}`,
      })) as any;

      const answer =
        res?.answer ||
        res?.message ||
        res?.text ||
        (Array.isArray(res?.suggestions) ? res.suggestions.join('\n\n') : '') ||
        template.body;

      const cleanAnswer = stripMarkdownSymbols(answer);

      if (kind === 'email') {
        const parsed = extractEmailParts(cleanAnswer);

        setApplyPreview({
          kind,
          title: template.title,
          subject: parsed.subject || template.subject,
          body: parsed.body,
          source: 'ai',
        });
      } else {
        setApplyPreview({
          kind,
          title: template.title,
          body: cleanAnswer,
          source: 'ai',
        });
      }

      recordDeepSeekUse();
      toast({ title: 'AI draft ready', description: 'Your apply content is ready to copy.' });
    } catch {
      setApplyPreview({
        ...templatePreview,
        source: 'fallback',
      });

      toast({
        title: 'Template fallback used',
        description: 'Live AI was unavailable, so FaceMeX used a built-in template.',
      });
    } finally {
      setApplyBusy(false);
    }
  };

  const quickAsk = (text: string) => {
    setWorkspaceOpen(true);
    setPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Text copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  const copyApplyPreview = () => {
    if (!applyPreview) return;

    const text =
      applyPreview.kind === 'email'
        ? `Subject: ${applyPreview.subject || ''}\n\n${applyPreview.body}`
        : applyPreview.body;

    copyText(text);
  };

  const saveApplyPreview = () => {
    if (!applyPreview) return;

    const text =
      applyPreview.kind === 'email'
        ? `Subject: ${applyPreview.subject || ''}\n\n${applyPreview.body}`
        : applyPreview.body;

    setMessages((prev) => [
      ...prev,
      {
        id: safeId(),
        role: 'assistant',
        content: text,
        createdAt: new Date().toISOString(),
        saved: true,
        savedCategory: 'application_message',
      },
    ]);

    toast({ title: 'Saved application message', description: 'Saved in your workspace.' });
  };

  const saveMessageAs = (id: string, category: SavedCategory) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              saved: true,
              savedCategory: category,
            }
          : message
      )
    );

    toast({ title: savedCategoryLabels[category], description: 'Saved in your workspace.' });
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, pinned: !message.pinned } : message
      )
    );
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
  };

  const saveEdit = () => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === editingMessageId ? { ...message, content: editText } : message
      )
    );

    setEditingMessageId(null);
    setEditText('');
  };

  const researchMessage = (message: ChatMessage) => {
    setPrompt(`Research this deeper and give me a stronger practical answer:\n\n${message.content}`);
    setWorkspaceOpen(true);
  };

  const messageActions = (message: ChatMessage) => (
    <div className="mt-3 space-y-2 border-t border-black/5 pt-2 dark:border-white/10">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2">
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2">
          <Edit3 className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => deleteMessage(message.id)} className="h-8 rounded-full px-2 text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2">
          {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2">
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {message.role === 'assistant' && (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'career_plan')} className="h-8 rounded-full px-2 text-[11px]">
            Plan
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'cv_advice')} className="h-8 rounded-full px-2 text-[11px]">
            CV
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'application_message')} className="h-8 rounded-full px-2 text-[11px]">
            Apply
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'research')} className="h-8 rounded-full px-2 text-[11px]">
            Research
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-44 pt-14 sm:px-4 md:pt-20">
        <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">FaceMeX Career Workspace</span>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              FaceMeX Career Workspace
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-white/55">
              Ask about jobs, CVs, interviews, research, business opportunities, and career growth.
            </p>
          </div>

          <Badge className="w-fit rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
            {creatorPlus ? (
              <>
                <Crown className="mr-1 h-3.5 w-3.5" />
                Creator+: Unlimited AI
              </>
            ) : currentTier === 'pro' ? (
              `Pro AI: ${deepSeekUsage}/10 today`
            ) : (
              'Free: templates + basic help'
            )}
          </Badge>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Opportunity profile
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, skill, or opportunity" className={premiumInput} />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location e.g. Tzaneen" className={premiumInput} />
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry e.g. retail, tech, admin" className={premiumInput} />

                <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className={premiumSelect}>
                  <option value="">Any work mode</option>
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>

                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={premiumSelect}>
                  <option value="">Experience level</option>
                  <option value="student / intern">Student / Intern</option>
                  <option value="entry level">Entry level</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={enableNearbyJobs} disabled={geoBusy} className={premiumOutlineButton}>
                    {geoBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Nearby
                  </Button>

                  <Button variant="outline" onClick={enableVacancyAlerts} className={premiumOutlineButton}>
                    {alertEnabled ? <BellRing className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                    Alerts
                  </Button>
                </div>

                {nearbyEnabled && (
                  <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
                    Nearby enabled: {geoLabel}
                  </div>
                )}

                <Button onClick={refreshSources} className="h-11 w-full rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-black">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh radar
                </Button>
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" />
                  Opportunity radar
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {activeRadarCard && (
                  <a href={activeRadarCard.url} target="_blank" rel="noreferrer" className="block rounded-[24px] border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/[0.06]">
                    <div className="flex gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                        {activeRadarCard.image ? (
                          <img src={activeRadarCard.image} alt={activeRadarCard.label} className="h-9 w-9 rounded-xl object-contain" />
                        ) : (
                          <Briefcase className="h-7 w-7 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold">{activeRadarCard.label}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-white/50">{activeRadarCard.note}</p>
                      </div>

                      <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  </a>
                )}

                <div className="flex w-full gap-2 overflow-x-auto pb-1">
                  {sourceLinks.slice(0, 8).map((link, index) => (
                    <button
                      key={link.url}
                      type="button"
                      onClick={() => setActiveCard(index)}
                      className={`flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-[11px] ${
                        activeCard === index
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-black/5 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.04]'
                      }`}
                    >
                      {link.image && <img src={link.image} alt={link.label} className="h-6 w-6 rounded-lg object-contain" />}
                      <span className="line-clamp-1 max-w-[54px]">{link.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  Apply email & messages
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className={premiumInput} />
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person, optional" className={premiumInput} />

                <div className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50">
                  Free users get 5 email templates and 5 message templates. Pro gets 10 AI writes/research per day. Creator+ is unlimited.
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email templates</div>

                  <div className="grid gap-2">
                    {templates.emails.map((template) => (
                      <div key={template.id} className="grid grid-cols-[1fr_auto] gap-2">
                        <Button
                          variant="outline"
                          className={`${premiumOutlineButton} justify-start truncate`}
                          onClick={() => {
                            setApplyPreview({
                              kind: 'email',
                              title: template.title,
                              subject: template.subject,
                              body: template.body,
                              source: 'template',
                            });
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{template.title}</span>
                        </Button>

                        <Button
                          variant="outline"
                          className={`${premiumOutlineButton} px-3`}
                          disabled={applyBusy}
                          onClick={() => generateApplyContent('email', template.purpose)}
                        >
                          {applyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message templates</div>

                  <div className="grid gap-2">
                    {templates.messages.map((template) => (
                      <div key={template.id} className="grid grid-cols-[1fr_auto] gap-2">
                        <Button
                          variant="outline"
                          className={`${premiumOutlineButton} justify-start truncate`}
                          onClick={() => {
                            setApplyPreview({
                              kind: 'message',
                              title: template.title,
                              body: template.body,
                              source: 'template',
                            });
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{template.title}</span>
                        </Button>

                        <Button
                          variant="outline"
                          className={`${premiumOutlineButton} px-3`}
                          disabled={applyBusy}
                          onClick={() => generateApplyContent('message', template.purpose)}
                        >
                          {applyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {applyPreview && (
                  <div className="rounded-[22px] border border-black/5 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{applyPreview.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {applyPreview.source === 'ai' ? 'AI draft' : applyPreview.source === 'fallback' ? 'Template fallback' : 'Template'}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" onClick={copyApplyPreview} className="h-8 rounded-full px-2">
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={saveApplyPreview} className="h-8 rounded-full px-2">
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {applyPreview.kind === 'email' && applyPreview.subject && (
                      <div className="mb-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.05]">
                        <span className="font-semibold">Subject:</span> {applyPreview.subject}
                      </div>
                    )}

                    <p className="max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-white/75">
                      {applyPreview.body}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Save className="h-4 w-4" />
                  Saved workspace
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['career_plan', 'cv_advice', 'application_message', 'research'] as SavedCategory[]).map((category) => (
                    <Button
                      key={category}
                      variant={savedFilter === category ? 'default' : 'outline'}
                      onClick={() => setSavedFilter(category)}
                      className="h-auto min-h-11 rounded-2xl px-3 py-2 text-left text-xs"
                    >
                      <span className="block truncate">
                        {savedCategoryLabels[category].replace('Saved ', '')}
                      </span>
                      <span className="ml-1 opacity-70">({savedStats[category]})</span>
                    </Button>
                  ))}
                </div>

                <Button variant="ghost" onClick={() => setSavedFilter('all')} className="h-9 w-full rounded-2xl text-xs">
                  Show all saved
                </Button>

                <div className="space-y-2">
                  {visibleSavedMessages.length === 0 ? (
                    <div className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
                      No saved items yet. Save useful answers as plan, CV advice, application, or research.
                    </div>
                  ) : (
                    visibleSavedMessages.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setWorkspaceOpen(true)}
                        className="block w-full rounded-2xl border border-black/5 bg-white p-3 text-left text-xs dark:border-white/10 dark:bg-white/[0.05]"
                      >
                        <div className="mb-1 font-semibold">
                          {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                        </div>
                        <div className="line-clamp-2 text-slate-500 dark:text-white/50">
                          {item.content}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={`${premiumCard} flex min-h-[55vh] flex-col items-center justify-center p-5 text-center lg:min-h-[74vh]`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white dark:bg-white dark:text-black">
              <MessageCircle className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-xl font-semibold sm:text-2xl">
              FaceMeX Career Workspace
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-white/55">
              Ask about jobs, CVs, interviews, research, business opportunities, and career growth.
            </p>

            <div className="mt-4 flex max-w-full flex-wrap justify-center gap-2">
              <Button onClick={() => quickAsk('Find opportunities near me and help me apply smart.')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Find opportunities
              </Button>

              <Button onClick={() => quickAsk('Help me prepare for an interview.')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Interview prep
              </Button>

              <Button onClick={() => quickAsk('Write an email and WhatsApp message to send my CV for an opportunity.')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Send my CV
              </Button>

              <Button onClick={() => quickAsk('Check if this job or opportunity looks fake or risky.')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Check fake job
              </Button>

              <Button onClick={() => quickAsk('Where can I network with tech investors in South Africa?')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Find investors
              </Button>

              <Button onClick={() => quickAsk('Help me research opportunities, companies, and career options.')} variant="outline" className="rounded-full text-xs sm:text-sm">
                Research anything
              </Button>
            </div>

            <Button onClick={() => setWorkspaceOpen(true)} className="mt-5 h-11 rounded-2xl bg-slate-950 px-5 text-white dark:bg-white dark:text-black">
              <MessageCircle className="mr-2 h-4 w-4" />
              Open workspace
            </Button>

            {deepSeekLimit !== null && (
              <p className="mt-3 text-xs text-slate-400">
                AI uses left today: {remainingDeepSeekUses}
              </p>
            )}
          </Card>
        </div>

        {reminders.length > 0 && (
          <Card className={`${premiumCard} mt-4`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4" />
                Saved alerts
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{reminder.role}</div>
                    <div className="text-xs text-slate-500">Location: {reminder.location}</div>
                    <div className="text-xs text-slate-500">Frequency: {reminder.frequency}</div>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => deleteReminder(reminder.id)} className="h-9 w-9 shrink-0 rounded-full text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col gap-2 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Soon you’ll receive alerts when new jobs and opportunities match your profile.</span>
            </div>

            <Button size="sm" variant="ghost" onClick={() => navigate('/pricing')} className="rounded-full">
              View tiers
            </Button>
          </CardContent>
        </Card>
      </main>

      {!workspaceOpen && (
        <button
          type="button"
          onClick={() => setWorkspaceOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] right-3 z-40 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] dark:bg-white dark:text-black"
        >
          <MessageCircle className="mr-2 inline h-4 w-4" />
          Ask
        </button>
      )}

      {workspaceOpen && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen max-w-full flex-col overflow-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-black/5 bg-white/90 px-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90 sm:px-4">
            <div className="flex min-w-0 items-center gap-1">
              <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">FaceMeX Career Workspace</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-white/45">
                  Jobs, CVs, research, business
                </div>
              </div>
            </div>

            <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-4">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {messages.length === 0 && !busy && (
                <div className="flex min-h-[52vh] flex-col items-center justify-center px-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white dark:bg-white dark:text-black">
                    <Sparkles className="h-7 w-7" />
                  </div>

                  <h2 className="mt-4 text-xl font-semibold">
                    What do you need help with?
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-white/55">
                    Ask about jobs, CVs, interviews, applications, investors, research, and opportunity safety.
                  </p>

                  <div className="mt-4 flex max-w-full flex-wrap justify-center gap-2">
                    {[
                      ['Find opportunities', 'Find opportunities near me and help me apply smart.'],
                      ['Interview prep', 'Help me prepare for an interview.'],
                      ['Send my CV', 'Write an email and WhatsApp message to send my CV for an opportunity.'],
                      ['Check fake job', 'Check if this job or opportunity looks fake or risky.'],
                      ['Find investors', 'Where can I network with tech investors in South Africa?'],
                      ['Research anything', 'Help me research opportunities, companies, and career options.'],
                    ].map(([label, text]) => (
                      <Button key={label} variant="outline" onClick={() => setPrompt(text)} className="rounded-full text-xs sm:text-sm">
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92vw] rounded-[22px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
                      message.role === 'user'
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                        : 'border border-black/5 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[120px] rounded-2xl" />

                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>
                            Cancel
                          </Button>

                          <Button size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[48vh] overflow-y-auto pr-1">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )}

                    {editingMessageId !== message.id && messageActions(message)}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-[22px] border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    FaceMeX is thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-black/5 bg-[#f7f7f5]/95 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f0f]/95 sm:px-4">
            <div className="mx-auto w-full max-w-3xl rounded-[24px] border border-black/10 bg-white/95 p-2 shadow-[0_16px_45px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#1a1a1a]/95">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about jobs, CVs, research, investors..."
                className="max-h-28 min-h-[48px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 dark:text-white/45">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Verify opportunities before paying or sending sensitive documents.</span>
                </div>

                <Button
                  onClick={() => sendPrompt()}
                  disabled={busy}
                  className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
