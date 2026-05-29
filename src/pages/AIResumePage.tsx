import { useMemo, useState } from 'react';
import {
  Copy,
  Crown,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import Navbar from '@/components/layout/Navbar';

type FontStyle = 'mono' | 'sans' | 'serif' | 'system' | 'document';
type LineSpacing = 'tight' | 'normal' | 'relaxed';

type QuickDraft = {
  title: string;
  content: string;
};

function cleanText(value: string) {
  return String(value || '').trim();
}

function titleCaseWords(text = '') {
  return cleanText(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function splitList(value = '') {
  return String(value || '')
    .split(/[,;\n/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function bulletList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '';
}

function normalizeEducation(value = '') {
  const raw = cleanText(value);

  if (!raw) return '[Qualification] | [Institution] | [Year]';

  return raw
    .replace(/\bTVT\b/gi, 'TVET')
    .replace(/\btvt\b/gi, 'TVET')
    .replace(/\s+/g, ' ')
    .trim();
}

function professionalizeSummary(summary = '') {
  const raw = cleanText(summary);
  const lower = raw.toLowerCase();

  if (!raw) {
    return 'Reliable and motivated candidate with strong communication, teamwork, and customer service skills. Able to work under pressure, follow instructions, and complete tasks on time. Eager to contribute positively in a professional environment and grow through practical experience.';
  }

  if (lower.includes('media') || lower.includes('team management')) {
    return 'Experienced media and team management professional with strong communication, coordination, and customer service skills. Skilled in supporting daily operations, managing social media activities, working with teams, and staying productive in busy or high-pressure environments.';
  }

  if (lower.includes('driver') || lower.includes('code 10')) {
    return 'Reliable and safety-conscious driver with strong route awareness, time management, and customer service skills. Able to follow instructions, handle responsibilities professionally, and complete transport or delivery duties on time.';
  }

  return raw
    .replace(/\benglish fluently\b/gi, 'English: Fluent')
    .replace(/\bsepedi mothers? tangue\b/gi, 'Sepedi: Mother tongue')
    .replace(/\bsepedi mothers? tongue\b/gi, 'Sepedi: Mother tongue')
    .replace(/\bcode 10 drive\b/gi, 'Driver’s licence: Code 10');
}

function professionalizeSkills(skills = '') {
  const items = splitList(skills);

  if (!items.length) {
    return [
      'Customer Service',
      'Team Collaboration',
      'Communication',
      'Time Management',
      'Problem Solving',
      'Workplace Discipline',
    ];
  }

  return items.map((item) => {
    const lower = item.toLowerCase();

    if (lower.includes('team management')) return 'Team Management';
    if (lower.includes('customer')) return 'Customer Service';
    if (lower.includes('social media')) return 'Social Media Management';
    if (lower.includes('media')) return 'Media Management';
    if (lower.includes('communication')) return 'Communication';
    if (lower.includes('time')) return 'Time Management';

    return titleCaseWords(item);
  });
}

function professionalizeExperience(experience = '') {
  const raw = cleanText(experience);
  const lower = raw.toLowerCase();

  if (!raw) {
    return `[Job Title] | [Company Name] | [Year]
- Supported daily workplace tasks and followed instructions from supervisors.
- Assisted customers, team members, or management in a professional manner.
- Completed assigned duties on time and maintained a reliable work ethic.`;
  }

  if (lower.includes('ceo') && lower.includes('facemex')) {
    return `Chief Executive Officer | FaceMeX | 2025 – Present
- Oversee daily operations and support the strategic direction of the platform.
- Manage and coordinate platform improvement, user feedback, and product testing.
- Implement social media and user engagement strategies to grow brand awareness.
- Maintain high standards of customer service, communication, and platform development.`;
  }

  if (lower.includes('driver') || lower.includes('truck')) {
    return `Driver | [Company Name] | [Year]
- Transported goods or passengers safely while following road and company rules.
- Planned routes, managed time effectively, and completed trips or deliveries on schedule.
- Communicated professionally with customers, team members, and supervisors.`;
  }

  if (!raw.includes('-') && !raw.includes('•')) {
    return `${raw}
- Supported daily tasks and contributed to smooth operations.
- Communicated professionally with customers, colleagues, or supervisors.
- Completed duties on time and showed reliability in the workplace.`;
  }

  return raw.replace(/•/g, '-');
}

function extractExtras(extras = '', skills = '') {
  const raw = cleanText(extras);
  const combined = `${raw} ${skills}`.toLowerCase();

  const technicalSkills: string[] = [];
  const languages: string[] = [];
  const additional: string[] = [];

  if (combined.includes('social media')) technicalSkills.push('Social Media Platforms');
  if (combined.includes('microsoft') || combined.includes('office') || combined.includes('word') || combined.includes('excel')) {
    technicalSkills.push('Microsoft Office Suite');
  }
  if (combined.includes('computer')) technicalSkills.push('Basic Computer Literacy');
  if (combined.includes('graphic')) technicalSkills.push('Basic Graphic Design Tools');

  if (!technicalSkills.length) {
    technicalSkills.push('Basic Computer Literacy');
    technicalSkills.push('Email Communication');
  }

  if (combined.includes('english')) languages.push('English: Fluent');
  if (combined.includes('sepedi')) languages.push('Sepedi: Mother tongue');

  if (!languages.length) {
    languages.push('English: Fluent');
  }

  const licenceMatch = raw.match(/code\s*\d+/i);
  if (licenceMatch) {
    additional.push(`Driver’s licence: ${licenceMatch[0].replace(/\s+/g, ' ').toUpperCase()}`);
  }

  return {
    technicalSkills: Array.from(new Set(technicalSkills)).slice(0, 5),
    languages: Array.from(new Set(languages)).slice(0, 4),
    additional,
  };
}

function buildClassicCv(input: {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  idNumber: string;
  showIdOnCv: boolean;
  summary: string;
  experience: string;
  skills: string;
  education: string;
  extras: string;
}) {
  const fullName = cleanText(input.fullName).toUpperCase() || '[YOUR NAME]';
  const email = cleanText(input.email) || 'your.email@example.com';
  const phone = cleanText(input.phone) || '+27 00 000 0000';
  const location = cleanText(input.location) || 'Your City, South Africa';

  const contactLine = input.showIdOnCv && cleanText(input.idNumber)
    ? `Address: ${location} | Contact: ${phone} | Email: ${email} | Profile ID: ${cleanText(input.idNumber)}`
    : `Address: ${location} | Contact: ${phone} | Email: ${email}`;

  const finalSummary = professionalizeSummary(input.summary);
  const finalSkills = professionalizeSkills(input.skills);
  const finalExperience = professionalizeExperience(input.experience);
  const finalEducation = normalizeEducation(input.education);
  const extraData = extractExtras(input.extras, input.skills);

  return `${fullName}
${contactLine}

PROFESSIONAL SUMMARY
${finalSummary}

CORE COMPETENCIES
${bulletList(finalSkills.slice(0, 7))}

PROFESSIONAL EXPERIENCE
${finalExperience}

EDUCATION
${finalEducation}

TECHNICAL SKILLS
${bulletList(extraData.technicalSkills)}

LANGUAGES
${bulletList(extraData.languages)}

${extraData.additional.length ? `ADDITIONAL INFORMATION\n${bulletList(extraData.additional)}\n\n` : ''}REFERENCES
Available Upon Request`;
}

function improveToTemplateCv(input: {
  existingCv: string;
  targetLevel: string;
  extras: string;
}) {
  const existing = cleanText(input.existingCv);
  const target = cleanText(input.targetLevel);
  const extras = cleanText(input.extras);

  return `ATS CV UPGRADE DRAFT

PROFESSIONAL SUMMARY
Reliable and motivated candidate with practical experience, strong communication skills, and the ability to work in structured environments. Demonstrates discipline, teamwork, punctuality, and a willingness to learn. ${
    target ? `Positioned for ${target} opportunities with a focus on professional growth and measurable contribution.` : ''
  }

CORE COMPETENCIES
- Communication
- Teamwork
- Time Management
- Customer Service
- Problem Solving
- Reliability
- Organisation
- Workplace Discipline

PROFESSIONAL EXPERIENCE
${existing}

EDUCATION
Qualification | Institution | Year

TECHNICAL SKILLS
- Computer Literacy
- Customer Assistance
- Administration Support
- Planning and Organisation
- Reporting and Communication

ADDITIONAL INFORMATION
${extras || 'Languages, driver’s licence, certifications, projects, volunteering, achievements, or portfolio links can be added here.'}

REFERENCES
Available Upon Request`;
}

function buildCoverLetterFromCv(cv: string) {
  const firstLine = cv.split('\n').map((x) => x.trim()).find(Boolean) || '[Your Name]';

  return `Dear Hiring Manager,

I would like to apply for the available opportunity at your company.

Please find attached my CV for your consideration. I believe my skills, experience, and willingness to learn make me a strong candidate. I am reliable, professional, and ready to contribute positively to your team.

I would appreciate the opportunity to be considered for an interview.

Kind regards,
${firstLine}
[Your Phone Number]`;
}

function buildApplicationMessageFromCv(cv: string) {
  const firstLine = cv.split('\n').map((x) => x.trim()).find(Boolean) || '[Your Name]';

  return `Good day. I hope you are well. My name is ${titleCaseWords(firstLine)}. I am interested in applying for an opportunity at your company. Please may I ask where I can send my CV or how I can apply? Thank you.`;
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function CvPreview({
  content,
  fontClass,
  leadingClass,
}: {
  content: string;
  fontClass: string;
  leadingClass: string;
}) {
  return (
    <div className="w-full max-w-full overflow-x-hidden rounded-[24px] border border-black/5 bg-slate-100/70 p-2 sm:p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mx-auto w-full max-w-[794px] overflow-hidden bg-white text-black shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
        <pre
          className={`m-0 min-h-0 whitespace-pre-wrap break-words px-6 py-8 text-[12.5px] leading-normal sm:px-10 sm:py-12 sm:text-sm md:min-h-[1123px] md:px-[18mm] md:py-[18mm] ${fontClass} ${leadingClass}`}
          style={{
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
          }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}

export default function AIResumePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [showIdOnCv, setShowIdOnCv] = useState(false);
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [education, setEducation] = useState('');
  const [extras, setExtras] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fontStyle, setFontStyle] = useState<FontStyle>('document');
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('normal');

  const [proInput, setProInput] = useState('');
  const [proTargetLevel, setProTargetLevel] = useState('');
  const [proExtras, setProExtras] = useState('');
  const [proOutput, setProOutput] = useState<string | null>(null);
  const [proBusy, setProBusy] = useState(false);

  const [quickDraft, setQuickDraft] = useState<QuickDraft | null>(null);

  const { tier, hasTier } = useUserStore();

  const currentTier = String(tier || 'free').toLowerCase();
  const isCreatorPlus = Boolean(
    hasTier?.('creator') ||
      hasTier?.('business') ||
      hasTier?.('exclusive') ||
      ['creator', 'creator+', 'business', 'exclusive'].includes(currentTier)
  );

  const outputFontClass =
    fontStyle === 'serif' || fontStyle === 'document'
      ? 'font-serif'
      : fontStyle === 'sans' || fontStyle === 'system'
        ? 'font-sans'
        : 'font-mono';

  const outputLeadingClass =
    lineSpacing === 'tight'
      ? 'leading-tight'
      : lineSpacing === 'relaxed'
        ? 'leading-loose'
        : 'leading-normal';

  const hasBuilderOutput = useMemo(() => Boolean(output), [output]);
  const hasUpgradeOutput = useMemo(() => Boolean(proOutput), [proOutput]);

  const fieldClass =
    'h-12 w-full max-w-full rounded-2xl border-black/10 bg-white px-4 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

  const textAreaClass =
    'w-full max-w-full rounded-2xl border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

  const darkButton =
    'h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-white/90';

  const outlineButton =
    'h-11 rounded-2xl border-black/10 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]';

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied',
        description: 'Text copied successfully.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please highlight and copy manually.',
      });
    }
  };

  const openPrintWindow = (title: string, content: string) => {
    const win = window.open('', '_blank');

    if (!win) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups so the CV can open for printing or saving as PDF.',
      });
      return;
    }

    const fontFamily =
      fontStyle === 'serif' || fontStyle === 'document'
        ? 'Georgia, "Times New Roman", serif'
        : fontStyle === 'sans' || fontStyle === 'system'
          ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          : 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

    const lineHeight =
      lineSpacing === 'tight' ? '1.15' : lineSpacing === 'relaxed' ? '1.65' : '1.35';

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4;
        margin: 18mm;
      }

      html, body {
        margin: 0;
        padding: 0;
      }

      body {
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        white-space: pre-wrap;
        font-size: 12px;
        color: #000;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    </style>
  </head>
  <body>${escapeHtml(content)}</body>
</html>`);

    win.document.close();
    win.focus();
    win.print();
  };

  const handleGenerate = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast({
        title: 'Add required details',
        description: 'Please provide your name, email, and phone number before generating your CV.',
      });
      return;
    }

    setBusy(true);
    setQuickDraft(null);

    const fallbackCv = buildClassicCv({
      fullName,
      email,
      phone,
      location,
      idNumber,
      showIdOnCv,
      summary,
      experience,
      skills,
      education,
      extras,
    });

    try {
      const res = (await api.post('/api/ai/pro/resume-builder', {
        fullName,
        email,
        phone,
        location,
        idNumber,
        showIdOnCv,
        summary,
        experience,
        skills,
        education,
        extras,
        tier,
        creatorPlus: isCreatorPlus,
        template: 'six-second-cv',
        requiredSections: [
          'PROFESSIONAL SUMMARY',
          'CORE COMPETENCIES',
          'PROFESSIONAL EXPERIENCE',
          'EDUCATION',
          'TECHNICAL SKILLS',
          'LANGUAGES',
          'REFERENCES',
        ],
      })) as any;

      setOutput(res.resumeText || fallbackCv);
    } catch {
      setOutput(fallbackCv);
      toast({
        title: 'Generated with local template',
        description: 'AI endpoint was unavailable, so FaceMeX used the ATS CV template format.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImprove = async () => {
    if (!proInput.trim()) {
      toast({
        title: 'Paste your current CV',
        description: 'Add your existing CV text first so the AI can upgrade it.',
      });
      return;
    }

    if (!isCreatorPlus) {
      toast({
        title: 'Creator+ required',
        description: 'AI CV Upgrade is for Creator, Business, and Exclusive users. You can still use the free CV builder.',
      });
      return;
    }

    setProBusy(true);
    setQuickDraft(null);

    const fallbackUpgrade = improveToTemplateCv({
      existingCv: proInput,
      targetLevel: proTargetLevel,
      extras: proExtras,
    });

    try {
      const res = (await api.post('/api/ai/pro/resume-improver', {
        existingCv: proInput,
        targetLevel: proTargetLevel,
        extras: proExtras,
        tier,
        creatorPlus: isCreatorPlus,
        template: 'six-second-cv',
        instruction:
          'Rewrite into a clean one-page A4 ATS CV using these sections: PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION, TECHNICAL SKILLS, LANGUAGES, REFERENCES. Correct grammar and improve weak input.',
      })) as any;

      setProOutput(res.improvedText || fallbackUpgrade);
    } catch {
      setProOutput(fallbackUpgrade);
      toast({
        title: 'Used template fallback',
        description: 'AI endpoint was unavailable, so FaceMeX created a clean ATS upgrade draft.',
      });
    } finally {
      setProBusy(false);
    }
  };

  const createCoverLetter = (content: string) => {
    const draft = buildCoverLetterFromCv(content);
    setQuickDraft({
      title: 'Cover Letter Draft',
      content: draft,
    });
    toast({
      title: 'Cover letter created',
      description: 'Your cover letter draft is ready below.',
    });
  };

  const createApplicationMessage = (content: string) => {
    const draft = buildApplicationMessageFromCv(content);
    setQuickDraft({
      title: 'Application Message Draft',
      content: draft,
    });
    toast({
      title: 'Application message created',
      description: 'Your WhatsApp message is ready below.',
    });
  };

  const PreviewActions = ({ content, title }: { content: string; title: string }) => (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button variant="outline" className={outlineButton} onClick={() => copyToClipboard(content)}>
        <Copy className="mr-2 h-4 w-4" />
        Copy CV
      </Button>

      <Button className={darkButton} onClick={() => openPrintWindow(title, content)}>
        <Download className="mr-2 h-4 w-4" />
        Download PDF
      </Button>

      <Button variant="outline" className={outlineButton} onClick={() => createCoverLetter(content)}>
        <FileText className="mr-2 h-4 w-4" />
        Cover letter
      </Button>

      <Button variant="outline" className={outlineButton} onClick={() => createApplicationMessage(content)}>
        <MessageCircle className="mr-2 h-4 w-4" />
        Apply message
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-background dark:text-white">
      <Navbar />

      <SensitiveContentShield context="cv" className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-44 pt-16 sm:px-4 md:pt-20">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">FaceMeX AI CV Studio</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">AI CV Studio</h1>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-white/55">
              Create a clean one-page A4 CV, cover letter, and application message using a professional ATS structure.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="w-full overflow-hidden rounded-[24px] border border-black/5 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg md:text-xl">AI CV Builder</CardTitle>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                      Free one-page A4 CV based on the uploaded template style.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.06]">
                    Free
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
                  Fill in your details. FaceMeX will rewrite weak wording into professional CV language.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Full name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Thabo Mokoena"
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Profile ID / Optional ID</label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Optional: ID number or FaceMeX handle"
                      className={fieldClass}
                    />

                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-white/50">
                      <input
                        type="checkbox"
                        checked={showIdOnCv}
                        onChange={(e) => setShowIdOnCv(e.target.checked)}
                        className="mt-0.5"
                      />
                      Show this on CV. Avoid adding sensitive ID numbers unless an employer asks.
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Phone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 076 000 0000"
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Town, Province"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Professional Summary</label>
                    <Textarea
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Example: media management and team management in a busy environment"
                      className={textAreaClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Core Competencies / Skills</label>
                    <Textarea
                      rows={4}
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Team management, customer service, social media management, communication"
                      className={textAreaClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Professional Experience</label>
                  <Textarea
                    rows={5}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder={'Job Title | Company | Year\n- Write responsibility or achievement\n- Write responsibility or achievement'}
                    className={textAreaClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Education</label>
                  <Textarea
                    rows={3}
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="Diploma | TVET College | 2024"
                    className={textAreaClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Additional Info</label>
                  <Textarea
                    rows={3}
                    value={extras}
                    onChange={(e) => setExtras(e.target.value)}
                    placeholder="English fluently / Sepedi mothers tangue / Code 10 drive"
                    className={textAreaClass}
                  />
                </div>

                <Button onClick={handleGenerate} disabled={busy} className={`${darkButton} w-full`}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {busy ? 'Generating CV…' : 'Generate ATS CV'}
                </Button>

                {hasBuilderOutput && output && (
                  <div className="mt-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-white/55">
                      <span>Display settings</span>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-xl border bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-white/[0.06]"
                          value={fontStyle}
                          onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                        >
                          <option value="document">Document serif</option>
                          <option value="serif">Serif</option>
                          <option value="sans">Sans</option>
                          <option value="system">System</option>
                          <option value="mono">Mono</option>
                        </select>

                        <select
                          className="rounded-xl border bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-white/[0.06]"
                          value={lineSpacing}
                          onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                        >
                          <option value="tight">Tight</option>
                          <option value="normal">Normal</option>
                          <option value="relaxed">Relaxed</option>
                        </select>
                      </div>
                    </div>

                    <PreviewActions content={output} title="FaceMeX ATS CV" />

                    <CvPreview
                      content={output}
                      fontClass={outputFontClass}
                      leadingClass={outputLeadingClass}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="w-full overflow-hidden rounded-[24px] border border-black/5 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg md:text-xl">AI CV Upgrade</CardTitle>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                      Creator+ rewrite using the same one-page A4 CV template.
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.06]">
                    <Crown className="mr-1 h-3 w-3" />
                    Creator+
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
                  Paste your current CV. FaceMeX will improve grammar, structure, bullets, and section layout.
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    Current CV
                    <span className="rounded-full border px-2 py-0.5 text-[10px] text-slate-500">Required</span>
                  </label>

                  <Textarea
                    rows={10}
                    value={proInput}
                    onChange={(e) => setProInput(e.target.value)}
                    placeholder="Paste your current CV here."
                    className={textAreaClass}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Target role / level</label>
                    <Input
                      value={proTargetLevel}
                      onChange={(e) => setProTargetLevel(e.target.value)}
                      placeholder="e.g. Driver, General Worker, Junior Admin"
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Extra notes</label>
                    <Textarea
                      rows={3}
                      value={proExtras}
                      onChange={(e) => setProExtras(e.target.value)}
                      placeholder="Add anything you want the AI to highlight."
                      className={textAreaClass}
                    />
                  </div>
                </div>

                <Button onClick={handleImprove} disabled={proBusy || !isCreatorPlus} className={`${darkButton} w-full`}>
                  {proBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {proBusy ? 'Upgrading CV…' : isCreatorPlus ? 'Upgrade my CV' : 'Creator+ required'}
                </Button>

                <p className="flex gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-white/55">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Use the upgraded CV as your base, then adjust it for each job before applying.
                </p>

                {hasUpgradeOutput && proOutput && (
                  <div className="mt-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-white/55">
                      <span>Display settings</span>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-xl border bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-white/[0.06]"
                          value={fontStyle}
                          onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                        >
                          <option value="document">Document serif</option>
                          <option value="serif">Serif</option>
                          <option value="sans">Sans</option>
                          <option value="system">System</option>
                          <option value="mono">Mono</option>
                        </select>

                        <select
                          className="rounded-xl border bg-white px-2 py-1 text-[11px] dark:border-white/10 dark:bg-white/[0.06]"
                          value={lineSpacing}
                          onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                        >
                          <option value="tight">Tight</option>
                          <option value="normal">Normal</option>
                          <option value="relaxed">Relaxed</option>
                        </select>
                      </div>
                    </div>

                    <PreviewActions content={proOutput} title="FaceMeX ATS CV Upgrade" />

                    <CvPreview
                      content={proOutput}
                      fontClass={outputFontClass}
                      leadingClass={outputLeadingClass}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {quickDraft && (
            <Card className="w-full overflow-hidden rounded-[24px] border border-black/5 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{quickDraft.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="rounded-[22px] border border-black/5 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80">
                  <pre
                    className="m-0 whitespace-pre-wrap break-words font-sans"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {quickDraft.content}
                  </pre>
                </div>

                <Button
                  variant="outline"
                  className={outlineButton}
                  onClick={() => copyToClipboard(quickDraft.content)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy draft
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SensitiveContentShield>
    </div>
  );
}
