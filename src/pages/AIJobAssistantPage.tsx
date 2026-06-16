import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MoreVertical,
  Pin,
  PinOff,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';

import {
  trackButtonClick,
  trackError,
  trackFeatureUse,
  trackImageAnalysis,
  trackLinkClick,
  trackUpload,
  trackWorkspaceOpen,
  trackWorkspacePrompt,
  trackWorkspaceResponse,
} from '@/lib/analytics';

type SavedCategory = 'career_plan' | 'cv_advice' | 'application_message' | 'research';

type WorkspaceImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type SourceCategoryKey =
  | 'facemex_verified_local_employer'
  | 'official_company_source'
  | 'government_public_institution'
  | 'community_advert_needs_verification'
  | 'external_job_api'
  | 'high_risk_avoid';

type LocalVerifiedJob = {
  id: string;
  title: string;
  company: string;
  area: string;
  deadline?: string | null;
  sourceLabel: string;
  verificationStatus: 'verified' | 'needs_verification' | 'avoid';
  actionLabel: string;
  applyUrl: string;
  sourceUrl: string;
  sourceType: SourceCategoryKey;
  isSourceCard?: boolean;
  salary?: string | null;
  category?: string | null;
  description?: string | null;
  createdAt?: string | null;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pinned?: boolean;
  saved?: boolean;
  savedCategory?: SavedCategory;
  deletedFromChat?: boolean;
  images?: WorkspaceImage[];
  intent?: string;
  jobs?: LocalVerifiedJob[];
  jobSearchArea?: string;
  jobSearchQuery?: string;
};

const AI_CV_BUILDER_PATH = '/ai/resume';
const AI_COVER_LETTER_PATH = '/ai/cover-letter';
const FACE_MEX_AI_ICON_SRC = '/facemex_ai_flow_icon.png';

const JOBS_BATCH_SIZE = 10;
const WORKSPACE_STORAGE_KEY = 'facemex_opportunities_workspace_messages';

const BUILD_CV_QUICK_ACTION = '__OPEN_FACEMEX_AI_CV_BUILDER__';
const COVER_LETTER_QUICK_ACTION = '__OPEN_FACEMEX_COVER_LETTER_AI__';
const TRACK_APPLICATIONS_QUICK_ACTION = '__OPEN_FACEMEX_JOB_TRACKER__';

const NO_EXPERIENCE_SEARCH_KEYWORD =
  'no experience entry level general worker cleaner packer cashier store assistant learnership internship';

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Plan',
  cv_advice: 'CV',
  application_message: 'Apply',
  research: 'Research',
};

const MAX_WORKSPACE_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 12;

const PRIORITY_AREAS = [
  'Tzaneen',
  'Lenyenye',
  'Nkowankowa',
  'Maake',
  'Letsitele',
  'Modjadjiskloof',
  'Haenertsburg',
  'Polokwane',
  'Phalaborwa',
  'Hoedspruit',
  'Makhado',
  'Musina',
  'Messina',
];

const GREATER_TZANEEN_AREAS = [
  'tzaneen',
  'greater tzaneen',
  'lenyenye',
  'nkowankowa',
  'maake',
  'letsitele',
  'modjadjiskloof',
  'haenertsberg',
  'haenertsburg',
  'mooketsi',
  'duivelskloof',
  'burgersdorp',
  'gavaza',
  'dan',
  'julesburg',
  'lephepane',
  'mafarana',
  'kujwana',
  'khujwana',
  'moime',
  'runnymede',
  'rita',
  'deerpark',
  'ramokako',
  'mohlaba',
  'bridgeway',
  'nwamitwa',
  'mogoboya',
  'mogapeng',
  'petanenge',
  'relela',
  'myakayaka',
];

const LIMPOPO_AREAS = [
  ...GREATER_TZANEEN_AREAS,
  'limpopo',
  'polokwane',
  'pietersburg',
  'seshego',
  'mankweng',
  'phalaborwa',
  'ba-phalaborwa',
  'hoedspruit',
  'maruleng',
  'giyani',
  'malamulele',
  'mopani',
  'makhado',
  'louis trichardt',
  'thohoyandou',
  'musina',
  'messina',
  'mokopane',
  'modimolle',
  'bela-bela',
  'warmbad',
  'lephalale',
  'ellisras',
  'thabazimbi',
  'waterberg',
  'burgersfort',
  'greater tubatse',
  'steelpoort',
  'marble hall',
  'groblersdal',
  'capricorn',
  'vhembe',
  'sekhukhune',
];

const OUTSIDE_LIMPOPO_AREAS = [
  'gauteng',
  'johannesburg',
  'joburg',
  'roodepoort',
  'west johannesburg',
  'pretoria',
  'tshwane',
  'sandton',
  'midrand',
  'centurion',
  'soweto',
  'durban',
  'kwazulu',
  'cape town',
  'western cape',
  'eastern cape',
  'free state',
  'bloemfontein',
  'north west',
  'rustenburg',
  'mpumalanga',
  'nelspruit',
  'mbombela',
  'witbank',
  'emalahleni',
  'secunda',
  'kimberley',
  'northern cape',
];

const OFFICIAL_JOB_SOURCE_CARDS: LocalVerifiedJob[] = [
  {
    id: 'shoprite-store-jobs',
    title: 'Shoprite / Checkers / Usave Store Jobs',
    company: 'Shoprite Group',
    area: 'South Africa / Local stores',
    deadline: null,
    sourceLabel: 'Official Company Source',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://apply.shoprite.jobs/',
    sourceUrl: 'https://apply.shoprite.jobs/',
    sourceType: 'official_company_source',
    isSourceCard: true,
    category: 'Retail',
    description: 'Official Shoprite Group job application portal.',
  },
  {
    id: 'shoprite-careers',
    title: 'Shoprite Group Careers',
    company: 'Shoprite Group',
    area: 'South Africa',
    deadline: null,
    sourceLabel: 'Official Company Source',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.shopriteholdings.co.za/careers.html',
    sourceUrl: 'https://www.shopriteholdings.co.za/careers.html',
    sourceType: 'official_company_source',
    isSourceCard: true,
    category: 'Retail',
    description: 'Official Shoprite Group careers page.',
  },
  {
    id: 'westfalia-careers',
    title: 'Westfalia Fruit Careers',
    company: 'Westfalia Fruit',
    area: 'Tzaneen / Limpopo / South Africa',
    deadline: null,
    sourceLabel: 'Official Company Source',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.westfaliafruit.com/careers',
    sourceUrl: 'https://www.westfaliafruit.com/careers',
    sourceType: 'official_company_source',
    isSourceCard: true,
    category: 'Agriculture',
    description: 'Official Westfalia Fruit careers page.',
  },
  {
    id: 'zz2-vacancies',
    title: 'ZZ2 Vacancies',
    company: 'ZZ2 / Bertie van Zyl (Pty) Ltd',
    area: 'Mooketsi / Tzaneen / Limpopo',
    deadline: null,
    sourceLabel: 'Official Company Source',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://recruit.zz2.co.za/vacancies',
    sourceUrl: 'https://recruit.zz2.co.za/vacancies',
    sourceType: 'official_company_source',
    isSourceCard: true,
    category: 'Agriculture',
    description: 'Official ZZ2 recruitment page.',
  },
  {
    id: 'limpopo-health-careers',
    title: 'Limpopo Department of Health Careers',
    company: 'Limpopo Department of Health',
    area: 'Limpopo / Letaba / Nkowankowa',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.ldoh.gov.za/?q=node/11',
    sourceUrl: 'https://www.ldoh.gov.za/?q=node/11',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government / Health',
    description: 'Official Limpopo Department of Health careers page.',
  },
  {
    id: 'greater-tzaneen-vacancies',
    title: 'Greater Tzaneen Municipality Vacancies',
    company: 'Greater Tzaneen Municipality',
    area: 'Tzaneen',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.greatertzaneen.gov.za/?q=current_vacancies',
    sourceUrl: 'https://www.greatertzaneen.gov.za/?q=current_vacancies',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Greater Tzaneen Municipality vacancies page.',
  },
  {
    id: 'polokwane-apply',
    title: 'Polokwane Municipality Employment Portal',
    company: 'Polokwane Municipality',
    area: 'Polokwane',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://apply.polokwane.gov.za/',
    sourceUrl: 'https://apply.polokwane.gov.za/',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Polokwane Municipality employment portal.',
  },
  {
    id: 'ba-phalaborwa-vacancies',
    title: 'Ba-Phalaborwa Municipality Vacancies',
    company: 'Ba-Phalaborwa Municipality',
    area: 'Phalaborwa',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.phalaborwa.gov.za/vacancies/vacancies.php',
    sourceUrl: 'https://www.phalaborwa.gov.za/vacancies/vacancies.php',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Ba-Phalaborwa Municipality vacancies page.',
  },
  {
    id: 'maruleng-vacancies',
    title: 'Maruleng Municipality Vacancies',
    company: 'Maruleng Municipality',
    area: 'Hoedspruit',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.maruleng.gov.za/pages/vacancies.php',
    sourceUrl: 'https://www.maruleng.gov.za/pages/vacancies.php',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Maruleng Municipality vacancies page.',
  },
  {
    id: 'makhado-vacancies',
    title: 'Makhado Municipality Advertised Posts',
    company: 'Makhado Municipality',
    area: 'Makhado',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.makhado.gov.za/?q=advertisedvacancies',
    sourceUrl: 'https://www.makhado.gov.za/?q=advertisedvacancies',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Makhado Municipality advertised vacancies page.',
  },
  {
    id: 'musina-vacancies',
    title: 'Musina Municipality Vacancies',
    company: 'Musina Municipality',
    area: 'Musina',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://www.musina.gov.za/vacancies-musina-municipality/',
    sourceUrl: 'https://www.musina.gov.za/vacancies-musina-municipality/',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Government',
    description: 'Official Musina Municipality vacancies page.',
  },
  {
    id: 'sayouth',
    title: 'SAYouth Opportunities',
    company: 'SAYouth',
    area: 'South Africa / Youth Opportunities',
    deadline: null,
    sourceLabel: 'Government / Public Institution',
    verificationStatus: 'verified',
    actionLabel: 'Open Official Page',
    applyUrl: 'https://sayouth.mobi/',
    sourceUrl: 'https://sayouth.mobi/',
    sourceType: 'government_public_institution',
    isSourceCard: true,
    category: 'Youth / Learnerships',
    description: 'Official youth opportunities platform.',
  },
];

