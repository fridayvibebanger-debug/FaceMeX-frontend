import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';
import Navbar from '@/components/layout/Navbar';

type SearchLink = {
  label: string;
  url: string;
  note?: string;
};

type Reminder = {
  id: string;
  company: string;
  role: string;
  contact: string;
  dueDate: string;
  notes: string;
  createdAt: string;
};

const labels = [
  'Best places to search',
  'Social media vacancy method',
  'Google search strategy',
  'CV and profile improvements',
  'Application strategy',
  'Networking and outreach',
  'Scam safety checklist',
  'Weekly routine',
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsageKey(tier: string) {
  return `facemex_job_assistant_usage_${tier || 'free'}_${todayKey()}`;
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
    localStorage.setItem(key, String(current + 1));
    return current + 1;
  } catch {
    return 0;
  }
}

function clean(value: string) {
  return String(value || '').trim();
}

function encodeSearchQuery(parts: string[]) {
  const text = parts.filter(Boolean).join(' ').trim();
  return encodeURIComponent(text || 'jobs vacancies near me');
}

function safeTag(value: string) {
  return encodeURIComponent(
    String(value || 'jobs')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
  );
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildSearchLinks(input: {
  role: string;
  location: string;
  industry: string;
  workMode: string;
}) {
  const role = clean(input.role) || 'jobs';
  const location = clean(input.location);
  const industry = clean(input.industry);
  const workMode = clean(input.workMode);

  const query = encodeSearchQuery([
    role,
    industry,
    location,
    workMode,
    'vacancies jobs hiring apply',
  ]);

  const roleTag = safeTag(role);
  const locationTag = safeTag(location || 'south africa');

  const links: SearchLink[] = [
    {
      label: 'Google vacancies search',
      url: `https://www.google.com/search?q=${query}`,
      note: 'Use this to find live job posts, company career pages, and vacancy PDFs.',
    },
    {
      label: 'Google recent vacancies',
      url: `https://www.google.com/search?q=${query}&tbs=qdr:w`,
      note: 'Shows newer results from the last week.',
    },
    {
      label: 'Facebook vacancy posts',
      url: `https://www.facebook.com/search/posts/?q=${query}`,
      note: 'Good for local businesses, community groups, stores, schools, and shops.',
    },
    {
      label: 'Facebook job groups',
      url: `https://www.facebook.com/search/groups/?q=${query}`,
      note: 'Join local job groups and check pinned posts.',
    },
    {
      label: 'Instagram hashtag search',
      url: `https://www.instagram.com/explore/tags/${roleTag}/`,
      note: 'Check business pages posting vacancies in stories/posts.',
    },
    {
      label: 'Instagram local jobs hashtag',
      url: `https://www.instagram.com/explore/tags/${locationTag}jobs/`,
      note: 'Useful for local area hiring posts.',
    },
    {
      label: 'X / Twitter live search',
      url: `https://x.com/search?q=${query}&src=typed_query&f=live`,
      note: 'Search latest recruiter and company vacancy posts.',
    },
    {
      label: 'LinkedIn jobs',
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}`,
      note: 'Best for professional roles, internships, admin, tech, sales, and office jobs.',
    },
    {
      label: 'Indeed South Africa',
      url: `https://za.indeed.com/jobs?q=${query}`,
      note: 'Good for entry-level and general vacancies.',
    },
    {
      label: 'PNet jobs',
      url: `https://www.pnet.co.za/jobs/${query}`,
      note: 'Good for formal company vacancies.',
    },
    {
      label: 'Careers24 jobs',
      url: `https://www.careers24.com/jobs/?query=${query}`,
      note: 'Good for South African job listings.',
    },
    {
      label: 'DPSA government vacancies',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official public service vacancy circular.',
    },
  ];

  return links;
}

