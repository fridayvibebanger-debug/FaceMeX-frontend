import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import Navbar from '@/components/layout/Navbar';

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

  const [fontStyle, setFontStyle] = useState<'mono' | 'sans' | 'serif' | 'system' | 'document'>('mono');
  const [lineSpacing, setLineSpacing] = useState<'tight' | 'normal' | 'relaxed'>('normal');

  const [proInput, setProInput] = useState('');
  const [proTargetLevel, setProTargetLevel] = useState('');
  const [proExtras, setProExtras] = useState('');
  const [proOutput, setProOutput] = useState<string | null>(null);
  const [proBusy, setProBusy] = useState(false);

  const { tier, hasTier } = useUserStore();

  const handleGenerate = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !idNumber.trim()) {
      toast({
        title: 'Add personal details',
        description: 'Please provide your name, email, phone, and ID before generating your CV.',
      });
      return;
    }
    setBusy(true);
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
      });
      setOutput(res.resumeText || 'No resume text returned.');
    } catch (e: any) {
      toast({ title: 'Resume builder failed', description: e?.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const outputFontClass =
    fontStyle === 'serif' || fontStyle === 'document'
      ? 'font-serif'
      : fontStyle === 'sans' || fontStyle === 'system'
      ? 'font-sans'
      : 'font-mono';
  const outputLeadingClass =
    lineSpacing === 'tight' ? 'leading-tight' : lineSpacing === 'relaxed' ? 'leading-loose' : 'leading-normal';

  const openPrintWindow = (title: string, content: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const fontFamily =
      fontStyle === 'serif' || fontStyle === 'document'
        ? 'Georgia, "Times New Roman", serif'
        : fontStyle === 'sans' || fontStyle === 'system'
        ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        : 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const lineHeight = lineSpacing === 'tight' ? '1.1' : lineSpacing === 'relaxed' ? '1.8' : '1.4';

    const safe = (value: string) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const hasHeaderInfo = fullName || email || phone || location || idNumber;
    const headerHtml = hasHeaderInfo
      ? `<header style="margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
  <div style="font-size: 18px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;">${safe(
    fullName || '[Your Name]'
  )}</div>
  <div style="margin-top: 4px; font-size: 11px; color: #444; white-space: pre-wrap;">
    ${[
      email && `Email: ${safe(email)}`,
      phone && `Phone: ${safe(phone)}`,
      location && `Location: ${safe(location)}`,
      idNumber && `ID / Profile: ${safe(idNumber)}`,
    ]
      .filter(Boolean)
      .join(' \u00b7 ')}
  </div>
</header>`
      : '';

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>${title}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        margin: 20mm;
        font-family: ${fontFamily};
        line-height: ${lineHeight};
        white-space: pre-wrap;
        font-size: 12px;
      }
      @page {
        size: A4;
        margin: 20mm;
      }
    </style>
  </head>
  <body>${headerHtml}<main>${safe(content)}</main></body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleImprove = async () => {
    if (!proInput.trim()) {
      toast({
        title: 'Paste your current CV',
        description: 'Add your existing CV text first so the AI can upgrade it.',
      });
      return;
    }

    const isCreatorPlus = hasTier('creator');

    if (!isCreatorPlus) {
      toast({
        title: 'Creator+ upgrade recommended',
        description:
          'On free plans the CV upgrade uses a guided template. Upgrade to Creator+ to unlock a full DeepSeek rewrite.',
      });
    }

    setProBusy(true);
    try {
      const res = await api.post('/api/ai/pro/resume-improver', {
        existingCv: proInput,
        targetLevel: proTargetLevel,
        extras: proExtras,
        tier,
        creatorPlus: isCreatorPlus,
      });
      setProOutput(res.improvedText || 'No improved CV text returned.');
    } catch (e: any) {
      toast({ title: 'CV upgrade failed', description: e?.message || 'Please try again.' });
    } finally {
      setProBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <SensitiveContentShield context="cv" className="max-w-6xl mx-auto pt-14 md:pt-16 px-4">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold">AI CV Studio</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Start with a clean AI CV builder (free), then unlock an upgraded Creator+ flow that rewrites weak CVs into a
              professional version using your local DeepSeek AI.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg md:text-xl">AI CV Builder</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Free layout that turns your details into a full CV you can copy into job portals.
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Free
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Fill in what you have. The AI will generate a clean, ATS-friendly CV with sections for summary,
                  experience, skills, and education.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Full name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Mokoena"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">ID / Profile ID</label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g. ID number or FaceMeX handle"
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
                      placeholder="e.g. +27 00 000 0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Location</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Summary</label>
                    <Textarea
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder={
                        '3–4 lines: who you are, your strongest skills, and the type of roles you want.\nExample: Junior customer support / creator with strong communication and social media skills.'
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Skills (comma separated)</label>
                    <Textarea
                      rows={4}
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder={
                        '6–10 skills that match jobs you like, separated by commas.\nExample: Communication, Customer service, Social media, Excel, Time management'
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Experience</label>
                  <Textarea
                    rows={5}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder={
                      'If you have experience, list each role on a new line with Job title | Company | City | Dates, then 2–4 bullet points.\nIf you have no experience, write about school projects, volunteering, or side hustles.'
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Education</label>
                  <Textarea
                    rows={3}
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder={
                      'Highest level of education, short courses, or bootcamps.\nExample: High School (year finished) or Short course / Online certificate name.'
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Additional info (optional)</label>
                  <Textarea
                    rows={3}
                    value={extras}
                    onChange={(e) => setExtras(e.target.value)}
                    placeholder={
                      'Languages, links, small projects, or community work.\nExample: Languages (English, Zulu), Link to portfolio or social profile, volunteering, side hustles.'
                    }
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={busy}
                    className="text-sm font-medium"
                  >
                    {busy ? 'Generating…' : 'Generate CV'}
                  </Button>
                </div>
                {output && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Display settings (for this view only)</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Font</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={fontStyle}
                            onChange={(e) =>
                              setFontStyle(e.target.value as 'mono' | 'sans' | 'serif' | 'system' | 'document')
                            }
                          >
                            <option value="mono">Mono</option>
                            <option value="sans">Sans (screen)</option>
                            <option value="system">System</option>
                            <option value="serif">Serif (classic)</option>
                            <option value="document">Document serif</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Spacing</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={lineSpacing}
                            onChange={(e) => setLineSpacing(e.target.value as 'tight' | 'normal' | 'relaxed')}
                          >
                            <option value="tight">Tight</option>
                            <option value="normal">Normal</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`flex-1 p-4 rounded-md border bg-card whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                      >
                        {(fullName || email || phone || location || idNumber) && (
                          <div className="mb-2 border-b pb-1">
                            <div className="text-xs md:text-sm font-semibold tracking-wide uppercase">
                              {fullName || '[Your Name]'}
                            </div>
                            <div className="mt-1 text-[10px] md:text-xs text-muted-foreground whitespace-pre-wrap">
                              {[
                                email && `Email: ${email}`,
                                phone && `Phone: ${phone}`,
                                location && `Location: ${location}`,
                                idNumber && `ID / Profile: ${idNumber}`,
                              ]
                                .filter(Boolean)
                                .join(' \u00b7 ')}
                            </div>
                          </div>
                        )}
                        {output}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[11px]"
                        onClick={() => output && openPrintWindow('FaceMeX CV', output)}
                      >
                        Download / Print
                      </Button>
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
                      Creator+ tool that rewrites a weak CV into a sharper, more professional draft.
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Creator+
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Paste your current CV (even if it is messy). DeepSeek will rewrite it with stronger language and clearer
                  structure. Ideal when you already have a CV but want it to sound professional.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    Current CV (paste text)
                    <span className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground">
                      Required
                    </span>
                  </label>
                  <Textarea
                    rows={10}
                    value={proInput}
                    onChange={(e) => setProInput(e.target.value)}
                    placeholder={'Paste your existing CV here, including summary, roles, skills, and education.'}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Target level (optional)</label>
                    <Input
                      value={proTargetLevel}
                      onChange={(e) => setProTargetLevel(e.target.value)}
                      placeholder="e.g. Junior, Mid, Senior, Lead, Creator, Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Extra notes (optional)</label>
                    <Textarea
                      rows={3}
                      value={proExtras}
                      onChange={(e) => setProExtras(e.target.value)}
                      placeholder="Tell the AI what jobs you are targeting or what you want to highlight."
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                  <span>Requires Creator or higher. On free plans you can still use the basic CV builder on the left.</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleImprove}
                    disabled={proBusy}
                    className="text-sm font-medium"
                  >
                    {proBusy ? 'Upgrading…' : 'Upgrade my CV (Creator+)'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The upgraded CV is ideal for submitting to recruiters, job portals, or as a base for tailoring to
                  specific roles.
                </p>
                {proOutput && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Display settings (for this view only)</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Font</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={fontStyle}
                            onChange={(e) => setFontStyle(e.target.value as 'mono' | 'sans' | 'serif')}
                          >
                            <option value="mono">Mono</option>
                            <option value="sans">Sans</option>
                            <option value="serif">Serif</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="uppercase tracking-wide">Spacing</span>
                          <select
                            className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                            value={lineSpacing}
                            onChange={(e) => setLineSpacing(e.target.value as 'tight' | 'normal' | 'relaxed')}
                          >
                            <option value="tight">Tight</option>
                            <option value="normal">Normal</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`p-4 rounded-md border bg-card whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                      >
                        {(fullName || email || phone || location || idNumber) && (
                          <div className="mb-2 border-b pb-1">
                            <div className="text-sm font-semibold tracking-wide uppercase">
                              {fullName || '[Your Name]'}
                            </div>
                            <div className="mt-1 text-[10px] md:text-xs text-muted-foreground whitespace-pre-wrap">
                              {[
                                email && `Email: ${email}`,
                                phone && `Phone: ${phone}`,
                                location && `Location: ${location}`,
                                idNumber && `ID / Profile: ${idNumber}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        )}
                        {proOutput}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[11px]"
                        onClick={() => proOutput && openPrintWindow('FaceMeX CV (Upgraded)', proOutput)}
                      >
                        Download / Print
                      </Button>
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
