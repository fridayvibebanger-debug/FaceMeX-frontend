import { useEffect, useMemo, useRef, useState } from 'react';
import SubscriptionModal from "../components/SubscriptionModal";
import type { ChangeEvent, ReactNode } from 'react';
import { ChevronRight } from "lucide-react";
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
  Sparkles,
  Mail,
  MapPin,
  Menu,
  MoreVertical,
  Pin,
  PinOff,
  Save,
  Search,
  Send,
  Share2,
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

type SavedCategory =
  | 'career_plan'
  | 'cv_advice'
  | 'application_message'
  | 'research'
  | 'homework_help'
  | 'assignments'
  | 'youtube_lessons'
  | 'institution_applications';

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

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type ScheduledTaskStatus = 'active' | 'paused';

type ScheduledTask = {
  id: string;
  title: string;
  prompt: string;
  frequency: 'every_morning' | 'every_afternoon' | 'twice_day' | 'hourly' | 'custom';
  email: string;
  emailEnabled: boolean;
  createdAt: string;
  nextRunLabel?: string;
  status: ScheduledTaskStatus;
};

type LibrarySectionKey = 'jobs' | 'investors' | 'students';

type LibrarySection = {
  key: LibrarySectionKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: any;
  prompt: string;
};

type YouTubeLessonCategory = {
  label: string;
  query: string;
  description: string;
  library: LibrarySectionKey;
  badge: string;
};

type YouTubeLessonVideo = {
  videoId: string;
  title: string;
  description?: string | null;
  channelTitle?: string | null;
  publishedAt?: string | null;
  thumbnail?: string | null;
  embedUrl: string;
  watchUrl: string;
};

const AI_CV_BUILDER_PATH = '/ai/resume';
const AI_COVER_LETTER_PATH = '/ai/cover-letter';
const FACE_MEX_AI_ICON_SRC = '/facemex_ai_flow_icon.png';

const JOBS_BATCH_SIZE = 10;
const WORKSPACE_STORAGE_KEY = 'facemex_opportunities_workspace_messages';
const WORKSPACE_SESSIONS_STORAGE_KEY = 'facemex_opportunities_workspace_sessions';
const WORKSPACE_ACTIVE_SESSION_STORAGE_KEY = 'facemex_opportunities_workspace_active_session';
const WORKSPACE_SCHEDULES_STORAGE_KEY = 'facemex_opportunities_workspace_schedules';

const BUILD_CV_QUICK_ACTION = '__OPEN_FACEMEX_AI_CV_BUILDER__';
const COVER_LETTER_QUICK_ACTION = '__OPEN_FACEMEX_COVER_LETTER_AI__';
const TRACK_APPLICATIONS_QUICK_ACTION = '__OPEN_FACEMEX_JOB_TRACKER__';

const NO_EXPERIENCE_SEARCH_KEYWORD =
  'no experience entry level general worker cleaner packer cashier store assistant learnership internship';

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Jobs',
  cv_advice: 'CV',
  application_message: 'Apply',
  research: 'Research',
  homework_help: 'Homework',
  assignments: 'Assignments',
  youtube_lessons: 'YouTube Lessons',
  institution_applications: 'Applications',
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
You are FaceMeX Job AI, but you must behave like a helpful ChatGPT-style assistant for everyday life, career, business, learning, work, apps, documents, messages, planning, school, college, university, and general questions.

Main rule:
- Answer any normal helpful question clearly and calmly.
- Only search jobs when the user clearly asks for jobs, vacancies, hiring, work, learnerships, internships, employment, or a specific job role.
- Do not treat location words like Tzaneen, Polokwane, Letsitele, Limpopo, or South Africa as job-search intent by themselves.
- If the user asks about business ideas, life advice, app improvement, transport, money planning, studies, messages, or strategy, answer normally without showing job cards.
- If the user asks for CV help, cover letter help, application message, or interview help, answer with career guidance.
- If the user asks for jobs, show job results and job cards.
- If the user asks a general question after job results, answer the new question directly.

Education rule:
- If the user is in Homework Help, behave as a professional educational assistant.
- First understand the subject, grade/level, exact question, and what the learner has already tried.
- Explain step by step in a way a student can understand.
- Do not only give final answers. Teach the method.
- Highlight key words and key points.
- End with a short revision note.

Assignments rule:
- If the user is in Assignments, first ask for the assignment instructions, subject, grade/level, due date, marking rubric, and required format.
- Help the student plan the assignment academically.
- Help with structure, research points, introduction, paragraphs, conclusion, references, and editing.
- Do not encourage copying. Help the student understand and write better.