function buildCompanyContactLinks(input: {
  company: string;
  role: string;
  location: string;
}) {
  const company = clean(input.company);
  const role = clean(input.role) || 'vacancy';
  const location = clean(input.location);

  const base = company || `${role} ${location}`.trim() || 'company vacancy';

  const contactQuery = encodeSearchQuery([
    base,
    'careers contact HR email send CV',
  ]);

  const vacancyQuery = encodeSearchQuery([
    base,
    role,
    location,
    'vacancy apply email CV',
  ]);

  const links: SearchLink[] = [
    {
      label: 'Company careers/contact search',
      url: `https://www.google.com/search?q=${contactQuery}`,
      note: 'Find official careers page, HR email, or contact form.',
    },
    {
      label: 'Company vacancy search',
      url: `https://www.google.com/search?q=${vacancyQuery}`,
      note: 'Find current vacancy posts linked to this company/department.',
    },
    {
      label: 'LinkedIn company/jobs search',
      url: `https://www.linkedin.com/search/results/all/?keywords=${contactQuery}`,
      note: 'Find company page, recruiters, HR people, and open jobs.',
    },
    {
      label: 'Facebook company search',
      url: `https://www.facebook.com/search/pages/?q=${contactQuery}`,
      note: 'Find the company page and message/contact details.',
    },
    {
      label: 'Facebook vacancy posts for company',
      url: `https://www.facebook.com/search/posts/?q=${vacancyQuery}`,
      note: 'Find public vacancy posts and comments from the company.',
    },
    {
      label: 'X / Twitter company hiring search',
      url: `https://x.com/search?q=${vacancyQuery}&src=typed_query&f=live`,
      note: 'Find recent hiring posts and recruiter mentions.',
    },
  ];

  return links;
}

function buildSearchPhrases(input: {
  role: string;
  location: string;
  industry: string;
  workMode: string;
  experienceLevel: string;
}) {
  const role = clean(input.role) || 'job';
  const location = clean(input.location) || 'South Africa';
  const industry = clean(input.industry);
  const workMode = clean(input.workMode);
  const level = clean(input.experienceLevel);

  return [
    `${role} vacancies ${location}`,
    `${level} ${role} jobs ${location}`.trim(),
    `${industry} ${role} hiring ${location}`.trim(),
    `${role} ${workMode} jobs ${location}`.trim(),
    `"${role}" "apply now" "${location}"`,
    `"${role}" "vacancy" "email CV" "${location}"`,
    `site:facebook.com ${role} vacancies ${location}`,
    `site:instagram.com ${role} jobs ${location}`,
    `site:x.com ${role} hiring ${location}`,
  ].filter((item, index, arr) => item.trim() && arr.indexOf(item) === index);
}

