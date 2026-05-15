import { useMemo, useState } from 'react';
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

function cleanText(value: string) {
  return String(value || '').trim();
}

function splitList(value: string) {
  return String(value || '')
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bulletList(items: string[]) {
  return items.length ? items.map((item) => `• ${item}`).join('\n') : '';
}

function normalizeLines(value: string) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatExperience(experience: string) {
  const lines = normalizeLines(experience);

  if (!lines.length) {
    return `No formal work experience listed yet.
• Available to gain practical workplace experience.
• Willing to learn, follow instructions, and support team goals.`;
  }

  return lines
    .map((line) => {
      if (line.startsWith('•') || line.startsWith('-')) return line.replace('-', '•');
      return line;
    })
    .join('\n');
}

function buildAtsCv(input: {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  idNumber: string;
  summary: string;
  experience: string;
  skills: string;
  education: string;
  extras: string;
}) {
  const fullName = cleanText(input.fullName).toUpperCase();
  const contactLine = [
    cleanText(input.location),
    cleanText(input.phone),
    cleanText(input.email),
    cleanText(input.idNumber) ? `ID / Profile: ${cleanText(input.idNumber)}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const skills = splitList(input.skills);
  const extras = cleanText(input.extras);
  const education = cleanText(input.education);
  const summary =
    cleanText(input.summary) ||
    `Reliable and detail-oriented candidate with strong communication, teamwork, time management, and willingness to learn. Able to follow instructions, support daily operations, and work well in busy environments.`;

  const coreCompetencies = skills.length
    ? skills.slice(0, 8)
    : [
        'Communication',
        'Teamwork',
        'Time Management',
        'Customer Assistance',
        'Problem Solving',
        'Reliability',
      ];

  return `${fullName || '[YOUR NAME]'}
${contactLine || '[Location] | [Phone] | [Email]'}

PROFESSIONAL SUMMARY
${summary}

CORE COMPETENCIES
${bulletList(coreCompetencies)}

PROFESSIONAL EXPERIENCE
${formatExperience(input.experience)}

EDUCATION
${education || 'Highest qualification / School / Institution | Year'}

TECHNICAL SKILLS
${bulletList(skills.length ? skills : coreCompetencies)}

ADDITIONAL INFORMATION
${extras || 'Languages, driver’s licence, certifications, projects, volunteering, or portfolio links can be added here.'}

REFERENCES
Available on request.`;
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
• Communication
• Teamwork
• Time Management
• Customer Service
• Problem Solving
• Reliability
• Organisation
• Workplace Discipline

PROFESSIONAL EXPERIENCE
${existing}

EDUCATION
Add your education section here in this format:
Qualification - Institution | Year
Subjects / Modules / Relevant training

TECHNICAL SKILLS
• Computer literacy
• Customer assistance
• Administration support
• Planning and organisation
• Task execution
• Reporting and communication

ADDITIONAL INFORMATION
${extras || 'Add languages, driver’s licence, certifications, projects, volunteering, achievements, or portfolio links.'}

REFERENCES
Available on request.

NOTE
Use this as your improved ATS structure. Replace any weak or missing sections with your real details before applying.`;
}

export default function AIResumePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [idNumber, setIdNumber] = useState('');
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

  const { tier, hasTier } = useUserStore();

  const isCreatorPlus = hasTier('creator');

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

  const hasBuilderOutput = useMemo(() => !!output, [output]);
  const hasUpgradeOutput = useMemo(() => !!proOutput, [proOutput]);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied',
        description: 'Your CV text has been copied.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please highlight and copy manually.',
      });
    }
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

    const fallbackCv = buildAtsCv({
      fullName,
      email,
      phone,
      location,
      idNumber,
      summary,
      experience,
      skills,
      education,
      extras,
    });

    try {
      const res = await api.post('/api/ai/pro/resume-builder', {
        fullName,
        email,
        phone,
        location,
        idNumber,
        summary,
        experience,
        skills,
        education,
        extras,
        template: 'ats_general_worker_template',
        requiredSections: [
          'PROFESSIONAL SUMMARY',
          'CORE COMPETENCIES',
          'PROFESSIONAL EXPERIENCE',
          'EDUCATION',
          'TECHNICAL SKILLS',
          'ADDITIONAL INFORMATION',
          'REFERENCES',
        ],
      });

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

    const fallbackUpgrade = improveToTemplateCv({
      existingCv: proInput,
      targetLevel: proTargetLevel,
      extras: proExtras,
    });

    try {
      const res = await api.post('/api/ai/pro/resume-improver', {
        existingCv: proInput,
        targetLevel: proTargetLevel,
        extras: proExtras,
        tier,
        creatorPlus: isCreatorPlus,
        template: 'ats_professional_template',
        instruction:
          'Rewrite into a clean ATS CV using these sections: PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION, TECHNICAL SKILLS, LANGUAGES, REFERENCES. Keep it professional, simple, and recruiter-friendly.',
      });

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
      lineSpacing === 'tight' ? '1.15' : lineSpacing === 'relaxed' ? '1.75' : '1.35';

    const safe = (value: string) =>
      value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>${safe(title)}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        margin: 18mm;
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        white-space: pre-wrap;
        font-size: 12px;
        color: #000;
      }
      @page {
        size: A4;
        margin: 18mm;
      }
    </style>
  </head>
  <body>${safe(content)}</body>
</html>`);

    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <SensitiveContentShield context="cv" className="max-w-6xl mx-auto pt-14 md:pt-16 px-4">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold">AI CV Studio</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Generate a clean ATS CV using the same professional structure as your uploaded template: summary,
              competencies, experience, education, skills, and references.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg md:text-xl">AI CV Builder</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Free ATS layout based on the uploaded CV template.
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Free
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Fill in your details. FaceMeX will generate a clean, job-ready CV with strong ATS section headings.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Full name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramoshweu Moshe Rakgoale"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">ID / Profile ID</label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Optional: ID number or FaceMeX handle"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Phone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 076 000 0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Town, Province"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Professional Summary</label>
                    <Textarea
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Example: Reliable and detail-oriented candidate with experience in customer service, stock support, teamwork, and busy environments."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Core Competencies / Skills</label>
                    <Textarea
                      rows={4}
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Shelf packing, Customer service, Queue management, Teamwork, Communication, Time management"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Professional Experience</label>
                  <Textarea
                    rows={5}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Job Title - Company | Dates&#10;• Write achievement or duty&#10;• Write achievement or duty"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Education</label>
                  <Textarea
                    rows={3}
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="Qualification - School / Institution | Year&#10;Subjects / certificates / courses"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Additional Info</label>
                  <Textarea
                    rows={3}
                    value={extras}
                    onChange={(e) => setExtras(e.target.value)}
                    placeholder="Languages, driver's licence, references, certificates, projects, volunteering."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleGenerate} disabled={busy} className="text-sm font-medium">
                    {busy ? 'Generating ATS CV…' : 'Generate ATS CV'}
                  </Button>
                </div>

                {hasBuilderOutput && output && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Display settings</span>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Font</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={fontStyle}
                            onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                          >
                            <option value="document">Document serif</option>
                            <option value="serif">Serif</option>
                            <option value="sans">Sans</option>
                            <option value="system">System</option>
                            <option value="mono">Mono</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Spacing</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={lineSpacing}
                            onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                          >
                            <option value="tight">Tight</option>
                            <option value="normal">Normal</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 overflow-auto rounded-md border bg-muted/40 p-3">
                        <div
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
                            margin: '0 auto',
                            padding: '18mm',
                            background: 'white',
                            color: 'black',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
                            border: '1px solid rgba(0,0,0,0.12)',
                          }}
                          className={`whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                        >
                          {output}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px]"
                          onClick={() => copyToClipboard(output)}
                        >
                          Copy
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px]"
                          onClick={() => openPrintWindow('FaceMeX ATS CV', output)}
                        >
                          Download / Print
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg md:text-xl">AI CV Upgrade</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creator+ rewrite using the uploaded ATS CV structure.
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Creator+
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Paste your current CV. FaceMeX will rewrite it into a sharper ATS CV with stronger wording and the same
                  clean section structure.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    Current CV
                    <span className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground">
                      Required
                    </span>
                  </label>

                  <Textarea
                    rows={10}
                    value={proInput}
                    onChange={(e) => setProInput(e.target.value)}
                    placeholder="Paste your current CV here."
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Target role / level</label>
                    <Input
                      value={proTargetLevel}
                      onChange={(e) => setProTargetLevel(e.target.value)}
                      placeholder="e.g. General Worker, Driver, Assistant, Junior Admin"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Extra notes</label>
                    <Textarea
                      rows={3}
                      value={proExtras}
                      onChange={(e) => setProExtras(e.target.value)}
                      placeholder="Add anything you want the AI to highlight."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                  <span>
                    Creator, Business, and Exclusive users can use the full AI CV Upgrade.
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleImprove} disabled={proBusy || !isCreatorPlus} className="text-sm font-medium">
                    {proBusy
                      ? 'Upgrading CV…'
                      : isCreatorPlus
                        ? 'Upgrade my CV'
                        : 'Creator+ required'}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Use the upgraded CV as your base, then adjust it for each job you apply for.
                </p>

                {hasUpgradeOutput && proOutput && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Display settings</span>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Font</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={fontStyle}
                            onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                          >
                            <option value="document">Document serif</option>
                            <option value="serif">Serif</option>
                            <option value="sans">Sans</option>
                            <option value="system">System</option>
                            <option value="mono">Mono</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Spacing</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={lineSpacing}
                            onChange={(e) => setLineSpacing(e.target.value as LineSpacing)}
                          >
                            <option value="tight">Tight</option>
                            <option value="normal">Normal</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 overflow-auto rounded-md border bg-muted/40 p-3">
                        <div
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
                            margin: '0 auto',
                            padding: '18mm',
                            background: 'white',
                            color: 'black',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
                            border: '1px solid rgba(0,0,0,0.12)',
                          }}
                          className={`whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                        >
                          {proOutput}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px]"
                          onClick={() => copyToClipboard(proOutput)}
                        >
                          Copy
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px]"
                          onClick={() => openPrintWindow('FaceMeX ATS CV Upgrade', proOutput)}
                        >
                          Download / Print
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SensitiveContentShield>
    </div>
  );
}