const FACE_MEX_ANSWER_STYLE = `
You are FaceMeX Job AI, but you must behave like a helpful ChatGPT-style assistant for everyday life, career, business, learning, work, apps, documents, messages, planning, and general questions.

Main rule:
- Answer any normal helpful question clearly and calmly.
- Only search jobs when the user clearly asks for jobs, vacancies, hiring, work, learnerships, internships, employment, or a specific job role.
- Do not treat location words like Tzaneen, Polokwane, Letsitele, Limpopo, or South Africa as job-search intent by themselves.
- If the user asks about business ideas, life advice, app improvement, transport, money planning, studies, messages, or strategy, answer normally without showing job cards.
- If the user asks for CV help, cover letter help, application message, or interview help, answer with career guidance.
- If the user asks for jobs, show job results and job cards.
- If the user asks a general question after job results, answer the new question directly.

CV and Cover Letter rule:
- If the user asks about a CV, answer according to the user's exact intent first: create CV, improve CV, review CV, write profile summary, list skills, tailor CV, or fix wording.
- After helping, instruct them clearly:
  "To create your CV inside FaceMeX, tap the hamburger menu (☰), scroll down, and open AI CV Builder."
- If the user asks about a cover letter, answer according to the user's exact intent first: create cover letter, improve cover letter, tailor cover letter, or write an application letter.
- After helping, instruct them clearly:
  "To create your cover letter inside FaceMeX, tap the hamburger menu (☰), scroll down, and open Cover Letter AI."
- Keep the instruction short and practical.
- Do not force job cards for CV or cover letter requests unless the user also asks for jobs.

Safety rules:
- Refuse hate, harmful, dangerous, illegal, explicit, or unsafe requests.
- Do not help with scams, violence, exploitation, or harmful instructions.
- For medical, legal, or financial issues, give general guidance and recommend a qualified professional when needed.

Style:
- Write like ChatGPT.
- Clean, calm, helpful, and practical.
- Use short sections.
- Do not make too much noise.
- Do not over-explain.
- Give the direct answer first.
- When useful, give steps or examples.
- Never invent jobs.
- Only say a job is verified if it comes from FaceMeX verified records, official company source, government/public institution, or a directly confirmed employer.

When users ask for jobs:
- Understand the user's intent first.
- If they ask generally, search "jobs".
- If they ask for no experience, entry level, first job, or training provided, search beginner-friendly jobs only.
- If they ask for security, search "security".
- If they ask for cashier, search "cashier".
- If they ask for driver, search "driver".
- If they ask for admin, search "admin".
- If they ask for teacher or creche jobs, search education/teacher/creche.
- Prioritize exact area first.
- Then nearby areas.
- Then South Africa only if local results are low.
- Show official apply links when available.
- Keep external API jobs as Needs verification.

When checking a job advert/screenshot:
**Verdict:** Verified / Needs verification / Avoid

**Why**
- Reason
- Reason
- Reason

**Next step**
Give one clear action.

For non-job questions:
- Do not show job cards.
- Do not show Apply Assistant unless the answer is about a job application.
`;

const quickPrompts = [
  {
    label: 'Find jobs',
    prompt:
      'I am looking for a job in Tzaneen. Search automatically and show me current available jobs with apply links.',
  },
  {
    label: 'Build My CV',
    prompt: BUILD_CV_QUICK_ACTION,
  },
  {
    label: 'Cover letter',
    prompt: COVER_LETTER_QUICK_ACTION,
  },
  {
    label: 'Check fake job',
    prompt: 'Help me check if this job or opportunity looks fake or risky.',
  },
  {
    label: 'Interview Prep',
    prompt: 'Help me prepare for an interview. Give me questions and strong answers.',
  },
  {
    label: 'Job Tracker',
    prompt: TRACK_APPLICATIONS_QUICK_ACTION,
  },
];

type ApplySheetTool = {
  label: string;
  icon: any;
  prompt: string;
  action?: 'open_cv_builder' | 'open_cover_letter_builder';
};

const applySheetTools: ApplySheetTool[] = [
  {
    label: 'Apply Assistant',
    icon: Send,
    prompt:
      'Use Apply Assistant. Help me choose the best job, verify it, prepare my documents, and tell me exactly what to do next.',
  },
  {
    label: 'Build CV',
    icon: FileText,
    action: 'open_cv_builder',
    prompt:
      'Open AI CV Builder so the user can create or improve their CV inside FaceMeX.',
  },
  {
    label: 'Cover Letter',
    icon: FileText,
    action: 'open_cover_letter_builder',
    prompt:
      'Open Cover Letter AI so the user can create a professional cover letter inside FaceMeX.',
  },
  {
    label: 'Write Email',
    icon: Mail,
    prompt:
      'Write a professional email I can send with my CV for this job. Keep it short, polite, and convincing.',
  },
];

function clean(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (typeof value === 'object') {
    const item = value as any;
    const picked =
      item.display_name ||
      item.full_name ||
      item.name ||
      item.company_name ||
      item.title ||
      item.label ||
      item.value ||
      '';

    return String(picked || '').trim();
  }

  return String(value || '').trim();
}

function includesAny(value: string, list: string[]) {
  const text = clean(value).toLowerCase();
  return list.some((item) => text.includes(item.toLowerCase()));
}

function isNoExperienceSearchKeyword(keyword: string) {
  const q = clean(keyword).toLowerCase();

  return /(no experience|without experience|no previous experience|no prior experience|entry level|first job|beginner|training provided|grade 10|grade 11|grade 12|matric|learnership|internship)/i.test(
    q
  );
}

function looksLikeNoExperienceJob(job: LocalVerifiedJob) {
  const text = jobText(job);

  return /(no experience|without experience|no previous experience|no prior experience|entry level|training provided|full training|first job|beginner|junior|trainee|learner|learnership|internship|graduate|general worker|general assistant|cleaner|cleaning|housekeeping|packer|picker|cashier|store assistant|shop assistant|retail assistant|merchandiser|promoter|crew|waiter|waitress|griller|kitchen assistant|kitchen staff|grade 10|grade 11|grade 12|matric)/i.test(
    text
  );
}

function getUserDisplayName(store: any) {
  const user =
    store?.user ||
    store?.currentUser ||
    store?.authUser ||
    store?.profile ||
    store?.account ||
    store?.session?.user ||
    store?.supabaseUser ||
    null;

  const rawName =
    store?.full_name ||
    store?.fullName ||
    store?.name ||
    store?.displayName ||
    store?.username ||
    store?.profile?.full_name ||
    store?.profile?.fullName ||
    store?.profile?.name ||
    store?.profile?.username ||
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.displayName ||
    user?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    user?.user_metadata?.name ||
    user?.user_metadata?.username ||
    user?.email?.split('@')?.[0] ||
    '';

  const name = clean(rawName).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!name) return 'there';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFirstName(name: string) {
  const value = clean(name);
  if (!value || value.toLowerCase() === 'there') return 'there';
  return value.split(' ')[0] || 'there';
}

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

function getDeepSeekDailyLimit(tier: string, hasTier?: (tier: string) => boolean) {
  if (isCreatorPlusTier(tier, hasTier)) return null;
  if (tier === 'pro') return 20;
  return 5;
}

