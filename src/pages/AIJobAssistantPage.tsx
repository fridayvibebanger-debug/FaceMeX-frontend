import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
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

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Career Plan',
  cv_advice: 'CV Advice',
  application_message: 'Application Message',
  research: 'Research',
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
    /(investor|investors|funding|funder|funders|grant|grants|venture|angel|vc|raise capital|capital|startup|pitch|business opportunity|business opportunities|partnership|network with tech|networking|accelerator|incubator)/i.test(
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

function buildVacancySources(input?: {
  role?: string;
  location?: string;
  industry?: string;
  workMode?: string;
}) {
  const role = clean(input?.role || '') || 'jobs';
  const location = clean(input?.location || '') || 'South Africa';
  const industry = clean(input?.industry || '');
  const workMode = clean(input?.workMode || '');

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
- grants
- networking
- startup growth
- fake job checks
- opportunity safety

Important rules:
1. First understand the user's intent.
2. If the user asks about investors, funding, startup networking, business opportunities, grants, partnerships, or business growth, do not answer as if they are asking for a job.
3. If the user asks for latest jobs, explain where to search and how to apply. Do not invent fake live vacancies.
4. If the user asks for email, write an email.
5. If the user asks for WhatsApp/message, write a short message.
6. If the user asks for apply message, give both a WhatsApp message and an email.
7. Every answer must include:
   - Direct answer
   - Action plan
   - Copy-ready message/email/script
   - Safety check when money, jobs, documents, grants, or opportunities are involved
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
}) {
  if (input.intent === 'investors-and-networking') {
    return `Direct answer:
Yes, you can ask about funding, grants, investors, and business opportunities inside FaceMeX Career Workspace.

If your business is not registered yet, you may still qualify for some idea-stage grants, competitions, incubators, and youth entrepreneurship programs. But most formal funders will eventually ask for CIPC registration, tax compliance, bank statements, and business documents.

Action plan:
1. Identify if the opportunity accepts individuals or only registered companies.
2. Prepare a short business summary.
3. Register your business if the funder requires CIPC documents.
4. Avoid anyone asking for upfront payment to guarantee funding.
5. Save the useful answer in your workspace for later.

Copy-ready message:
Good day. I would like to apply for this funding/grant opportunity. Please may you confirm if applicants must have a registered company, or if idea-stage and pre-registration applicants are accepted?

Safety check:
Do not pay anyone who promises guaranteed funding. Real funders review documents, traction, problem, market, and risk.`;
  }

  if (input.intent === 'verify-opportunity') {
    return `Direct answer:
This opportunity must be checked before you send money, ID copies, bank details, certificates, or personal documents.

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
1. Add the company name.
2. Attach your CV.
3. Add your phone number.
4. Send it during working hours.
5. Follow up after 3 to 5 working days.

Copy-ready email:
Subject: Application for Opportunity

Good day,

I hope you are well.

I would like to apply for the available opportunity at your company. I am interested in this role and would appreciate the chance to submit my CV for consideration.

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
Good day. I hope you are well. I am interested in the opportunity. Please may I ask where I can send my CV or how I can apply? Thank you.

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
Thank you for the opportunity. My name is [Name]. I am reliable, willing to learn, and focused on adding value to the team. I believe I can do well in this role because I am disciplined, respectful, and ready to improve every day.

Safety check:
Never pay for an interview or placement.`;
  }

  if (input.intent === 'cv-profile') {
    return `Direct answer:
Your CV must show your role, location, skills, and proof that you can do the work.

Action plan:
1. Add a clear headline.
2. Add a short profile summary.
3. Add 5 to 8 relevant skills.
4. Add work experience, projects, volunteering, or school achievements.
5. Keep the CV clean and easy to read.

Copy-ready CV profile:
I am a motivated candidate looking for career opportunities. I am reliable, willing to learn, and able to work with people professionally. I am looking for a role where I can grow, contribute, and build strong work experience.

Safety check:
Do not include ID numbers or bank details on your CV.`;
  }

  if (input.intent === 'job-search') {
    return `Direct answer:
You can use FaceMeX Career Workspace to plan your job search, improve your CV, write application messages, prepare for interviews, and check risky opportunities.

Action plan:
1. Search daily on Indeed, LinkedIn Jobs, Careers24, PNet, DPSA, Facebook groups, and company websites.
2. Apply within 24 to 48 hours.
3. Message local businesses directly.
4. Track every application.
5. Follow up after 3 to 5 working days.

Copy-ready message:
Good day. I am looking for job opportunities. Please may I ask if you are hiring or accepting CVs? I am available to send my CV. Thank you.

Safety check:
Avoid job posts that ask for upfront money, banking details, or ID copies before you verify the company.`;
  }

  if (input.intent === 'research') {
    return `Direct answer:
FaceMeX Career Workspace can help you research jobs, companies, grants, funders, business ideas, and career options.

Action plan:
1. Write down exactly what you want to find.
2. Search official sources first.
3. Compare at least 3 sources.
4. Save the useful answer.
5. Take one action immediately.

Copy-ready research prompt:
Please help me research [company/opportunity/topic]. I want to know what it does, who it helps, what opportunities exist, what risks I should check, and what action I should take today.

Safety check:
Do not trust screenshots only. Verify opportunities from official sources before paying or sending documents.`;
  }

  return `Direct answer:
FaceMeX Career Workspace can help you think clearly, apply smarter, and avoid risky opportunities.

Action plan:
1. Be clear about what you want.
2. Ask one direct question.
3. Save the useful answer.
4. Take one action today.
5. Follow up in 3 to 5 working days.

Copy-ready message:
Good day. I am interested in this opportunity. Please may you advise the correct process or contact person? Thank you.

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
  'w-full overflow-hidden rounded-[28px] border border-black/5 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]';

const softButton =
  'rounded-2xl border border-black/5 bg-white/90 text-slate-950 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.09]';

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { tier, hasTier } = useUserStore();

  const currentTier = normalizeTier(tier);
  const creatorPlus = isCreatorPlusTier(currentTier, hasTier);
  const deepSeekLimit = getDeepSeekDailyLimit(currentTier, hasTier);

  const [deepSeekUsage, setDeepSeekUsage] = useState(0);
  const [prompt, setPrompt] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SearchLink[]>([]);
  const [radarCards, setRadarCards] = useState<SearchLink[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const [busy, setBusy] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

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
      const rawMessages = localStorage.getItem('facemex_opportunities_workspace_messages');
      setMessages(rawMessages ? JSON.parse(rawMessages) : []);
    } catch {
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
    if (!workspaceOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, workspaceOpen]);

  const recordDeepSeekUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const cleanPrompt = clean(overridePrompt || prompt);

    if (!cleanPrompt) {
      setWorkspaceOpen(true);
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
            ? 'Free users can use basic workspace answers.'
            : 'Your Pro AI limit is finished for today. Built-in answer was used.',
      });

      setBusy(false);
      return;
    }

    try {
      const res = (await api.post('/api/ai/pro/job-assistant', {
        prompt: cleanPrompt,
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

  const quickAsk = (text: string) => {
    sendPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

    toast({ title: `${savedCategoryLabels[category]} saved`, description: 'Saved in Workspace.' });
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

  const clearSavedItems = () => {
    setMessages((prev) =>
      prev.map((message) => ({
        ...message,
        saved: false,
        savedCategory: undefined,
      }))
    );

    toast({ title: 'Saved items cleared', description: 'Your saved workspace list is now empty.' });
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

  const quickButtons = [
    ['Find opportunities', 'I am looking for job opportunities. Help me find opportunities and apply smart.'],
    ['Interview prep', 'Help me prepare for an interview. Give me questions and strong answers.'],
    ['Send my CV', 'Write a professional email and WhatsApp message to send my CV for an opportunity.'],
    ['Check fake job', 'Help me check if this job or opportunity looks fake or risky.'],
    ['Find investors', 'Where can I find investors, funders, or grant opportunities in South Africa?'],
    ['Research anything', 'Help me research opportunities, companies, grants, jobs, and career options.'],
  ] as const;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 pb-40 pt-14 sm:px-4 md:pt-20">
        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-8 sm:py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-lg dark:bg-white dark:text-black">
              <MessageCircle className="h-8 w-8" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {creatorPlus ? (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  Creator+: Unlimited AI
                </Badge>
              ) : currentTier === 'pro' ? (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  Pro AI: {deepSeekUsage}/10 today
                </Badge>
              ) : (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  Free: basic workspace help
                </Badge>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              FaceMeX Career Workspace
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-white/55 sm:text-base">
              Ask about jobs, CVs, interviews, research, business opportunities, and career growth.
            </p>

            <div className="mt-5 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about jobs, CVs, interviews..."
                className="h-10 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
              />

              <Button
                onClick={() => sendPrompt()}
                disabled={busy}
                className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
              {quickButtons.map(([label, text]) => (
                <Button
                  key={label}
                  onClick={() => quickAsk(text)}
                  variant="outline"
                  className="h-10 rounded-full border-black/10 bg-white/80 px-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              onClick={() => setWorkspaceOpen(true)}
              className="mt-6 h-12 rounded-2xl bg-slate-950 px-8 text-white shadow-lg dark:bg-white dark:text-black"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Open workspace
            </Button>

            {deepSeekLimit !== null && (
              <p className="mt-3 text-xs text-slate-400">
                AI uses left today: {remainingDeepSeekUses}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Briefcase className="h-5 w-5" />
                Opportunity Radar
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-white/50">
                Discover trusted job sources faster.
              </p>
            </div>

            {activeRadarCard && (
              <a
                href={activeRadarCard.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[24px] border border-black/5 bg-white p-3 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                    {activeRadarCard.image ? (
                      <img src={activeRadarCard.image} alt={activeRadarCard.label} className="h-9 w-9 rounded-xl object-contain" />
                    ) : (
                      <Briefcase className="h-7 w-7 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-semibold">{activeRadarCard.label}</h3>
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
                  className={`flex min-w-[76px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-[11px] transition ${
                    activeCard === index
                      ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-black/5 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.04]'
                  }`}
                >
                  {link.image && <img src={link.image} alt={link.label} className="h-6 w-6 rounded-lg object-contain" />}
                  <span className="line-clamp-1 max-w-[58px]">{link.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col gap-3 p-5 text-center text-sm text-slate-500 dark:text-white/55">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              <span>Soon you’ll receive alerts when new jobs and opportunities match your profile.</span>
            </div>

            <Button size="sm" variant="ghost" onClick={() => navigate('/pricing')} className="mx-auto rounded-full">
              View tiers
            </Button>
          </CardContent>
        </Card>
      </main>

      {!workspaceOpen && (
        <button
          type="button"
          onClick={() => setWorkspaceOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.25)] dark:bg-white dark:text-black"
          aria-label="Open FaceMeX Career Workspace"
        >
          <MessageCircle className="h-6 w-6" />
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

            <div className="flex shrink-0 items-center gap-1">
              <Button onClick={() => setSavedOpen(true)} size="icon" variant="ghost" className="h-10 w-10 rounded-full">
                <Save className="h-5 w-5" />
              </Button>

              <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-4">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {messages.length === 0 && !busy && (
                <div className="flex min-h-[56vh] flex-col items-center justify-center px-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white dark:bg-white dark:text-black">
                    <Sparkles className="h-8 w-8" />
                  </div>

                  <h2 className="mt-5 text-2xl font-semibold">
                    What do you need help with?
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-white/55">
                    Ask about jobs, CVs, interviews, applications, investors, research, and opportunity safety.
                  </p>

                  <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
                    {quickButtons.map(([label, text]) => (
                      <Button
                        key={label}
                        variant="outline"
                        onClick={() => quickAsk(text)}
                        className="rounded-full border-black/10 bg-white/80 text-xs shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:text-sm"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92vw] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
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
                      <div className="max-h-[52vh] overflow-y-auto pr-1">
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

          {savedOpen && (
            <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setSavedOpen(false)}>
              <div
                className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0f0f0f]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
                  <div>
                    <h2 className="text-base font-semibold">Saved</h2>
                    <p className="text-[11px] text-slate-500 dark:text-white/45">Workspace history</p>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => setSavedOpen(false)} className="h-10 w-10 rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={savedFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setSavedFilter('all')}
                      className="h-9 rounded-full px-4 text-xs"
                    >
                      All
                    </Button>

                    {(['career_plan', 'cv_advice', 'application_message', 'research'] as SavedCategory[]).map((category) => (
                      <Button
                        key={category}
                        variant={savedFilter === category ? 'default' : 'outline'}
                        onClick={() => setSavedFilter(category)}
                        className="h-9 rounded-full px-4 text-xs"
                      >
                        {savedCategoryLabels[category]} ({savedStats[category]})
                      </Button>
                    ))}
                  </div>

                  <div className="mt-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Recent
                    </h3>

                    {visibleSavedMessages.length === 0 ? (
                      <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50">
                        No saved items yet. Save useful answers from your workspace.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visibleSavedMessages.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSavedOpen(false)}
                            className="block w-full rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                                <FileText className="h-4 w-4 text-slate-500" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 text-sm font-semibold">
                                  {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                                </div>

                                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                                  {item.content}
                                </div>
                              </div>

                              <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <Button
                    variant="ghost"
                    onClick={clearSavedItems}
                    className="w-full rounded-2xl text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear saved items
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