YouTube Lessons rule:
- If the user is in YouTube Lessons, first ask what subject, topic, grade/level, and type of lesson they want to watch.
- If the user gives a YouTube link, title, or transcript, summarize the lesson into academic notes.
- Create sections: Lesson title, Main idea, Key terms, Step-by-step explanation, Important points, Example, Quick revision notes.
- If a YouTube video is needed, give a YouTube search link like:
  [Find related lessons on YouTube](https://www.youtube.com/results?search_query=topic)
- Do not pretend to watch a video unless the user provides a link, title, transcript, or enough context.

College and university applications rule:
- If the user is in College / University Applications, ask before giving a full answer:
  1. Which country?
  2. Which college, university, TVET, or institution?
  3. Which course or career field?
  4. Which intake year?
  5. What grade/results do they have?
  6. Do they need funding, bursary, scholarship, or NSFAS help?
- Respond according to the user's intent and instructions.
- Help with application steps, documents, motivation letters, emails, deadlines, and funding options.
- Do not invent application dates or admission requirements.

CV and Cover Letter rule:
- If the user asks about a CV, answer according to the user's exact intent first: create CV, improve CV, review CV, write profile summary, list skills, tailor CV, or fix wording.
- After helping, instruct them clearly:
  "To create your CV inside FaceMeX, tap the hamburger menu (☰), scroll down, and open AI CV Builder."
- If the user asks about a cover letter, answer according to the user's exact intent first: create cover letter, improve cover letter, tailor cover letter, or write an application letter.
- After helping, instruct them clearly:
  "To create your cover letter inside FaceMeX, tap the hamburger menu (☰), scroll down, and open Cover Letter AI."
- Keep the instruction short and practical.
- Do not force job cards for CV or cover letter requests unless the user also asks for jobs.

Application help rule:
- When the user asks to apply for a specific job, use the exact selected job context if provided.
- Help step by step.
- Start with what the job is, the company, the source, and the closing date status.
- If closing date is not stated, say clearly: "Closing date is not stated by the source. Open the job source and confirm before applying."
- Explain what documents are needed.
- Help write a short application email or WhatsApp message.
- Recommend checking the official source before sending CV.
- Never say a closing date if the source did not provide it.

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
- Never invent closing dates.
- Only say a job is verified if it comes from FaceMeX verified records, official company source, government/public institution, or a directly confirmed employer.

When users ask for jobs:
- Understand the user's intent first.
- If they ask generally, search "jobs".
- If they ask for no experience, entry level, first job, or training provided, search beginner-friendly jobs only.
- If they ask for security, search only security jobs.
- If they ask for cashier or retail, search only retail, cashier, store, shop, sales, merchandiser, or packer jobs.
- If they ask for farm, search only farm, agriculture, packhouse, fruit, harvest, ZZ2, Westfalia, or agricultural jobs.
- If they ask for admin, search only admin, office, receptionist, data capture, or administrator jobs.
- If they ask for teacher or creche jobs, search only teacher, educator, tutor, school, daycare, or creche jobs.
- If they ask for driver, search only driver, delivery, courier, transport, code 10, code 14, or fleet jobs.
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

type EducationTool = ApplySheetTool;

const applySheetTools: ApplySheetTool[] = [
  {
    label: 'Apply Assistant',
    icon: Send,
    prompt:
      'Use Apply Assistant for this exact job. Help me apply step by step, check the closing date status, prepare my documents, and write the message or email I must send.',
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
      'Write a professional email I can send with my CV for this exact job. Keep it short, polite, and convincing.',
  },
];

const educationTools: ApplySheetTool[] = [
  {
    label: 'Homework Help',
    icon: FileText,
    prompt:
      'Education Workspace: Homework Help. First ask me for my subject, grade or level, exact homework question, and what I have already tried. Then help me understand the answer step by step. Highlight key words and key points, and save the answer under Homework Help.',
  },
  {
    label: 'Assignments',
    icon: Edit3,
    prompt:
      'Education Workspace: Assignments. First ask me for the assignment instructions, subject, grade or level, due date, rubric, and required format. Then help me plan and write it academically step by step. Save the answer under Assignments.',
  },
  {
    label: 'YouTube Lessons',
    icon: Globe2,
    prompt:
      'Education Workspace: YouTube Lessons. First ask me what subject, topic, grade or level, and type of lesson I want to watch. If I provide a YouTube link, title, or transcript, summarize it into academic notes with key terms, key points, examples, and revision notes. Save the summary under YouTube Lessons.',
  },
  {
    label: 'College / University',
    icon: Users,
    prompt:
      'Education Workspace: College and University Applications. First ask me which country, institution, course, intake year, results, and funding support I need. Then help me apply to colleges, universities, TVET colleges, private institutions, bursaries, scholarships, and institutions across Africa and beyond. Save the answer under Applications.',
  },
];

const librarySections: LibrarySection[] = [
  {
    key: 'jobs',
    title: 'Job Library',
    shortTitle: 'Jobs',
    icon: Briefcase,
    description:
      'Clean job-search lessons, South African job platforms, abroad applications, CV sending, interviews and safe online applications.',
    prompt:
      'FaceMeX Job Library. Help me with job searching, safe applications, CV sending, interviews, local South African jobs, jobs abroad, and avoiding scams. Ask what job, country, area, experience level, and documents I have before giving a plan.',
  },
  {
    key: 'investors',
    title: 'Investors Library',
    shortTitle: 'Investors',
    icon: Building2,
    description:
      'Funding, grants, investor readiness, pitch decks, traction, revenue, business proof and application steps.',
    prompt:
      'FaceMeX Investors Library. Help me understand grants, funding, investors, pitch decks, business models, traction, revenue proof, due diligence and application steps. Ask what business, stage, location, amount needed and documents I have.',
  },
  {
    key: 'students',
    title: 'Students Library',
    shortTitle: 'Students',
    icon: Users,
    description:
      'School subjects, homework, assignments, lesson videos, university applications, NSFAS, bursaries and study notes.',
    prompt:
      'FaceMeX Students Library. Help me with school subjects, homework, assignments, YouTube lesson notes, university or TVET applications, NSFAS, bursaries and study plans. Ask my grade or level, subject, topic and goal first.',
  },
];

const youtubeLessonCategories: YouTubeLessonCategory[] = [
  {
    label: 'Math',
    library: 'students',
    badge: 'School',
    query: 'full maths lesson tutorial grade 12 South Africa exam revision step by step no shorts',
    description: 'Maths lessons, examples, exam prep and step-by-step explanations.',
  },
  {
    label: 'History',
    library: 'students',
    badge: 'School',
    query: 'full history lesson grade 10 11 12 South Africa source based questions essay revision no shorts',
    description: 'History topics, timelines, essays, source-based questions and revision.',
  },
  {
    label: 'Accounting',
    library: 'students',
    badge: 'School',
    query: 'full accounting lesson grade 12 South Africa financial statements ledgers exam revision no shorts',
    description: 'Accounting basics, journals, ledgers, financial statements and exam prep.',
  },
  {
    label: 'Science',
    library: 'students',
    badge: 'School',
    query: 'full physical science life sciences grade 12 South Africa lesson revision no shorts',
    description: 'Physical Science, Life Sciences, experiments, formulas and revision.',
  },
  {
    label: 'English',
    library: 'students',
    badge: 'School',
    query: 'full English lesson grade 12 essay writing literature comprehension grammar South Africa no shorts',
    description: 'English grammar, essays, literature, comprehension and writing skills.',
  },
  {
    label: 'Business Studies',
    library: 'students',
    badge: 'School',
    query: 'full business studies grade 12 lesson South Africa exam revision case studies no shorts',
    description: 'Business Studies topics, case studies, exam answers and summaries.',
  },
  {
    label: 'University Applications',
    library: 'students',
    badge: 'Applications',
    query: 'how to apply for university in South Africa full application guide documents deadlines no shorts',
    description: 'University applications, documents, admission steps and deadlines to check.',
  },
  {
    label: 'NSFAS / Bursaries',
    library: 'students',
    badge: 'Funding',
    query: 'how to apply for NSFAS bursaries South Africa full guide documents requirements no shorts',
    description: 'NSFAS, bursaries, documents, funding steps and application help.',
  },
  {
    label: 'Grants / Funding',
    library: 'investors',
    badge: 'Funding',
    query: 'how to apply for business grants funding South Africa full guide requirements no shorts',
    description: 'Grant applications, funding steps, requirements and mistakes to avoid.',
  },
  {
    label: 'Investors',
    library: 'investors',
    badge: 'Investor-ready',
    query: 'what investors want in a startup pitch deck traction revenue full lesson no shorts',
    description: 'Investor readiness, pitch decks, traction, revenue and business proof.',
  },
  {
    label: 'Pitch Decks',
    library: 'investors',
    badge: 'Startup',
    query: 'how to create a startup pitch deck investors full tutorial no shorts',
    description: 'Problem, solution, market, traction, revenue, team and funding ask.',
  },
  {
    label: 'Business Funding',
    library: 'investors',
    badge: 'Business',
    query: 'business funding options South Africa grants loans investors full guide no shorts',
    description: 'Funding routes, documents, due diligence and application planning.',
  },
  {
    label: 'Jobs Abroad',
    library: 'jobs',
    badge: 'Global',
    query: 'how to find legitimate jobs abroad online full guide work visa CV no shorts',
    description: 'Safe job search abroad, applications, CV tips and scam warning signs.',
  },
  {
    label: 'Jobs South Africa',
    library: 'jobs',
    badge: 'Local',
    query: 'how to find jobs online in South Africa safely full guide CV applications no shorts',
    description: 'South African job platforms, CV sending, applications and interviews.',
  },
  {
    label: 'CV & Interview Prep',
    library: 'jobs',
    badge: 'Career',
    query: 'how to write a CV and prepare for interviews South Africa full guide no shorts',
    description: 'CV structure, interview questions, answers and application follow-up.',
  },
  {
    label: 'Learnerships',
    library: 'jobs',
    badge: 'Youth',
    query: 'how to apply for learnerships internships South Africa full guide no shorts',
    description: 'Learnerships, internships, youth opportunities and application documents.',
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

function isEducationText(text: string) {
  return /(education workspace|homework|assignment|study|studying|exam|test|notes|lesson|teacher|student|math|maths|mathematics|english|life sciences|physical science|physics|chemistry|biology|geography|history|accounting|economics|business studies|youtube lessons|youtube lesson|college|university|tvet|institution|course|faculty|admission|application form|bursary|scholarship|nsfas|learn|explain this topic|grade 8|grade 9|grade 10|grade 11|grade 12|tertiary)/i.test(
    text
  );
}

function getEducationIntent(text: string) {
  const t = clean(text).toLowerCase();

  if (/(college|university|tvet|institution|admission|application form|bursary|scholarship|nsfas|course|faculty)/i.test(t)) {
    return 'education_institution';
  }

  if (/(youtube|video|watch|lesson video|youtube lesson)/i.test(t)) {
    return 'education_youtube';
  }

  if (/(assignment|rubric|due date|essay|project|research task)/i.test(t)) {
    return 'education_assignment';
  }

  if (/(homework|school work|question|exercise|study|exam|test|notes|subject|grade)/i.test(t)) {
    return 'education_homework';
  }

  return 'education_homework';
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

function getUserEmail(store: any) {
  const user =
    store?.user ||
    store?.currentUser ||
    store?.authUser ||
    store?.profile ||
    store?.account ||
    store?.session?.user ||
    store?.supabaseUser ||
    null;

  return clean(
    store?.email ||
      store?.profile?.email ||
      user?.email ||
      user?.user_metadata?.email ||
      ''
  );
}

function normalizeScheduledTaskStatus(status: unknown): ScheduledTaskStatus {
  return status === 'paused' ? 'paused' : 'active';
}

function normalizeScheduledTasks(value: any): ScheduledTask[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ScheduledTask => ({
      id: clean(item?.id) || safeId(),
      title: clean(item?.title) || 'FaceMeX scheduled help',
      prompt: clean(item?.prompt) || 'Scan for anything that needs my attention.',
      frequency:
        item?.frequency === 'every_afternoon' ||
        item?.frequency === 'twice_day' ||
        item?.frequency === 'hourly' ||
        item?.frequency === 'custom'
          ? item.frequency
          : 'every_morning',
      email: clean(item?.email),
      emailEnabled: item?.emailEnabled !== false,
      createdAt: clean(item?.createdAt) || new Date().toISOString(),
      nextRunLabel: clean(item?.nextRunLabel),
      status: normalizeScheduledTaskStatus(item?.status),
    }))
    .slice(0, 20);
}

function scheduleFrequencyLabel(frequency: ScheduledTask['frequency']) {
  if (frequency === 'every_morning') return 'Every morning';
  if (frequency === 'every_afternoon') return 'Every afternoon';
  if (frequency === 'twice_day') return 'Twice a day';
  if (frequency === 'hourly') return 'Hourly';
  return 'Custom schedule';
}

function getDefaultSchedulePrompt(messages: ChatMessage[]) {
  const lastUserPrompt = [...messages].reverse().find((message) => message.role === 'user')?.content;

  return clean(lastUserPrompt) || 'Scan FaceMeX opportunities, education tasks, and saved jobs. Email me if anything needs my attention.';
}

function getWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(normalizeUssdCodes(text))}`;
}

function buildSharePayload(text: string, title = 'FaceMeX AI') {
  const cleaned = normalizeUssdCodes(clean(text));
  const excerpt = cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
  const url = typeof window !== 'undefined' ? window.location.href : 'https://facemexsocial.com/ai';

  return {
    title,
    text: excerpt,
    url,
    combined: `${excerpt}

Open in FaceMeX: ${url}`,
  };
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
  const t = clean(text).toLowerCase().trim();
  if (isEducationText(t)) return getEducationIntent(t);
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
  if (intent === 'education_homework') return 'homework_help';
  if (intent === 'education_assignment') return 'assignments';
  if (intent === 'education_youtube') return 'youtube_lessons';
  if (intent === 'education_institution') return 'institution_applications';

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
  if (intent === 'education_homework') {
    return `${promptText}

FaceMeX Education Workspace:
You are now in Homework Help.
First ask for the subject, grade/level, exact question, and what the student has already tried.
Then teach step by step.
Highlight key words and key points.
Save this response under Homework Help.`;
  }

  if (intent === 'education_assignment') {
    return `${promptText}

FaceMeX Education Workspace:
You are now in Assignments.
First ask for the assignment instructions, subject, grade/level, due date, rubric, and required format.
Help the student plan and write academically.
Save this response under Assignments.`;
  }

  if (intent === 'education_youtube') {
    return `${promptText}

FaceMeX Education Workspace:
You are now in YouTube Lessons.
First ask what subject, topic, grade/level, and lesson type the student wants to watch.
If a YouTube link, title, or transcript is provided, summarize it into academic notes.
Use: Lesson title, Main idea, Key terms, Step-by-step explanation, Key points, Example, Quick revision notes.
Save this response under YouTube Lessons.`;
  }

  if (intent === 'education_institution') {
    return `${promptText}

FaceMeX Education Workspace:
You are now in College and University Applications.
First ask for country, institution, course, intake year, results, and funding support.
Then guide the student step by step according to their intent.
Do not invent requirements or deadlines.
Save this response under Applications.`;
  }

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

  if (/(security|guard|armed response|protection)/i.test(t)) return 'security';
  if (/(cashier|retail|store assistant|shop assistant|shoprite|checkers|usave|sales assistant|merchandiser|packer|clerk)/i.test(t)) return 'retail';
  if (/(farm|agriculture|packhouse|packing|fruit|westfalia|zz2|letaba|harvest)/i.test(t)) return 'farm';
  if (/(admin|administrator|administrative|office|receptionist|data capture)/i.test(t)) return 'admin';
  if (/(teacher|educator|creche|crèche|school|daycare|assistant teacher|tutor)/i.test(t)) return 'teacher';
  if (/(driver|drivers|code 10|code 14|pdp|delivery|truck|side tipper|courier|transport)/i.test(t)) return 'driver';
  if (/(cleaner|cleaning|housekeeping)/i.test(t)) return 'cleaner';
  if (/(learnership|internship|graduate|youth)/i.test(t)) return 'learnership internship';
  if (/(general worker|general work|general)/i.test(t)) return 'general worker';

  if (
    /\b(job|jobs|vacancy|vacancies|work|employment|hiring)\b/i.test(original) &&
    !/(security|cashier|retail|driver|admin|teacher|creche|crèche|cleaner|farm|agriculture|learnership|internship|general worker)/i.test(
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
  if (q === 'retail' || q.includes('cashier')) return 'retail, cashier, packer and store jobs';
  if (q === 'farm' || q.includes('farm')) return 'farm, agriculture and packhouse jobs';
  if (q === 'admin' || q.includes('admin')) return 'admin and office jobs';
  if (q === 'teacher' || q.includes('teacher')) return 'teacher, creche and school jobs';
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

  if (/[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF]/.test(text)) return true;

  return false;
}

function jobText(job: LocalVerifiedJob) {
  return [job.title, job.company, job.area, job.category, job.sourceLabel, job.description].join(' ').toLowerCase();
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

    if (/south africa/i.test(job.area) && !includesAny(text, LIMPOPO_AREAS)) return true;
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

  if (isLimpopoSearch(requestedArea)) return includesAny(text, LIMPOPO_AREAS);

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

  if (q === 'security') return /(security|guard|armed|protection|response|control room|patrol)/i.test(text);

  if (q === 'driver') {
    return /(driver|drivers|code 10|code 14|pdp|truck|delivery|courier|transport|fleet|vehicle|motorbike|bike|side tipper)/i.test(text);
  }

  if (q === 'retail' || q.includes('cashier')) {
    return /(cashier|retail|store assistant|shop assistant|sales assistant|sales consultant|packer|picker|merchandiser|till operator|shoprite|checkers|usave|store|supermarket)/i.test(text);
  }

  if (q === 'farm' || q.includes('farm') || q.includes('agriculture')) {
    return /(farm|agriculture|agricultural|packhouse|fruit|harvest|avocado|tomato|zz2|westfalia|letaba|orchard|irrigation|tractor|production farm|farm worker)/i.test(text);
  }

  if (q === 'admin' || q.includes('admin')) {
    return /(admin|administrator|administrative|office administrator|office assistant|receptionist|data capture|data capturer|clerk|filing|secretary)/i.test(text);
  }

  if (q === 'teacher' || q.includes('teacher')) {
    return /(teacher|educator|teaching assistant|assistant teacher|school|creche|crèche|daycare|tutor|lecturer|facilitator|training facilitator)/i.test(text);
  }

  if (q.includes('cleaner')) return /(cleaner|cleaning|housekeeping|housekeeper)/i.test(text);
  if (q.includes('general worker')) return /(general worker|general assistant|labourer|worker)/i.test(text);
  if (q.includes('learnership') || q.includes('internship')) return /(learnership|internship|graduate|trainee|youth)/i.test(text);

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

function extractClosingDateFromText(text: string) {
  const value = clean(text);

  const closingMatch =
    value.match(/(?:closing date|deadline|closes|closing|apply by|applications close)\s*[:\-]?\s*(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/i) ||
    value.match(/(?:closing date|deadline|closes|closing|apply by|applications close)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i) ||
    value.match(/(?:closing date|deadline|closes|closing|apply by|applications close)\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);

  return clean(closingMatch?.[1]);
}

function getDeadlineInfo(deadline?: string | null) {
  if (!deadline) {
    return { label: 'Not stated by source', expired: false, urgent: false, needsCheck: true };
  }

  const end = new Date(`${deadline}T23:59:59`);
  const now = new Date();

  if (Number.isNaN(end.getTime())) {
    return { label: deadline, expired: false, urgent: false, needsCheck: false };
  }

  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { label: 'Closed', expired: true, urgent: false, needsCheck: false };

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days <= 0) return { label: `Closing in ${hours}h`, expired: false, urgent: true, needsCheck: false };
  if (days === 1) return { label: 'Closing in 1 day', expired: false, urgent: true, needsCheck: false };

  return { label: `Closing in ${days} days`, expired: false, urgent: days <= 3, needsCheck: false };
}

function getClosingDateDisplay(deadline?: string | null) {
  const info = getDeadlineInfo(deadline);

  if (!deadline || info.needsCheck) {
    return 'Not stated by source — open the job source to confirm before applying.';
  }

  return info.label;
}

function getJobPostedTime(value?: string | null) {
  const raw = clean(value);

  if (!raw) return 0;

  const direct = new Date(raw).getTime();
  if (!Number.isNaN(direct)) return direct;

  const normalized = raw.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1');
  const parsed = new Date(normalized).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getJobPostedLabel(value?: string | null) {
  const postedTime = getJobPostedTime(value);

  if (!postedTime) return 'Posted date not stated';

  const diffMs = Date.now() - postedTime;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Posted today';
  if (diffDays === 1) return 'Posted yesterday';
  if (diffDays < 31) return `Posted ${diffDays} days ago`;

  const date = new Date(postedTime);
  return `Posted ${date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}`;
}

function jobFreshnessScore(job: LocalVerifiedJob) {
  const posted = getJobPostedTime(job.createdAt);
  if (!posted) return 0;

  const ageDays = Math.max(0, Math.floor((Date.now() - posted) / (1000 * 60 * 60 * 24)));
  if (ageDays <= 1) return 500;
  if (ageDays <= 3) return 420;
  if (ageDays <= 7) return 320;
  if (ageDays <= 14) return 220;
  if (ageDays <= 30) return 120;
  return 20;
}

function stableJobTieBreaker(job: LocalVerifiedJob) {
  const key = `${job.title}|${job.company}|${job.area}|${job.applyUrl}`.toLowerCase();
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function compareJobsForDisplay(a: LocalVerifiedJob, b: LocalVerifiedJob, requestedArea = '') {
  const areaDiff = areaRelevanceScore(b, requestedArea) - areaRelevanceScore(a, requestedArea);
  if (areaDiff !== 0) return areaDiff;

  const postedDiff = getJobPostedTime(b.createdAt) - getJobPostedTime(a.createdAt);
  if (postedDiff !== 0) return postedDiff;

  if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
  if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return 1;

  const freshDiff = jobFreshnessScore(b) - jobFreshnessScore(a);
  if (freshDiff !== 0) return freshDiff;

  return stableJobTieBreaker(a) - stableJobTieBreaker(b);
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


function isApplicationOpportunityText(content: string) {
  const text = clean(content).toLowerCase();

  if (!text) return false;
  if (hasJobSearchWords(text)) return false;

  if (/(homework|assignment|essay|exam|test|study notes|another homework question|subject|grade\s?\d|teacher|student|lesson|mathematics|maths|history|accounting|science|english|business studies)/i.test(text)) {
    return false;
  }

  return /(university|college|tvet|institution|admission|apply to|application form|intake|course|faculty|nsfas|bursary|bursaries|scholarship|grant|grants|funding|funders|investor|investors|pitch deck|startup funding|business funding|seed funding|pre[-\s]?seed|series a|accelerator|incubator)/i.test(
    text
  );
}

function isResearchIntentText(content: string) {
  const text = clean(content).toLowerCase();

  if (!text) return false;
  if (hasJobSearchWords(text)) return false;
  if (isApplicationOpportunityText(text)) return false;

  return /(research|analyse|analyze|analysis|market research|competitor|industry|case study|summarise|summarize|break down|compare|investigate|find out|explain this document|study this|report|strategy research)/i.test(
    text
  );
}

function shouldShowApplicationActions(message: ChatMessage, previousUserText = '') {
  const combined = `${message.content}
${previousUserText}`;

  if (isGovernmentServiceText(combined)) return false;
  if (message.intent === 'job-search') return false;
  if (hasJobSearchWords(previousUserText) || hasJobSearchWords(message.content)) return false;

  if (
    message.savedCategory === 'homework_help' ||
    message.savedCategory === 'assignments' ||
    message.savedCategory === 'youtube_lessons' ||
    message.intent === 'education_homework' ||
    message.intent === 'education_assignment' ||
    message.intent === 'education_youtube' ||
    message.intent === 'general-question' ||
    message.intent === 'general-help' ||
    isResearchIntentText(combined)
  ) {
    return false;
  }

  return (
    message.savedCategory === 'institution_applications' ||
    message.intent === 'education_institution' ||
    isApplicationOpportunityText(combined)
  );
}

function shouldShowResearchActions(message: ChatMessage, previousUserText = '') {
  const combined = `${message.content}\n${previousUserText}`;

  if (isGovernmentServiceText(combined)) return false;
  if (shouldShowApplicationActions(message, previousUserText)) return false;
  if (message.intent === 'job-search' || hasJobSearchWords(previousUserText)) return false;
  if (message.intent === 'general-question' || message.intent === 'general-help') return false;

  return (
    message.intent === 'research' ||
    message.intent === 'verify-opportunity' ||
    message.intent === 'image_or_document_analysis' ||
    isResearchIntentText(combined)
  );
}

function shouldShowGeneralOnly(message: ChatMessage, previousUserText = '') {
  if (message.role !== 'assistant') return false;
  if (message.jobs?.length) return false;
  if (message.intent !== 'general-question' && message.intent !== 'general-help') return false;
  if (shouldShowApplicationActions(message, previousUserText)) return false;
  if (shouldShowResearchActions(message, previousUserText)) return false;
  if (shouldShowCvBuilderActions(message.content, previousUserText)) return false;
  if (shouldShowApplyActions(message.content, previousUserText)) return false;

  return true;
}

function buildSavedItemFollowUpPrompt(item: ChatMessage, mode: 'continue' | 'deeper' | 'apply' = 'continue') {
  const label = item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item';
  const content = normalizeUssdCodes(item.content);

  if (mode === 'apply') {
    return `Use this saved ${label} and help me apply or take action step by step. Ask only for missing details if needed.\n\nSaved item:\n${content}`;
  }

  if (mode === 'deeper') {
    return `Use this saved ${label} and go deeper. Give me better details, next steps, useful questions to ask, and what I should do next.\n\nSaved item:\n${content}`;
  }

  return `Continue from this saved ${label}. Help me understand it better and guide me to the next step.\n\nSaved item:\n${content}`;
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
  const companyMatch = text.match(/(?:Company|Employer|Source):\s*(.+)/i) || text.match(/\bMRMS\b/i);

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

function buildJobApplyContext(job?: LocalVerifiedJob | null, fallbackContext = '') {
  if (!job) return fallbackContext;

  return `Selected job for application help:

Job title: ${job.title}
Company: ${job.company}
Area: ${job.area}
Category: ${job.category || 'Not stated'}
Source: ${job.sourceLabel}
Verification status: ${verificationStatusLabel(job.verificationStatus)}
Posted: ${getJobPostedLabel(job.createdAt)}
Closing date status: ${getClosingDateDisplay(job.deadline)}
Apply link: ${job.applyUrl}
Source link: ${job.sourceUrl}
Details: ${job.description || 'No extra details provided by source.'}

Instruction:
Help the user apply for this exact job step by step.
Do not invent a closing date.
If the closing date is not stated, tell the user to open the source and confirm before applying.
Help with documents, CV tailoring, cover letter, and application email/message.`;
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

function normalizeYouTubeLessonVideos(raw: any): YouTubeLessonVideo[] {
  const videos = Array.isArray(raw?.videos) ? raw.videos : Array.isArray(raw?.items) ? raw.items : [];

  return videos
    .map((item: any) => {
      const videoId = clean(item?.videoId || item?.id?.videoId || item?.id);
      if (!videoId) return null;

      return {
        videoId,
        title: clean(item?.title || item?.snippet?.title) || 'YouTube lesson',
        description: clean(item?.description || item?.snippet?.description),
        channelTitle: clean(item?.channelTitle || item?.snippet?.channelTitle),
        publishedAt: clean(item?.publishedAt || item?.snippet?.publishedAt),
        thumbnail:
          clean(item?.thumbnail) ||
          clean(item?.snippet?.thumbnails?.high?.url) ||
          clean(item?.snippet?.thumbnails?.medium?.url) ||
          clean(item?.snippet?.thumbnails?.default?.url) ||
          null,
        embedUrl: clean(item?.embedUrl) || `https://www.youtube.com/embed/${videoId}`,
        watchUrl: clean(item?.watchUrl) || `https://www.youtube.com/watch?v=${videoId}`,
      } satisfies YouTubeLessonVideo;
    })
    .filter(Boolean)
    .filter((video: YouTubeLessonVideo) => isUsefulYouTubeLessonVideo(video))
    .slice(0, 8) as YouTubeLessonVideo[];
}

