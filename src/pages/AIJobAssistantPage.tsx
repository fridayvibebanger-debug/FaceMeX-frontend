import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Briefcase,
  Building2,
  ChevronRight,
  Crown,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
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
import { trackEvent } from '@/lib/analytics';

type SearchLink = {
  label: string;
  url: string;
  note?: string;
  category?: 'jobs' | 'social' | 'government' | 'interview' | 'email' | 'nearby';
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: SearchLink[];
  createdAt: string;
};

type Reminder = {
  id: string;
  role: string;
  location: string;
  frequency: string;
  createdAt: string;
};

function clean(value: string) {
  return String(value || '').trim();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeTag(value: string) {
  return encodeURIComponent(
    String(value || 'jobs')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
  );
}

function encodeSearchQuery(parts: string[]) {
  const text = parts.filter(Boolean).join(' ').trim();
  return encodeURIComponent(text || 'jobs vacancies near me');
}

function normalizeTier(tier?: string | null) {
  return String(tier || 'free').toLowerCase();
}

function isCreatorPlusTier(tier: string, hasTier?: (tier: string) => boolean) {
  return (
    hasTier?.('creator') ||
    tier === 'creator' ||
    tier === 'business' ||
    tier === 'exclusive'
  );
}

function getDailyLimit(tier: string, hasTier?: (tier: string) => boolean) {
  if (isCreatorPlusTier(tier, hasTier)) return null;
  if (tier === 'pro') return 20;
  return 4;
}

function getUsageKey(tier: string) {
  return `facemex_job_assistant_ai_usage_${tier || 'free'}_${todayKey()}`;
}

function getUsage(tier: string) {
  try {
    return Number(localStorage.getItem(getUsageKey(tier)) || 0);
  } catch {
    return 0;
  }
}

function increaseUsage(tier: string) {
  try {
    const key = getUsageKey(tier);
    const current = Number(localStorage.getItem(key) || 0);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
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

  const query = encodeSearchQuery([
    role,
    industry,
    location,
    workMode,
    'vacancies jobs hiring apply',
  ]);

  const recentQuery = encodeSearchQuery([
    role,
    industry,
    location,
    workMode,
    'latest vacancies apply now',
  ]);

  const roleTag = safeTag(role);
  const locationTag = safeTag(location || 'south africa');

  return [
    {
      label: 'Indeed South Africa',
      url: `https://za.indeed.com/jobs?q=${query}`,
      note: 'General jobs, admin, retail, driver, office, and entry-level posts.',
      category: 'jobs',
    },
    {
      label: 'PNet jobs',
      url: `https://www.pnet.co.za/jobs/${query}`,
      note: 'Formal company vacancies and professional roles.',
      category: 'jobs',
    },
    {
      label: 'DPSA government vacancies',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official South African government vacancy circular.',
      category: 'government',
    },
    {
      label: 'Careers24 jobs',
      url: `https://www.careers24.com/jobs/?query=${query}`,
      note: 'South African job listings across different provinces.',
      category: 'jobs',
    },
    {
      label: 'LinkedIn jobs',
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}`,
      note: 'Office, tech, sales, internships, admin, and professional roles.',
      category: 'jobs',
    },
    {
      label: 'Google latest vacancies',
      url: `https://www.google.com/search?q=${recentQuery}&tbs=qdr:w`,
      note: 'Recent vacancies from company pages, PDFs, and agencies.',
      category: 'jobs',
    },
    {
      label: 'Facebook vacancy posts',
      url: `https://www.facebook.com/search/posts/?q=${query}`,
      note: 'Local shops, community vacancies, small businesses, and urgent posts.',
      category: 'social',
    },
    {
      label: 'Facebook job groups',
      url: `https://www.facebook.com/search/groups/?q=${query}`,
      note: 'Join groups and check pinned posts daily.',
      category: 'social',
    },
    {
      label: 'Instagram role hashtag',
      url: `https://www.instagram.com/explore/tags/${roleTag}/`,
      note: 'Check business pages and stories for hiring posts.',
      category: 'social',
    },
    {
      label: 'Instagram local jobs hashtag',
      url: `https://www.instagram.com/explore/tags/${locationTag}jobs/`,
      note: 'Useful for local hiring around your area.',
      category: 'social',
    },
    {
      label: 'X / Twitter live hiring search',
      url: `https://x.com/search?q=${query}&src=typed_query&f=live`,
      note: 'Live recruiter posts and company vacancy announcements.',
      category: 'social',
    },
    {
      label: 'Google jobs near me',
      url: `https://www.google.com/search?q=${encodeSearchQuery([role, 'jobs near me vacancies hiring'])}`,
      note: 'Uses browser/location signals to show nearby vacancies.',
      category: 'nearby',
    },
  ] as SearchLink[];
}

function buildGodfreyPandekaRadar(input: { role: string; location: string }) {
  const role = clean(input.role) || 'jobs';
  const location = clean(input.location) || 'South Africa';

  const query = encodeSearchQuery([
    'Godfrey Pandeka',
    role,
    location,
    'vacancies jobs hiring apply',
  ]);

  const generalQuery = encodeSearchQuery([
    'Godfrey Pandeka',
    'job vacancies',
    'South Africa',
  ]);

  return [
    {
      label: 'Godfrey Pandeka vacancy posts',
      url: `https://www.facebook.com/search/posts/?q=${query}`,
      note: 'Facebook search for public vacancy posts linked to Godfrey Pandeka.',
      category: 'social',
    },
    {
      label: 'Godfrey Pandeka latest job posts',
      url: `https://www.facebook.com/search/posts/?q=${generalQuery}`,
      note: 'Check recent public vacancy posts manually.',
      category: 'social',
    },
    {
      label: 'Facebook local vacancy posts',
      url: `https://www.facebook.com/search/posts/?q=${encodeSearchQuery([role, location, 'vacancies hiring apply'])}`,
      note: 'Nearby public vacancy posts on Facebook.',
      category: 'social',
    },
  ] as SearchLink[];
}

function buildInterviewAnswer(input: {
  role: string;
  experienceLevel: string;
  industry: string;
}) {
  const role = clean(input.role) || 'the role';
  const level = clean(input.experienceLevel) || 'your experience level';
  const industry = clean(input.industry) || 'the industry';

  return `Interview preparation for ${role}

1. Tell me about yourself
“I am a ${level} candidate interested in ${role}. I have skills and experience related to ${industry}. I am reliable, willing to learn, and I am looking for an opportunity where I can contribute and grow.”

2. Why do you want this job?
“I’m interested in this role because it matches my skills and career goals. I also want to work in a place where I can add value, learn quickly, and become reliable for the team.”

3. What are your strengths?
• Reliable
• Fast learner
• Good communication
• Teamwork
• Problem-solving
• Willing to work under pressure

4. What is your weakness?
“One area I’m improving is confidence in interviews. I’m working on it by preparing better and practicing how to explain my skills clearly.”

5. Why should we hire you?
“You should hire me because I am serious about the opportunity, I am willing to learn, I respect time, and I will do the work properly. I may still be growing, but I am committed and dependable.”

6. Questions to ask the employer:
• What does success look like in this role?
• What are the working hours?
• Is there training for new employees?
• When can I expect feedback?

Quick rule:
Do not sound desperate. Sound prepared, respectful, and ready.`;
}

function buildEmailTemplates(input: {
  role: string;
  company: string;
  contactPerson: string;
}) {
  const role = clean(input.role) || '[role]';
  const company = clean(input.company) || '[company]';
  const person = clean(input.contactPerson);

  const apply = `Good day${person ? ` ${person}` : ''},

I hope you are well.

I am interested in the ${role} opportunity at ${company}. I would like to apply or send my CV for consideration.

Please may you advise where I should send my CV, or who the correct person/department is for this application?

Kind regards`;

  const followUp = `Good day${person ? ` ${person}` : ''},

I hope you are well.

I am following up on my application for the ${role} opportunity at ${company}.

I would appreciate any update when available.

Kind regards`;

  const directMessage = `Good day, I saw your vacancy/post for ${role}. I am interested and available to send my CV. Please may I ask where I can apply or who I should contact?`;

  return { apply, followUp, directMessage };
}

function buildLocalAnswer(input: {
  prompt: string;
  role: string;
  location: string;
  industry: string;
  workMode: string;
  experienceLevel: string;
  company: string;
  contactPerson: string;
}) {
  const prompt = input.prompt.toLowerCase();
  const role = clean(input.role) || 'your target role';
  const location = clean(input.location) || 'South Africa';
  const industry = clean(input.industry) || 'your preferred industry';

  if (prompt.includes('interview') || prompt.includes('prepare')) {
    return buildInterviewAnswer({
      role,
      experienceLevel: input.experienceLevel,
      industry,
    });
  }

  if (
    prompt.includes('email') ||
    prompt.includes('message') ||
    prompt.includes('cv') ||
    prompt.includes('send')
  ) {
    const templates = buildEmailTemplates({
      role,
      company: input.company,
      contactPerson: input.contactPerson,
    });

    return `Here are professional messages you can use:

APPLICATION EMAIL

${templates.apply}

FOLLOW-UP EMAIL

${templates.followUp}

WHATSAPP / FACEBOOK DM

${templates.directMessage}

Safety tip:
Use official company emails or verified pages first. Avoid paying any “registration fee” or “placement fee”.`;
  }

  if (
    prompt.includes('facebook') ||
    prompt.includes('godfrey') ||
    prompt.includes('pandeka')
  ) {
    return `Facebook vacancy method:

1. Open the Godfrey Pandeka vacancy search cards below.
2. Search posts, not only pages.
3. Sort by recent if Facebook allows it.
4. Look for posts with:
• role title
• company/branch name
• location
• closing date
• official contact
• no upfront payment

Important:
FaceMeX cannot privately pull Facebook posts without official Facebook API access and permission. The safe method is to open live Facebook search results and verify each vacancy before applying.`;
  }

  return `Job search plan for ${role} in ${location}

1. Search daily using the vacancy cards below:
• Indeed South Africa
• PNet
• DPSA government vacancies
• Careers24
• LinkedIn
• Google recent vacancies
• Facebook vacancy posts
• Facebook job groups

2. Use these keywords:
• ${role} vacancies ${location}
• ${role} hiring ${location}
• ${role} apply now ${location}
• ${industry} ${role} jobs ${location}
• no experience ${role} jobs ${location}
• ${role} email CV ${location}

3. Apply fast:
When you see a new post, apply within 24 hours.

4. Track every application:
Company | Role | Date applied | Platform | Contact | Follow-up date

5. Follow up after 3–5 working days.

6. Avoid scams:
Never pay money to get an interview. Verify the company before sending ID documents.

7. Return daily:
Use FaceMeX Job Assistant every day to search, prepare, and follow up.`;
}

const premiumCard =
  'overflow-hidden rounded-[28px] border border-black/5 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]';

const premiumInput =
  'h-11 rounded-2xl border-black/10 bg-white px-4 text-sm shadow-inner placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

const premiumSelect =
  'h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

const premiumOutlineButton =
  'h-10 rounded-2xl border-black/10 bg-white/80 px-4 text-sm font-medium shadow-sm transition hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]';

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { tier, hasTier } = useUserStore();

  const currentTier = normalizeTier(tier);
  const creatorPlus = isCreatorPlusTier(currentTier, hasTier);
  const dailyLimit = getDailyLimit(currentTier, hasTier);

  const [usageCount, setUsageCount] = useState(0);
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

  const [geoBusy, setGeoBusy] = useState(false);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [geoLabel, setGeoLabel] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const remainingUses = useMemo(() => {
    if (dailyLimit === null) return null;
    return Math.max(0, dailyLimit - usageCount);
  }, [dailyLimit, usageCount]);

  const canAsk = dailyLimit === null || usageCount < dailyLimit;

  useEffect(() => {
    setUsageCount(getUsage(currentTier));

    try {
      const raw = localStorage.getItem('facemex_job_alert_reminders');
      setReminders(raw ? JSON.parse(raw) : []);
    } catch {
      setReminders([]);
    }

    const firstCards = [
      ...buildVacancySources({
        role: 'jobs',
        location: 'South Africa',
        industry: '',
        workMode: '',
      }),
      ...buildGodfreyPandekaRadar({
        role: 'jobs',
        location: 'South Africa',
      }),
    ];

    setRadarCards(firstCards);
    setSourceLinks(firstCards);

    setMessages([
      {
        id: safeId(),
        role: 'assistant',
        content:
          'Welcome to FaceMeX Job Assistant. Tell me the job you want, your location, and your experience level. I’ll help you search, prepare, and apply professionally.',
        links: firstCards.slice(0, 6),
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [currentTier]);

  useEffect(() => {
    if (!radarCards.length) return;

    const timer = window.setInterval(() => {
      setActiveCard((prev) => (prev + 1) % radarCards.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [radarCards.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  const saveReminders = (next: Reminder[]) => {
    setReminders(next);

    try {
      localStorage.setItem('facemex_job_alert_reminders', JSON.stringify(next));
    } catch {}
  };

  const refreshSources = () => {
    const links = [
      ...buildVacancySources({
        role,
        location,
        industry,
        workMode,
      }),
      ...buildGodfreyPandekaRadar({
        role,
        location,
      }),
    ];

    setSourceLinks(links);
    setRadarCards(links);
    setActiveCard(0);

    toast({
      title: 'Vacancy radar refreshed',
      description: 'Job sources updated based on your role and location.',
    });
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
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setNearbyEnabled(true);
        setGeoLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        const nextLocation = location || 'near me';
        setLocation(nextLocation);

        await trackEvent('job_location_enabled', '/ai/job-assistant', {
          lat,
          lng,
          role,
          location: nextLocation,
        });

        toast({
          title: 'Nearby jobs enabled',
          description: 'FaceMeX will prioritize vacancy links near your area while this page is open.',
        });

        setGeoBusy(false);
      },
      () => {
        toast({
          title: 'Location permission denied',
          description: 'You can still type your town or city manually.',
          variant: 'destructive',
        });

        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const enableVacancyAlerts = async () => {
    const frequency = 'daily';

    const reminder: Reminder = {
      id: safeId(),
      role: role || 'jobs',
      location: location || 'South Africa',
      frequency,
      createdAt: new Date().toISOString(),
    };

    saveReminders([reminder, ...reminders]);

    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          new Notification('FaceMeX vacancy alerts enabled', {
            body: `We’ll prioritize ${reminder.role} vacancies around ${reminder.location}.`,
          });

          setAlertEnabled(true);
        }
      } catch {}
    }

    await trackEvent('job_alert_enabled', '/ai/job-assistant', {
      role: reminder.role,
      location: reminder.location,
      frequency,
    });

    toast({
      title: 'Vacancy alert saved',
      description:
        'Your preference is saved. For real background push alerts, connect this later to a server cron + push notifications.',
    });
  };

  const sendPrompt = async () => {
    const cleanPrompt = clean(prompt);

    if (!cleanPrompt && !role && !location && !industry) {
      toast({
        title: 'Ask something first',
        description: 'Type your job question or fill in role/location.',
      });
      return;
    }

    if (!canAsk) {
      toast({
        title: 'Daily limit reached',
        description:
          currentTier === 'pro'
            ? 'You have used your 20 job searches today. Upgrade to Creator+ for unlimited.'
            : 'Free users get 4 job searches per day. Upgrade to Pro for 20 or Creator+ for unlimited.',
        variant: 'destructive',
      });
      return;
    }

    const userQuestion =
      cleanPrompt ||
      `Help me find ${role || 'jobs'} in ${location || 'South Africa'}.`;

    const userMessage: ChatMessage = {
      id: safeId(),
      role: 'user',
      content: userQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setBusy(true);

    const links = [
      ...buildVacancySources({
        role,
        location,
        industry,
        workMode,
      }),
      ...buildGodfreyPandekaRadar({
        role,
        location,
      }),
    ];

    setSourceLinks(links);
    setRadarCards(links);
    setActiveCard(0);

    try {
      const res = (await api.post('/api/ai/pro/job-assistant', {
        prompt: userQuestion,
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        company,
        contactPerson,
        tier: currentTier,
        dailyLimit,
        instruction:
          'You are FaceMeX Job Assistant. Answer like ChatGPT but focused only on jobs, CVs, interviews, job search, applications, vacancies, emails, follow-ups, career planning, PNet, Indeed, DPSA government vacancies, LinkedIn, Facebook vacancy search, and South African opportunities. Be practical, safe, and concise. Do not claim you scraped Facebook. If asked about Godfrey Pandeka vacancies, explain that you can open live Facebook search links and help verify posts.',
      })) as any;

      const answer =
        res?.answer ||
        res?.message ||
        (Array.isArray(res?.suggestions) ? res.suggestions.join('\n\n') : '') ||
        buildLocalAnswer({
          prompt: userQuestion,
          role,
          location,
          industry,
          workMode,
          experienceLevel,
          company,
          contactPerson,
        });

      const assistantMessage: ChatMessage = {
        id: safeId(),
        role: 'assistant',
        content: answer,
        links,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (dailyLimit !== null) {
        setUsageCount(increaseUsage(currentTier));
      }

      await trackEvent('ai_job_assistant_used', '/ai/job-assistant', {
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        hasCompany: !!company,
        tier: currentTier,
        linksGenerated: links.length,
      });
    } catch {
      const answer = buildLocalAnswer({
        prompt: userQuestion,
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        company,
        contactPerson,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          links,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (dailyLimit !== null) {
        setUsageCount(increaseUsage(currentTier));
      }

      await trackEvent('ai_job_assistant_used', '/ai/job-assistant', {
        role,
        location,
        industry,
        workMode,
        experienceLevel,
        tier: currentTier,
        fallback: true,
        linksGenerated: links.length,
      });

      toast({
        title: 'Assistant used offline planner',
        description: 'Backend was unavailable, so FaceMeX generated a built-in job plan.',
      });
    } finally {
      setBusy(false);
    }
  };

  const askQuick = (text: string) => {
    setPrompt(text);
    window.setTimeout(() => {
      const el = document.getElementById('job-assistant-prompt');
      el?.focus();
    }, 0);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast({
        title: 'Copied',
        description: 'Text copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the text manually.',
        variant: 'destructive',
      });
    }
  };

  const emailTemplates = buildEmailTemplates({
    role,
    company,
    contactPerson,
  });

  const activeRadarCard = radarCards[activeCard];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+8rem)] pt-16 sm:px-5 md:pt-20">
        <div className="mb-5 flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Premium AI career assistant</span>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl dark:text-white">
              FaceMeX Job Assistant
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-white/55">
              Search jobs, prepare for interviews, write CV messages, and apply with confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
              {creatorPlus ? (
                <>
                  <Crown className="mr-1 h-3.5 w-3.5 shrink-0" />
                  Unlimited
                </>
              ) : currentTier === 'pro' ? (
                `Pro: ${usageCount}/20 today`
              ) : (
                `Free: ${usageCount}/4 today`
              )}
            </Badge>

            {!creatorPlus && (
              <Button
                size="sm"
                onClick={() => navigate('/pricing')}
                className="rounded-full bg-slate-950 px-4 text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black"
              >
                Upgrade
              </Button>
            )}
          </div>
        </div>

        <div className="grid w-full gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Search className="h-4 w-4" />
                  Job profile
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-white/55">
                    Target role
                  </label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Driver, Admin, General Worker"
                    className={premiumInput}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-white/55">
                    Location
                  </label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Tzaneen, Polokwane, Johannesburg"
                    className={premiumInput}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-white/55">
                      Industry
                    </label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Retail"
                      className={premiumInput}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-white/55">
                      Work mode
                    </label>
                    <select
                      value={workMode}
                      onChange={(e) => setWorkMode(e.target.value)}
                      className={premiumSelect}
                    >
                      <option value="">Any</option>
                      <option value="on-site">On-site</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-white/55">
                    Experience level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className={premiumSelect}
                  >
                    <option value="">Not specified</option>
                    <option value="student / intern">Student / Intern</option>
                    <option value="entry level">Entry level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={enableNearbyJobs}
                    disabled={geoBusy}
                    className={premiumOutlineButton}
                  >
                    {geoBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Nearby
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={enableVacancyAlerts}
                    className={premiumOutlineButton}
                  >
                    {alertEnabled ? (
                      <BellRing className="mr-2 h-4 w-4" />
                    ) : (
                      <Bell className="mr-2 h-4 w-4" />
                    )}
                    Alerts
                  </Button>
                </div>

                {nearbyEnabled && (
                  <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
                    Nearby search enabled: {geoLabel}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={refreshSources}
                  className="h-11 w-full rounded-2xl bg-slate-950 text-sm font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-black"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh radar
                </Button>
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Briefcase className="h-4 w-4" />
                  Vacancy radar
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {activeRadarCard ? (
                  <a
                    href={activeRadarCard.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.25)] transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60">
                          {activeRadarCard.category || 'jobs'}
                        </div>

                        <h3 className="mt-3 text-lg font-semibold leading-tight">
                          {activeRadarCard.label}
                        </h3>

                        <p className="mt-2 text-xs leading-relaxed text-white/60">
                          {activeRadarCard.note}
                        </p>
                      </div>

                      <ExternalLink className="h-4 w-4 shrink-0 text-white/60" />
                    </div>

                    <div className="mt-4 flex gap-1">
                      {radarCards.slice(0, 8).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 rounded-full transition-all ${
                            index === activeCard ? 'w-6 bg-white' : 'w-1.5 bg-white/25'
                          }`}
                        />
                      ))}
                    </div>
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">No vacancy cards yet.</p>
                )}

                <div className="grid gap-2">
                  {sourceLinks.slice(0, 5).map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-3 py-2 text-sm shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{link.label}</div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-white/45">
                          {link.note}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Mail className="h-4 w-4" />
                  Apply messages
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className={premiumInput}
                />

                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Contact person, optional"
                  className={premiumInput}
                />

                <Button
                  type="button"
                  variant="outline"
                  className={`${premiumOutlineButton} w-full justify-start`}
                  onClick={() => copyText(emailTemplates.apply)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Copy application email
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={`${premiumOutlineButton} w-full justify-start`}
                  onClick={() => copyText(emailTemplates.followUp)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Copy follow-up email
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className={`${premiumCard} flex min-h-[74vh] min-w-0 flex-col`}>
            <CardHeader className="border-b border-black/5 bg-white/60 pb-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-slate-700 dark:text-white/70" />
                  Job Assistant
                </CardTitle>

                <Badge className="w-fit rounded-full border border-black/5 bg-slate-100 px-3 py-1 text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-white/70">
                  {dailyLimit === null ? 'Unlimited' : `${remainingUses} searches left`}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['Latest vacancies', 'Find latest vacancies near me and show the best places to search.'],
                    ['Interview prep', 'Help me prepare for an interview.'],
                    ['Email CV', 'Write an email to send my CV for a job.'],
                    ['Facebook jobs', 'Search Facebook vacancies from Godfrey Pandeka and local job posts.'],
                  ].map(([label, text]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => askQuick(text)}
                      className="rounded-full border-black/10 bg-white/80 px-4 text-xs shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-[26px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
                        message.role === 'user'
                          ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                          : 'border border-black/5 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>

                      {message.links && message.links.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {message.links.slice(0, 6).map((link) => (
                            <a
                              key={link.url}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-2 text-xs transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                            >
                              <div className="flex items-center justify-between gap-2 font-semibold">
                                <span className="truncate">{link.label}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </div>

                              {link.note && (
                                <div className="mt-1 text-slate-500 dark:text-white/45">
                                  {link.note}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {busy && (
                  <div className="flex justify-start">
                    <div className="rounded-[26px] border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Building your answer...
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {reminders.length > 0 && (
          <Card className={`${premiumCard} mt-4`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BellRing className="h-4 w-4" />
                Saved vacancy alerts
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-2xl border border-black/5 bg-white/70 p-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="font-semibold">{reminder.role}</div>
                  <div className="text-xs text-slate-500 dark:text-white/45">
                    Location: {reminder.location}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/45">
                    Frequency: {reminder.frequency}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col gap-2 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-white/45">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>
                Real background vacancy notifications can be added later with server cron and push notifications.
              </span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/pricing')}
              className="w-full rounded-full sm:w-auto"
            >
              View tiers
            </Button>
          </CardContent>
        </Card>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[#f7f7f5]/90 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f0f]/90">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#1a1a1a]">
          {!canAsk && (
            <div className="mb-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Daily search limit reached. Free gets 4/day, Pro gets 20/day, Creator+ gets unlimited.
            </div>
          )}

          <Textarea
            id="job-assistant-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask FaceMeX about jobs, CVs, interviews, applications, or vacancies..."
            className="max-h-40 min-h-[56px] resize-none border-0 bg-transparent px-3 py-3 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
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
              <span className="truncate">Verify jobs before sending ID documents or paying anything.</span>
            </div>

            <Button
              type="button"
              onClick={sendPrompt}
              disabled={busy || !canAsk}
              className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white shadow-md transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-black"
              aria-label="Send"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
