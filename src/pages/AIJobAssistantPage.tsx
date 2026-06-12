import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
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
  Sparkles,
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

const AI_CV_BUILDER_PATH = '/ai-cv-builder';
const AI_COVER_LETTER_PATH = '/ai-cover-letter';

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

Your main rule:
- Answer any normal helpful question clearly and calmly.
- Only search jobs when the user clearly asks for jobs, vacancies, hiring, work, learnerships, internships, employment, or a specific job role.
- Do not treat location words like Tzaneen, Polokwane, Letsitele, Limpopo, or South Africa as job-search intent by themselves.
- If the user asks about business ideas, life advice, app improvement, transport, money planning, studies, messages, or strategy, answer normally without showing job cards.
- If the user asks for CV help, cover letter help, application message, or interview help, answer with career guidance.
- If the user asks for jobs, show job results and job cards.
- If the user asks a general question after job results, answer the new question directly.

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
    label: 'Build CV',
    prompt:
      'Help me improve my CV for job applications. Tell me what to fix and what to write.',
  },
  {
    label: 'Cover letter',
    prompt:
      'Help me write a strong cover letter for a job application.',
  },
  {
    label: 'Check fake job',
    prompt: 'Help me check if this job or opportunity looks fake or risky.',
  },
  {
    label: 'Interview prep',
    prompt: 'Help me prepare for an interview. Give me questions and strong answers.',
  },
  {
    label: 'Ask anything',
    prompt:
      'I want general advice. Help me think clearly and give me a practical answer.',
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
  return /(job|jobs|vacancy|vacancies|hiring|learnership|internship|employment|apply for work|looking for work|looking for a job|work opportunity|career opportunity|available posts|post available|position available|cashier|packer|clerk|security|general worker|driver|admin job|cleaner job|retail job|store assistant|teacher job|creche job|crèche job)/i.test(
    text
  );
}