function buildTemplatePlan(input: {
  role: string;
  location: string;
  preferences: string;
  experienceLevel: string;
  industry: string;
  workMode: string;
  hoursPerWeek: string;
}) {
  const role = clean(input.role) || 'your target role';
  const location = clean(input.location) || 'your area';
  const preferences = clean(input.preferences);
  const experienceLevel = clean(input.experienceLevel) || 'your level';
  const industry = clean(input.industry) || 'your preferred industry';
  const workMode = clean(input.workMode) || 'any work mode';
  const hours = clean(input.hoursPerWeek) || '5';

  const phrases = buildSearchPhrases({
    role,
    location,
    industry,
    workMode,
    experienceLevel,
  });

  return [
    `Focus your search on ${role} roles in ${location}. Start with Google, Facebook job groups, company career pages, LinkedIn, Indeed, PNet, Careers24, and DPSA vacancies if you want government jobs.`,

    `Use social media like a job hunter, not like a normal scroller.\n\nFacebook:\n• Search: ${role} vacancies ${location}\n• Join local job groups and community groups.\n• Search group posts using “hiring”, “vacancy”, “CV”, “apply”, and your location.\n\nInstagram:\n• Search hashtags like #${role.replace(/\s+/g, '')}, #${location.replace(/\s+/g, '')}jobs, #hiring, #vacancies.\n• Check business pages, hotels, shops, agencies, schools, restaurants, and local brands.\n\nX / Twitter:\n• Search live posts for hiring keywords.\n• Follow recruiters, companies, local business pages, and government vacancy accounts.`,

    `Use these Google searches and save the best results:\n\n${phrases
      .map((phrase) => `• ${phrase}`)
      .join('\n')}\n\nTip: Add words like “latest”, “2026”, “apply now”, “email CV”, “no experience”, or “entry level” depending on your situation.`,

    `Improve your CV and profile before applying:\n\n• Put your target role clearly at the top of your CV.\n• Use keywords from the job post.\n• Add measurable duties or achievements.\n• Keep your CV clean, ATS-friendly, and easy to scan.\n• Your FaceMeX/LinkedIn profile should match the same role focus: ${role}.\n• If you are targeting ${industry}, make your summary and skills speak to that industry.`,

    `Application strategy:\n\n• Apply within 24 hours of finding a vacancy.\n• Send 5 to 10 quality applications per day if you are actively searching.\n• Track each job: company, role, platform, date applied, contact person, and follow-up date.\n• Follow up after 3 to 5 working days.\n• Do not use one CV for every job. Adjust your summary and skills for each role.\n• Preferences to consider: ${preferences || 'salary, transport distance, work schedule, growth opportunity, and company reputation'}.`,

    `Networking and outreach:\n\nMessage template:\n“Good day, I saw your vacancy/post for ${role}. I am based in/near ${location} and I am interested. I have experience/skills related to this role and I can send my CV immediately. Please may I ask where I can apply or who I should send my CV to?”\n\nFollow-up template:\n“Good day, I am following up on my application for ${role}. I would appreciate any update when available. Thank you.”`,

    `Avoid job scams:\n\n• Never pay money to get a job interview.\n• Be careful if they ask for “registration fee”, “uniform fee”, “training fee”, or “placement fee”.\n• Check if the company has a real website, real address, and real contact details.\n• Do not send ID copies too early before verifying the employer.\n• Be careful with WhatsApp-only recruiters who refuse to share company details.\n• Search the company name + “scam” on Google.\n• If salary sounds too high for no experience, verify before sending documents.\n• Real companies usually use official email, website forms, or known recruitment platforms.`,

    `Weekly routine using ${hours} hours/week:\n\nMonday: Search Google, Facebook groups, and job sites.\nTuesday: Apply to the best roles and adjust CV keywords.\nWednesday: Search Instagram/X and message businesses directly.\nThursday: Follow up on applications.\nFriday: Improve CV, profile, and save new vacancies.\nSaturday/Sunday: Prepare interview answers and plan next week.`,
  ];
}