function getDeepSeekUsageKey(tier: string) {
  return `facemex_workspace_ai_usage_${tier || 'free'}_${todayKey()}`;
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

function unwrapApiResponse(res: any) {
  return res?.data || res;
}

function normalizeUssdCodes(text: string) {
  return String(text || '')
    .replace(/\\\*/g, '*')
    .replace(/\*\*(\*134\*843#)\*\*/g, '$1')
    .replace(/\*\*([*]\d{3}[*]\d{3}#)\*\*/g, '$1')
    .replace(/`(\*\d{3}\*\d{3}#)`/g, '$1');
}

function hasJobSearchWords(text: string) {
  return /(job|jobs|vacancy|vacancies|hiring|learnership|internship|employment|apply for work|looking for work|looking for a job|work opportunity|career opportunity|available posts|post available|position available|cashier|packer|clerk|security|general worker|driver|drivers|admin job|cleaner job|retail job|store assistant|teacher job|creche job|crèche job|no experience|entry level|first job|training provided)/i.test(
    text
  );
}

function hasGeneralHelpWords(text: string) {
  return /(business|businesses|start|starting|side hustle|make money|improve my life|life advice|everyday life|strategy|business idea|ideas|how can i improve|what should i do|teach me|explain|learn|study|app|website|users|customers|marketing|transport|delivery|courier|logistics|budget|save money|plan my day|motivation|discipline|relationship advice|school|college|skills|productivity)/i.test(
    text
  );
}

function detectIntent(text: string, hasImages = false) {
  const t = clean(text).toLowerCase();

  if (hasImages) return 'image_or_document_analysis';

  if (/(uif|ussd|sassa|claim status|department of employment|labour|labor|\*134\*843#)/i.test(t)) {
    return 'government-service-check';
  }

  if (
    /(fake|scam|legit|legitimate|verify|verified|verification|safe|pay money|registration fee|upfront|is this real|is it real|risky|check job|check this|ligit|source)/i.test(
      t
    )
  ) {
    return 'verify-opportunity';
  }

  if (/(cover letter|application letter|motivation letter)/i.test(t)) {
    return 'cover-letter';
  }

  if (/(email|mail|application email|send cv|send my cv|email cv)/i.test(t)) {
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

  if (hasGeneralHelpWords(t) && !hasJobSearchWords(t)) {
    return 'general-help';
  }

  if (hasJobSearchWords(t)) {
    return 'job-search';
  }

  if (/(research|find out|company|market|industry|business idea|analyse|analyze)/i.test(t)) {
    return 'research';
  }

  return 'general-question';
}

function savedCategoryFromIntent(intent: string): SavedCategory {
  if (intent === 'cv-profile') return 'cv_advice';

  if (intent === 'cover-letter' || intent === 'email-application' || intent === 'message-application') {
    return 'application_message';
  }

  if (
    intent === 'research' ||
    intent === 'image_or_document_analysis' ||
    intent === 'verify-opportunity' ||
    intent === 'government-service-check' ||
    intent === 'general-help' ||
    intent === 'general-question'
  ) {
    return 'research';
  }

  return 'career_plan';
}

function addFaceMeXCareerToolInstruction(promptText: string, intent: string) {
  if (intent === 'cv-profile') {
    return `${promptText}

FaceMeX instruction:
After answering the user's CV request, remind them:
"To create your CV inside FaceMeX, tap the hamburger menu (☰), scroll down, and open AI CV Builder."`;
  }

  if (intent === 'cover-letter') {
    return `${promptText}

FaceMeX instruction:
After answering the user's cover letter request, remind them:
"To create your cover letter inside FaceMeX, tap the hamburger menu (☰), scroll down, and open Cover Letter AI."`;
  }

  return promptText;
}

function extractAreaFromPrompt(text: string) {
  const t = clean(text).toLowerCase();

  const found = PRIORITY_AREAS.find((area) => t.includes(area.toLowerCase()));

  if (found) return found === 'Messina' ? 'Musina' : found;

  return 'Tzaneen';
}

function stripAreasFromText(text: string) {
  let value = ` ${clean(text).toLowerCase()} `;

  PRIORITY_AREAS.forEach((area) => {
    value = value.replace(new RegExp(`\\b${area.toLowerCase()}\\b`, 'gi'), ' ');
  });

  return value.replace(/\s+/g, ' ').trim();
}

function extractKeywordFromPrompt(text: string) {
  const original = clean(text).toLowerCase();
  const t = stripAreasFromText(text);

  if (/(no experience|without experience|no previous experience|no prior experience|entry level|first job|beginner|training provided|grade 10|grade 11|grade 12|matric)/i.test(t)) {
    return NO_EXPERIENCE_SEARCH_KEYWORD;
  }

  if (/(security|guard|armed response|protection)/i.test(t)) {
    return 'security';
  }

  if (/(cashier|packer|retail|store assistant|shop assistant|shoprite|checkers|usave|clerk)/i.test(t)) {
    return 'cashier retail packer store assistant clerk';
  }

  if (/(driver|drivers|code 10|code 14|pdp|delivery|truck|side tipper)/i.test(t)) {
    return 'driver';
  }

  if (/(admin|administrator|administrative|office|receptionist|data capture)/i.test(t)) {
    return 'admin clerk office';
  }

  if (/(teacher|educator|creche|crèche|school|daycare|assistant teacher)/i.test(t)) {
    return 'teacher creche school daycare';
  }

  if (/(cleaner|cleaning|housekeeping)/i.test(t)) {
    return 'cleaner';
  }

  if (/(farm|agriculture|packhouse|packing|fruit|westfalia|zz2|letaba)/i.test(t)) {
    return 'farm agriculture packhouse packing';
  }

  if (/(learnership|internship|graduate|youth)/i.test(t)) {
    return 'learnership internship';
  }

  if (/(general worker|general work|general)/i.test(t)) {
    return 'general worker';
  }

  if (
    /\b(job|jobs|vacancy|vacancies|work|employment|hiring)\b/i.test(original) &&
    !/(security|cashier|driver|admin|teacher|creche|crèche|cleaner|farm|agriculture|learnership|internship|general worker)/i.test(
      original
    )
  ) {
    return 'jobs';
  }

  const simplified = t
    .replace(/\b(hi|hello|hey|please)\b/gi, '')
    .replace(/can you help me/gi, '')
    .replace(/can you help/gi, '')
    .replace(/help me/gi, '')
    .replace(/help/gi, '')
    .replace(/find me/gi, '')
    .replace(/find/gi, '')
    .replace(/search for/gi, '')
    .replace(/search/gi, '')
    .replace(/i am looking for/gi, '')
    .replace(/i'm looking for/gi, '')
    .replace(/im looking for/gi, '')
    .replace(/looking for/gi, '')
    .replace(/show me/gi, '')
    .replace(/available/gi, '')
    .replace(/all/gi, '')
    .replace(/jobs?/gi, '')
    .replace(/vacanc(y|ies)/gi, '')
    .replace(/employment/gi, '')
    .replace(/hiring/gi, '')
    .replace(/work/gi, '')
    .replace(/\bin\b/gi, '')
    .replace(/\bnearby\b/gi, '')
    .replace(/\bnear\b/gi, '')
    .replace(/\baround\b/gi, '')
    .replace(/\bme\b/gi, '')
    .replace(/\bmy area\b/gi, '')
    .replace(/\bclose to me\b/gi, '')
    .replace(/\ba\b/gi, '')
    .replace(/[?.,!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!simplified || simplified.length < 3) return 'jobs';

  return simplified;
}

function getSearchDisplayLabel(keyword: string) {
  const q = clean(keyword).toLowerCase();

  if (isNoExperienceSearchKeyword(q)) return 'no experience jobs';
  if (!q || q === 'jobs' || q === 'job') return 'jobs';
  if (q === 'security') return 'security jobs';
  if (q === 'driver') return 'driver jobs';
  if (q.includes('cashier')) return 'retail, cashier, packer and store jobs';
  if (q.includes('farm')) return 'farm, agriculture and packhouse jobs';
  if (q.includes('admin')) return 'admin and office jobs';
  if (q.includes('teacher')) return 'teacher, creche and school jobs';
  if (q.includes('general worker')) return 'general worker jobs';

  return `${keyword} jobs`;
}

function normalizeVerificationStatus(value: any): LocalVerifiedJob['verificationStatus'] {
  const status = clean(value).toLowerCase();

  if (status === 'verified' || status === 'approved') return 'verified';
  if (status === 'avoid' || status === 'high_risk' || status === 'rejected') return 'avoid';

  return 'needs_verification';
}

function normalizeSourceType(value: any): SourceCategoryKey {
  const source = clean(value).toLowerCase();

  if (source.includes('facemex')) return 'facemex_verified_local_employer';
  if (source.includes('government') || source.includes('municipality') || source.includes('public')) {
    return 'government_public_institution';
  }
  if (source.includes('community') || source.includes('screenshot')) {
    return 'community_advert_needs_verification';
  }
  if (source.includes('api') || source.includes('adzuna') || source.includes('external') || source.includes('jooble')) {
    return 'external_job_api';
  }
  if (source.includes('risk') || source.includes('avoid')) return 'high_risk_avoid';

  return 'official_company_source';
}

function isForeignLookingJob(job: LocalVerifiedJob) {
  const text = `${job.title} ${job.company} ${job.category || ''} ${job.area || ''}`.toLowerCase();

  if (/(addetto|vendite|commesso|stage curriculare|magazziniere|tirocinio|impiegato|cameriere|barista)/i.test(text)) {
    return true;
  }

  if (/[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF]/.test(text)) {
    return true;
  }

  return false;
}

function jobText(job: LocalVerifiedJob) {
  return [
    job.title,
    job.company,
    job.area,
    job.category,
    job.sourceLabel,
    job.description,
  ]
    .join(' ')
    .toLowerCase();
}

function isBroadSearchArea(area: string) {
  const value = clean(area).toLowerCase();
  return value === 'south africa' || value === 'africa' || value === 'limpopo';
}

function isGreaterTzaneenSearch(area: string) {
  return includesAny(area, GREATER_TZANEEN_AREAS);
}

function isLimpopoSearch(area: string) {
  return includesAny(area, LIMPOPO_AREAS);
}

function isClearlyOutsideRequestedProvince(job: LocalVerifiedJob, requestedArea: string) {
  const requested = clean(requestedArea).toLowerCase();

  if (requested === 'south africa' || requested === 'africa') return false;

  const text = jobText(job);

  if (isLimpopoSearch(requestedArea)) {
    if (includesAny(text, LIMPOPO_AREAS)) return false;
    if (includesAny(text, OUTSIDE_LIMPOPO_AREAS)) return true;

    if (/south africa/i.test(job.area) && !includesAny(text, LIMPOPO_AREAS)) {
      return true;
    }
  }

  return false;
}

function jobMatchesRequestedArea(job: LocalVerifiedJob, requestedArea: string) {
  const requested = clean(requestedArea).toLowerCase();

  if (!requested || requested === 'south africa' || requested === 'africa') return true;

  const text = jobText(job);

  if (isClearlyOutsideRequestedProvince(job, requestedArea)) return false;

  if (isGreaterTzaneenSearch(requestedArea)) {
    return includesAny(text, GREATER_TZANEEN_AREAS) || includesAny(text, LIMPOPO_AREAS);
  }

  if (isLimpopoSearch(requestedArea)) {
    return includesAny(text, LIMPOPO_AREAS);
  }

  return text.includes(requested);
}

function areaRelevanceScore(job: LocalVerifiedJob, requestedArea: string) {
  const requested = clean(requestedArea).toLowerCase();
  const text = jobText(job);

  if (!requested || requested === 'south africa' || requested === 'africa') return 0;

  if (isClearlyOutsideRequestedProvince(job, requestedArea)) return -500;

  if (text.includes(requested)) return 600;
  if (isGreaterTzaneenSearch(requestedArea) && includesAny(text, GREATER_TZANEEN_AREAS)) return 460;
  if (isLimpopoSearch(requestedArea) && includesAny(text, LIMPOPO_AREAS)) return 260;

  return 0;
}

function jobMatchesKeywordIntent(job: LocalVerifiedJob, keyword: string) {
  const q = clean(keyword).toLowerCase();
  const text = jobText(job);

  if (!q || q === 'jobs' || q === 'job') return true;

  if (isNoExperienceSearchKeyword(q)) return looksLikeNoExperienceJob(job);

  if (q.includes('security')) return /(security|guard|armed|protection|response)/i.test(text);
  if (q.includes('driver')) return /(driver|drivers|code 10|code 14|pdp|truck|delivery|courier|transport|fleet|vehicle)/i.test(text);
  if (q.includes('cashier') || q.includes('retail')) {
    return /(cashier|packer|retail|store|shop|sales|clerk|merchandiser|assistant)/i.test(text);
  }
  if (q.includes('farm') || q.includes('agriculture')) {
    return /(farm|agriculture|packhouse|packing|fruit|harvest|zz2|westfalia|letaba)/i.test(text);
  }
  if (q.includes('admin')) return /(admin|clerk|office|reception|data capture|administrator|assistant|pa)/i.test(text);
  if (q.includes('teacher') || q.includes('creche')) {
    return /(teacher|educator|school|creche|crèche|daycare|assistant teacher)/i.test(text);
  }
  if (q.includes('cleaner')) return /(cleaner|cleaning|housekeeping)/i.test(text);
  if (q.includes('general worker')) return /(general worker|general assistant|worker|labourer)/i.test(text);
  if (q.includes('learnership') || q.includes('internship')) {
    return /(learnership|internship|graduate|trainee|youth)/i.test(text);
  }

  return q
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .some((word) => text.includes(word));
}

function dedupeJobs(jobs: LocalVerifiedJob[]) {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    const key = `${job.title}-${job.company}-${job.area}`.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getDeadlineInfo(deadline?: string | null) {
  if (!deadline) return { label: 'Closing date not stated', expired: false, urgent: false };

  const end = new Date(`${deadline}T23:59:59`);
  const now = new Date();

  if (Number.isNaN(end.getTime())) {
    return { label: deadline, expired: false, urgent: false };
  }

  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { label: 'Closed', expired: true, urgent: false };
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days <= 0) {
    return { label: `Closing in ${hours}h`, expired: false, urgent: true };
  }

  if (days === 1) {
    return { label: 'Closing in 1 day', expired: false, urgent: true };
  }

  return { label: `Closing in ${days} days`, expired: false, urgent: days <= 3 };
}

function verificationStatusStyles(status: LocalVerifiedJob['verificationStatus']) {
  if (status === 'verified') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20';
  }

  if (status === 'avoid') {
    return 'bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20';
  }

  return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20';
}

function verificationStatusLabel(status: LocalVerifiedJob['verificationStatus']) {
  if (status === 'verified') return 'Verified';
  if (status === 'avoid') return 'Avoid';
  return 'Needs verification';
}

function isJobRelatedText(content: string) {
  return /(job|jobs|vacancy|vacancies|apply|application|cv|resume|cover letter|employer|company|interview|hiring|learnership|internship|position|closing date|salary|source|verification status|public advert|verified employer|cashier|packer|clerk|security|teacher|creche|general worker|driver|drivers|admin)/i.test(
    content
  );
}

function isCvRelatedText(content: string) {
  return /(cv|resume|cover letter|application letter|motivation letter|profile summary|ats|career profile|work experience|skills section|employment history)/i.test(
    content
  );
}

function isGovernmentServiceText(content: string) {
  return /(uif|ussd|sassa|claim status|department of employment|labour|labor|\*134\*843#)/i.test(
    normalizeUssdCodes(content)
  );
}

function shouldShowCvBuilderActions(content: string, previousUserText = '') {
  const combined = `${content}\n${previousUserText}`;
  if (isGovernmentServiceText(combined)) return false;
  return isCvRelatedText(combined);
}

function shouldShowApplyActions(content: string, previousUserText = '') {
  const combined = `${content}\n${previousUserText}`;

  if (isGovernmentServiceText(combined)) return false;

  return isJobRelatedText(combined);
}

function shouldShowGovernmentSourceAction(content: string, previousUserText = '') {
  return isGovernmentServiceText(`${content}\n${previousUserText}`);
}

function extractJobTitle(text: string) {
  const value = normalizeUssdCodes(text);

  if (/code\s*14/i.test(value)) return 'Code 14 Side Tipper Driver';

  const titleMatch =
    value.match(/(?:Job title|Role|Position):\s*(.+)/i) ||
    value.match(/\*\*([^*]*(?:Driver|Clerk|Cashier|Cleaner|Security|General Worker|Assistant|Intern|Learnership|Teacher|Packer)[^*]*)\*\*/i);

  return clean(titleMatch?.[1]) || 'Job opportunity';
}

function extractCompany(text: string) {
  const companyMatch =
    text.match(/(?:Company|Employer|Source):\s*(.+)/i) ||
    text.match(/\bMRMS\b/i);

  if (companyMatch?.[0]?.toUpperCase().includes('MRMS')) return 'MRMS';

  return clean(companyMatch?.[1]) || 'Company not confirmed';
}

function extractEmail(text: string) {
  return clean(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]);
}

function extractDeadline(text: string) {
  const value = text.match(/\b\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\b/i)?.[0];

  if (value) return value;

  const slashDate = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0];

  return slashDate || '';
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));

    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl: string, maxWidth = 1280, quality = 0.82) {
  return new Promise<string>((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed || dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function imageFileToWorkspaceImage(file: File): Promise<WorkspaceImage> {
  const raw = await readFileAsDataUrl(file);
  const dataUrl = await resizeImageDataUrl(raw);

  return {
    id: safeId(),
    name: file.name || 'image',
    type: file.type || 'image/jpeg',
    size: file.size,
    dataUrl,
  };
}

function createUnavailableAnswer(hasImages: boolean) {
  if (hasImages) {
    return 'FaceMeX AI image analysis is temporarily unavailable. Please try again shortly. If this continues, check that your backend image-analysis route and vision API key are configured correctly.';
  }

  return 'FaceMeX AI is temporarily unavailable. Please try again shortly.';
}

function normalizeAnswerText(raw: any, fallback: string) {
  const answer =
    raw?.answer ||
    raw?.reply ||
    raw?.response ||
    raw?.text ||
    raw?.content ||
    raw?.message ||
    (Array.isArray(raw?.suggestions) ? raw.suggestions.join('\n\n') : '') ||
    '';

  return normalizeUssdCodes(clean(answer) || fallback);
}

function normalizeBrokenMarkdownLinks(text: string) {
  return normalizeUssdCodes(String(text || ''))
    .replace(/\[([^\]]+)\]\s*\(\s*(https?:\/\/[^)\s]+)\s*\)/gi, '[$1]($2)')
    .replace(
      /\[([^\]]+)\]\s*\(\s*((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^)\s]*)?)\s*\)/gi,
      '[$1]($2)'
    );
}

function stripTrailingPunctuation(value: string) {
  const trimmed = value.trim();
  const trailing = trimmed.match(/[),.;:!?]+$/)?.[0] || '';
  const cleanValue = trailing ? trimmed.slice(0, -trailing.length) : trimmed;

  return {
    cleanValue,
    trailing,
  };
}

function getLinkHref(rawUrl: string) {
  const { cleanValue } = stripTrailingPunctuation(rawUrl);

  if (/^https?:\/\//i.test(cleanValue)) return cleanValue;

  return `https://${cleanValue}`;
}

function getLinkLabel(rawUrl: string) {
  const { cleanValue } = stripTrailingPunctuation(rawUrl);

  try {
    const href = getLinkHref(cleanValue);
    const host = new URL(href).hostname.replace(/^www\./, '');

    return host;
  } catch {
    return cleanValue;
  }
}

function SourceChip({
  label,
  url,
  onClick,
}: {
  label: string;
  url: string;
  onClick?: (url: string, label?: string) => void;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => onClick?.(url, label)}
      className="mx-1 inline-flex max-w-full translate-y-[-1px] items-center rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold leading-none text-slate-700 no-underline transition hover:bg-slate-300 dark:bg-white/[0.12] dark:text-white/70 dark:hover:bg-white/[0.2]"
    >
      <span className="max-w-[140px] truncate">{label}</span>
    </a>
  );
}

function renderInlineText(text: string, onLinkClick?: (url: string, label?: string) => void) {
  const nodes: ReactNode[] = [];
  const safeText = normalizeBrokenMarkdownLinks(text);

  const regex =
    /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+|(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s)]*)?)\)|((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(safeText)) !== null) {
    if (match.index > lastIndex) nodes.push(safeText.slice(lastIndex, match.index));

    if (match[2]) {
      nodes.push(
        <strong key={`bold-${key++}`} className="font-semibold text-slate-950 dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3] && match[4]) {
      const label = match[3];
      const rawUrl = match[4];
      const href = getLinkHref(rawUrl);
      const { trailing } = stripTrailingPunctuation(rawUrl);

      nodes.push(<SourceChip key={`md-link-${key++}`} label={label} url={href} onClick={onLinkClick} />);
      if (trailing) nodes.push(trailing);
    } else if (match[5]) {
      const rawUrl = match[5];
      const href = getLinkHref(rawUrl);
      const label = getLinkLabel(rawUrl);
      const { trailing } = stripTrailingPunctuation(rawUrl);

      nodes.push(<SourceChip key={`domain-link-${key++}`} label={label} url={href} onClick={onLinkClick} />);
      if (trailing) nodes.push(trailing);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < safeText.length) nodes.push(safeText.slice(lastIndex));

  return nodes.length ? nodes : safeText;
}

function isTableSeparator(line: string) {
  const value = line.trim();

  if (!value.includes('|')) return false;

  const cells = value
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  if (cells.length < 2) return false;

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isLikelyTableRow(line: string) {
  const value = line.trim();
  if (!value.includes('|')) return false;

  const cells = value
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  return cells.length >= 2;
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderMarkdownTable(
  tableLines: string[],
  key: string,
  onLinkClick?: (url: string, label?: string) => void
) {
  const header = parseTableRow(tableLines[0]);
  const body = tableLines.slice(2).map(parseTableRow);
  const columnCount = Math.max(header.length, ...body.map((row) => row.length));

  return (
    <div
      key={key}
      className="my-4 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
    >
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-slate-100 dark:bg-white/[0.06]">
          <tr>
            {Array.from({ length: columnCount }).map((_, index) => (
              <th
                key={`head-${index}`}
                className="border-b border-slate-200 px-3 py-3 font-semibold text-slate-950 dark:border-white/10 dark:text-white"
              >
                {renderInlineText(header[index] || '', onLinkClick)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {body.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-b border-slate-100 last:border-0 dark:border-white/10"
            >
              {Array.from({ length: columnCount }).map((_, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="align-top px-3 py-3 text-slate-700 dark:text-white/75"
                >
                  {renderInlineText(row[cellIndex] || '', onLinkClick)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChatGPTStyleText({
  text,
  onLinkClick,
}: {
  text: string;
  onLinkClick?: (url: string, label?: string) => void;
}) {
  const safeText = normalizeBrokenMarkdownLinks(text);
  const lines = safeText.split('\n');
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (
      isLikelyTableRow(line) &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;

      while (index < lines.length && isLikelyTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      index -= 1;
      blocks.push(renderMarkdownTable(tableLines, `table-${index}`, onLinkClick));
      continue;
    }

    if (!line) {
      blocks.push(<div key={`space-${index}`} className="h-1" />);
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3
          key={`heading-${index}`}
          className="pt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          {renderInlineText(heading[1], onLinkClick)}
        </h3>
      );
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      blocks.push(
        <div key={`number-${index}`} className="flex gap-3">
          <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">
            {numbered[1]}
          </span>
          <div className="min-w-0 flex-1">{renderInlineText(numbered[2], onLinkClick)}</div>
        </div>
      );
      continue;
    }

    const bullet = line.match(/^[-•*]\s+(.+)$/);
    if (bullet) {
      blocks.push(
        <div key={`bullet-${index}`} className="flex gap-3">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-white/50" />
          <div className="min-w-0 flex-1">{renderInlineText(bullet[1], onLinkClick)}</div>
        </div>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className="text-slate-800 dark:text-white/85">
        {renderInlineText(line, onLinkClick)}
      </p>
    );
  }

  return <div className="space-y-3 text-[15px] leading-7 text-slate-800 dark:text-white/85">{blocks}</div>;
}

function isShortContextReply(text: string) {
  return /^(yes|yebo|yeah|yep|ok|okay|sure|continue|do it|please do|go ahead|no|not now|send it|draft it)$/i.test(
    clean(text)
  );
}

function buildConversationContext(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.deletedFromChat)
    .slice(-10)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n');
}

function FaceMeXFlowIcon({ className = '' }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`fm-flow-fallback ${className}`} />;
  }

  return (
    <img
      src={FACE_MEX_AI_ICON_SRC}
      alt=""
      className={`fm-flow-image ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function WelcomeHero({
  firstName,
  onQuickAsk,
}: {
  firstName: string;
  onQuickAsk: (text: string) => void;
}) {
  const displayName = firstName && firstName !== 'there' ? firstName : 'there';

  const rotatingPrompts = useMemo(
    () => [
      `Hi ${displayName}, how can I help you today?`,
      "Let's start with positive attention.",
      'Which job are we hunting today?',
      "Tomorrow starts today. Let's prepare for it.",
      `Ask me anything, ${displayName}.`,
    ],
    [displayName]
  );

  const [promptIndex, setPromptIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = rotatingPrompts[promptIndex];

    const typeSpeed = 95;
    const deleteSpeed = 58;
    const pauseAfterTyping = 2800;
    const pauseBeforeNext = 500;

    let timer: number | undefined;

    if (!isDeleting && typedPrompt.length < currentText.length) {
      timer = window.setTimeout(() => {
        setTypedPrompt(currentText.slice(0, typedPrompt.length + 1));
      }, typeSpeed);
    }

    if (!isDeleting && typedPrompt.length === currentText.length) {
      timer = window.setTimeout(() => {
        setIsDeleting(true);
      }, pauseAfterTyping);
    }

    if (isDeleting && typedPrompt.length > 0) {
      timer = window.setTimeout(() => {
        setTypedPrompt(currentText.slice(0, typedPrompt.length - 1));
      }, deleteSpeed);
    }

    if (isDeleting && typedPrompt.length === 0) {
      timer = window.setTimeout(() => {
        setIsDeleting(false);
        setPromptIndex((prev) => (prev + 1) % rotatingPrompts.length);
      }, pauseBeforeNext);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [typedPrompt, isDeleting, promptIndex, rotatingPrompts]);

  return (
    <div className="mx-auto flex min-h-[38vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="fm-treasure-wrap">
        <span className="fm-treasure-ring" />
        <span className="fm-treasure-shadow" />

        <div className="fm-treasure-orb">
          <FaceMeXFlowIcon className="h-[62px] w-[62px]" />
        </div>
      </div>

      <div className="mt-7 flex min-h-[78px] items-center justify-center px-4">
        <h2 className="fm-main-typing-text text-balance font-semibold leading-tight tracking-tight text-slate-950 dark:text-white">
          {typedPrompt || '\u00A0'}
          <span className="fm-type-caret" />
        </h2>
      </div>

      <p className="mt-2 max-w-md px-3 text-sm leading-6 text-slate-500 dark:text-white/50">
        Ask one clear question. Upload a screenshot when checking a job post,
        CV, advert, or opportunity.
      </p>

      <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2 px-2">
        {quickPrompts.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickAsk(item.prompt)}
            className="fm-quick-pill rounded-full border border-black/5 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition duration-300 hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1]"
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CompactAssistantJobCard({
  job,
  onOpen,
  onVerify,
  onSave,
}: {
  job: LocalVerifiedJob;
  onOpen: () => void;
  onVerify: () => void;
  onSave: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const deadlineInfo = getDeadlineInfo(job.deadline);
  const disabled = job.verificationStatus === 'avoid' || deadlineInfo.expired;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.045]">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-[15px] font-semibold leading-tight text-slate-950 dark:text-white">
              {job.title}
            </h3>

            <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-600 dark:text-white/60">
              {job.company}
            </p>
          </div>

          {job.verificationStatus === 'verified' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : job.verificationStatus === 'avoid' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500 dark:text-white/50">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[150px] truncate">{job.area}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 ${
              job.verificationStatus === 'avoid'
                ? 'text-red-600'
                : job.verificationStatus === 'verified'
                  ? 'text-emerald-600'
                  : 'text-blue-600'
            }`}
          >
            {verificationStatusLabel(job.verificationStatus)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.category && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60">
              {job.category}
            </span>
          )}

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60">
            {job.sourceLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpen}
            disabled={disabled}
            className="h-9 rounded-xl text-xs"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {deadlineInfo.expired ? 'Closed' : 'Open'}
          </Button>

          <Button size="sm" variant="outline" onClick={onVerify} className="h-9 rounded-xl text-xs">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Verify
          </Button>

          <Button size="sm" variant="outline" onClick={onSave} className="h-9 rounded-xl text-xs">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-1 py-1 text-[12px] font-semibold text-slate-500 transition hover:text-slate-800 dark:text-white/50 dark:hover:text-white"
        >
          <span>More details</span>
          {detailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {detailsOpen && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600 dark:bg-white/[0.06] dark:text-white/60">
            <p>
              <span className="font-semibold text-slate-800 dark:text-white">Closing date:</span>{' '}
              {deadlineInfo.label}
            </p>

            {job.salary && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-white">Salary:</span> {job.salary}
              </p>
            )}

            {job.description && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-white">Details:</span> {job.description}
              </p>
            )}

            <p>
              <span className="font-semibold text-slate-800 dark:text-white">Source:</span> {job.sourceLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const userStore = useUserStore() as any;
  const { tier, hasTier } = userStore;

  const userDisplayName = useMemo(() => getUserDisplayName(userStore), [userStore]);
  const firstName = useMemo(() => getFirstName(userDisplayName), [userDisplayName]);

  const currentTier = normalizeTier(tier);
  const creatorPlus = isCreatorPlusTier(currentTier, hasTier);
  const deepSeekLimit = getDeepSeekDailyLimit(currentTier, hasTier);

  const [deepSeekUsage, setDeepSeekUsage] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<WorkspaceImage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localJobs, setLocalJobs] = useState<LocalVerifiedJob[]>(OFFICIAL_JOB_SOURCE_CARDS);
  const [busy, setBusy] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [applySheetOpen, setApplySheetOpen] = useState(false);
  const [clearWorkspaceOpen, setClearWorkspaceOpen] = useState(false);
  const [applySheetContext, setApplySheetContext] = useState('');
  const [followUpExpanded, setFollowUpExpanded] = useState(false);
  const [jobVisibleCounts, setJobVisibleCounts] = useState<Record<string, number>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedFilter, setSavedFilter] = useState<SavedCategory | 'all'>('all');
  const [nowTick, setNowTick] = useState(Date.now());

  const canUseAI = useMemo(() => {
    if (deepSeekLimit === null) return true;
    return deepSeekUsage < deepSeekLimit;
  }, [deepSeekLimit, deepSeekUsage]);

  const remainingAIUses = useMemo(() => {
    if (deepSeekLimit === null) return null;
    return Math.max(0, deepSeekLimit - deepSeekUsage);
  }, [deepSeekLimit, deepSeekUsage]);

  const chatMessages = useMemo(() => {
    return messages.filter((message) => !message.deletedFromChat);
  }, [messages]);

  const hasJobResultsOnScreen = useMemo(() => {
    return chatMessages.some((message) => message.role === 'assistant' && Boolean(message.jobs?.length));
  }, [chatMessages]);

  const inputHasContent = prompt.trim().length > 0 || selectedImages.length > 0;

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

  const usageLabel = useMemo(() => {
    if (creatorPlus) return 'Unlimited';
    if (currentTier === 'pro') return `${deepSeekUsage}/20`;
    return `${deepSeekUsage}/5`;
  }, [creatorPlus, currentTier, deepSeekUsage]);

  const sortedLocalJobs = useMemo(() => {
    return [...localJobs].sort((a, b) => {
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
      if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return 1;
      return a.title.localeCompare(b.title);
    });
  }, [localJobs]);

  const closingSoonJob = useMemo(() => {
    return sortedLocalJobs
      .filter((job) => job.deadline && getDeadlineInfo(job.deadline).urgent && !getDeadlineInfo(job.deadline).expired)
      .sort((a, b) => {
        const aTime = new Date(`${a.deadline}T23:59:59`).getTime();
        const bTime = new Date(`${b.deadline}T23:59:59`).getTime();
        return aTime - bTime;
      })[0];
  }, [sortedLocalJobs, nowTick]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDeepSeekUsage(getDeepSeekUsage(currentTier));

    try {
      const rawMessages = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      setMessages(rawMessages ? JSON.parse(rawMessages) : []);
    } catch {
      setMessages([]);
    }

    trackWorkspaceOpen({
      message_count: 0,
      selected_image_count: 0,
    });
  }, [currentTier]);

  useEffect(() => {
    loadAutomaticJobs({
      query: 'jobs',
      area: 'Tzaneen',
      silent: true,
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages.length, busy]);

  const recordAIUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const normalizeApiJobs = (jobs: any[], keyword = 'jobs', requestedArea = 'Tzaneen'): LocalVerifiedJob[] => {
    const normalized = jobs
      .map((job: any) => ({
        id: clean(job.id) || safeId(),
        title: clean(job.title || job.job_title || job.role),
        company: clean(job.company || job.employer || job.source_name || job.company_name) || 'Company not stated',
        area: clean(job.area || job.location || job.town || job.city) || 'South Africa',
        deadline: clean(job.deadline || job.closing_date || job.closingDate) || null,
        sourceLabel: clean(job.sourceLabel || job.source_label || job.source_type || job.sourceType) || 'External job source',
        verificationStatus: normalizeVerificationStatus(job.verificationStatus || job.verification_status || job.status),
        actionLabel: clean(job.actionLabel || job.action_label) || 'Open Job Source',
        applyUrl: clean(job.applyUrl || job.apply_url || job.application_link || job.redirect_url || job.sourceUrl || job.source_url),
        sourceUrl: clean(job.sourceUrl || job.source_url || job.applyUrl || job.apply_url || job.redirect_url),
        sourceType: normalizeSourceType(job.sourceType || job.source_type || job.sourceLabel),
        isSourceCard: Boolean(job.isSourceCard || job.is_source_card),
        salary: clean(job.salary || job.salary_text) || null,
        category: clean(job.category) || null,
        description: clean(job.description) || null,
        createdAt: clean(job.createdAt || job.created_at) || null,
      }))
      .filter((job: LocalVerifiedJob) => job.title && job.applyUrl)
      .filter((job: LocalVerifiedJob) => !isForeignLookingJob(job))
      .filter((job: LocalVerifiedJob) => jobMatchesKeywordIntent(job, keyword))
      .filter((job: LocalVerifiedJob) => jobMatchesRequestedArea(job, requestedArea))
      .sort((a: LocalVerifiedJob, b: LocalVerifiedJob) => {
        const areaDiff = areaRelevanceScore(b, requestedArea) - areaRelevanceScore(a, requestedArea);
        if (areaDiff !== 0) return areaDiff;

        if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
        if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return 1;

        return a.title.localeCompare(b.title);
      });

    return dedupeJobs(normalized);
  };

  const loadAutomaticJobs = async ({
    query,
    area,
    silent = false,
  }: {
    query: string;
    area: string;
    silent?: boolean;
  }) => {
    try {
      const url = `/api/jobs/auto-search?query=${encodeURIComponent(query)}&area=${encodeURIComponent(
        area
      )}&includeExternal=true&includeOfficialSources=true&limit=80`;

      const res = await api.get(url);
      const data = unwrapApiResponse(res);
      const jobs = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
      const normalizedJobs = normalizeApiJobs(jobs, query, area);

      const finalJobs = normalizedJobs.length ? normalizedJobs : OFFICIAL_JOB_SOURCE_CARDS;

      setLocalJobs(finalJobs);

      return finalJobs;
    } catch (error: any) {
      if (!silent) {
        toast({
          title: 'Live search unavailable',
          description: 'Showing official verified source cards for now.',
          variant: 'destructive',
        });
      }

      setLocalJobs(OFFICIAL_JOB_SOURCE_CARDS);
      return OFFICIAL_JOB_SOURCE_CARDS;
    }
  };

  const buildJobsAnswer = (jobs: LocalVerifiedJob[], areaText: string, queryText: string) => {
    const exactJobs = jobs.filter((job) => !job.isSourceCard);
    const sourceCards = jobs.filter((job) => job.isSourceCard);
    const count = exactJobs.length || sourceCards.length;
    const areaLabel = isBroadSearchArea(areaText) ? areaText : `${areaText} • Limpopo`;
    const searchLabel = getSearchDisplayLabel(queryText);

    if (exactJobs.length) {
      return `${count} ${searchLabel} found ${areaLabel}`;
    }

    return `No clear local ${searchLabel} found ${areaLabel}`;
  };

  const handlePickImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    event.currentTarget.value = '';

    if (!files.length) return;

    const remaining = MAX_WORKSPACE_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      toast({
        title: 'Image limit reached',
        description: `You can upload up to ${MAX_WORKSPACE_IMAGES} images.`,
        variant: 'destructive',
      });
      return;
    }

    const filesToUse = files.slice(0, remaining);
    const tooLarge = filesToUse.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);

    if (tooLarge) {
      toast({
        title: 'Image too large',
        description: `Each image must be under ${MAX_IMAGE_SIZE_MB}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const converted = await Promise.all(filesToUse.map(imageFileToWorkspaceImage));
      setSelectedImages((prev) => [...prev, ...converted].slice(0, MAX_WORKSPACE_IMAGES));

      trackUpload({
        uploadType: 'image',
        count: converted.length,
        metadata: {
          feature: 'FaceMeX Career Workspace',
          action: 'workspace_images_selected',
        },
      });
    } catch (error: any) {
      trackError('workspace_image_select_failed', error?.message || 'Could not select image.');

      toast({
        title: 'Image failed',
        description: 'Could not prepare the image. Try another screenshot.',
        variant: 'destructive',
      });
    }
  };

  const removeSelectedImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((image) => image.id !== id));
  };

  const clearSelectedImages = () => {
    setSelectedImages([]);
  };

  const openApplySheet = (context: string) => {
    setApplySheetContext(context);
    setApplySheetOpen(true);
  };

  const showMoreJobsForMessage = (message: ChatMessage) => {
    const total = message.jobs?.length || 0;

    if (!total) return;

    setJobVisibleCounts((prev) => {
      const current = prev[message.id] || JOBS_BATCH_SIZE;
      const next = Math.min(total, current + JOBS_BATCH_SIZE);

      return {
        ...prev,
        [message.id]: next,
      };
    });

    trackButtonClick('workspace_show_more_jobs', undefined, {
      message_id: message.id,
      total_jobs: total,
      batch_size: JOBS_BATCH_SIZE,
    });
  };

  const filterNoExperienceJobsForMessage = async (message: ChatMessage) => {
    const searchArea = message.jobSearchArea || 'Tzaneen';
    const areaLabel = isBroadSearchArea(searchArea) ? searchArea : `${searchArea} • Limpopo`;

    setBusy(true);

    try {
      const liveJobs = await loadAutomaticJobs({
        query: NO_EXPERIENCE_SEARCH_KEYWORD,
        area: searchArea,
        silent: true,
      });

      const liveFiltered = liveJobs
        .filter((job) => !job.isSourceCard)
        .filter((job) => looksLikeNoExperienceJob(job));

      const existingFiltered = (message.jobs || [])
        .filter((job) => !job.isSourceCard)
        .filter((job) => looksLikeNoExperienceJob(job));

      const finalJobs = dedupeJobs(liveFiltered.length ? liveFiltered : existingFiltered);
      const content = finalJobs.length
        ? `${finalJobs.length} no experience jobs found ${areaLabel}`
        : `No clear local no experience jobs found ${areaLabel}`;

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content,
                jobs: finalJobs.length ? finalJobs : undefined,
                jobSearchArea: searchArea,
                jobSearchQuery: NO_EXPERIENCE_SEARCH_KEYWORD,
              }
            : item
        )
      );

      setJobVisibleCounts((prev) => ({
        ...prev,
        [message.id]: JOBS_BATCH_SIZE,
      }));

      toast({
        title: finalJobs.length ? 'Filtered' : 'No beginner jobs found',
        description: finalJobs.length
          ? `Showing no experience jobs around ${searchArea}.`
          : `No clear no experience jobs found around ${searchArea} right now.`,
      });

      trackButtonClick('workspace_filter_no_experience_jobs', undefined, {
        message_id: message.id,
        total_jobs_before: message.jobs?.length || 0,
        total_jobs_after: finalJobs.length,
        area: searchArea,
      });
    } catch (error: any) {
      trackError('workspace_no_experience_filter_failed', error?.message || 'Could not filter no experience jobs.');

      toast({
        title: 'Filter failed',
        description: 'Could not filter no experience jobs right now.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const clearWorkspaceFromScratch = () => {
    setMessages([]);
    setPrompt('');
    setSelectedImages([]);
    setJobVisibleCounts({});
    setFollowUpExpanded(false);
    setEditingMessageId(null);
    setEditText('');
    setApplySheetOpen(false);
    setApplySheetContext('');
    setJobsOpen(false);
    setTrackerOpen(false);
    setClearWorkspaceOpen(false);

    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {
      // ignore
    }

    trackFeatureUse({
      feature: 'FaceMeX Career Workspace',
      action: 'workspace_clear_start_from_scratch',
    });

    toast({
      title: 'Started fresh',
      description: 'Chat and saved tracker items were cleared.',
    });
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const cleanPrompt = clean(overridePrompt || prompt);
    const attachedImages = selectedImages;
    const hasImages = attachedImages.length > 0;

    if (!cleanPrompt && !hasImages) return;

    const finalPrompt =
      cleanPrompt ||
      'Please analyse these images and tell me what they show, what I should check, and what action I should take.';

    const conversationContext = buildConversationContext(messages);
    const shouldUseContext = isShortContextReply(finalPrompt) && conversationContext;

    const intent = detectIntent(finalPrompt, hasImages);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

    const contextualPrompt = shouldUseContext
      ? `Use the recent conversation to understand this short reply and continue from the last assistant question.

Recent conversation:
${conversationContext}

Latest user reply:
${finalPrompt}

Respond based on the previous question/task. Do not ask what the user means if the context is clear.`
      : finalPrompt;

    const aiPromptWithToolDirection = addFaceMeXCareerToolInstruction(contextualPrompt, intent);

    const userMessage: ChatMessage = {
      id: safeId(),
      role: 'user',
      content: finalPrompt,
      createdAt: new Date().toISOString(),
      images: attachedImages,
      intent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setSelectedImages([]);
    setFollowUpExpanded(false);
    setBusy(true);

    trackWorkspacePrompt({
      prompt: finalPrompt,
      intent,
      metadata: {
        image_count: attachedImages.length,
        has_images: hasImages,
        tier: currentTier,
        auto_job_search: intent === 'job-search',
      },
    });

    if (hasImages) {
      trackImageAnalysis(attachedImages.length, finalPrompt, undefined, {
        intent,
        tier: currentTier,
      });
    }

    const shouldAutoSearchJobs =
      intent === 'job-search' &&
      !hasImages &&
      hasJobSearchWords(finalPrompt);

    if (shouldAutoSearchJobs) {
      try {
        const area = extractAreaFromPrompt(finalPrompt);
        const keyword = extractKeywordFromPrompt(finalPrompt);
        const jobs = await loadAutomaticJobs({ query: keyword || 'jobs', area });
        const exactJobs = jobs.filter((job) => !job.isSourceCard);
        const shouldHideSourceCards = isNoExperienceSearchKeyword(keyword || 'jobs');
        const finalJobs = shouldHideSourceCards ? exactJobs : jobs;
        const answer = buildJobsAnswer(finalJobs, area, keyword || 'jobs');

        setMessages((prev) => [
          ...prev,
          {
            id: safeId(),
            role: 'assistant',
            content: answer,
            createdAt: new Date().toISOString(),
            savedCategory: suggestedSavedCategory,
            intent,
            jobs: finalJobs.length ? finalJobs : undefined,
            jobSearchArea: area,
            jobSearchQuery: keyword || 'jobs',
          },
        ]);

        setBusy(false);
        return;
      } catch {
        // continue to AI fallback
      }
    }

    if (!canUseAI) {
      const answer =
        currentTier === 'free'
          ? 'Your free AI limit is finished for today. Try again tomorrow or upgrade when you are ready.'
          : 'Your AI limit is finished for today. Try again tomorrow or upgrade when you are ready.';

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
          intent,
        },
      ]);

      setBusy(false);
      return;
    }

    try {
      const fullSystemInstruction = `${FACE_MEX_ANSWER_STYLE}

User name: ${userDisplayName}
Current automatic job results in FaceMeX:
${JSON.stringify(sortedLocalJobs.slice(0, 40), null, 2)}
`;

      const payload = {
        prompt: aiPromptWithToolDirection,
        message: aiPromptWithToolDirection,
        question: aiPromptWithToolDirection,
        originalPrompt: finalPrompt,
        conversationContext,
        conversationMessages: messages
          .filter((message) => !message.deletedFromChat)
          .slice(-10)
          .map((message) => ({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            intent: message.intent,
          })),
        tier: currentTier,
        creatorPlus,
        intent,
        userName: userDisplayName,
        firstName,
        source: 'facemex-career-workspace',
        responseStyle: 'chatgpt-premium',
        answerStyle: fullSystemInstruction,
        systemInstruction: fullSystemInstruction,
        priorityAreas: PRIORITY_AREAS,
        automaticJobs: sortedLocalJobs.slice(0, 60),
        imageCount: attachedImages.length,
        imageDataUrls: attachedImages.map((image) => image.dataUrl),
        images: attachedImages.map((image) => ({
          name: image.name,
          type: image.type,
          size: image.size,
          dataUrl: image.dataUrl,
        })),
        attachments: attachedImages.map((image) => ({
          type: 'image',
          name: image.name,
          mimeType: image.type,
          size: image.size,
          dataUrl: image.dataUrl,
        })),
      };

      let data: any = null;

      try {
        const res = await api.post('/api/ai/pro/job-assistant', payload);
        data = unwrapApiResponse(res);
      } catch {
        const res = await api.post('/api/ai/workspace', payload);
        data = unwrapApiResponse(res);
      }

      const answer = normalizeAnswerText(data, createUnavailableAnswer(hasImages));

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
          intent,
        },
      ]);

      recordAIUse();

      trackWorkspaceResponse({
        intent,
        image_count: attachedImages.length,
        source: data?.source || 'unknown',
        answer_length: answer.length,
      });
    } catch (error: any) {
      const answer = createUnavailableAnswer(hasImages);

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
          intent,
        },
      ]);

      trackError('workspace_ai_failed', error?.message || 'AI failed', {
        intent,
        image_count: attachedImages.length,
      });
    } finally {
      setBusy(false);
    }
  };

  const quickAsk = (text: string) => {
    if (text === BUILD_CV_QUICK_ACTION) {
      trackButtonClick('workspace_quick_open_cv_builder', undefined, {
        feature: 'FaceMeX Career Workspace',
      });

      toast({
        title: 'Opening AI CV Builder',
        description: 'Create or improve your CV inside FaceMeX.',
      });

      navigate(AI_CV_BUILDER_PATH);
      return;
    }

    if (text === COVER_LETTER_QUICK_ACTION) {
      trackButtonClick('workspace_quick_open_cover_letter_ai', undefined, {
        feature: 'FaceMeX Career Workspace',
      });

      toast({
        title: 'Opening Cover Letter AI',
        description: 'Create a professional cover letter inside FaceMeX.',
      });

      navigate(AI_COVER_LETTER_PATH);
      return;
    }

    if (text === TRACK_APPLICATIONS_QUICK_ACTION) {
      trackButtonClick('workspace_quick_open_job_tracker', undefined, {
        feature: 'FaceMeX Career Workspace',
      });

      setTrackerOpen(true);

      toast({
        title: 'Job Tracker opened',
        description: 'Track saved jobs, applied jobs, interviews, rejected jobs, and offers.',
      });

      return;
    }

    trackButtonClick('workspace_quick_prompt', undefined, {
      prompt_preview: text.slice(0, 80),
    });

    sendPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(normalizeUssdCodes(text));

      trackFeatureUse({
        feature: 'FaceMeX Career Workspace',
        action: 'workspace_copy_message',
      });

      toast({ title: 'Copied', description: 'Text copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
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

    trackFeatureUse({
      feature: 'FaceMeX Career Workspace',
      action: 'workspace_saved_answer',
      metadata: { category },
    });

    toast({ title: `${savedCategoryLabels[category]} saved`, description: 'Saved in Job Tracker.' });
  };

  const saveLocalJob = (job: LocalVerifiedJob) => {
    const content = `**${job.title}**

Company/source: ${job.company}
Area: ${job.area}
Category: ${job.category || 'Not stated'}
Source: ${job.sourceLabel}
Verification: ${verificationStatusLabel(job.verificationStatus)}
Closing date: ${job.deadline || 'Not stated'}
Apply link: ${job.applyUrl}`;

    setMessages((prev) => [
      ...prev,
      {
        id: safeId(),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        saved: true,
        savedCategory: 'career_plan',
        intent: 'job-search',
        jobs: [job],
      },
    ]);

    toast({ title: 'Saved', description: 'Job saved in Job Tracker.' });
  };

  const removeFromSaved = (id: string) => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (message.id !== id) return [message];
        if (message.deletedFromChat) return [];

        return [{ ...message, saved: false, savedCategory: undefined }];
      })
    );

    toast({ title: 'Removed', description: 'Item removed from Job Tracker.' });
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, pinned: !message.pinned } : message))
    );
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (message.id !== id) return [message];

        if (message.saved) return [{ ...message, deletedFromChat: true }];

        return [];
      })
    );

    toast({
      title: 'Deleted',
      description: 'Removed from chat. Saved copy stays in Job Tracker.',
    });
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
  };

  const saveEdit = () => {
    setMessages((prev) =>
      prev.map((message) => (message.id === editingMessageId ? { ...message, content: editText } : message))
    );

    setEditingMessageId(null);
    setEditText('');
  };

  const researchMessage = (message: ChatMessage) => {
    setPrompt(`Research this deeper and give me a stronger practical answer:\n\n${message.content}`);
    setFollowUpExpanded(true);
  };

  const clearSavedItems = () => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (!message.saved) return [message];
        if (message.deletedFromChat) return [];

        return [{ ...message, saved: false, savedCategory: undefined }];
      })
    );

    toast({ title: 'Job Tracker cleared', description: 'Your saved list is now empty.' });
  };

  const handleGeneratedLinkClick = (url: string, label?: string) => {
    trackLinkClick(url, label || 'workspace_generated_link', undefined, {
      feature: 'FaceMeX Career Workspace',
    });
  };

  const openOfficialApplyPage = (job: LocalVerifiedJob) => {
    if (!job.applyUrl) {
      toast({
        title: 'No apply link',
        description: 'This job does not have an application link yet.',
        variant: 'destructive',
      });
      return;
    }

    trackLinkClick(job.applyUrl, job.title, undefined, {
      feature: 'FaceMeX Automatic Jobs',
      area: job.area,
      verification_status: job.verificationStatus,
    });

    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  };

  const openCvBuilder = () => {
    trackButtonClick('workspace_open_cv_builder', undefined, {
      feature: 'FaceMeX Career Workspace',
    });

    navigate(AI_CV_BUILDER_PATH);
  };

  const openCoverLetterBuilder = () => {
    trackButtonClick('workspace_open_cover_letter_builder', undefined, {
      feature: 'FaceMeX Career Workspace',
    });

    navigate(AI_COVER_LETTER_PATH);
  };

  const renderMessageImages = (images?: WorkspaceImage[]) => {
    if (!images?.length) return null;

    return (
      <div className="mb-3 grid grid-cols-2 gap-2">
        {images.slice(0, 4).map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-2xl border border-black/5 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]"
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className="h-28 w-full object-cover sm:h-40"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderAssistantJobCards = (message: ChatMessage) => {
    if (!message.jobs?.length) return null;

    const visibleLimit = jobVisibleCounts[message.id] || JOBS_BATCH_SIZE;
    const jobsToShow = message.jobs.slice(0, visibleLimit);
    const remainingJobs = Math.max(0, message.jobs.length - jobsToShow.length);

    const searchArea = message.jobSearchArea || 'Tzaneen';
    const searchQuery = message.jobSearchQuery || 'jobs';
    const areaLabel = isBroadSearchArea(searchArea) ? searchArea : `${searchArea} • Limpopo`;
    const searchLabel = getSearchDisplayLabel(searchQuery);
    const totalLabel = `${message.jobs.length} ${searchLabel} found ${areaLabel}`;

    return (
      <div className="space-y-2.5">
        <div className="sticky top-0 z-10 rounded-2xl border border-black/5 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#171717]/95">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-slate-600 dark:text-white/60" />
              <p className="truncate text-[13px] font-semibold text-slate-950 dark:text-white">
                {totalLabel}
              </p>
            </div>

            {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>

        {jobsToShow.map((job, index) => (
          <CompactAssistantJobCard
            key={`${message.id}-${job.id}-${index}`}
            job={job}
            onOpen={() => openOfficialApplyPage(job)}
            onVerify={() =>
              sendPrompt(
                `Verify this job/company before I apply:\n\nJob: ${job.title}\nCompany: ${job.company}\nArea: ${job.area}\nSource: ${job.sourceLabel}\nApply link: ${job.applyUrl}\n\nTell me if it looks safe, what red flags to check, and what I must do before sending my CV.`
              )
            }
            onSave={() => saveLocalJob(job)}
          />
        ))}

        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/[0.06]">
          {remainingJobs > 0 ? (
            <button
              type="button"
              onClick={() => showMoreJobsForMessage(message)}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70"
            >
              More jobs ({remainingJobs})
            </button>
          ) : (
            <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-400 shadow-sm dark:bg-white/[0.08] dark:text-white/40">
              All jobs shown
            </span>
          )}

          <button
            type="button"
            onClick={() => filterNoExperienceJobsForMessage(message)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70"
          >
            No experience
          </button>

          <button
            type="button"
            onClick={() =>
              openApplySheet(
                `Help me apply for one of these jobs around ${searchArea}. Search type: ${getSearchDisplayLabel(searchQuery)}.`
              )
            }
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70"
          >
            Help me apply
          </button>

          <button
            type="button"
            onClick={() => sendPrompt('Teach me how to check if a job advert is fake before I apply.')}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70"
          >
            Check fake job
          </button>
        </div>

        {remainingJobs === 0 && message.jobs.length > JOBS_BATCH_SIZE && (
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
            You have reached the end of these results. Try a specific search like “security job in Letsitele” or “driver job in Tzaneen”.
          </div>
        )}
      </div>
    );
  };

  const renderJobSummaryCard = (message: ChatMessage, previousUserText = '') => {
    const combined = `${previousUserText}\n${message.content}`;

    if (message.jobs?.length) return null;
    if (!shouldShowApplyActions(message.content, previousUserText)) return null;

    if (!/(verdict|needs verification|verified|avoid|job|vacancy|apply|cv|email|deadline|closing date|cashier|packer|clerk|security|teacher|general worker)/i.test(combined)) {
      return null;
    }

    const title = extractJobTitle(combined);
    const company = extractCompany(combined);
    const email = extractEmail(combined);
    const deadline = extractDeadline(combined);
    const needsVerification = /needs verification|not enough|unclear|verify/i.test(combined);

    return (
      <div className="mb-4 rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex gap-3">
          {message.images?.[0] ? (
            <img
              src={message.images[0].dataUrl}
              alt="Job screenshot"
              className="h-24 w-24 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
              <Briefcase className="h-7 w-7 text-slate-500" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight">{title}</h3>

            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-white/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{company}</span>
              </div>

              {email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{email}</span>
                </div>
              )}

              {deadline && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{deadline}</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                {needsVerification ? 'Needs verification' : 'Job opportunity'}
              </span>
            </div>
          </div>

          <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" />
        </div>
      </div>
    );
  };

  const assistantSmartActions = (message: ChatMessage, previousUserText = '') => {
    if (message.role !== 'assistant') return null;
    if (message.jobs?.length) return null;

    const canApply = shouldShowApplyActions(message.content, previousUserText);
    const isGovernment = shouldShowGovernmentSourceAction(message.content, previousUserText);
    const showCvButtons = shouldShowCvBuilderActions(message.content, previousUserText);

    if (isGovernment) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10">
          <a
            href="https://www.labour.gov.za/online-tools"
            target="_blank"
            rel="noreferrer"
            onClick={() => trackLinkClick('https://www.labour.gov.za/online-tools', 'Official government source')}
          >
            <Button size="sm" variant="outline" className="h-9 w-full rounded-xl text-xs">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Official Source
            </Button>
          </a>

          <Button
            size="sm"
            variant="outline"
            onClick={() => copyText(message.content)}
            className="h-9 rounded-xl text-xs"
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Answer
          </Button>
        </div>
      );
    }

    if (showCvButtons) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10">
          <Button
            size="sm"
            variant="outline"
            onClick={openCvBuilder}
            className="h-10 rounded-xl text-xs"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            AI CV Builder
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={openCoverLetterBuilder}
            className="h-10 rounded-xl text-xs"
          >
            <Mail className="mr-2 h-3.5 w-3.5" />
            Cover Letter AI
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => copyText(message.content)}
            className="h-10 rounded-xl text-xs"
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Answer
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMessageAs(message.id, 'cv_advice')}
            className="h-10 rounded-xl text-xs"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save Tips
          </Button>
        </div>
      );
    }

    if (!canApply) return null;

    return (
      <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/10">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openApplySheet(message.content)}
          className="h-10 w-full rounded-xl text-xs"
        >
          <Send className="mr-2 h-3.5 w-3.5" />
          Help me apply
        </Button>
      </div>
    );
  };

  const messageActions = (message: ChatMessage) => (
    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-black/5 pt-2 opacity-80 dark:border-white/10">
      <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2">
        <Copy className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2">
        <Edit3 className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2">
        {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>

      <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2">
        <Search className="h-3.5 w-3.5" />
      </Button>

      {message.role === 'assistant' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => saveMessageAs(message.id, message.savedCategory || 'research')}
          className="h-8 rounded-full px-2"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => deleteMessage(message.id)}
        className="ml-auto h-8 rounded-full px-2 text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen max-w-full flex-col overflow-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0b0b0c] dark:text-white">
      <style>{`
        @keyframes fmSoftFloatIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fmTreasureRingRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fmTreasureBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.28;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.42;
          }
        }

        @keyframes fmIconRealGesture {
          0% {
            transform: perspective(760px) rotateY(-14deg) rotateX(3deg) rotateZ(-1.5deg) scale(0.99);
          }
          28% {
            transform: perspective(760px) rotateY(13deg) rotateX(-2deg) rotateZ(1.2deg) scale(1.015);
          }
          55% {
            transform: perspective(760px) rotateY(-6deg) rotateX(2deg) rotateZ(-0.8deg) scale(1);
          }
          82% {
            transform: perspective(760px) rotateY(15deg) rotateX(-2deg) rotateZ(1.4deg) scale(1.012);
          }
          100% {
            transform: perspective(760px) rotateY(-14deg) rotateX(3deg) rotateZ(-1.5deg) scale(0.99);
          }
        }

        @keyframes fmCaretBlink {
          0%, 48% {
            opacity: 1;
          }
          49%, 100% {
            opacity: 0;
          }
        }

        .fm-treasure-wrap {
          position: relative;
          display: flex;
          height: 100px;
          width: 100px;
          align-items: center;
          justify-content: center;
        }

        .fm-treasure-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background:
            conic-gradient(
              from 90deg,
              rgba(15, 23, 42, 0),
              rgba(15, 23, 42, 0.07),
              rgba(148, 163, 184, 0.2),
              rgba(15, 23, 42, 0.035),
              rgba(15, 23, 42, 0)
            );
          animation: fmTreasureRingRotate 24s linear infinite;
        }

        .fm-treasure-shadow {
          position: absolute;
          inset: 13px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.07);
          filter: blur(18px);
          animation: fmTreasureBreathe 7s ease-in-out infinite;
        }

        .fm-treasure-orb {
          position: relative;
          z-index: 1;
          display: flex;
          height: 78px;
          width: 78px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(145deg, #ffffff, #f8fafc);
          box-shadow:
            0 20px 46px rgba(15, 23, 42, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            inset 0 -1px 0 rgba(15, 23, 42, 0.06);
        }

        .fm-flow-image {
          object-fit: contain;
          transform-origin: 50% 50%;
          animation: fmIconRealGesture 8.5s ease-in-out infinite;
          filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.18));
          will-change: transform;
          backface-visibility: hidden;
        }

        .fm-flow-fallback {
          border-radius: 24px;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(255,255,255,0) 34%),
            linear-gradient(145deg, #111827, #020617);
        }

        .fm-main-typing-text {
          max-width: 19ch;
          text-align: center;
          font-size: 23px;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .fm-type-caret {
          display: inline-block;
          height: 0.85em;
          width: 2px;
          margin-left: 3px;
          transform: translateY(2px);
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.4);
          animation: fmCaretBlink 1.15s step-end infinite;
        }

        .fm-quick-pill {
          opacity: 0;
          animation: fmSoftFloatIn 360ms ease forwards;
        }

        .dark .fm-treasure-ring {
          background:
            conic-gradient(
              from 90deg,
              rgba(255, 255, 255, 0),
              rgba(255, 255, 255, 0.11),
              rgba(148, 163, 184, 0.18),
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0)
            );
        }

        .dark .fm-treasure-shadow {
          background: rgba(255, 255, 255, 0.07);
        }

        .dark .fm-treasure-orb {
          background: linear-gradient(145deg, #ffffff, #e5e7eb);
          box-shadow:
            0 20px 46px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            inset 0 -1px 0 rgba(15, 23, 42, 0.08);
        }

        .dark .fm-type-caret {
          background: rgba(255, 255, 255, 0.52);
        }

        @media (min-width: 640px) {
          .fm-main-typing-text {
            max-width: 24ch;
            font-size: 29px;
          }
        }

        @media (max-width: 420px) {
          .fm-main-typing-text {
            max-width: 18ch;
            font-size: 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fm-treasure-ring,
          .fm-treasure-shadow,
          .fm-flow-image,
          .fm-quick-pill,
          .fm-type-caret {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white/95 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:h-16 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold sm:text-base">FaceMeX Job AI</h1>

              <Badge className="hidden rounded-full border border-black/5 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 shadow-none hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/50 sm:inline-flex">
                {creatorPlus && <Crown className="mr-1 h-3 w-3" />}
                {usageLabel}
              </Badge>
            </div>

            <p className="truncate text-[11px] text-slate-500 dark:text-white/45">
              Ask anything. Jobs, CVs, interviews, life, business
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {chatMessages.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setClearWorkspaceOpen(true)}
              className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              aria-label="Clear chat and start from scratch"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setJobsOpen(true)}
            className="h-9 w-9 rounded-full"
            aria-label="Automatic jobs"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTrackerOpen(true)}
            className="h-9 w-9 rounded-full"
            aria-label="Job Tracker"
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-4 sm:py-4">
        <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.045] sm:rounded-[30px]">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {chatMessages.length === 0 && !busy && (
                <WelcomeHero firstName={firstName} onQuickAsk={quickAsk} />
              )}

              {chatMessages.map((message, index) => {
                const previousUserText =
                  chatMessages
                    .slice(0, index)
                    .reverse()
                    .find((item) => item.role === 'user')?.content || '';

                const isJobResultsMessage = message.role === 'assistant' && Boolean(message.jobs?.length);

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm sm:rounded-[24px] ${
                        message.role === 'user'
                          ? 'max-w-[88%] bg-slate-950 text-white dark:bg-white dark:text-black sm:max-w-[82%]'
                          : isJobResultsMessage
                            ? 'w-full max-w-full bg-transparent px-0 py-0 shadow-none'
                            : 'max-w-[96%] border border-black/5 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white sm:max-w-[88%]'
                      }`}
                    >
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[120px] rounded-2xl bg-white dark:bg-black/20"
                          />

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
                        <div className={message.role === 'assistant' && !isJobResultsMessage ? 'max-h-[58vh] overflow-y-auto pr-1' : ''}>
                          {renderMessageImages(message.images)}

                          {message.role === 'assistant' && renderJobSummaryCard(message, previousUserText)}

                          {message.role === 'assistant' ? (
                            <>
                              {isJobResultsMessage ? (
                                renderAssistantJobCards(message)
                              ) : (
                                <ChatGPTStyleText text={message.content} onLinkClick={handleGeneratedLinkClick} />
                              )}
                            </>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{normalizeUssdCodes(message.content)}</div>
                          )}
                        </div>
                      )}

                      {!isJobResultsMessage && editingMessageId !== message.id && assistantSmartActions(message, previousUserText)}
                      {!isJobResultsMessage && editingMessageId !== message.id && messageActions(message)}
                    </div>
                  </div>
                );
              })}

              {busy && (
                <div className="flex items-start">
                  <div className="rounded-[22px] border border-black/5 bg-slate-50 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-black/5 bg-white/95 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:p-4">
            <div className="mx-auto w-full max-w-3xl">
              {selectedImages.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-2xl bg-black">
                      <img src={image.dataUrl} alt={image.name} className="h-16 w-full object-cover sm:h-20" />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {hasJobResultsOnScreen && !followUpExpanded && selectedImages.length === 0 && !prompt.trim() ? (
                <div className="flex items-center gap-2 rounded-[22px] border border-black/10 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#171717]">
                  <button
                    type="button"
                    onClick={() => setFollowUpExpanded(true)}
                    className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-slate-100 px-3 text-left text-sm font-medium text-slate-500 dark:bg-white/[0.08] dark:text-white/50"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="truncate">Ask a follow-up...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white"
                    aria-label="Upload image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <Button
                    onClick={() => sendPrompt()}
                    disabled
                    className="h-11 w-11 shrink-0 rounded-2xl bg-slate-950 p-0 text-white disabled:opacity-40 dark:bg-white dark:text-black"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePickImages}
                  />
                </div>
              ) : (
                <div className="rounded-[22px] border border-black/10 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#171717] sm:rounded-[24px]">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onFocus={() => setFollowUpExpanded(true)}
                    placeholder={
                      hasJobResultsOnScreen
                        ? 'Ask a follow-up...'
                        : 'Search jobs, check advert, or ask CV help...'
                    }
                    className={`resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      hasJobResultsOnScreen
                        ? inputHasContent || followUpExpanded
                          ? 'max-h-24 min-h-[46px]'
                          : 'h-10 min-h-[40px] max-h-[40px] overflow-hidden'
                        : inputHasContent
                          ? 'max-h-28 min-h-[48px] sm:max-h-32 sm:min-h-[52px]'
                          : 'h-10 min-h-[40px] max-h-[40px] overflow-hidden'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendPrompt();
                      }
                    }}
                  />

                  <div className="flex items-center justify-between gap-2 border-t border-black/5 px-1 pt-2 dark:border-white/10">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white"
                        aria-label="Upload image"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </button>

                      <div className="min-w-0 text-[11px] text-slate-500 dark:text-white/45">
                        <div className="flex min-w-0 items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Helpful answers. Verify jobs before applying.</span>
                        </div>

                        {selectedImages.length > 0 && (
                          <button type="button" onClick={clearSelectedImages} className="font-semibold text-red-500">
                            Clear images
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasJobResultsOnScreen && followUpExpanded && !prompt.trim() && selectedImages.length === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setFollowUpExpanded(false)}
                          className="h-10 w-10 shrink-0 rounded-full p-0"
                          aria-label="Collapse input"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        onClick={() => sendPrompt()}
                        disabled={busy || (!prompt.trim() && selectedImages.length === 0)}
                        className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        aria-label="Send"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePickImages}
                  />
                </div>
              )}

              {remainingAIUses !== null && (
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  AI uses left today: {remainingAIUses}
                </div>
              )}
            </div>
          </footer>
        </section>
      </main>

      {clearWorkspaceOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-end bg-black/40 backdrop-blur-sm"
          onClick={() => setClearWorkspaceOpen(false)}
        >
          <div
            className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl dark:bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                  Delete and start from scratch?
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/55">
                  This will clear the chat, saved tracker items, selected images, and local chat history on this device.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClearWorkspaceOpen(false)}
                className="h-11 rounded-2xl"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={clearWorkspaceFromScratch}
                className="h-11 rounded-2xl bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {applySheetOpen && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/40 backdrop-blur-sm" onClick={() => setApplySheetOpen(false)}>
          <div
            className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl dark:bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Help me apply</h2>
                <p className="truncate text-xs text-slate-500 dark:text-white/50">
                  Choose what you need now.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setApplySheetOpen(false)}
                className="h-10 w-10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {applySheetTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => {
                      setApplySheetOpen(false);

                      if (tool.action === 'open_cv_builder') {
                        toast({
                          title: 'Opening AI CV Builder',
                          description: 'Create or improve your CV inside FaceMeX.',
                        });

                        openCvBuilder();
                        return;
                      }

                      if (tool.action === 'open_cover_letter_builder') {
                        toast({
                          title: 'Opening Cover Letter AI',
                          description: 'Create a professional cover letter inside FaceMeX.',
                        });

                        openCoverLetterBuilder();
                        return;
                      }

                      sendPrompt(`${tool.prompt}\n\nContext:\n${applySheetContext}`);
                    }}
                    className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-left transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06]"
                  >
                    <Icon className="mb-2 h-5 w-5 text-slate-700 dark:text-white/70" />
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{tool.label}</p>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[12px] font-medium leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Safety rule: never pay money to get a job. Verify the company, email domain, official advert, and source before sending documents.
            </p>
          </div>
        </div>
      )}

      {trackerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setTrackerOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
              <div>
                <h2 className="text-base font-semibold">Job Tracker</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">
                  Saved jobs, applied, interviews, rejected, offers
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setTrackerOpen(false)} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]">
                  <Save className="h-5 w-5 text-blue-500" />
                  <p className="mt-2 text-[11px] text-slate-500">Saved</p>
                  <p className="text-xl font-semibold">{savedMessages.length}</p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="mt-2 text-[11px] text-slate-500">Verified</p>
                  <p className="text-xl font-semibold">
                    {sortedLocalJobs.filter((job) => job.verificationStatus === 'verified').length}
                  </p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]">
                  <Users className="h-5 w-5 text-purple-500" />
                  <p className="mt-2 text-[11px] text-slate-500">Interviews</p>
                  <p className="text-xl font-semibold">0</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ['Save Jobs', savedMessages.length],
                  ['Applied Jobs', 0],
                  ['Interview Tracker', 0],
                  ['Rejected Jobs', 0],
                  ['Offer Received', 0],
                ].map(([label, count]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <p className="text-xs text-slate-500 dark:text-white/50">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{count}</p>
                  </div>
                ))}
              </div>

              {closingSoonJob && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
                      <Clock className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-300">Closing soon</p>
                      <h3 className="truncate font-semibold">{closingSoonJob.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-white/50">
                        {getDeadlineInfo(closingSoonJob.deadline).label}
                      </p>
                    </div>

                    <Button size="sm" onClick={() => openOfficialApplyPage(closingSoonJob)} className="rounded-xl">
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <h3 className="text-base font-semibold">Your pipeline</h3>

                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {sortedLocalJobs.slice(0, 5).map((job) => {
                    const deadlineInfo = getDeadlineInfo(job.deadline);

                    return (
                      <div key={job.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                          {job.verificationStatus === 'verified' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Save className="h-4 w-4 text-blue-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{job.title}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-white/50">{job.company}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-white/50">{job.deadline || 'Open'}</p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                              deadlineInfo.urgent
                                ? 'bg-orange-50 text-orange-600'
                                : verificationStatusStyles(job.verificationStatus)
                            }`}
                          >
                            {deadlineInfo.urgent ? deadlineInfo.label : verificationStatusLabel(job.verificationStatus)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <h3 className="text-base font-semibold">Daily tasks</h3>

                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {[
                    ['Search today’s new jobs', Search],
                    ['Send follow-up email', Mail],
                    ['Tailor CV for saved jobs', FileText],
                    ['Review interview questions', Users],
                  ].map(([label, Icon]: any) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setTrackerOpen(false);
                        sendPrompt(String(label));
                      }}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <Icon className="h-4 w-4 text-blue-500" />
                      <span className="flex-1 text-sm">{label}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={savedFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setSavedFilter('all')}
                    className="h-9 rounded-full px-4 text-xs"
                  >
                    All
                  </Button>

                  {(['career_plan', 'cv_advice', 'application_message', 'research'] as SavedCategory[]).map(
                    (category) => (
                      <Button
                        key={category}
                        variant={savedFilter === category ? 'default' : 'outline'}
                        onClick={() => setSavedFilter(category)}
                        className="h-9 rounded-full px-4 text-xs"
                      >
                        {savedCategoryLabels[category]} ({savedStats[category]})
                      </Button>
                    )
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {visibleSavedMessages.length === 0 ? (
                    <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50">
                      No saved items yet.
                    </div>
                  ) : (
                    visibleSavedMessages.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>

                          <button type="button" onClick={() => setTrackerOpen(false)} className="min-w-0 flex-1 text-left">
                            <div className="line-clamp-1 text-sm font-semibold">
                              {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                            </div>

                            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                              {normalizeUssdCodes(item.content)}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromSaved(item.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                            aria-label="Delete saved item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <MoreVertical className="hidden h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Button
                variant="ghost"
                onClick={clearSavedItems}
                className="w-full rounded-2xl text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear tracker
              </Button>
            </div>
          </div>
        </div>
      )}

      {jobsOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setJobsOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
              <div>
                <h2 className="text-base font-semibold">Automatic Job Search</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">
                  Search by user intent
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setJobsOpen(false)} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['Tzaneen', 'Retail', 'Farm', 'Admin', 'Security', 'Driver', 'Teacher', 'Polokwane', 'Phalaborwa', 'Hoedspruit'].map(
                  (item) => (
                    <Button
                      key={item}
                      variant="outline"
                      onClick={() => {
                        const area = PRIORITY_AREAS.includes(item) ? item : 'Tzaneen';
                        const queryMap: Record<string, string> = {
                          Retail: 'cashier retail packer store assistant clerk',
                          Farm: 'farm agriculture packhouse packing',
                          Admin: 'admin clerk office',
                          Security: 'security',
                          Driver: 'driver',
                          Teacher: 'teacher creche school daycare',
                        };
                        const query = PRIORITY_AREAS.includes(item) ? 'jobs' : queryMap[item] || item;
                        loadAutomaticJobs({ query, area });
                      }}
                      className="h-9 shrink-0 rounded-full px-4 text-xs"
                    >
                      {item}
                    </Button>
                  )
                )}
              </div>

              <div className="mt-4 space-y-3">
                {sortedLocalJobs.map((job) => {
                  const deadlineInfo = getDeadlineInfo(job.deadline);

                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                          {job.verificationStatus === 'verified' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : job.verificationStatus === 'avoid' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : (
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold">{job.title}</h4>
                              <p className="truncate text-xs text-slate-500 dark:text-white/50">{job.company}</p>
                            </div>

                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </div>

                          <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-white/50">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{job.area}</span>
                            </div>

                            <div
                              className={`flex items-center gap-2 ${
                                deadlineInfo.urgent ? 'text-orange-600' : 'text-slate-500 dark:text-white/50'
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>{deadlineInfo.label}</span>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              {job.sourceLabel}
                            </span>

                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-medium ${verificationStatusStyles(
                                job.verificationStatus
                              )}`}
                            >
                              {verificationStatusLabel(job.verificationStatus)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOfficialApplyPage(job)}
                              disabled={job.verificationStatus === 'avoid' || deadlineInfo.expired}
                              className="h-8 rounded-xl text-xs"
                            >
                              {job.isSourceCard ? (
                                <Globe2 className="mr-1.5 h-3.5 w-3.5" />
                              ) : job.verificationStatus === 'needs_verification' ? (
                                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                              ) : (
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {deadlineInfo.expired ? 'Closed' : job.actionLabel}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveLocalJob(job)}
                              className="h-8 rounded-xl text-xs"
                            >
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                <strong className="block text-sm">FaceMeX rule</strong>
                Search according to the user’s intent. Generic job search shows all jobs. Security search shows security jobs. Cashier search shows retail jobs. No experience filters beginner-friendly jobs only. External jobs stay Needs verification.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