function hasGeneralHelpWords(text: string) {
  return /(business|start|starting|side hustle|make money|improve my life|life advice|everyday life|strategy|business idea|ideas|how can i improve|what should i do|teach me|explain|learn|study|app|website|users|customers|marketing|transport|delivery|courier|logistics|budget|save money|plan my day|motivation|discipline|relationship advice|school|college|skills|productivity)/i.test(
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

  if (intent === 'email-application' || intent === 'message-application') {
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
  const t = stripAreasFromText(text);

  if (/(security|guard|armed response|protection)/i.test(t)) {
    return 'security';
  }

  if (/(cashier|packer|retail|store assistant|shop assistant|shoprite|checkers|usave|clerk)/i.test(t)) {
    return 'cashier retail packer store assistant clerk';
  }

  if (/(driver|code 10|code 14|pdp|delivery|truck|side tipper)/i.test(t)) {
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

  const simplified = t
    .replace(/i am looking for/gi, '')
    .replace(/i'm looking for/gi, '')
    .replace(/im looking for/gi, '')
    .replace(/looking for/gi, '')
    .replace(/show me/gi, '')
    .replace(/search/gi, '')
    .replace(/available/gi, '')
    .replace(/all/gi, '')
    .replace(/jobs?/gi, '')
    .replace(/vacanc(y|ies)/gi, '')
    .replace(/work/gi, '')
    .replace(/\bin\b/gi, '')
    .replace(/\bnear\b/gi, '')
    .replace(/\bme\b/gi, '')
    .replace(/\ba\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!simplified || simplified.length < 3) return 'jobs';

  return simplified;
}

function getSearchDisplayLabel(keyword: string) {
  const q = clean(keyword).toLowerCase();

  if (!q || q === 'jobs' || q === 'job') return 'all jobs';
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

function jobMatchesKeywordIntent(job: LocalVerifiedJob, keyword: string) {
  const q = clean(keyword).toLowerCase();
  const text = jobText(job);

  if (!q || q === 'jobs' || q === 'job') return true;

  if (q.includes('security')) return /(security|guard|armed|protection|response)/i.test(text);
  if (q.includes('driver')) return /(driver|code 10|code 14|pdp|truck|delivery|courier|transport|fleet|vehicle)/i.test(text);
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
  return /(job|jobs|vacancy|vacancies|apply|application|cv|resume|employer|company|interview|hiring|learnership|internship|position|closing date|salary|source|verification status|public advert|verified employer|cashier|packer|clerk|security|teacher|creche|general worker|driver|admin)/i.test(
    content
  );
}

function isCvRelatedText(content: string) {
  return /(cv|resume|cover letter|application letter|profile summary|ats|career profile|work experience|skills section|employment history)/i.test(
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

function WelcomeHero({
  firstName,
  onQuickAsk,
}: {
  firstName: string;
  onQuickAsk: (text: string) => void;
}) {
  const displayName = firstName && firstName !== 'there' ? firstName : 'there';

  const animatedLines = [
    "Let's start with focus.",
    'Which job are we hunting today?',
    'Tomorrow starts today.',
    `Ask me anything, ${displayName}.`,
  ];

  return (
    <div className="mx-auto flex min-h-[48vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="fm-treasure-wrap">
        <span className="fm-treasure-ring" />
        <span className="fm-treasure-soft-glow" />

        <div className="fm-treasure-orb">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-white/35">
        FaceMeX Career Workspace
      </p>

      <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
        Hi {displayName}, how can I help you today?
      </h2>

      <div className="fm-line-stage mt-4 h-9 w-full max-w-[360px] overflow-hidden rounded-full border border-black/5 bg-slate-50/80 px-4 text-sm font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white/55">
        <div className="fm-line-track">
          {animatedLines.map((line) => (
            <span key={line} className="fm-line-item">
              {line}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-white/50">
        Search jobs, fix your CV, prepare for interviews, check screenshots, or ask anything that helps you move forward.
      </p>

      <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        {quickPrompts.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickAsk(item.prompt)}
            className="fm-quick-card group rounded-2xl border border-black/5 bg-white px-3 py-3 text-left text-xs font-medium text-slate-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.1]"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <span className="block truncate">{item.label}</span>
            <span className="mt-1 block h-1 w-8 rounded-full bg-slate-200 transition group-hover:w-10 dark:bg-white/15" />
          </button>
        ))}
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
      const rawMessages = localStorage.getItem('facemex_opportunities_workspace_messages');
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
      localStorage.setItem('facemex_opportunities_workspace_messages', JSON.stringify(messages));
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

  const normalizeApiJobs = (jobs: any[], keyword = 'jobs'): LocalVerifiedJob[] => {
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
      .filter((job: LocalVerifiedJob) => jobMatchesKeywordIntent(job, keyword));

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
      const normalizedJobs = normalizeApiJobs(jobs, query);

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
    const searchLabel = getSearchDisplayLabel(queryText);

    if (exactJobs.length) {
      return `**${searchLabel} found for ${areaText}**

I found ${count} result${count === 1 ? '' : 's'}. Open the job source to apply.

External jobs are marked **Needs verification**, so check the company and never pay money to apply.`;
    }

    return `**Verified official job sources for ${areaText}**

I could not load exact ${searchLabel} posts for ${areaText} right now, so I’m showing official verified source pages where you can apply safely.

Open the source page, search your area, then use **Apply Assistant** to prepare your CV, email, and follow-up.`;
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

    const contextualPrompt = shouldUseContext
      ? `Use the recent conversation to understand this short reply and continue from the last assistant question.

Recent conversation:
${conversationContext}

Latest user reply:
${finalPrompt}

Respond based on the previous question/task. Do not ask what the user means if the context is clear.`
      : finalPrompt;

    const intent = detectIntent(finalPrompt, hasImages);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

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
        const answer = buildJobsAnswer(jobs, area, keyword || 'jobs');

        setMessages((prev) => [
          ...prev,
          {
            id: safeId(),
            role: 'assistant',
            content: answer,
            createdAt: new Date().toISOString(),
            savedCategory: suggestedSavedCategory,
            intent,
            jobs,
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
        prompt: contextualPrompt,
        message: contextualPrompt,
        question: contextualPrompt,
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

    toast({ title: 'Saved', description: 'Job saved in My Job Tracker.' });
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

    const jobsToShow = message.jobs.slice(0, 20);

    return (
      <div className="my-4 space-y-3">
        {jobsToShow.map((job, index) => {
          const deadlineInfo = getDeadlineInfo(job.deadline);
          const needsVerification = job.verificationStatus === 'needs_verification';

          return (
            <div
              key={`${message.id}-${job.id}-${index}`}
              className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.045]"
            >
              <div className="flex gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                  {job.verificationStatus === 'verified' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : job.verificationStatus === 'avoid' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-slate-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-slate-950 dark:text-white">
                        {job.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-white/50">{job.company}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openOfficialApplyPage(job)}
                      className="mt-0.5 shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Open job"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-white/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{job.area}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span>{job.deadline || 'Closing date not stated'}</span>
                    </div>

                    <div className={`flex items-center gap-2 ${deadlineInfo.urgent ? 'text-orange-600' : ''}`}>
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{deadlineInfo.label}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60">
                        {job.category}
                      </span>
                    )}

                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {job.sourceLabel}
                    </span>

                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${verificationStatusStyles(job.verificationStatus)}`}>
                      {verificationStatusLabel(job.verificationStatus)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openOfficialApplyPage(job)}
                      disabled={job.verificationStatus === 'avoid' || deadlineInfo.expired}
                      className="h-9 rounded-xl text-xs"
                    >
                      {job.isSourceCard ? (
                        <Globe2 className="mr-1.5 h-3.5 w-3.5" />
                      ) : needsVerification ? (
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {deadlineInfo.expired ? 'Closed' : 'Open'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        sendPrompt(
                          `Verify this job/company before I apply:\n\nJob: ${job.title}\nCompany: ${job.company}\nArea: ${job.area}\nSource: ${job.sourceLabel}\nApply link: ${job.applyUrl}`
                        )
                      }
                      className="h-9 rounded-xl text-xs"
                    >
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      Verify
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveLocalJob(job)}
                      className="h-9 rounded-xl text-xs"
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

        {message.jobs.length > 20 && (
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
            Showing first 20 results. Search a specific role like “security job in Letsitele” to narrow it down.
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
            Build CV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={openCoverLetterBuilder}
            className="h-10 rounded-xl text-xs"
          >
            <Mail className="mr-2 h-3.5 w-3.5" />
            Cover Letter
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
            Save CV Tips
          </Button>
        </div>
      );
    }

    if (!canApply) return null;

    return (
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            sendPrompt(
              `Use Apply Assistant for this opportunity. Guide me step by step: verify the source, prepare my CV, write the application email or WhatsApp, and remind me about the closing date:\n\n${message.content}`
            )
          }
          className="h-10 rounded-xl text-xs"
        >
          <Send className="mr-2 h-3.5 w-3.5" />
          Apply Assistant
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            sendPrompt(
              `Verify this job/company deeper. Check official website, company location, contact person, email domain, LinkedIn/company page, and scam signs:\n\n${message.content}`
            )
          }
          className="h-10 rounded-xl text-xs"
        >
          <Building2 className="mr-2 h-3.5 w-3.5" />
          Verify Company
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            sendPrompt(
              `Write a professional application email and WhatsApp message for this opportunity. Keep it clean, short, and copy-ready:\n\n${message.content}`
            )
          }
          className="h-10 rounded-xl text-xs"
        >
          <Mail className="mr-2 h-3.5 w-3.5" />
          Write Email
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={openCvBuilder}
          className="h-10 rounded-xl text-xs"
        >
          <FileText className="mr-2 h-3.5 w-3.5" />
          Build CV
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={openCoverLetterBuilder}
          className="h-10 rounded-xl text-xs"
        >
          <Mail className="mr-2 h-3.5 w-3.5" />
          Cover Letter
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => saveMessageAs(message.id, 'career_plan')}
          className="h-10 rounded-xl text-xs"
        >
          <Save className="mr-2 h-3.5 w-3.5" />
          Save Job
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
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fmTreasureSpin {
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
            opacity: 0.45;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.68;
          }
        }

        @keyframes fmLineSlide {
          0%, 18% {
            transform: translateY(0);
          }
          25%, 43% {
            transform: translateY(-36px);
          }
          50%, 68% {
            transform: translateY(-72px);
          }
          75%, 93% {
            transform: translateY(-108px);
          }
          100% {
            transform: translateY(0);
          }
        }

        .fm-treasure-wrap {
          position: relative;
          display: flex;
          height: 76px;
          width: 76px;
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
              rgba(15, 23, 42, 0.16),
              rgba(15, 23, 42, 0.04),
              rgba(15, 23, 42, 0)
            );
          animation: fmTreasureSpin 10s linear infinite;
        }

        .fm-treasure-soft-glow {
          position: absolute;
          inset: 9px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          filter: blur(14px);
          animation: fmTreasureBreathe 4.8s ease-in-out infinite;
        }

        .fm-treasure-orb {
          position: relative;
          z-index: 1;
          display: flex;
          height: 58px;
          width: 58px;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          background: #020617;
          color: white;
          box-shadow:
            0 18px 45px rgba(15, 23, 42, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .dark .fm-treasure-ring {
          background:
            conic-gradient(
              from 90deg,
              rgba(255, 255, 255, 0),
              rgba(255, 255, 255, 0.2),
              rgba(255, 255, 255, 0.05),
              rgba(255, 255, 255, 0)
            );
        }

        .dark .fm-treasure-soft-glow {
          background: rgba(255, 255, 255, 0.08);
        }

        .dark .fm-treasure-orb {
          background: rgba(255, 255, 255, 0.95);
          color: #020617;
          box-shadow:
            0 18px 45px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .fm-line-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fm-line-track {
          height: 144px;
          width: 100%;
          animation: fmLineSlide 15s ease-in-out infinite;
        }

        .fm-line-item {
          display: flex;
          height: 36px;
          width: 100%;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fm-quick-card {
          opacity: 0;
          animation: fmSoftFloatIn 420ms ease forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .fm-treasure-ring,
          .fm-treasure-soft-glow,
          .fm-line-track,
          .fm-quick-card {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .fm-line-track {
            height: 36px;
          }

          .fm-line-item:not(:first-child) {
            display: none;
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
            aria-label="My Job Tracker"
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
                        <div className={message.role === 'assistant' ? 'max-h-[58vh] overflow-y-auto pr-1' : ''}>
                          {renderMessageImages(message.images)}

                          {message.role === 'assistant' && renderJobSummaryCard(message, previousUserText)}

                          {message.role === 'assistant' ? (
                            <>
                              <ChatGPTStyleText text={message.content} onLinkClick={handleGeneratedLinkClick} />
                              {renderAssistantJobCards(message)}
                            </>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{normalizeUssdCodes(message.content)}</div>
                          )}
                        </div>
                      )}

                      {editingMessageId !== message.id && assistantSmartActions(message, previousUserText)}
                      {editingMessageId !== message.id && messageActions(message)}
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

              <div className="rounded-[22px] border border-black/10 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#171717] sm:rounded-[24px]">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Ask me anything, ${firstName}...`}
                  className="max-h-28 min-h-[48px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:max-h-32 sm:min-h-[52px]"
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

                  <Button
                    onClick={() => sendPrompt()}
                    disabled={busy || (!prompt.trim() && selectedImages.length === 0)}
                    className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    aria-label="Send"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
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

              {remainingAIUses !== null && (
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  AI uses left today: {remainingAIUses}
                </div>
              )}
            </div>
          </footer>
        </section>
      </main>

      {trackerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setTrackerOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
              <div>
                <h2 className="text-base font-semibold">My Job Tracker</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">
                  Saved jobs, reminders, follow-ups
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

                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>{job.deadline || 'Closing date not stated'}</span>
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
                Search according to the user’s intent. Generic job search shows all jobs. Security search shows security jobs. Cashier search shows retail jobs. External jobs stay Needs verification.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