function isUsefulYouTubeLessonVideo(video: YouTubeLessonVideo) {
  const text = `${video.title} ${video.channelTitle || ''} ${video.description || ''}`.toLowerCase();

  if (!video.videoId || !video.embedUrl) return false;

  if (
    /#shorts|youtube shorts|tiktok|reels?|funny|comedy|prank|meme|music video|lyrics|status video|whatsapp status/i.test(
      text
    )
  ) {
    return false;
  }

  if (clean(video.title).length < 12) return false;

  return true;
}

function buildWorkspaceMemoryContext(messages: ChatMessage[], sessions: ChatSession[]) {
  const currentConversation = messages
    .filter((message) => !message.deletedFromChat)
    .slice(-14)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n');

  const savedLibraryItems = [
    ...messages,
    ...sessions.flatMap((session) => session.messages || []),
  ]
    .filter((message) => !message.deletedFromChat && (message.saved || message.pinned || message.savedCategory))
    .slice(-24)
    .map((message) => {
      const label = message.savedCategory ? savedCategoryLabels[message.savedCategory] : 'Saved';
      return `${label}: ${message.content}`;
    })
    .join('\n\n');

  const recentChats = sessions
    .slice(0, 8)
    .map((session) => {
      const last = [...(session.messages || [])].reverse().find((message) => !message.deletedFromChat);
      return `${session.title || 'Chat'}: ${last?.content || 'No recent message'}`;
    })
    .join('\n');

  return [
    currentConversation ? `Current conversation:\n${currentConversation}` : '',
    savedLibraryItems ? `Saved library and pinned notes:\n${savedLibraryItems}` : '',
    recentChats ? `Recent chat history:\n${recentChats}` : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
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

  return { cleanValue, trailing };
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
        <strong key={`bold-${key++}`} className="font-semibold text-slate-950 dark:text-white lg:text-white">
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
      className="my-4 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03] lg:border-white/10 lg:bg-[#171717]"
    >
      <table className="w-full min-w-[520px] border-collapse text-left text-sm lg:text-white">
        <thead className="bg-slate-100 dark:bg-white/[0.06] lg:bg-[#242424]">
          <tr>
            {Array.from({ length: columnCount }).map((_, index) => (
              <th
                key={`head-${index}`}
                className="border-b border-slate-200 px-3 py-3 font-semibold text-slate-950 dark:border-white/10 dark:text-white lg:border-white/10 lg:text-white"
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
              className="border-b border-slate-100 last:border-0 dark:border-white/10 lg:border-white/10"
            >
              {Array.from({ length: columnCount }).map((_, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="align-top px-3 py-3 text-slate-700 dark:text-white/75 lg:text-white/80"
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

    if (isLikelyTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
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
          className="pt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white lg:text-white"
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
      <p key={`p-${index}`} className="text-slate-800 dark:text-white/85 lg:text-white/90">
        {renderInlineText(line, onLinkClick)}
      </p>
    );
  }

  return <div className="space-y-3 text-[15px] leading-7 text-slate-800 dark:text-white/85 lg:text-white/90">{blocks}</div>;
}

function isShortContextReply(text: string) {
  const value = clean(text).toLowerCase();

  if (!value) return false;

  const followUps = [
    'yes',
    'yebo',
    'yeah',
    'yep',
    'ok',
    'okay',
    'sure',
    'continue',
    'go ahead',
    'do it',
    'please do',
    'send it',
    'draft it',
    'tell me more',
    'what about',
    'how much',
    'how do',
    'why',
    'when',
    'where',
    'who',
    'can i',
    'should i',
    'would that',
    'is it possible',
    'and',
    'also',
    'then',
    'next'
  ];

  return (
    value.length < 120 &&
    followUps.some((item) => value.startsWith(item))
  );
}


function buildPremiumRecentHeading(text: string) {
  const value = clean(text).replace(/\s+/g, ' ').trim();
  const lower = value.toLowerCase();

  if (!value) return 'New chat';

  const locationMatch = lower.match(/(tzaneen|lenyenye|nkowankowa|polokwane|limpopo|gauteng|johannesburg|pretoria|cape town|durban|south africa)/i);
  const location = locationMatch?.[1]
    ? locationMatch[1].split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : '';

  if (/(job|jobs|vacancy|vacancies|hiring|work|employment|learnership|internship)/i.test(lower)) {
    return location ? `Seeking ${location} Job` : 'Seeking Jobs';
  }

  if (/(cv|resume)/i.test(lower)) return 'Building CV';
  if (/(cover letter|application letter|motivation letter)/i.test(lower)) return 'Cover Letter';
  if (/(interview)/i.test(lower)) return 'Interview Prep';
  if (/(fake|scam|legit|verify|safe|risky)/i.test(lower)) return 'Checking Opportunity';
  if (/(youtube|video|watch|lesson video)/i.test(lower)) return 'Watching Lessons';
  if (/(saved youtube lesson)/i.test(lower)) return 'Saved YouTube Lesson';
  if (/(funding|grant|investor|pitch|startup|business plan)/i.test(lower)) return 'Funding & Investors';
  if (/(nsfas|bursary|scholarship)/i.test(lower)) return 'NSFAS & Bursaries';
  if (/(college|university|tvet|application)/i.test(lower)) return 'College Application';

  const gradeMatch = lower.match(/grade\s*(8|9|10|11|12)/i);
  const subjectMatch = lower.match(/(math|maths|mathematics|history|accounting|science|english|business studies|geography|economics)/i);
  if (gradeMatch && subjectMatch) {
    const subject = subjectMatch[1]
      .replace('maths', 'Maths')
      .replace('math', 'Maths')
      .replace('mathematics', 'Maths')
      .replace('business studies', 'Business Studies')
      .replace(/^./, (char) => char.toUpperCase());
    return `Grade ${gradeMatch[1]} ${subject}`;
  }

  const cleaned = value
    .replace(/^(hi|hello|hey|please|can you|could you|help me|i need|i want|write me|show me|tell me)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 4);
  const title = words.join(' ');
  if (!title) return 'New chat';

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function buildChatSessionTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user' && clean(message.content));
  const title = buildPremiumRecentHeading(clean(firstUserMessage?.content || messages[0]?.content || 'New chat'));

  if (!title) return 'New chat';
  if (title.length <= 34) return title;

  return `${title.slice(0, 34).trim()}...`;
}

function normalizeChatSessions(value: unknown): ChatSession[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => {
      const messages = Array.isArray(item?.messages) ? item.messages : [];
      const id = clean(item?.id) || safeId();
      const createdAt = clean(item?.createdAt) || new Date().toISOString();
      const updatedAt = clean(item?.updatedAt) || createdAt;

      return {
        id,
        title: clean(item?.title) || buildChatSessionTitle(messages),
        messages,
        createdAt,
        updatedAt,
      } as ChatSession;
    })
    .filter((session) => session.messages.length > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function buildConversationContext(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.deletedFromChat)
    .slice(-10)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n');
}

function MessageCircleIcon() {
  return <span className="block h-4 w-4 rounded-full border-2 border-current" />;
}

function FaceMeXFlowIcon({ className = '' }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <div className={`fm-flow-fallback ${className}`} />;

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
  `Hi ${displayName}! How can I help you today?`,
  "What would you like to achieve today?",
  "Looking for a job? Let's find one together.",
  "Applying to college or university?",
  "Ready to learn something new today?",
  "Explore the sidebar for helpful learning videos.",
  "Search the sidebar for study resources.",
  "Discover career tips in the sidebar.",
  "Need help with homework? I'm here to help.",
  "Let's prepare for your next interview.",
  "Want to improve your CV? Let's do it together.",
  "Explore new opportunities today.",
  "Every lesson brings you closer to your goals.",
  "Small steps today lead to big success tomorrow.",
  "What would you like to learn today?",
  "Ask me anything—I'm here to help.",
  `Welcome back, ${displayName}!`
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
    <div className="mx-auto flex min-h-[38vh] max-w-xl flex-col items-center justify-center text-center lg:min-h-[45vh]">
      <div className="fm-treasure-wrap">
        <span className="fm-treasure-ring" />
        <span className="fm-treasure-shadow" />

        <div className="fm-treasure-orb">
          <FaceMeXFlowIcon className="h-[62px] w-[62px]" />
        </div>
      </div>

      <div className="mt-7 flex min-h-[78px] items-center justify-center px-4">
        <h2 className="fm-main-typing-text text-balance font-semibold leading-tight tracking-tight text-slate-950 dark:text-white lg:text-white">
          {typedPrompt || '\u00A0'}
          <span className="fm-type-caret" />
        </h2>
      </div>

      <p className="mt-2 max-w-md px-3 text-sm leading-6 text-slate-500 dark:text-white/50 lg:text-white/50">
        Ask one clear question. Upload a screenshot when checking a job post,
        CV, advert, or opportunity.
      </p>

      <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2 px-2">
        {quickPrompts.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickAsk(item.prompt)}
            className="fm-quick-pill rounded-full border border-black/5 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition duration-300 hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1] lg:border-white/10 lg:bg-white/10 lg:text-white/80 lg:hover:bg-white/15"
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
    <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.045] lg:border-white/10 lg:bg-[#171717]">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-[15px] font-semibold leading-tight text-slate-950 dark:text-white lg:text-white">
              {job.title}
            </h3>

            <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-600 dark:text-white/60 lg:text-white/60">
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

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500 dark:text-white/50 lg:text-white/50">
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

          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-white/50 lg:text-white/50">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{getJobPostedLabel(job.createdAt)}</span>
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.category && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60 lg:bg-white/10 lg:text-white/65">
              {job.category}
            </span>
          )}

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.08] dark:text-white/60 lg:bg-white/10 lg:text-white/65">
            {job.sourceLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpen}
            disabled={disabled}
            className="h-9 rounded-xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {deadlineInfo.expired ? 'Closed' : 'Open'}
          </Button>

          <Button size="sm" variant="outline" onClick={onVerify} className="h-9 rounded-xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Verify
          </Button>

          <Button size="sm" variant="outline" onClick={onSave} className="h-9 rounded-xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-1 py-1 text-[12px] font-semibold text-slate-500 transition hover:text-slate-800 dark:text-white/50 dark:hover:text-white lg:text-white/50 lg:hover:text-white"
        >
          <span>More details</span>
          {detailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {detailsOpen && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600 dark:bg-white/[0.06] dark:text-white/60 lg:bg-white/5 lg:text-white/65">
            <p>
              <span className="font-semibold text-slate-800 dark:text-white lg:text-white">Posted:</span>{' '}
              {getJobPostedLabel(job.createdAt)}
            </p>

            <p>
              <span className="font-semibold text-slate-800 dark:text-white lg:text-white">Closing date:</span>{' '}
              {getClosingDateDisplay(job.deadline)}
            </p>

            {job.salary && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-white lg:text-white">Salary:</span> {job.salary}
              </p>
            )}

            {job.description && (
              <p>
                <span className="font-semibold text-slate-800 dark:text-white lg:text-white">Details:</span> {job.description}
              </p>
            )}

            <p>
              <span className="font-semibold text-slate-800 dark:text-white lg:text-white">Source:</span> {job.sourceLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState(() => safeId());
  const [localJobs, setLocalJobs] = useState<LocalVerifiedJob[]>(OFFICIAL_JOB_SOURCE_CARDS);
  const [busy, setBusy] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeLibrarySection, setActiveLibrarySection] = useState<LibrarySectionKey>('students');
  const [activeYoutubeLessonCategory, setActiveYoutubeLessonCategory] = useState<YouTubeLessonCategory | null>(null);
  const [youtubeLessonVideos, setYoutubeLessonVideos] = useState<YouTubeLessonVideo[]>([]);
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
  const [youtubeLessonsBusy, setYoutubeLessonsBusy] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [watchPanelOpen, setWatchPanelOpen] = useState(false);
  const [mexaMode, setMexaMode] = useState<
  "auto" | "study" | "career" | "business" | "research" | "creative" | "coding"
>("auto");

const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [watchSearch, setWatchSearch] = useState('');
  const [watchVideos, setWatchVideos] = useState<YouTubeLessonVideo[]>([]);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchPlayingVideoId, setWatchPlayingVideoId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleStep, setScheduleStep] = useState<'choose' | 'custom'>('choose');
  const [schedulePrompt, setSchedulePrompt] = useState('');
  const [scheduleEmail, setScheduleEmail] = useState(() => getUserEmail(userStore));
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [savedReaderMessage, setSavedReaderMessage] = useState<ChatMessage | null>(null);
  const [applySheetOpen, setApplySheetOpen] = useState(false);
  const [clearWorkspaceOpen, setClearWorkspaceOpen] = useState(false);
  const [applySheetContext, setApplySheetContext] = useState('');
  const [applySheetJob, setApplySheetJob] = useState<LocalVerifiedJob | null>(null);
  const [lastSelectedJob, setLastSelectedJob] = useState<LocalVerifiedJob | null>(null);
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

  const activeLibrary = useMemo(
    () => librarySections.find((section) => section.key === activeLibrarySection) || librarySections[2],
    [activeLibrarySection]
  );

  const activeLibraryYoutubeCategories = useMemo(
    () => youtubeLessonCategories.filter((category) => category.library === activeLibrarySection),
    [activeLibrarySection]
  );

  const chatMessages = useMemo(() => {
    return messages.filter((message) => !message.deletedFromChat);
  }, [messages]);

  const lastChatMessage = chatMessages[chatMessages.length - 1];

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
      homework_help: savedMessages.filter((message) => message.savedCategory === 'homework_help').length,
      assignments: savedMessages.filter((message) => message.savedCategory === 'assignments').length,
      youtube_lessons: savedMessages.filter((message) => message.savedCategory === 'youtube_lessons').length,
      institution_applications: savedMessages.filter((message) => message.savedCategory === 'institution_applications').length,
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
    return [...localJobs].sort((a, b) => compareJobsForDisplay(a, b, ''));
  }, [localJobs, nowTick]);

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
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDeepSeekUsage(getDeepSeekUsage(currentTier));

    try {
      const rawSessions = localStorage.getItem(WORKSPACE_SESSIONS_STORAGE_KEY);
      const storedSessions = normalizeChatSessions(rawSessions ? JSON.parse(rawSessions) : []);
      const storedActiveId = clean(localStorage.getItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY));
      const rawMessages = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      const storedMessages = rawMessages ? JSON.parse(rawMessages) : [];
      const fallbackSessionId = storedActiveId || safeId();

      setChatSessions(storedSessions);
      setActiveSessionId(fallbackSessionId);

      const activeSession = storedSessions.find((session) => session.id === storedActiveId);
      if (activeSession) {
        setMessages(activeSession.messages);
      } else {
        setMessages(Array.isArray(storedMessages) ? storedMessages : []);
      }
    } catch {
      setChatSessions([]);
      setMessages([]);
      setActiveSessionId(safeId());
    }

    try {
      const rawSchedules = localStorage.getItem(WORKSPACE_SCHEDULES_STORAGE_KEY);
      setScheduledTasks(normalizeScheduledTasks(rawSchedules ? JSON.parse(rawSchedules) : []));
    } catch {
      setScheduledTasks([]);
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
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, activeSessionId);

      if (messages.length > 0) {
        const now = new Date().toISOString();
        const nextSession: ChatSession = {
          id: activeSessionId,
          title: buildChatSessionTitle(messages),
          messages,
          createdAt: messages[0]?.createdAt || now,
          updatedAt: now,
        };

        setChatSessions((prev) => {
          const next = [nextSession, ...prev.filter((session) => session.id !== activeSessionId)]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 24);

          localStorage.setItem(WORKSPACE_SESSIONS_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    } catch {
      // ignore
    }
  }, [messages, activeSessionId]);

  useEffect(() => {
    if (busy) return;
    if (!lastChatMessage || lastChatMessage.role !== 'assistant') return;

    window.setTimeout(() => {
      messageRefs.current[lastChatMessage.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }, [busy, lastChatMessage?.id, lastChatMessage?.role]);

  const recordAIUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const normalizeApiJobs = (jobs: any[], keyword = 'jobs', requestedArea = 'Tzaneen'): LocalVerifiedJob[] => {
    const normalized = jobs
      .map((job: any) => {
        const description = clean(job.description);
        const title = clean(job.title || job.job_title || job.role);
        const company = clean(job.company || job.employer || job.source_name || job.company_name) || 'Company not stated';
        const area = clean(job.area || job.location || job.town || job.city) || 'South Africa';
        const deadline =
          clean(job.deadline || job.closing_date || job.closingDate) ||
          extractClosingDateFromText(`${title} ${company} ${area} ${description}`);

        return {
          id: clean(job.id) || safeId(),
          title,
          company,
          area,
          deadline: deadline || null,
          sourceLabel: clean(job.sourceLabel || job.source_label || job.source_type || job.sourceType) || 'External job source',
          verificationStatus: normalizeVerificationStatus(job.verificationStatus || job.verification_status || job.status),
          actionLabel: clean(job.actionLabel || job.action_label) || 'Open Apply Page',
          applyUrl: clean(job.applyUrl || job.apply_url || job.application_link || job.redirect_url || job.sourceUrl || job.source_url),
          sourceUrl: clean(job.sourceUrl || job.source_url || job.applyUrl || job.apply_url || job.redirect_url),
          sourceType: normalizeSourceType(job.sourceType || job.source_type || job.sourceLabel),
          isSourceCard: Boolean(job.isSourceCard || job.is_source_card),
          salary: clean(job.salary || job.salary_text) || null,
          category: clean(job.category) || null,
          description: description || null,
          createdAt:
            clean(
              job.createdAt ||
                job.created_at ||
                job.created ||
                job.postedAt ||
                job.posted_at ||
                job.publicationDate ||
                job.publication_date ||
                job.date ||
                job.created_at_raw
            ) || null,
        };
      })
      .filter((job: LocalVerifiedJob) => job.title && job.applyUrl)
      .filter((job: LocalVerifiedJob) => !isForeignLookingJob(job))
      .filter((job: LocalVerifiedJob) => jobMatchesKeywordIntent(job, keyword))
      .filter((job: LocalVerifiedJob) => jobMatchesRequestedArea(job, requestedArea))
      .sort((a: LocalVerifiedJob, b: LocalVerifiedJob) => compareJobsForDisplay(a, b, requestedArea));

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
      )}&includeExternal=true&includeOfficialSources=true&limit=80&sort=date&fresh=true&days=30&cacheBust=${Date.now()}`;

      const res = await api.get(url);
      const data = unwrapApiResponse(res);
      const jobs = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
      const normalizedJobs = normalizeApiJobs(jobs, query, area);
      const shouldFallbackToOfficial = clean(query).toLowerCase() === 'jobs';

      const finalJobs = normalizedJobs.length
        ? normalizedJobs
        : shouldFallbackToOfficial
          ? OFFICIAL_JOB_SOURCE_CARDS
          : [];

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

      const fallback = clean(query).toLowerCase() === 'jobs' ? OFFICIAL_JOB_SOURCE_CARDS : [];
      setLocalJobs(fallback);
      return fallback;
    }
  };

  const buildJobsAnswer = (jobs: LocalVerifiedJob[], areaText: string, queryText: string) => {
    const exactJobs = jobs.filter((job) => !job.isSourceCard);
    const sourceCards = jobs.filter((job) => job.isSourceCard);
    const count = exactJobs.length || sourceCards.length;
    const areaLabel = isBroadSearchArea(areaText) ? areaText : `${areaText} • Limpopo`;
    const searchLabel = getSearchDisplayLabel(queryText);

    if (exactJobs.length) return `${count} ${searchLabel} found ${areaLabel} — newest first`;
    if (sourceCards.length) return `${count} official job sources found ${areaLabel}`;

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

  const openApplySheet = (context: string, job?: LocalVerifiedJob | null) => {
    setApplySheetContext(context);
    setApplySheetJob(job || null);
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

  const refreshJobsForMessage = async (message: ChatMessage) => {
    const searchArea = message.jobSearchArea || 'Tzaneen';
    const searchQuery = message.jobSearchQuery || 'jobs';
    const areaLabel = isBroadSearchArea(searchArea) ? searchArea : `${searchArea} • Limpopo`;

    setBusy(true);

    try {
      const liveJobs = await loadAutomaticJobs({
        query: searchQuery,
        area: searchArea,
        silent: true,
      });

      const exactJobs = liveJobs.filter((job) => !job.isSourceCard);
      const finalJobs = dedupeJobs(exactJobs.length ? exactJobs : liveJobs).sort((a, b) => compareJobsForDisplay(a, b, searchArea));
      const content = finalJobs.length
        ? `${finalJobs.length} ${getSearchDisplayLabel(searchQuery)} found ${areaLabel} — refreshed newest first`
        : `No fresh ${getSearchDisplayLabel(searchQuery)} found ${areaLabel}`;

      setJobVisibleCounts((prev) => ({ ...prev, [message.id]: JOBS_BATCH_SIZE }));

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content,
                jobs: finalJobs.length ? finalJobs : undefined,
                jobSearchArea: searchArea,
                jobSearchQuery: searchQuery,
              }
            : item
        )
      );

      toast({
        title: 'Jobs refreshed',
        description: 'Showing fresh jobs first where the source provides posted dates.',
      });
    } catch {
      toast({
        title: 'Refresh failed',
        description: 'Could not refresh jobs right now. Try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
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

      const liveFiltered = liveJobs.filter((job) => !job.isSourceCard).filter((job) => looksLikeNoExperienceJob(job));
      const existingFiltered = (message.jobs || []).filter((job) => !job.isSourceCard).filter((job) => looksLikeNoExperienceJob(job));

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

  const resetWorkspaceUiForNewChat = () => {
    setPrompt('');
    setSelectedImages([]);
    setJobVisibleCounts({});
    setFollowUpExpanded(false);
    setEditingMessageId(null);
    setEditText('');
    setApplySheetOpen(false);
    setApplySheetContext('');
    setApplySheetJob(null);
    setLastSelectedJob(null);
    setJobsOpen(false);
    setLibraryOpen(false);
    setScheduleOpen(false);
    setTrackerOpen(false);
    setClearWorkspaceOpen(false);
  };

  const openNewChatCard = () => {
    const nextId = safeId();

    setActiveSessionId(nextId);
    setMessages([]);
    resetWorkspaceUiForNewChat();

    try {
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, nextId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }

    toast({
      title: 'New chat opened',
      description: 'Your previous chat stays in Recent.',
    });
  };

  const openChatSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    resetWorkspaceUiForNewChat();

    try {
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, session.id);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(session.messages));
    } catch {
      // ignore
    }
  };

  const startSavedItemNewChat = (item: ChatMessage, mode: 'continue' | 'deeper' | 'apply' = 'continue') => {
    const nextId = safeId();
    const nextPrompt = buildSavedItemFollowUpPrompt(item, mode);

    setActiveSessionId(nextId);
    setMessages([]);
    resetWorkspaceUiForNewChat();
    setSavedReaderMessage(null);
    setPrompt(nextPrompt);
    setFollowUpExpanded(true);

    try {
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, nextId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }

    toast({
      title: 'Saved item opened in a new chat',
      description: 'Ask FaceMeX AI to continue, research deeper, or help you apply.',
    });
  };


  const clearCurrentChatOnly = () => {
    setMessages([]);
    setPrompt('');
    setSelectedImages([]);
    setJobVisibleCounts({});
    setFollowUpExpanded(false);
    setEditingMessageId(null);
    setEditText('');
    setApplySheetOpen(false);
    setApplySheetContext('');
    setApplySheetJob(null);
    setLastSelectedJob(null);

    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify([]));
      setChatSessions((prev) => {
        const next = prev.filter((session) => session.id !== activeSessionId);
        localStorage.setItem(WORKSPACE_SESSIONS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // ignore
    }

    toast({
      title: 'Chat cleared',
      description: 'This chat is now clean. Your other recent chats stay saved.',
    });
  };

  const shareMessageLink = async (text: string, title = 'FaceMeX AI') => {
    const payload = buildSharePayload(text, title);

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });

        return;
      }
    } catch {
      // fall through to clipboard fallback
    }

    try {
      await navigator.clipboard.writeText(payload.combined);
      toast({
        title: 'Link copied',
        description: 'A FaceMeX share link and preview text were copied.',
      });
      return;
    } catch {
      // fall through to WhatsApp fallback
    }

    window.open(getWhatsAppShareUrl(payload.combined), '_blank', 'noopener,noreferrer');
  };

  const openSchedulePanel = (basePrompt?: string) => {
    setSchedulePrompt(clean(basePrompt) || getDefaultSchedulePrompt(messages));
    setScheduleEmail((prev) => prev || getUserEmail(userStore));
    setScheduleStep('choose');
    setScheduleOpen(true);
  };

  const createScheduledTask = async (frequency: ScheduledTask['frequency']) => {
    const promptToSchedule = clean(schedulePrompt) || getDefaultSchedulePrompt(messages);
    const emailToUse = clean(scheduleEmail) || getUserEmail(userStore);

    if (!emailToUse) {
      toast({
        title: 'Email needed',
        description: 'Add an email address so FaceMeX can send scheduled updates.',
        variant: 'destructive',
      });
      return;
    }

    const task: ScheduledTask = {
      id: safeId(),
      title: 'FaceMeX scheduled update',
      prompt: promptToSchedule,
      frequency,
      email: emailToUse,
      emailEnabled: true,
      createdAt: new Date().toISOString(),
      nextRunLabel: scheduleFrequencyLabel(frequency),
      status: 'active',
    };

    setScheduleBusy(true);

    try {
      if (creatorPlus) {
        const payload = {
          ...task,
          channel: 'email',
          sendEmail: true,
          userEmail: emailToUse,
          source: 'facemex-job-ai',
        };

        await api.post('/api/ai/schedules', payload);
      }

      setScheduledTasks((prev) => {
        const next = [task, ...prev].slice(0, 20);
        localStorage.setItem(WORKSPACE_SCHEDULES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      toast({
        title: creatorPlus ? 'Schedule created' : 'Schedule saved',
        description: creatorPlus
          ? `${scheduleFrequencyLabel(frequency)} updates will be emailed to ${emailToUse}.`
          : 'Saved on this device. Upgrade to Creator+ when you want automatic email delivery.',
      });
    } catch {
      setScheduledTasks((prev) => {
        const next = [task, ...prev].slice(0, 20);
        localStorage.setItem(WORKSPACE_SCHEDULES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      toast({
        title: 'Schedule saved',
        description: 'Saved on this device. Connect /api/ai/schedules on the backend to send automatic emails.',
      });
    } finally {
      setScheduleBusy(false);
      setScheduleOpen(false);
    }
  };

  const deleteScheduledTask = async (id: string) => {
    setScheduledTasks((prev) => {
      const next = prev.filter((task) => task.id !== id);
      localStorage.setItem(WORKSPACE_SCHEDULES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    try {
      await (api as any).delete(`/api/ai/schedules/${id}`);
    } catch {
      // Schedule already removed locally. Backend delete can be connected later.
    }

    toast({
      title: 'Schedule deleted',
      description: 'This scheduled update was removed.',
    });
  };

  const openLibraryChat = (tool: EducationTool) => {
    const nextId = safeId();

    setActiveSessionId(nextId);
    setMessages([]);
    resetWorkspaceUiForNewChat();
    setLibraryOpen(false);
    setJobsOpen(false);

    try {
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, nextId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      sendPrompt(tool.prompt);
    }, 120);
  };

  const openLibrarySectionChat = (section: LibrarySection) => {
    setActiveLibrarySection(section.key);
    setActiveYoutubeLessonCategory(null);
    setYoutubeLessonVideos([]);
    setActivePlayingVideoId(null);

    const nextId = safeId();

    setActiveSessionId(nextId);
    setMessages([]);
    resetWorkspaceUiForNewChat();
    setLibraryOpen(false);
    setJobsOpen(false);

    try {
      localStorage.setItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY, nextId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      sendPrompt(section.prompt);
    }, 120);
  };

  const openYoutubeLessonCategory = async (category: YouTubeLessonCategory) => {
    setActiveLibrarySection(category.library);
    setActiveYoutubeLessonCategory(category);
    setYoutubeLessonsBusy(true);
    setYoutubeLessonVideos([]);
    setActivePlayingVideoId(null);

    trackButtonClick('workspace_youtube_lesson_category', undefined, {
      category: category.label,
      query: category.query,
    });

    try {
      const res = await api.get(
        `/api/youtube/search?q=${encodeURIComponent(category.query)}&limit=8&duration=medium`
      );
      const data = unwrapApiResponse(res);
      const videos = normalizeYouTubeLessonVideos(data);

      setYoutubeLessonVideos(videos);

      if (videos.length === 0) {
        toast({
          title: 'No videos found',
          description: 'Try another YouTube lesson category or search topic.',
        });
      } else {
        toast({
          title: `${category.label} lessons loaded`,
          description: 'You can watch the videos inside FaceMeX.',
        });
      }
    } catch (error: any) {
      setYoutubeLessonVideos([]);

      trackError('workspace_youtube_lessons_failed', error?.message || 'YouTube lessons failed', {
        category: category.label,
      });

      toast({
        title: 'YouTube lessons failed',
        description: 'Check your backend /api/youtube/search route and try again.',
        variant: 'destructive',
      });
    } finally {
      setYoutubeLessonsBusy(false);
    }
  };

  const openWatchSearch = async (value?: string) => {
    const query = clean(value || watchSearch || 'useful educational videos');

    if (!query) {
      toast({ title: 'Search needed', description: 'Type a topic or video you want to watch.' });
      return;
    }

    setWatchSearch(query);
    setWatchBusy(true);
    setWatchVideos([]);
    setWatchPlayingVideoId(null);
    setWatchPanelOpen(true);
    setJobsOpen(true);

    try {
      const res = await api.get(
        `/api/youtube/search?q=${encodeURIComponent(`${query} full lesson tutorial guide no shorts`)}&limit=5&duration=medium`
      );
      const data = unwrapApiResponse(res);
      const videos = normalizeYouTubeLessonVideos(data).slice(0, 5);
      setWatchVideos(videos);

      if (videos.length === 0) {
        toast({ title: 'No useful videos found', description: 'Try a clearer topic, subject or channel name.' });
      }
    } catch (error: any) {
      setWatchVideos([]);
      trackError('workspace_watch_youtube_failed', error?.message || 'Watch search failed', { query });
      toast({
        title: 'Watch search failed',
        description: 'Check your YouTube API route and try again.',
        variant: 'destructive',
      });
    } finally {
      setWatchBusy(false);
    }
  };

  const clearWorkspaceFromScratch = () => {
    setMessages([]);
    setChatSessions([]);
    setActiveSessionId(safeId());
    setPrompt('');
    setSelectedImages([]);
    setJobVisibleCounts({});
    setFollowUpExpanded(false);
    setEditingMessageId(null);
    setEditText('');
    setApplySheetOpen(false);
    setApplySheetContext('');
    setApplySheetJob(null);
    setLastSelectedJob(null);
    setJobsOpen(false);
    setLibraryOpen(false);
    setScheduleOpen(false);
    setTrackerOpen(false);
    setClearWorkspaceOpen(false);

    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      localStorage.removeItem(WORKSPACE_SESSIONS_STORAGE_KEY);
      localStorage.removeItem(WORKSPACE_ACTIVE_SESSION_STORAGE_KEY);
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
    let shouldUseContext = isShortContextReply(finalPrompt) && conversationContext;

    const intent = detectIntent(finalPrompt, hasImages);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);
    const shouldAutoSaveEducation =
      suggestedSavedCategory === 'homework_help' ||
      suggestedSavedCategory === 'assignments' ||
      suggestedSavedCategory === 'youtube_lessons' ||
      suggestedSavedCategory === 'institution_applications';

    // `shouldUsePreviousContext` helper is not present; keep initial context decision
    
    const aiPromptWithToolDirection = addFaceMeXCareerToolInstruction(finalPrompt, intent);

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
          saved: shouldAutoSaveEducation,
          savedCategory: suggestedSavedCategory,
          intent,
        },
      ]);

      setBusy(false);
      return;
    }

    try {
      const workspaceMemoryContext = buildWorkspaceMemoryContext(messages, chatSessions);

      const fullSystemInstruction = `${FACE_MEX_ANSWER_STYLE}

FaceMeX intelligence rules:
- Behave like a polished ChatGPT-style assistant, but focused on FaceMeX users: jobs, students, founders, funding, applications, business and daily practical help.
- Use previous messages, saved notes and recent chats when the user says short replies like "yes", "continue", "same", "help me apply", "make notes", "more", or "explain".
- Do not fumble or restart when context is clear. Continue the exact task.
- When the user asks for videos or lessons, guide them to the correct FaceMeX Library section and YouTube category.
- Keep YouTube recommendations useful: full lessons, tutorials, guides and professional explainers. Avoid Shorts, reels, jokes and entertainment clips.
- Keep libraries separate: Job Library for job-search skills, Investors Library for funding/investors/business, Students Library for subjects/applications/NSFAS.
- Ask one smart clarifying question only when needed. Otherwise give the answer directly.
- Response routing must be strict: general questions must receive a clean answer only, with no CV, cover letter, save note, make note, job or application ending.
- If the user asks for jobs, vacancies, hiring, learnerships or work, use FaceMeX job search/results and support CV + cover letter next steps.
- If the user asks for research, analysis, strategy, market or breakdown, answer like a research assistant and make the answer easy to save as a note.
- If the user asks about university, college, TVET, NSFAS, bursaries, grants, funding, investors or pitch decks, answer like an application assistant and guide them toward applying or scheduling follow-up.
- Never mix Library sections. Students = school/university/NSFAS. Investors = grants/funding/investors/pitching. Jobs = jobs/CV/interviews/learnerships.

User name: ${userDisplayName}
Current automatic job results in FaceMeX:
${JSON.stringify(sortedLocalJobs.slice(0, 40), null, 2)}
`;

     const payload = {
  prompt: aiPromptWithToolDirection,
  message: aiPromptWithToolDirection,
  question: aiPromptWithToolDirection,
  originalPrompt: finalPrompt,

  // ONLY send context if needed
  conversationContext: shouldUseContext ? conversationContext : '',

  // KEEP memory BUT CLEAN IT
  memoryContext: workspaceMemoryContext || null,
  userMemoryContext: workspaceMemoryContext || null,
  previousChatMemory: workspaceMemoryContext || null,

  // IMPORTANT FIX 👇 only last 6–8 messages
  conversationMessages: messages
    .filter((m) => !m.deletedFromChat)
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content: m.content,
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
        // Hint to backend: prefer a direct AI answer for general questions
        directAnswer: true,
      };

      let data: any = null;

      try {
        console.log('Sending AI request to /api/ai/pro/job-assistant');
      
        const res = await api.post('/api/ai/pro/job-assistant', payload);
      
        console.log('AI Response:', res);
      
        data = unwrapApiResponse(res);
      } catch (err: any) {
        console.error('Primary AI endpoint failed:', err);
      
        try {
          console.log('Trying fallback endpoint /api/ai/workspace');
      
          const res = await api.post('/api/ai/workspace', payload);
      
          console.log('Fallback AI Response:', res);
      
          data = unwrapApiResponse(res);
        } catch (fallbackErr: any) {
          console.error('Fallback endpoint also failed:', fallbackErr);
      
          throw fallbackErr;
        }
      }

      const answer = normalizeAnswerText(data, createUnavailableAnswer(hasImages));

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          saved: shouldAutoSaveEducation,
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
          saved: shouldAutoSaveEducation,
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
Closing date: ${getClosingDateDisplay(job.deadline)}
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

    setLastSelectedJob(job);

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
        <div className="sticky top-0 z-10 rounded-2xl border border-black/5 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#171717]/95 lg:border-white/10 lg:bg-black lg:bg-black/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-slate-600 dark:text-white/60 lg:text-white/60" />
              <p className="truncate text-[13px] font-semibold text-slate-950 dark:text-white lg:text-white">
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
            onOpen={() => {
              setLastSelectedJob(job);
              openOfficialApplyPage(job);
            }}
            onVerify={() => {
              setLastSelectedJob(job);
              sendPrompt(
                `Verify this job/company before I apply:\n\nJob: ${job.title}\nCompany: ${job.company}\nArea: ${job.area}\nSource: ${job.sourceLabel}\nClosing date status: ${getClosingDateDisplay(job.deadline)}\nApply link: ${job.applyUrl}\n\nTell me if it looks safe, what red flags to check, and what I must do before sending my CV.`
              );
            }}
            onSave={() => {
              setLastSelectedJob(job);
              saveLocalJob(job);
            }}
          />
        ))}

        <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 px-3 py-3 dark:bg-white/[0.06] lg:bg-white/5">
          {remainingJobs > 0 ? (
            <button
              type="button"
              onClick={() => showMoreJobsForMessage(message)}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
            >
              More jobs ({remainingJobs})
            </button>
          ) : (
            <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-400 shadow-sm dark:bg-white/[0.08] dark:text-white/40 lg:bg-white/10">
              All jobs shown
            </span>
          )}

          <button
            type="button"
            onClick={() => refreshJobsForMessage(message)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
          >
            Refresh jobs
          </button>

          <button
            type="button"
            onClick={() => filterNoExperienceJobsForMessage(message)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
          >
            No experience
          </button>

          <button
            type="button"
            onClick={() => {
              const selectedFromThisList =
                lastSelectedJob && message.jobs?.some((job) => job.id === lastSelectedJob.id)
                  ? lastSelectedJob
                  : jobsToShow[0] || message.jobs?.[0] || null;

              openApplySheet(
                buildJobApplyContext(
                  selectedFromThisList,
                  `Help me apply for one of these jobs around ${searchArea}. Search type: ${getSearchDisplayLabel(searchQuery)}.`
                ),
                selectedFromThisList
              );
            }}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
          >
            Help me apply
          </button>

          <button
            type="button"
            onClick={openCvBuilder}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
          >
            Build CV
          </button>

          <button
            type="button"
            onClick={openCoverLetterBuilder}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
          >
            Cover letter
          </button>

          <button
            type="button"
            onClick={() => sendPrompt('Teach me how to check if a job advert is fake before I apply.')}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/[0.08] dark:text-white/70 lg:bg-white/10 lg:text-white/80"
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
    if (!['job-search', 'verify-opportunity', 'cv-profile', 'cover-letter', 'email-application', 'message-application', 'interview-prep'].includes(message.intent || '')) {
      return null;
    }
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
      <div className="mb-4 rounded-2xl border border-black/5 bg-white p-3 text-slate-950 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white lg:border-white/10 lg:bg-[#171717] lg:text-white">
        <div className="flex gap-3">
          {message.images?.[0] ? (
            <img
              src={message.images[0].dataUrl}
              alt="Job screenshot"
              className="h-24 w-24 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08] lg:bg-white/10">
              <Briefcase className="h-7 w-7 text-slate-500 lg:text-white/60" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight">{title}</h3>

            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-white/50 lg:text-white/60">
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

              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{deadline || 'Closing date not stated by source'}</span>
              </div>
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

    const isGovernment = shouldShowGovernmentSourceAction(message.content, previousUserText);
    const showCvButtons = shouldShowCvBuilderActions(message.content, previousUserText);
    const showApplicationButtons = shouldShowApplicationActions(message, previousUserText);
    const showResearchButtons = shouldShowResearchActions(message, previousUserText);

    if (shouldShowGeneralOnly(message, previousUserText)) {
      return null;
    }

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
            className="h-9 rounded-xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10"
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
          <Button size="sm" variant="outline" onClick={openCvBuilder} className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10">
            <FileText className="mr-2 h-3.5 w-3.5" />
            AI CV Builder
          </Button>

          <Button size="sm" variant="outline" onClick={openCoverLetterBuilder} className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10">
            <Mail className="mr-2 h-3.5 w-3.5" />
            Cover Letter AI
          </Button>

          <Button size="sm" variant="outline" onClick={() => copyText(message.content)} className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10">
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Answer
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'cv_advice')} className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10">
            <Save className="mr-2 h-3.5 w-3.5" />
            Save Tips
          </Button>
        </div>
      );
    }

    if (showApplicationButtons) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10 lg:border-white/10">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              sendPrompt(
                `Help me apply or take action step by step using this answer. Ask only for missing details if needed:\n\n${message.content}`
              )
            }
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Help to apply
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openSchedulePanel(message.content)}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <CalendarDays className="mr-2 h-3.5 w-3.5" />
            Schedule
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMessageAs(message.id, message.savedCategory || 'institution_applications')}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrompt(`Create a clear application action plan from this answer:\n\n${message.content}`);
              setFollowUpExpanded(true);
            }}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            Action plan
          </Button>
        </div>
      );
    }

    if (
      message.savedCategory === 'homework_help' ||
      message.savedCategory === 'assignments' ||
      message.savedCategory === 'youtube_lessons' ||
      message.intent === 'education_homework' ||
      message.intent === 'education_assignment' ||
      message.intent === 'education_youtube'
    ) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMessageAs(message.id, message.savedCategory || 'homework_help')}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save Notes
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrompt(`Create a clearer study summary from this answer:\n\n${message.content}`);
              setFollowUpExpanded(true);
            }}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            Make Notes
          </Button>
        </div>
      );
    }

    if (showResearchButtons) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 dark:border-white/10 lg:border-white/10">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMessageAs(message.id, 'research')}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save Note
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrompt(`Turn this answer into a clear research note with headings, key points, and next steps. Keep it easy to revise and save it as a note:\n\n${message.content}`);
              setFollowUpExpanded(true);
            }}
            className="h-10 rounded-xl text-xs lg:border-white/10 lg:bg-[#171717] lg:text-white lg:hover:bg-white/10"
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            Make a Note
          </Button>
        </div>
      );
    }

    return null;
  };
  const messageActions = (message: ChatMessage) => (
    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-black/5 pt-2 opacity-80 dark:border-white/10">
      <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white">
        <Copy className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => shareMessageLink(message.content, 'FaceMeX AI answer')} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white" aria-label="Share answer link">
        <Share2 className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => openSchedulePanel(message.content)} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white" aria-label="Schedule this chat">
        <CalendarDays className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white">
        <Edit3 className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white">
        {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>

      <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white">
        <Search className="h-3.5 w-3.5" />
      </Button>

      {message.role === 'assistant' && message.intent !== 'general-question' && message.intent !== 'general-help' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => saveMessageAs(message.id, message.savedCategory || 'research')}
          className="h-8 rounded-full px-2 lg:text-white/70 lg:hover:bg-white/10 lg:hover:text-white"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={clearCurrentChatOnly}
        className="h-8 rounded-full px-2 text-red-500"
        aria-label="Clear current chat"
      >
        Clear chat
      </Button>

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
    <div className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-screen max-w-full min-w-0 overflow-hidden bg-white text-slate-950 lg:bg-black lg:text-white">
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

        .fm-desktop-sidebar-scroll {
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.34) transparent;
          scrollbar-gutter: stable;
        }

        .fm-desktop-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .fm-desktop-sidebar-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.34);
        }

        .fm-desktop-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.48);
        }

        .fm-desktop-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }



        .fm-sidebar-recent-list {
          padding-bottom: 22px;
        }

        .fm-sidebar-recent-button {
          display: block;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .fm-sidebar-recent-text {
          display: block;
          max-width: 100%;
          white-space: normal;
          overflow: visible;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.35;
        }

        .fm-panel-scroll {
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.34) transparent;
          scrollbar-gutter: stable;
        }

        .fm-panel-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .fm-panel-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.34);
        }

        .fm-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.48);
        }

        .fm-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fm-chat-scroll {
          overscroll-behavior: contain;
        }

        .fm-chat-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .fm-chat-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }

        .fm-chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .fm-user-prompt-bubble {
          background: #020617;
          color: #ffffff;
        }

        .fm-user-prompt-bubble * {
          color: inherit;
        }

        .dark .fm-user-prompt-bubble {
          background: #ffffff;
          color: #000000;
        }

        @media (min-width: 1024px) {
          .fm-user-prompt-bubble,
          .dark .fm-user-prompt-bubble {
            background: #2f2f2f;
            color: #ffffff;
          }
        }

        @media (max-width: 1023px) {
          .dark .fm-user-prompt-bubble,
          .dark .fm-user-prompt-bubble * {
            color: #000000;
          }
        }



        @media (min-width: 1024px) {
          .fm-desktop-sidebar-scroll {
            padding-bottom: 36px;
          }

          .fm-sidebar-recent-list {
            padding-bottom: 72px;
          }

          .fm-sidebar-recent-button {
            min-height: auto;
            max-height: none;
            height: auto;
          }

          .fm-sidebar-recent-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }



        @media (max-width: 1023px) {
          .fm-user-prompt-bubble,
          .dark .fm-user-prompt-bubble {
            background: #f4f4f5 !important;
            color: #111827 !important;
            border: 1px solid rgba(15, 23, 42, 0.04);
            box-shadow: none !important;
          }

          .fm-user-prompt-bubble * {
            color: inherit !important;
          }

          .fm-assistant-message {
            font-size: 16px;
            line-height: 1.68;
            letter-spacing: -0.01em;
            color: #111827;
          }

          .fm-assistant-message h3 {
            font-size: 17px;
            line-height: 1.35;
          }

          .fm-composer-card {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.09);
            box-shadow: 0 14px 45px rgba(15, 23, 42, 0.12);
          }

          .fm-mobile-chat-shell {
            background:
              radial-gradient(circle at 50% 0%, rgba(241, 245, 249, 0.86), rgba(255, 255, 255, 0) 34%),
              #ffffff;
          }

          .fm-premium-drawer {
            background:
              linear-gradient(180deg, #ffffff 0%, #fbfbfc 64%, #f8fafc 100%);
            box-shadow: 28px 0 80px rgba(15, 23, 42, 0.18);
          }

          .fm-drawer-row {
            min-height: 42px;
            border-radius: 16px;
          }

          .fm-drawer-row:active {
            transform: scale(0.99);
          }

          .fm-drawer-heading {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #111827;
          }

          .fm-drawer-chat-button {
            box-shadow: 0 16px 34px rgba(37, 99, 235, 0.26);
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

      <aside className="hidden h-[100dvh] max-h-[100dvh] min-h-0 w-[260px] min-w-[260px] shrink-0 overflow-hidden border-r border-white/5 bg-[#050505] text-white lg:flex lg:flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between bg-[#050505] px-4">
          <div className="min-w-0 truncate text-sm font-semibold">FaceMeX</div>

          <button
            type="button"
            onClick={openNewChatCard}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="New chat"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>

        <div className="fm-desktop-sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 pl-3 pr-2">
          <button
            type="button"
            onClick={openNewChatCard}
            className="mb-2 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10"
          >
            <Edit3 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">New chat</span>
          </button>

          <button
            type="button"
            onClick={() => setJobsOpen(true)}
            className="mb-1 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Search className="h-4 w-4" />
            Search jobs
          </button>

          <button
            type="button"
            onClick={() => setTrackerOpen(true)}
            className="mb-1 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Clock className="h-4 w-4" />
            Job Tracker
          </button>

          <button
            type="button"
            onClick={() => openSchedulePanel()}
            className="mb-1 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <CalendarDays className="h-4 w-4" />
            Scheduled
          </button>

          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="mb-1 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <FileText className="h-4 w-4" />
            Library
          </button>

          <button
            type="button"
            onClick={() => {
              setWatchPanelOpen(true);
              setWatchPlayingVideoId(null);
          
              // Optional: clear previous search each time
              setWatchSearch('');
              setWatchVideos([]);
            }}
            className="mb-1 flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Globe2 className="h-4 w-4" />
            Watch
          </button>

          <div className="mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-white/40">
            Quick tools
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() =>
                quickAsk('I am looking for a job in Tzaneen. Search automatically and show me current available jobs with apply links.')
              }
              className="line-clamp-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
            >
              Find jobs
            </button>

            <button
              type="button"
              onClick={openCvBuilder}
              className="line-clamp-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
            >
              Build My CV
            </button>

            <button
              type="button"
              onClick={openCoverLetterBuilder}
              className="line-clamp-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
            >
              Cover Letter AI
            </button>

            <button
              type="button"
              onClick={() => quickAsk('Help me prepare for an interview. Give me questions and strong answers.')}
              className="line-clamp-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
            >
              Interview Prep
            </button>
          </div>

          {chatSessions.length > 0 && (
            <>
              <div className="mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                Recent
              </div>

              <div className="fm-sidebar-recent-list mt-2 space-y-1">
                {chatSessions.slice(0, 12).map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => openChatSession(session)}
                    className={`fm-sidebar-recent-button w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      session.id === activeSessionId
                        ? 'bg-white/10 text-white'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="fm-sidebar-recent-text">{session.title || 'New chat'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-white/5 bg-[#050505] p-3">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to FaceMeX
          </button>

          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white ring-2 ring-emerald-400/20">
              {firstName?.[0]?.toUpperCase() || 'F'}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{firstName}</p>
              <p className="text-xs text-white/40">Back to FaceMeX feed</p>
            </div>
          </button>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-[65] flex h-[64px] items-center justify-between bg-white/55 px-4 pt-2 backdrop-blur-xl lg:hidden">

        {/* Left */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-3">
      
          <button
            type="button"
            onClick={() => setJobsOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition active:scale-[0.98] hover:bg-slate-50"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
      
          <button
          type="button"
          onClick={() => navigate("/mexa")}
          className="group flex h-11 max-w-[210px] items-center rounded-full border border-emerald-500/20 bg-gradient-to-r from-[#111] via-[#161616] to-[#111] px-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-emerald-400/40"
        >
        
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white font-bold">
            X
          </div>
        
          <div className="ml-3 flex flex-col items-start leading-tight">
        
           <span className="text-sm font-semibold text-red-500">
              TEST MEXA
            </span>
        
            <span className="text-[11px] text-emerald-300">
              AI Companion
            </span>
        
          </div>
        
          <div className="ml-auto flex items-center">
        
            <span className="mr-2 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">
              NEW
            </span>
        
            <ChevronRight className="h-4 w-4 text-white/60 group-hover:translate-x-1 transition-transform" />
        
          </div>
        
        </button>
      
        {/* Right */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
      
          <button
            type="button"
            onClick={() => setGlobalSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition active:scale-[0.98] hover:bg-slate-50"
            aria-label="Search FaceMeX"
          >
            <Search className="h-5 w-5" />
          </button>
      
          <button
            type="button"
            onClick={() => navigate("/feed")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-[0_10px_25px_rgba(16,185,129,0.28)] ring-4 ring-emerald-500/10 transition active:scale-[0.98] hover:bg-emerald-600"
            aria-label="Back to FaceMeX"
          >
            {firstName?.[0]?.toUpperCase() || "F"}
          </button>
      
        </div>
      
      </header>
      <main className="fm-mobile-chat-shell min-h-0 flex-1 overflow-hidden bg-white px-0 pb-0 pt-[66px] sm:px-4 sm:pb-4 lg:bg-black lg:text-white lg:px-0 lg:py-0 lg:pt-0">
        <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white lg:max-w-none lg:bg-black">
          <div className="fm-chat-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6 lg:py-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 lg:max-w-[760px] lg:gap-6 lg:pb-8">
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
                    ref={(node) => {
                      messageRefs.current[message.id] = node;
                    }}
                    className={`flex w-full ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`text-sm leading-7 ${
                        message.role === 'user'
                          ? 'fm-user-prompt-bubble max-w-[84%] rounded-[18px] px-4 py-3 text-[15px] leading-6 sm:max-w-[78%] lg:max-w-[72%] lg:bg-[#2f2f2f] lg:px-4 lg:py-3 lg:text-white'
                          : isJobResultsMessage
                            ? 'w-full max-w-full bg-transparent px-0 py-0 shadow-none'
                            : 'fm-assistant-message w-full max-w-full bg-transparent px-0 py-1 text-slate-950 shadow-none lg:text-white'
                      }`}
                    >
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[120px] rounded-2xl bg-white text-slate-950 dark:bg-black/20 dark:text-white lg:bg-[#2f2f2f] lg:text-white"
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
                        <div className={message.role === 'assistant' && !isJobResultsMessage ? 'pr-0 lg:text-white' : ''}>
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
                  <div className="rounded-full bg-transparent px-0 py-2 text-[15px] text-slate-500 shadow-none lg:text-white/60">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="shrink-0 border-t border-black/5 bg-white/95 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:p-4 lg:border-0 lg:bg-black lg:px-6 lg:pb-6">
            <div className="mx-auto w-full max-w-3xl lg:max-w-[760px]">
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

              <div className="fm-composer-card rounded-[30px] bg-white dark:bg-[#2b2b2b] lg:bg-[#2b2b2b] px-3 py-2 sm:px-4">
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-[0.98] hover:bg-slate-200 lg:bg-white/10 lg:text-white/80 lg:hover:bg-white/15"
                    aria-label="Upload image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onFocus={() => setFollowUpExpanded(true)}
                    placeholder={hasJobResultsOnScreen ? 'Ask a follow-up...' : 'Ask FaceMeX anything'}
                    className={`min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[16px] leading-6 text-slate-950 dark:text-white lg:text-white placeholder:text-slate-500 dark:placeholder:text-white/45 lg:placeholder:text-white/45 lg:placeholder:text-white/45 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      inputHasContent ? 'max-h-28' : 'h-11 max-h-11 overflow-hidden'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendPrompt();
                      }
                    }}
                  />

                  <Button
                    onClick={() => sendPrompt()}
                    disabled={busy || (!prompt.trim() && selectedImages.length === 0)}
                    className="mb-1 h-10 w-10 shrink-0 rounded-full bg-slate-900 p-0 text-white shadow-none transition hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100 lg:bg-black lg:text-white lg:hover:bg-white/5"
                    aria-label="Send"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {selectedImages.length > 0 && (
                  <div className="mt-1 flex items-center justify-between px-2 text-[11px] text-slate-500 lg:text-white/45">
                    <span>{selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} ready</span>
                    <button type="button" onClick={clearSelectedImages} className="font-semibold text-red-500">
                      Clear
                    </button>
                  </div>
                )}

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
      </div>

      {clearWorkspaceOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-end bg-black/40 backdrop-blur-sm lg:items-center lg:justify-center"
          onClick={() => setClearWorkspaceOpen(false)}
        >
          <div
            className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl dark:bg-[#111] lg:max-w-md lg:rounded-[28px] lg:bg-[#171717] lg:text-white"
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
        <div className="fixed inset-0 z-[90] flex items-end bg-black/40 backdrop-blur-sm lg:items-center lg:justify-center" onClick={() => setApplySheetOpen(false)}>
          <div
            className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl dark:bg-[#111] lg:max-w-md lg:rounded-[28px] lg:bg-[#171717] lg:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Help me apply</h2>
                <p className="truncate text-xs text-slate-500 dark:text-white/50 lg:text-white/55">
                  {applySheetJob ? applySheetJob.title : 'Choose what you need now.'}
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

                      const exactContext = buildJobApplyContext(applySheetJob, applySheetContext);
                      sendPrompt(`${tool.prompt}\n\nContext:\n${exactContext}`);
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
              Safety rule: never pay money to get a job. Verify the company, email domain, official advert, source, and closing date before sending documents.
            </p>
          </div>
        </div>
      )}

      {trackerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setTrackerOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c] lg:border-l lg:border-white/10 lg:bg-[#111] lg:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90 lg:border-white/10 lg:bg-[#111]">
              <div>
                <h2 className="text-base font-semibold">Job Tracker</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">
                  Saved jobs, education notes, applications
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setTrackerOpen(false)} className="h-10 w-10 rounded-full lg:text-white lg:hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="fm-panel-scroll min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-black/5 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                  <Save className="h-5 w-5 text-blue-500" />
                  <p className="mt-2 text-[11px] text-slate-500 lg:text-white/55">Saved</p>
                  <p className="text-xl font-semibold">{savedMessages.length}</p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="mt-2 text-[11px] text-slate-500 lg:text-white/55">Verified</p>
                  <p className="text-xl font-semibold">
                    {sortedLocalJobs.filter((job) => job.verificationStatus === 'verified').length}
                  </p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <p className="mt-2 text-[11px] text-slate-500 lg:text-white/55">Education</p>
                  <p className="text-xl font-semibold">
                    {savedStats.homework_help + savedStats.assignments + savedStats.youtube_lessons + savedStats.institution_applications}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ['Saved Jobs', savedStats.career_plan],
                  ['Homework Help', savedStats.homework_help],
                  ['Assignments', savedStats.assignments],
                  ['YouTube Lessons', savedStats.youtube_lessons],
                  ['Applications', savedStats.institution_applications],
                ].map(([label, count]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-black/5 bg-white p-3 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white"
                  >
                    <p className="text-xs text-slate-500 dark:text-white/50 lg:text-white/55">{label}</p>
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
                      <p className="text-xs text-slate-500 dark:text-white/50 lg:text-white/55">
                        {getDeadlineInfo(closingSoonJob.deadline).label}
                      </p>
                    </div>

                    <Button size="sm" onClick={() => openOfficialApplyPage(closingSoonJob)} className="rounded-xl">
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                <h3 className="text-base font-semibold text-slate-950 dark:text-white lg:text-white">Your pipeline</h3>

                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {sortedLocalJobs.slice(0, 5).map((job) => {
                    const deadlineInfo = getDeadlineInfo(job.deadline);

                    return (
                      <div key={job.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08] lg:bg-white/10">
                          {job.verificationStatus === 'verified' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Save className="h-4 w-4 text-blue-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{job.title}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-white/50 lg:text-white/55">{job.company}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-white/50 lg:text-white/55">
                            {job.deadline || 'Check source'}
                          </p>
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

              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white">
                <h3 className="text-base font-semibold text-slate-950 dark:text-white lg:text-white">Daily tasks</h3>

                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {[
                    ['Search today’s new jobs', Search],
                    ['Send follow-up email', Mail],
                    ['Tailor CV for saved jobs', FileText],
                    ['Review interview questions', Users],
                    ['Homework Help', FileText],
                    ['College / University Applications', Users],
                  ].map(([label, Icon]: any) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setTrackerOpen(false);
                        sendPrompt(String(label));
                      }}
                      className="flex w-full items-center gap-3 rounded-xl py-3 text-left text-slate-900 dark:text-white lg:px-2 lg:text-white lg:hover:bg-white/10"
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
                    className="h-9 rounded-full px-4 text-xs lg:border-white/10 lg:bg-white/[0.06] lg:text-white lg:hover:bg-white/[0.1]"
                  >
                    All
                  </Button>

                  {([
                    'career_plan',
                    'cv_advice',
                    'application_message',
                    'research',
                    'homework_help',
                    'assignments',
                    'youtube_lessons',
                    'institution_applications',
                  ] as SavedCategory[]).map((category) => (
                    <Button
                      key={category}
                      variant={savedFilter === category ? 'default' : 'outline'}
                      onClick={() => setSavedFilter(category)}
                      className="h-9 rounded-full px-4 text-xs lg:border-white/10 lg:bg-white/[0.06] lg:text-white lg:hover:bg-white/[0.1]"
                    >
                      {savedCategoryLabels[category]} ({savedStats[category]})
                    </Button>
                  ))}
                </div>

                <div className="mt-3 space-y-3">
                  {visibleSavedMessages.length === 0 ? (
                    <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50 lg:border-white/10 lg:bg-white/[0.06] lg:text-white/60">
                      No saved items yet.
                    </div>
                  ) : (
                    visibleSavedMessages.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-black/5 bg-white p-3 text-left text-slate-950 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:border-white/10 lg:bg-white/[0.06] lg:text-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08] lg:bg-white/10">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>

                          <button type="button" onClick={() => setSavedReaderMessage(item)} className="min-w-0 flex-1 text-left">
                            <div className="line-clamp-1 text-sm font-semibold">
                              {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                            </div>

                            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/50 lg:text-white/55">
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

            <div className="shrink-0 border-t border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:border-white/10 lg:bg-[#111]">
              <Button
                variant="ghost"
                onClick={clearSavedItems}
                className="w-full rounded-2xl text-red-500 hover:text-red-600 lg:hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear tracker
              </Button>
            </div>
          </div>
        </div>
      )}


      {libraryOpen && (
        <div className="fixed inset-0 z-[72] bg-black/20 backdrop-blur-[2px]" onClick={() => setLibraryOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white text-slate-950 shadow-2xl lg:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
              <div className="min-w-0">
                <h2 className="truncate text-[22px] font-semibold tracking-[-0.03em] text-slate-950">Library</h2>
                <p className="truncate text-xs text-slate-500">
                  Jobs, investors and students — clean and organised.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-950 hover:bg-white/[0.14]"
                aria-label="Close Library"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="fm-panel-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {librarySections.map((section) => {
                    const Icon = section.icon;
                    const active = activeLibrarySection === section.key;

                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => {
                          setActiveLibrarySection(section.key);
                          setActiveYoutubeLessonCategory(null);
                          setYoutubeLessonVideos([]);
                          setActivePlayingVideoId(null);
                        }}
                        className={`rounded-2xl px-2 py-3 text-center transition active:scale-[0.98] ${
                          active
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Icon className="mx-auto mb-1 h-5 w-5" />
                        <span className="block text-[11px] font-semibold leading-tight">{section.shortTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {activeLibrary.title}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      Start the right workspace
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{activeLibrary.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openLibrarySectionChat(activeLibrary)}
                  className="mt-4 flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
                >
                  <span>Open {activeLibrary.title} chat</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {activeLibrarySection === 'students' && (
                <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="grid grid-cols-2 gap-2">
                    {educationTools.map((tool) => {
                      const Icon = tool.icon;

                      return (
                        <button
                          key={tool.label}
                          type="button"
                          onClick={() => openLibraryChat(tool)}
                          className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-100 active:scale-[0.98]"
                        >
                          <Icon className="mb-3 h-5 w-5 text-slate-700" />
                          <p className="text-sm font-semibold text-slate-950">{tool.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                      YouTube lessons inside {activeLibrary.shortTitle}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Useful full videos only. No reels, no funny clips, no mixed categories.
                    </p>
                  </div>
                  {youtubeLessonsBusy && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {activeLibraryYoutubeCategories.map((category) => (
                    <button
                      key={category.label}
                      type="button"
                      onClick={() => openYoutubeLessonCategory(category)}
                      className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                        activeYoutubeLessonCategory?.label === category.label
                          ? 'border-white bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      <span className="mb-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {category.badge}
                      </span>
                      <span className="block text-sm font-semibold">{category.label}</span>
                      <span className="mt-1 line-clamp-3 block text-[11px] leading-4 opacity-65">
                        {category.description}
                      </span>
                    </button>
                  ))}
                </div>

                {activeYoutubeLessonCategory && (
                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {activeYoutubeLessonCategory.label} videos
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Powered by your FaceMeX YouTube API. Tap Watch to play inside FaceMeX.
                      </p>
                    </div>

                    {youtubeLessonsBusy ? (
                      <div className="rounded-3xl bg-white p-5 text-sm text-slate-600">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Loading useful videos...
                      </div>
                    ) : youtubeLessonVideos.length === 0 ? (
                      <div className="rounded-3xl bg-white p-5 text-sm text-slate-600">
                        No useful videos loaded yet. Tap the category again or try another topic.
                      </div>
                    ) : (
                      youtubeLessonVideos.map((video) => {
                        const isPlaying = activePlayingVideoId === video.videoId;

                        return (
                          <article
                            key={video.videoId}
                            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.25)]"
                          >
                            <div className="aspect-video w-full overflow-hidden bg-black">
                              {isPlaying ? (
                                <iframe
                                  src={video.embedUrl}
                                  title={video.title}
                                  className="h-full w-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActivePlayingVideoId(video.videoId)}
                                  className="relative h-full w-full bg-slate-100 text-left"
                                >
                                  {video.thumbnail ? (
                                    <img src={video.thumbnail} alt="" className="h-full w-full object-cover opacity-90" />
                                  ) : (
                                    <div className="h-full w-full bg-slate-100" />
                                  )}
                                  <span className="absolute inset-0 bg-black/20" />
                                  <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl">
                                    ▶
                                  </span>
                                </button>
                              )}
                            </div>

                            <div className="p-4">
                              <p className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">{video.title}</p>

                              {video.channelTitle && (
                                <p className="mt-1 text-xs text-slate-500">{video.channelTitle}</p>
                              )}

                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setActivePlayingVideoId(video.videoId)}
                                  className="h-10 rounded-2xl bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  Watch in FaceMeX
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const savedVideoMessage: ChatMessage = {
                                      id: safeId(),
                                      role: 'assistant',
                                      content: `Saved YouTube lesson: ${video.title}
Channel: ${video.channelTitle || 'YouTube'}
Watch: ${video.watchUrl}`,
                                      createdAt: new Date().toISOString(),
                                      saved: true,
                                      savedCategory: 'youtube_lessons',
                                      intent: 'education_youtube',
                                    };

                                    setMessages((prev) => [...prev, savedVideoMessage]);

                                    toast({
                                      title: 'YouTube lesson saved',
                                      description: `Saved under ${activeLibrary.title}.`,
                                    });
                                  }}
                                  className="h-10 rounded-2xl border-slate-200 bg-slate-50 text-xs font-semibold text-slate-950 hover:bg-slate-100"
                                >
                                  <Save className="mr-1.5 h-3.5 w-3.5" />
                                  Save
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setLibraryOpen(false);
                                    sendPrompt(
                                      `Create useful notes from this YouTube lesson for ${activeLibrary.title}.

Video title: ${video.title}
Channel: ${video.channelTitle || 'YouTube'}
Link: ${video.watchUrl}

Give me: main idea, key points, step-by-step explanation, action steps, and quick revision notes. Be honest that you cannot watch the full video unless transcript/details are provided.`
                                    );
                                  }}
                                  className="h-10 rounded-2xl border-slate-200 bg-slate-50 text-xs font-semibold text-slate-950 hover:bg-slate-100"
                                >
                                  Make notes
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    trackLinkClick(video.watchUrl, 'youtube_lesson_watch_on_youtube');
                                    window.open(video.watchUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="h-10 rounded-2xl border-slate-200 bg-slate-50 text-xs font-semibold text-slate-950 hover:bg-slate-100"
                                >
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  YouTube
                                </Button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-semibold text-slate-950">Saved library notes</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Saved answers stay separated by Jobs, Investors and Students so users can come back later.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(['all', 'career_plan', 'research', 'homework_help', 'assignments', 'youtube_lessons', 'institution_applications'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSavedFilter(filter as any)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        savedFilter === filter ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      {filter === 'all' ? 'All' : savedCategoryLabels[filter as SavedCategory]}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  {savedMessages.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No saved notes yet. Save useful answers and videos to build your library.
                    </p>
                  ) : (
                    savedMessages
                      .filter((item) => savedFilter === 'all' || item.savedCategory === savedFilter)
                      .slice(0, 18)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSavedReaderMessage(item)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Library'}
                            </span>
                            {item.pinned && <Pin className="h-3.5 w-3.5 text-slate-500" />}
                          </div>
                          <p className="line-clamp-2 text-xs leading-5 text-slate-700">{item.content}</p>
                        </button>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {savedReaderMessage && (() => {
        const savedReaderIsApplication =
          savedReaderMessage.savedCategory === 'institution_applications' ||
          savedReaderMessage.intent === 'education_institution' ||
          shouldShowApplicationActions(savedReaderMessage, '');
        const savedReaderIsEducation =
          savedReaderMessage.savedCategory === 'homework_help' ||
          savedReaderMessage.savedCategory === 'assignments' ||
          savedReaderMessage.savedCategory === 'youtube_lessons' ||
          savedReaderMessage.intent === 'education_homework' ||
          savedReaderMessage.intent === 'education_assignment' ||
          savedReaderMessage.intent === 'education_youtube';
        const savedReaderIsResearch =
          savedReaderMessage.savedCategory === 'research' ||
          savedReaderMessage.intent === 'research' ||
          savedReaderMessage.intent === 'verify-opportunity' ||
          savedReaderMessage.intent === 'image_or_document_analysis' ||
          shouldShowResearchActions(savedReaderMessage, '');

        return (
        <div className="fixed inset-0 z-[97] flex items-end bg-black/35 backdrop-blur-sm lg:items-center lg:justify-center" onClick={() => setSavedReaderMessage(null)}>
          <div
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] bg-white text-slate-950 shadow-2xl dark:bg-[#111] dark:text-white lg:max-h-[86dvh] lg:max-w-2xl lg:rounded-[30px] lg:bg-[#202020]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20 lg:hidden" />

            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10 lg:border-white/10">
              <div className="min-w-0">
                <div className="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-white/55">
                  {savedReaderMessage.savedCategory ? savedCategoryLabels[savedReaderMessage.savedCategory] : 'Saved item'}
                </div>
                <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white lg:text-white">
                  Saved card
                </h2>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-white/50">
                  Read it, copy it, or open it in a new chat to continue.
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setSavedReaderMessage(null)} className="h-10 w-10 rounded-full lg:text-white lg:hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-[15px] leading-7 text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/78 lg:border-white/10 lg:bg-white/[0.06]">
                <ChatGPTStyleText text={savedReaderMessage.content} onLinkClick={handleGeneratedLinkClick} />
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:border-white/10">
                <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white lg:text-white">
                  Ask more about this
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-white/50">
                  Start a clean chat using this saved item as memory so the answer continues from the right topic.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button onClick={() => startSavedItemNewChat(savedReaderMessage, 'continue')} className="h-11 rounded-2xl bg-slate-950 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    Continue in new chat
                  </Button>

                  {(savedReaderIsResearch || savedReaderIsEducation || !savedReaderIsApplication) && (
                    <Button variant="outline" onClick={() => startSavedItemNewChat(savedReaderMessage, 'deeper')} className="h-11 rounded-2xl text-xs font-semibold lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
                      {savedReaderIsEducation ? 'Ask more about this' : 'Research deeper'}
                    </Button>
                  )}

                  {savedReaderIsApplication && (
                    <Button variant="outline" onClick={() => startSavedItemNewChat(savedReaderMessage, 'apply')} className="h-11 rounded-2xl text-xs font-semibold lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
                      Help me apply
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 px-5 py-4 dark:border-white/10 lg:border-white/10">
              <Button variant="outline" onClick={() => copyText(savedReaderMessage.content)} className="h-10 rounded-2xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>

              <Button variant="outline" onClick={() => shareMessageLink(savedReaderMessage.content, 'FaceMeX saved card')} className="h-10 rounded-2xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
                <Share2 className="mr-2 h-3.5 w-3.5" />
                Share
              </Button>

              {savedReaderIsApplication && (
                <Button variant="outline" onClick={() => openSchedulePanel(savedReaderMessage.content)} className="h-10 rounded-2xl text-xs lg:border-white/10 lg:bg-transparent lg:text-white lg:hover:bg-white/10">
                  <CalendarDays className="mr-2 h-3.5 w-3.5" />
                  Schedule
                </Button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {scheduleOpen && (
        <div className="fixed inset-0 z-[96] flex items-end bg-black/40 backdrop-blur-sm lg:items-center lg:justify-center" onClick={() => setScheduleOpen(false)}>
          <div
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white p-4 shadow-2xl dark:bg-[#111] lg:max-h-[86dvh] lg:max-w-xl lg:rounded-[28px] lg:bg-[#202020] lg:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20 lg:hidden" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white lg:text-white">Create schedule</h2>
                <p className="text-xs text-slate-500 dark:text-white/50 lg:text-white/50">
                  FaceMeX will run this task and email the update.
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setScheduleOpen(false)} className="h-10 w-10 rounded-full lg:text-white lg:hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="fm-panel-scroll min-h-0 flex-1 overflow-y-auto pr-1">
              {!creatorPlus && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 lg:border-amber-500/20 lg:bg-amber-500/10 lg:text-amber-100">
                  Free and Pro users can save schedules on this device. Creator, Business, and Exclusive users also get automatic email scheduling when the backend route is connected.
                </div>
              )}
              {scheduleStep === 'choose' ? (
                <div className="space-y-3">
                <div className="rounded-2xl border border-black/5 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.06] lg:border-white/10 lg:bg-[#2f2f2f]">
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-white/50 lg:text-white/50">Task</p>
                  <Textarea
                    value={schedulePrompt}
                    onChange={(e) => setSchedulePrompt(e.target.value)}
                    className="min-h-[80px] resize-none rounded-2xl border-black/10 bg-white text-sm text-slate-950 dark:border-white/10 dark:bg-black/20 dark:text-white lg:border-white/10 lg:bg-[#171717] lg:text-white"
                    placeholder="What should FaceMeX check for you?"
                  />
                  <input
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm text-slate-950 outline-none dark:border-white/10 dark:bg-black/20 dark:text-white lg:border-white/10 lg:bg-[#171717] lg:text-white"
                    placeholder="Email address for updates"
                  />
                </div>

                <div className="rounded-2xl bg-[#242424] p-3 text-white lg:bg-[#242424]">
                  <p className="mb-3 px-1 text-sm font-semibold">How often should FaceMeX run this?</p>
                  {[
                    ['every_morning', 'Every morning'],
                    ['every_afternoon', 'Every afternoon'],
                    ['twice_day', 'Twice a day'],
                    ['hourly', 'Hourly'],
                  ].map(([value, label], index) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => createScheduledTask(value as ScheduledTask['frequency'])}
                      disabled={scheduleBusy}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs">{index + 1}</span>
                      <span>{label}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setScheduleStep('custom')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs">5</span>
                    <span>Add another schedule</span>
                  </button>
                </div>
              </div>
              ) : (
                <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-white/60 lg:text-white/60">Choose a schedule type.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['every_morning', 'every_afternoon', 'twice_day', 'hourly'] as ScheduledTask['frequency'][]).map((frequency) => (
                    <button
                      key={frequency}
                      type="button"
                      onClick={() => createScheduledTask(frequency)}
                      className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-left text-sm font-semibold text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white lg:border-white/10 lg:bg-white/5 lg:text-white"
                    >
                      {scheduleFrequencyLabel(frequency)}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setScheduleStep('choose')} className="w-full rounded-2xl lg:text-white lg:hover:bg-white/10">
                  Back
                </Button>
              </div>
            )}

              {scheduledTasks.length > 0 && (
                <div className="mt-4 rounded-2xl border border-black/5 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.06] lg:border-white/10 lg:bg-[#171717]">
                <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-white/50 lg:text-white/50">Active schedules</p>
                <div className="space-y-2">
                  {scheduledTasks.map((task) => (
                    <div key={task.id} className="rounded-xl bg-white p-3 text-xs text-slate-600 dark:bg-white/[0.06] dark:text-white/60 lg:bg-white/5 lg:text-white/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-950 dark:text-white lg:text-white">{scheduleFrequencyLabel(task.frequency)}</div>
                          <div className="mt-1 whitespace-pre-wrap break-words">{task.prompt}</div>
                          <div className="mt-1 text-slate-400">Email: {task.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteScheduledTask(task.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 lg:hover:bg-red-500/10"
                          aria-label="Delete scheduled update"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {globalSearchOpen && (
        <div className="fixed inset-0 z-[85] bg-white/60 px-4 pt-4 backdrop-blur-xl lg:hidden" onClick={() => setGlobalSearchOpen(false)}>
          <div
            className="mx-auto mt-2 max-h-[82dvh] w-full max-w-[440px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 p-3">
              <Search className="h-5 w-5 shrink-0 text-slate-500" />
              <input
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && clean(globalSearchQuery)) {
                    setGlobalSearchOpen(false);
                    openWatchSearch(globalSearchQuery);
                  }
                }}
                autoFocus
                placeholder="Search FaceMeX, recents, topics, videos..."
                className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-950 outline-none placeholder:text-slate-500 dark:placeholder:text-white/45 lg:placeholder:text-white/45"
              />
              <button
                type="button"
                onClick={() => setGlobalSearchOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70dvh] overflow-y-auto p-3">
              {(() => {
                const q = clean(globalSearchQuery).toLowerCase();
                const matches = (text: string) => !q || clean(text).toLowerCase().includes(q);
                const recentResults = chatSessions.filter((session) => matches(session.title)).slice(0, 6);
                const topicResults = youtubeLessonCategories.filter((category) => matches(`${category.label} ${category.description} ${category.badge}`)).slice(0, 8);

                return (
                  <div className="space-y-5">
                    <section>
                      <h3 className="px-2 text-[13px] font-semibold text-slate-500">Features</h3>
                      <div className="mt-2 space-y-1">
                        {[
                          { label: 'Job Library', icon: Briefcase, action: () => { setActiveLibrarySection('jobs'); setLibraryOpen(true); } },
                          { label: 'Investors Library', icon: Building2, action: () => { setActiveLibrarySection('investors'); setLibraryOpen(true); } },
                          { label: 'Students Library', icon: Users, action: () => { setActiveLibrarySection('students'); setLibraryOpen(true); } },
                          { label: 'Scheduled', icon: CalendarDays, action: () => openSchedulePanel() },
                          { label: 'Job Tracker', icon: Clock, action: () => setTrackerOpen(true) },
                        ]
                          .filter((item) => matches(item.label))
                          .map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  setGlobalSearchOpen(false);
                                  item.action();
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-medium text-slate-900 transition hover:bg-slate-50 lg:text-white lg:hover:bg-white/10"
                              >
                                <Icon className="h-5 w-5 text-slate-500" />
                                {item.label}
                              </button>
                            );
                          })}
                      </div>
                    </section>

                    {(q || topicResults.length > 0) && (
                      <section>
                        <h3 className="px-2 text-[13px] font-semibold text-slate-500">YouTube topics</h3>
                        <div className="mt-2 space-y-1">
                          {topicResults.map((category) => (
                            <button
                              key={`${category.library}-${category.label}`}
                              type="button"
                              onClick={() => {
                                setGlobalSearchOpen(false);
                                setLibraryOpen(true);
                                openYoutubeLessonCategory(category);
                              }}
                              className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                            >
                              <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-slate-950">{category.label}</span>
                                <span className="mt-0.5 line-clamp-1 block text-[12px] text-slate-500">{category.description}</span>
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500">{category.badge}</span>
                            </button>
                          ))}

                          {q && (
                            <button
                              type="button"
                              onClick={() => {
                                setGlobalSearchOpen(false);
                                openWatchSearch(globalSearchQuery);
                              }}
                              className="flex w-full items-center gap-3 rounded-2xl bg-slate-950 px-3 py-3 text-left text-[15px] font-semibold text-white transition active:scale-[0.99]"
                            >
                              <Globe2 className="h-5 w-5" />
                              Search YouTube for “{globalSearchQuery}”
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {recentResults.length > 0 && (
                      <section>
                        <h3 className="px-2 text-[13px] font-semibold text-slate-500">Recents</h3>
                        <div className="mt-2 space-y-1">
                          {recentResults.map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => {
                                setGlobalSearchOpen(false);
                                openChatSession(session);
                              }}
                              className="block w-full rounded-2xl px-3 py-3 text-left text-[15px] text-slate-800 transition hover:bg-slate-50"
                            >
                              {session.title || 'New chat'}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {jobsOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[3px] lg:hidden" onClick={() => setJobsOpen(false)}>
          <div
            className="fm-premium-drawer absolute left-0 top-0 flex h-full w-[88vw] max-w-[390px] flex-col overflow-hidden rounded-r-[28px] bg-white text-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-[92px] shrink-0 items-center justify-between px-5 pt-4">
              <div className="min-w-0">
                <h2 className="truncate text-[28px] font-semibold tracking-[-0.045em] text-slate-950">FaceMeX</h2>
                <p className="mt-1 truncate text-[13px] text-slate-500">Your AI workspace</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJobsOpen(false);
                    setGlobalSearchOpen(true);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-900 shadow-sm transition active:scale-[0.98] hover:bg-slate-200 lg:bg-black lg:text-white lg:border-white/10 lg:hover:bg-white/5"
                  aria-label="Search FaceMeX"
                >
                  <Search className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJobsOpen(false);
                    navigate('/feed');
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-[0_10px_25px_rgba(16,185,129,0.28)] ring-4 ring-emerald-500/10 transition active:scale-[0.98] hover:bg-emerald-600"
                  aria-label="Back to FaceMeX feed"
                >
                  {firstName?.[0]?.toUpperCase() || 'F'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-2">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setJobsOpen(false);
                    setLibraryOpen(true);
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <FileText className="h-5 w-5 text-slate-900" />
                  Library
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLibrarySection('jobs');
                    setJobsOpen(false);
                    setLibraryOpen(true);
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <Briefcase className="h-5 w-5 text-slate-900" />
                  Job Library
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLibrarySection('investors');
                    setJobsOpen(false);
                    setLibraryOpen(true);
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <Building2 className="h-5 w-5 text-slate-900" />
                  Investors Library
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveLibrarySection('students');
                    setJobsOpen(false);
                    setLibraryOpen(true);
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <Users className="h-5 w-5 text-slate-900" />
                  Students Library
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJobsOpen(false);
                    openSchedulePanel();
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <CalendarDays className="h-5 w-5 text-slate-900" />
                  Scheduled
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJobsOpen(false);
                    setTrackerOpen(true);
                  }}
                  className="fm-drawer-row flex w-full items-center gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <Clock className="h-5 w-5 text-slate-900" />
                  Job Tracker
                </button>

                <button
                  type="button"
                  onClick={() => setWatchPanelOpen((value) => !value)}
                  className="fm-drawer-row mt-2 flex w-full items-center justify-between gap-4 px-3 py-3 text-left text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition hover:bg-slate-100"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <Globe2 className="h-5 w-5 text-slate-900" />
                    <span className="min-w-0 truncate">Watch</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${watchPanelOpen ? 'rotate-180' : ''}`} />
                </button>

                {watchPanelOpen && (
                  <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] lg:bg-[#0b0b0b] lg:border-white/10 lg:text-white">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 lg:bg-[#111] lg:border-white/10 lg:text-white">
                      <Search className="h-4 w-4 shrink-0 text-slate-500" />
                      <input
                        value={watchSearch}
                        onChange={(e) => setWatchSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openWatchSearch();
                        }}
                        placeholder="Search useful videos..."
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-500 dark:placeholder:text-white/45 lg:placeholder:text-white/45"
                      />
                      <button
                        type="button"
                        onClick={() => openWatchSearch()}
                        className="rounded-full bg-slate-950 px-3 py-1.5 text-[12px] font-semibold text-white transition active:scale-[0.98]"
                      >
                        Search
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {watchBusy ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading useful videos...
                        </div>
                      ) : watchVideos.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-3 text-[13px] leading-5 text-slate-500">
                          Search any lesson, funding topic, investor topic, or job guide and watch inside FaceMeX.
                        </div>
                      ) : (
                        watchVideos.slice(0, 3).map((video) => {
                          const isPlaying = watchPlayingVideoId === video.videoId;

                          return (
                            <div key={video.videoId} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                              <div className="relative aspect-video bg-slate-950">
                                {isPlaying ? (
                                  <iframe
                                    src={video.embedUrl}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="h-full w-full"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setWatchPlayingVideoId(video.videoId)}
                                    className="group relative h-full w-full overflow-hidden bg-slate-950 text-left"
                                  >
                                    {video.thumbnail ? (
                                      <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                                    ) : null}
                                    <span className="absolute inset-0 bg-black/20" />
                                    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-lg">
                                      ▶
                                    </span>
                                  </button>
                                )}
                              </div>

                              <div className="p-3">
                                <p className="line-clamp-2 text-[14px] font-semibold leading-5 tracking-[-0.02em] text-slate-950">
                                  {video.title}
                                </p>
                                <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">{video.channelTitle || 'YouTube'}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-7">
                <h3 className="fm-drawer-heading">Pinned</h3>
                <div className="mt-3 space-y-1">
                  {[
                    { label: 'Find jobs', action: () => quickAsk('I am looking for a job in Tzaneen. Search automatically and show me current available jobs with apply links.') },
                    { label: 'Build My CV', action: openCvBuilder },
                    { label: 'Cover Letter AI', action: openCoverLetterBuilder },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setJobsOpen(false);
                        item.action();
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left text-[15px] text-slate-800 transition hover:bg-slate-100"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm">
                        <MessageCircleIcon />
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {chatSessions.length > 0 && (
                <div className="mt-7">
                  <h3 className="fm-drawer-heading">Recents</h3>
                  <div className="mt-3 space-y-1">
                    {chatSessions.slice(0, 10).map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setJobsOpen(false);
                          openChatSession(session);
                        }}
                        className={`block w-full rounded-2xl px-3 py-3 text-left text-[15px] leading-snug transition hover:bg-slate-100 ${
                          session.id === activeSessionId ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700'
                        }`}
                      >
                        <span className="line-clamp-2">{session.title || 'New chat'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-end bg-gradient-to-t from-white via-white to-white/0 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  setJobsOpen(false);
                  openNewChatCard();
                }}
                className="fm-drawer-chat-button pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full bg-blue-500 px-7 text-[17px] font-semibold text-white transition active:scale-[0.98] hover:bg-blue-600"
              >
                <Edit3 className="h-5 w-5" />
                Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {subscriptionOpen && (
        <SubscriptionModal
          currentTier={currentTier}
          onClose={() => setSubscriptionOpen(false)}
        />
      )}
      
    </div>
  );
}



