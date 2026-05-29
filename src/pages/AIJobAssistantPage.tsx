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
import { trackEvent } from '@/lib/analytics';

type SearchLink = {
  label: string;
  url: string;
  note?: string;
  image?: string;
  category?: 'jobs' | 'social' | 'government' | 'nearby';
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pinned?: boolean;
  saved?: boolean;
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
  return hasTier?.('creator') || tier === 'creator' || tier === 'business' || tier === 'exclusive';
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

function faviconFor(url: string) {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  } catch {
    return '';
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

  const query = encodeSearchQuery([role, industry, location, workMode, 'vacancies jobs hiring apply']);
  const recentQuery = encodeSearchQuery([role, industry, location, workMode, 'latest vacancies apply now']);

  const links: SearchLink[] = [
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
      note: 'South African job listings across provinces.',
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
  ];

  return links.map((link) => ({ ...link, image: faviconFor(link.url) }));
}

function buildEmailTemplates(input: {
  role: string;
  company: string;
  contactPerson: string;
}) {
  const role = clean(input.role) || '[role]';
  const company = clean(input.company) || '[company]';
  const person = clean(input.contactPerson);

  const applyEmail = `Good day${person ? ` ${person}` : ''},

I hope you are well.

I am interested in the ${role} opportunity at ${company}. I would like to apply or submit my CV for consideration.

Please may you advise where I can send my CV or who the correct contact person is for this opportunity.

Kind regards`;

  const followUpEmail = `Good day${person ? ` ${person}` : ''},

I hope you are well.

I am following up regarding my application for the ${role} opportunity at ${company}.

I would appreciate any update regarding the recruitment process when available.

Thank you for your time and consideration.

Kind regards`;

  const whatsappApply = `Good day${person ? ` ${person}` : ''}. I hope you are well. I am interested in the ${role} opportunity at ${company}. Please may I ask where I can send my CV or who I should contact regarding the application? Thank you.`;

  const whatsappFollowUp = `Good day${person ? ` ${person}` : ''}. I hope you are well. I am following up on my application for the ${role} opportunity at ${company}. I would appreciate any update when available. Thank you for your time.`;

  return {
    applyEmail,
    followUpEmail,
    whatsappApply,
    whatsappFollowUp,
  };
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

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const remainingUses = useMemo(() => {
    if (dailyLimit === null) return null;
    return Math.max(0, dailyLimit - usageCount);
  }, [dailyLimit, usageCount]);

  const canAsk = dailyLimit === null || usageCount < dailyLimit;

  useEffect(() => {
    setUsageCount(getUsage(currentTier));

    try {
      const rawAlerts = localStorage.getItem('facemex_job_alert_reminders');
      setReminders(rawAlerts ? JSON.parse(rawAlerts) : []);

      const rawMessages = localStorage.getItem('facemex_job_workspace_messages');
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
      localStorage.setItem('facemex_job_workspace_messages', JSON.stringify(messages));
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

  const refreshSources = () => {
    const links = buildVacancySources({
      role,
      location,
      industry,
      workMode,
    });

    setSourceLinks(links);
    setRadarCards(links);
    setActiveCard(0);

    toast({
      title: 'Vacancy radar refreshed',
      description: 'Job sources updated.',
    });
  };

  const saveReminders = (next: Reminder[]) => {
    setReminders(next);

    try {
      localStorage.setItem('facemex_job_alert_reminders', JSON.stringify(next));
    } catch {}
  };

  const deleteReminder = (id: string) => {
    saveReminders(reminders.filter((item) => item.id !== id));

    toast({
      title: 'Alert deleted',
      description: 'Saved vacancy alert removed.',
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
          description: 'FaceMeX will prioritize vacancy links near your area.',
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
    const reminder: Reminder = {
      id: safeId(),
      role: role || 'jobs',
      location: location || 'South Africa',
      frequency: 'daily',
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

    toast({
      title: 'Vacancy alert saved',
      description: 'Your alert preference has been saved.',
    });
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

    setWorkspaceOpen(true);

    const userQuestion = cleanPrompt;

    setMessages((prev) => [
      ...prev,
      {
        id: safeId(),
        role: 'user',
        content: userQuestion,
        createdAt: new Date().toISOString(),
      },
    ]);

    setPrompt('');
    setBusy(true);

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
          'You are FaceMeX Workspace for Jobseekers. Help with latest vacancies, interview prep, CV emails, WhatsApp job messages, research, applications, career planning, job search strategy, company research, follow-ups, and any practical jobseeker question. Always call DeepSeek to respond. Be practical, clear, and useful. Do not show raw links unless the user asks for links. If researching jobs, suggest using Vacancy Radar and explain what to search.',
      })) as any;

      const answer =
        res?.answer ||
        res?.message ||
        (Array.isArray(res?.suggestions) ? res.suggestions.join('\n\n') : '') ||
        'I could not get a full DeepSeek response. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (dailyLimit !== null) {
        setUsageCount(increaseUsage(currentTier));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content:
            'DeepSeek is currently unavailable. Please try again shortly. Your question was saved in the workspace.',
          createdAt: new Date().toISOString(),
        },
      ]);

      toast({
        title: 'DeepSeek unavailable',
        description: 'The assistant could not get a live AI response right now.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const quickAsk = (text: string) => {
    setWorkspaceOpen(true);
    setPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast({
        title: 'Copied',
        description: 'Text copied.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy manually.',
        variant: 'destructive',
      });
    }
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, pinned: !message.pinned } : message
      )
    );
  };

  const toggleSave = (id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, saved: !message.saved } : message
      )
    );

    toast({
      title: 'Saved',
      description: 'Response saved in workspace.',
    });
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

  const emailTemplates = buildEmailTemplates({
    role,
    company,
    contactPerson,
  });

  const activeRadarCard = radarCards[activeCard];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-24 pt-16 sm:px-5 md:pt-20">
        <div className="mb-5 flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60">
              <Sparkles className="h-3.5 w-3.5" />
              FaceMeX Workspace for Jobseekers
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Jobseeker tools
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-white/55">
              Latest vacancies, interview prep, email CV, WhatsApp messages, research, applications, and more.
            </p>
          </div>

          <Badge className="w-fit rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
            {creatorPlus ? (
              <>
                <Crown className="mr-1 h-3.5 w-3.5" />
                Unlimited
              </>
            ) : currentTier === 'pro' ? (
              `Pro: ${usageCount}/20 today`
            ) : (
              `Free: ${usageCount}/4 today`
            )}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Job profile
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role" className={premiumInput} />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className={premiumInput} />
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" className={premiumInput} />

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
                    Nearby search enabled: {geoLabel}
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
                  Vacancy radar
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {activeRadarCard && (
                  <a href={activeRadarCard.url} target="_blank" rel="noreferrer" className="block rounded-[28px] border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/[0.06]">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/[0.08]">
                        {activeRadarCard.image ? (
                          <img src={activeRadarCard.image} alt={activeRadarCard.label} className="h-10 w-10 rounded-xl object-contain" />
                        ) : (
                          <Briefcase className="h-8 w-8 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-semibold">{activeRadarCard.label}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-white/50">{activeRadarCard.note}</p>
                      </div>

                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </div>
                  </a>
                )}

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sourceLinks.slice(0, 8).map((link, index) => (
                    <button
                      key={link.url}
                      type="button"
                      onClick={() => setActiveCard(index)}
                      className={`flex min-w-[76px] flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-xs ${
                        activeCard === index
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-black/5 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.04]'
                      }`}
                    >
                      {link.image && <img src={link.image} alt={link.label} className="h-7 w-7 rounded-lg object-contain" />}
                      <span className="line-clamp-1 max-w-[60px]">{link.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={premiumCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  Apply messages
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className={premiumInput} />
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person, optional" className={premiumInput} />

                <Button variant="outline" className={`${premiumOutlineButton} w-full justify-start`} onClick={() => copyText(emailTemplates.applyEmail)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Copy application email
                </Button>

                <Button variant="outline" className={`${premiumOutlineButton} w-full justify-start`} onClick={() => copyText(emailTemplates.followUpEmail)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Copy follow-up email
                </Button>

                <Button variant="outline" className={`${premiumOutlineButton} w-full justify-start`} onClick={() => copyText(emailTemplates.whatsappApply)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Copy WhatsApp application
                </Button>

                <Button variant="outline" className={`${premiumOutlineButton} w-full justify-start`} onClick={() => copyText(emailTemplates.whatsappFollowUp)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Copy WhatsApp follow-up
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className={`${premiumCard} flex min-h-[74vh] flex-col items-center justify-center p-6 text-center`}>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white dark:bg-white dark:text-black">
              <MessageCircle className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-semibold">
              FaceMeX Workspace for Jobseekers
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-white/55">
              Latest vacancies, interview prep, email CV, WhatsApp messages, research, applications, and more.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={() => quickAsk('Find latest vacancies near me and help me apply smart.')} variant="outline" className="rounded-full">
                Latest vacancies
              </Button>

              <Button onClick={() => quickAsk('Help me prepare for an interview.')} variant="outline" className="rounded-full">
                Interview prep
              </Button>

              <Button onClick={() => quickAsk('Write an email and WhatsApp message to send my CV for a job.')} variant="outline" className="rounded-full">
                Email CV
              </Button>

              <Button onClick={() => quickAsk('Help me research jobs, companies, and opportunities.')} variant="outline" className="rounded-full">
                Research
              </Button>
            </div>

            <Button onClick={() => setWorkspaceOpen(true)} className="mt-6 h-12 rounded-2xl bg-slate-950 px-6 text-white dark:bg-white dark:text-black">
              <MessageCircle className="mr-2 h-4 w-4" />
              Open workspace
            </Button>
          </Card>
        </div>

        {reminders.length > 0 && (
          <Card className={`${premiumCard} mt-4`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4" />
                Saved vacancy alerts
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div>
                    <div className="font-semibold">{reminder.role}</div>
                    <div className="text-xs text-slate-500">Location: {reminder.location}</div>
                    <div className="text-xs text-slate-500">Frequency: {reminder.frequency}</div>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => deleteReminder(reminder.id)} className="rounded-full text-red-500">
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
              <Building2 className="h-4 w-4" />
              <span>Real vacancy alerts can be connected later with server cron and push notifications.</span>
            </div>

            <Button size="sm" variant="ghost" onClick={() => navigate('/pricing')} className="rounded-full">
              View tiers
            </Button>
          </CardContent>
        </Card>
      </main>

      <button
        type="button"
        onClick={() => setWorkspaceOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-40 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_40px_rgba(15,23,42,0.25)] dark:bg-white dark:text-black"
      >
        <MessageCircle className="mr-2 inline h-4 w-4" />
        Ask
      </button>

      {workspaceOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
          <div className="flex h-14 items-center justify-between border-b border-black/5 bg-white/80 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/80 sm:px-5">
            <div className="flex items-center gap-2">
              <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div>
                <div className="text-sm font-semibold">FaceMeX Workspace for Jobseekers</div>
                <div className="text-[11px] text-slate-500 dark:text-white/45">
                  Latest vacancies, interview prep, email CV, WhatsApp messages, and more
                </div>
              </div>
            </div>

            <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.length === 0 && !busy && (
                <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white dark:bg-white dark:text-black">
                    <Sparkles className="h-8 w-8" />
                  </div>

                  <h2 className="mt-5 text-2xl font-semibold">
                    What do you need help with?
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-white/55">
                    Latest vacancies, interview prep, email CV, WhatsApp messages, research, applications, and more.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {[
                      ['Latest vacancies', 'Find latest vacancies near me and help me apply smart.'],
                      ['Interview prep', 'Help me prepare for an interview.'],
                      ['Email CV', 'Write an email and WhatsApp message to send my CV for a job.'],
                      ['Research', 'Help me research jobs, companies, and opportunities.'],
                    ].map(([label, text]) => (
                      <Button key={label} variant="outline" onClick={() => setPrompt(text)} className="rounded-full">
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-[26px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
                      message.role === 'user'
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                        : 'border border-black/5 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[130px] rounded-2xl" />
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
                      <div className="max-h-[430px] overflow-y-auto pr-1">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    )}

                    {message.role === 'assistant' && editingMessageId !== message.id && (
                      <div className="mt-3 flex flex-wrap gap-1 border-t border-black/5 pt-2 dark:border-white/10">
                        <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => deleteMessage(message.id)} className="h-8 rounded-full px-2 text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => toggleSave(message.id)} className="h-8 rounded-full px-2">
                          <Save className="h-3.5 w-3.5" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2">
                          {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2">
                          <Search className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-[26px] border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    FaceMeX is thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-black/5 bg-[#f7f7f5]/90 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f0f]/90">
            <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#1a1a1a]/95">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about jobs, CVs, interviews, research, applications..."
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
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="truncate">Verify jobs before sending ID documents or paying anything.</span>
                </div>

                <Button
                  onClick={() => sendPrompt()}
                  disabled={busy || !canAsk}
                  className="h-10 w-10 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
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