export default function AIJobAssistantPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [preferences, setPreferences] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [industry, setIndustry] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [followUpDays, setFollowUpDays] = useState('5');

  const [output, setOutput] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchLinks, setSearchLinks] = useState<SearchLink[]>([]);
  const [companyLinks, setCompanyLinks] = useState<SearchLink[]>([]);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [busy, setBusy] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'strategy' | 'apply'>('strategy');

  const { tier, hasTier } = useUserStore();

  const isCreatorPlus = hasTier('creator');
  const currentTier = String(tier || 'free').toLowerCase();

  const dailyLimit = useMemo(() => {
    if (isCreatorPlus) return null;
    if (currentTier === 'pro') return 10;
    return 3;
  }, [isCreatorPlus, currentTier]);

  const remainingUses = useMemo(() => {
    if (dailyLimit === null) return null;
    return Math.max(0, dailyLimit - usageCount);
  }, [dailyLimit, usageCount]);

  useEffect(() => {
    setUsageCount(getUsage(currentTier));

    try {
      const raw = localStorage.getItem('facemex_job_followup_reminders');
      setReminders(raw ? JSON.parse(raw) : []);
    } catch {
      setReminders([]);
    }
  }, [currentTier]);

  const saveReminders = (next: Reminder[]) => {
    setReminders(next);

    try {
      localStorage.setItem('facemex_job_followup_reminders', JSON.stringify(next));
    } catch {
      // ignore localStorage errors
    }
  };

  const handleGenerate = async () => {
    if (!role.trim() && !location.trim() && !preferences.trim()) {
      toast({
        title: 'Add job search details',
        description: 'Provide at least a role, location, or preference.',
      });
      return;
    }

    if (dailyLimit !== null && usageCount >= dailyLimit) {
      toast({
        title: 'Daily limit reached',
        description:
          'You have used today’s job assistant limit. Upgrade to Creator or higher for unlimited strategies.',
      });
      return;
    }

    setBusy(true);

    const links = buildSearchLinks({
      role,
      location,
      industry,
      workMode,
    });

    const templatePlan = buildTemplatePlan({
      role,
      location,
      preferences,
      experienceLevel,
      industry,
      workMode,
      hoursPerWeek,
    });

    try {
      const res = await api.post('/api/ai/pro/job-assistant', {
        role,
        location,
        preferences,
        experienceLevel,
        industry,
        workMode,
        hoursPerWeek,
        tier,
        creatorPlus: isCreatorPlus,
        dailyLimit,
        searchLinks: links,
        instruction:
          'Create a practical job search plan. Include where to find vacancies from Google, Facebook, Instagram, X/Twitter, job websites, company websites, and local communities. Include scam warning tips. Do not mention internal model names.',
      });

      const list =
        Array.isArray(res.suggestions) && res.suggestions.length
          ? (res.suggestions as string[])
          : templatePlan;

      setSearchLinks(links);
      setSuggestions(list);
      setOutput(list.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n\n'));

      if (!isCreatorPlus) {
        const next = increaseUsage(currentTier);
        setUsageCount(next);
      }
    } catch {
      setSearchLinks(links);
      setSuggestions(templatePlan);
      setOutput(templatePlan.map((item, i) => `${i + 1}. ${item}`).join('\n\n'));

      if (!isCreatorPlus) {
        const next = increaseUsage(currentTier);
        setUsageCount(next);
      }

      toast({
        title: 'Plan generated',
        description: 'The live assistant was unavailable, so FaceMeX used the built-in job strategy planner.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenApplyHelp = () => {
    if (!isCreatorPlus) {
      toast({
        title: 'Creator+ required',
        description: 'Upgrade to Creator or higher to unlock application help, contact finder, and follow-up reminders.',
      });
      navigate('/pricing');
      return;
    }

    setActiveTab('apply');

    const links = buildCompanyContactLinks({
      company: companyName,
      role,
      location,
    });

    setCompanyLinks(links);
  };

  const handleRefreshCompanyLinks = () => {
    if (!isCreatorPlus) {
      navigate('/pricing');
      return;
    }

    const links = buildCompanyContactLinks({
      company: companyName,
      role,
      location,
    });

    setCompanyLinks(links);

    toast({
      title: 'Contact links prepared',
      description: 'Open the links to find the correct company, department, HR contact, or CV email.',
    });
  };

  const handleSaveReminder = () => {
    if (!isCreatorPlus) {
      navigate('/pricing');
      return;
    }

    const company = clean(companyName);
    const targetRole = clean(role);
    const days = Math.max(1, Number(followUpDays || 5));

    if (!company || !targetRole) {
      toast({
        title: 'Add company and role',
        description: 'Enter the company/department and role before saving a follow-up reminder.',
      });
      return;
    }

    const reminder: Reminder = {
      id: `${Date.now()}`,
      company,
      role: targetRole,
      contact: clean(contactEmail || contactPerson || department || 'Check official contact page'),
      dueDate: addDays(days),
      notes: `Follow up after ${days} day(s) if there is no reply. Department: ${department || 'Not specified'}. Contact person: ${contactPerson || 'Not specified'}.`,
      createdAt: new Date().toISOString(),
    };

    saveReminders([reminder, ...reminders]);

    toast({
      title: 'Follow-up reminder saved',
      description: `Reminder set for ${reminder.dueDate}.`,
    });
  };

  const handleSavePlan = () => {
    const text =
      suggestions && suggestions.length
        ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        : (output || '').toString();

    if (!text.trim()) {
      toast({
        title: 'Nothing to save',
        description: 'Generate strategies first, then save them.',
      });
      return;
    }

    setSavedPlan(text);

    toast({
      title: 'Plan saved for this session',
      description: 'Scroll down to view your saved job search plan.',
    });
  };

  const handleCopyAll = async () => {
    const text =
      suggestions && suggestions.length
        ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        : (output || '').toString();

    if (!text.trim()) {
      toast({
        title: 'Nothing to copy',
        description: 'Generate strategies first, then copy them.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      toast({
        title: 'Copied to clipboard',
        description: 'Job search strategies are ready to paste into your notes.',
      });
    } catch (err) {
      console.error('copy strategies failed', err);

      toast({
        title: 'Copy failed',
        description: 'Select the text manually and copy it instead.',
      });
    }
  };

  const applicationMessage = `Good day${contactPerson ? ` ${contactPerson}` : ''},

I hope you are well. I am interested in the ${role || '[role]'} opportunity at ${companyName || '[company]'}. I would like to apply or send my CV for consideration.

Please may you advise where I should send my CV, or who the correct person/department is for this application?

Kind regards`;

  const followUpMessage = `Good day${contactPerson ? ` ${contactPerson}` : ''},

I hope you are well. I am following up on my application for the ${role || '[role]'} opportunity at ${companyName || '[company]'}.

I would appreciate any update when available.

Kind regards`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto pt-14 md:pt-16 px-4">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">AI Job Assistant</h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Build a practical job search plan, find vacancy sources, search social media, and avoid job scams.
          </p>
        </div>

        <Card className="rounded-2xl border border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Job search strategy</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your target role and area. FaceMeX will show you where to search, what keywords to use, and how to apply safely.
              {dailyLimit === null
                ? ' You have unlimited job assistant access.'
                : ` Daily limit: ${usageCount}/${dailyLimit} used. ${remainingUses} remaining today.`}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeTab === 'strategy' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setActiveTab('strategy')}
              >
                Strategy
              </Button>

              <Button
                type="button"
                variant={activeTab === 'apply' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={handleOpenApplyHelp}
              >
                {isCreatorPlus ? 'Apply Help' : 'Apply Help (Creator+)'}
              </Button>
            </div>

            {activeTab === 'strategy' && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Target role</label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. General Worker, Driver, Admin Assistant"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Preferred location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Tzaneen, Polokwane, Remote"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Preferences (optional)</label>
                    <Input
                      value={preferences}
                      onChange={(e) => setPreferences(e.target.value)}
                      placeholder="e.g. no experience, transport available, retail"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Experience level</label>
                    <select
                      className="w-full border bg-background px-2 py-1 rounded text-xs"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      <option value="student / intern">Student / Intern</option>
                      <option value="entry level">Entry level</option>
                      <option value="junior">Junior</option>
                      <option value="mid">Mid</option>
                      <option value="senior">Senior</option>
                      <option value="lead / manager">Lead / Manager</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Industry focus (optional)</label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Retail, Security, Hospitality, Tech"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Work mode</label>
                    <select
                      className="w-full border bg-background px-2 py-1 rounded text-xs"
                      value={workMode}
                      onChange={(e) => setWorkMode(e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Hours per week</label>
                    <Input
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      placeholder="e.g. 5, 10, 20"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {dailyLimit !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/pricing')}
                      className="text-sm font-medium"
                    >
                      Upgrade for unlimited
                    </Button>
                  )}

                  <Button onClick={handleGenerate} disabled={busy} className="text-sm font-medium">
                    {busy ? 'Building strategy…' : 'Build job strategy'}
                  </Button>
                </div>

                {searchLinks.length > 0 && (
                  <div className="mt-4 space-y-2 p-3 border border-border/60 rounded-xl bg-muted/30 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Clickable vacancy search links
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {searchLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border bg-background p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="text-sm font-semibold">{link.label}</div>
                          {link.note && (
                            <div className="mt-1 text-xs text-muted-foreground">{link.note}</div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions && suggestions.length > 0 && (
                  <div className="mt-4 space-y-3 p-3 border border-border/60 rounded-xl bg-card text-sm">
                    {suggestions.map((s, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {labels[i] || `Strategy ${i + 1}`}
                        </div>

                        <p className="whitespace-pre-wrap">{s}</p>
                      </div>
                    ))}

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[11px] mr-2"
                        onClick={handleCopyAll}
                      >
                        Copy all to notes
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[11px]"
                        onClick={handleSavePlan}
                      >
                        Save plan (this session)
                      </Button>
                    </div>
                  </div>
                )}

                {savedPlan && (
                  <div className="mt-4 space-y-2 p-3 border border-border/60 rounded-xl bg-muted/30 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Saved job search plan (session only)
                    </div>

                    <p className="whitespace-pre-wrap">{savedPlan}</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'apply' && (
              <div className="space-y-4">
                {!isCreatorPlus && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    Apply Help is available on Creator, Business, and Exclusive tiers.
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Company / Department</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Shoprite, Hospital, Municipality"
                      disabled={!isCreatorPlus}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Department / Branch</label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. HR, Store Manager, Admin"
                      disabled={!isCreatorPlus}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Known contact person</label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Optional"
                      disabled={!isCreatorPlus}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">CV email / contact found</label>
                    <Input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Paste email, phone, or contact page"
                      disabled={!isCreatorPlus}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Follow-up after days</label>
                    <Input
                      value={followUpDays}
                      onChange={(e) => setFollowUpDays(e.target.value)}
                      placeholder="e.g. 3, 5, 7"
                      disabled={!isCreatorPlus}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Action</label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-sm"
                      onClick={handleRefreshCompanyLinks}
                      disabled={!isCreatorPlus}
                    >
                      Find contact links
                    </Button>
                  </div>
                </div>

                {companyLinks.length > 0 && (
                  <div className="space-y-2 p-3 border border-border/60 rounded-xl bg-muted/30 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Contact finder links
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {companyLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border bg-background p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="text-sm font-semibold">{link.label}</div>
                          {link.note && (
                            <div className="mt-1 text-xs text-muted-foreground">{link.note}</div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 p-3 border border-border/60 rounded-xl bg-card text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Where to send your CV
                    </div>

                    <p className="text-sm text-muted-foreground">
                      First choice: official company careers page. Second choice: official HR email. Third choice:
                      verified company social page inbox. Avoid sending documents to random personal accounts unless verified.
                    </p>

                    <div className="pt-2 text-xs text-muted-foreground">
                      Who to contact:
                    </div>

                    <ul className="list-disc pl-5 text-sm">
                      <li>HR department for formal companies.</li>
                      <li>Store manager or branch manager for retail/shop jobs.</li>
                      <li>School admin or principal for school posts.</li>
                      <li>Municipal HR or registry office for public sector posts.</li>
                      <li>Recruiter or hiring manager for LinkedIn vacancies.</li>
                    </ul>
                  </div>

                  <div className="space-y-2 p-3 border border-border/60 rounded-xl bg-card text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Message templates
                    </div>

                    <Textarea value={applicationMessage} readOnly rows={7} className="text-xs" />

                    <Textarea value={followUpMessage} readOnly rows={6} className="text-xs" />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[11px]"
                        disabled={!isCreatorPlus}
                        onClick={() => navigator.clipboard.writeText(applicationMessage)}
                      >
                        Copy apply message
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[11px]"
                        disabled={!isCreatorPlus}
                        onClick={() => navigator.clipboard.writeText(followUpMessage)}
                      >
                        Copy follow-up
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {!isCreatorPlus && (
                    <Button type="button" variant="outline" onClick={() => navigate('/pricing')}>
                      Upgrade to Creator+
                    </Button>
                  )}

                  <Button type="button" onClick={handleSaveReminder} disabled={!isCreatorPlus}>
                    Save follow-up reminder
                  </Button>
                </div>

                {reminders.length > 0 && (
                  <div className="space-y-2 p-3 border border-border/60 rounded-xl bg-muted/30 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Follow-up reminders
                    </div>

                    {reminders.map((reminder) => (
                      <div key={reminder.id} className="rounded-xl border bg-background p-3">
                        <div className="font-semibold">
                          {reminder.company} — {reminder.role}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Follow up on: {reminder.dueDate}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Contact: {reminder.contact}
                        </div>
                        <p className="mt-1 text-xs">{reminder.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
