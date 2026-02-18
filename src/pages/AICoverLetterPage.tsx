import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import SensitiveContentShield from '@/components/safety/SensitiveContentShield';
import Navbar from '@/components/layout/Navbar';

export default function AICoverLetterPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [resumeSummary, setResumeSummary] = useState('');
  const [extras, setExtras] = useState('');
  const [candidateName, setCandidateName] = useState('');

  const [freeOutput, setFreeOutput] = useState<string | null>(null);
  const [creatorOutput, setCreatorOutput] = useState<string | null>(null);
  const [freeBusy, setFreeBusy] = useState(false);
  const [creatorBusy, setCreatorBusy] = useState(false);

  const [fontStyle, setFontStyle] = useState<'mono' | 'sans' | 'serif' | 'system' | 'document'>('mono');
  const [lineSpacing, setLineSpacing] = useState<'tight' | 'normal' | 'relaxed'>('normal');

  const applySignature = (text: string | null | undefined, name: string): string => {
    const trimmed = (text || '').toString();
    const cleanName = name.trim();
    if (!trimmed) return '';
    if (!cleanName) return trimmed;

    // Replace the common placeholder form first
    const withPlaceholderReplaced = trimmed.replace(/Sincerely,\s*\[Your Name\]/i, `Sincerely,\n${cleanName}`);

    if (withPlaceholderReplaced !== trimmed) {
      return withPlaceholderReplaced;
    }

    // If there is a bare Sincerely at the end without a name, append the name
    const bareSigRegex = /(Sincerely,)(\s*)$/i;
    if (bareSigRegex.test(withPlaceholderReplaced)) {
      return withPlaceholderReplaced.replace(bareSigRegex, `Sincerely,\n${cleanName}`);
    }

    return withPlaceholderReplaced;
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

    const safe = (value: string) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
        background: #f3f4f6;
        padding: 16px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.4;
        white-space: pre-wrap;
        font-size: 12px;
      }
      @page {
        size: A4;
        margin: 0;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 20mm;
        background: #ffffff;
        color: #000000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.10);
        border: 1px solid rgba(0,0,0,0.12);
        box-sizing: border-box;
      }
      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }
        .page {
          box-shadow: none;
          border: none;
          margin: 0;
        }
      }
    </style>
  </head>
  <body><main class="page">${safe(content)}</main></body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const validate = () => {
    if (!jobTitle.trim() && !company.trim() && !resumeSummary.trim()) {
      toast({ title: 'Add job details', description: 'Provide at least job title, company, or summary.' });
      return false;
    }
    return true;
  };

  const handleFreeGenerate = async () => {
    if (!validate()) return;
    setFreeBusy(true);
    try {
      const res = await api.post('/api/ai/pro/cover-letter', {
        jobTitle,
        company,
        resumeSummary,
        extras,
        candidateName,
        tier: 'free',
      });
      const letter = (res.letter as string | undefined) || 'No cover letter returned.';
      setFreeOutput(applySignature(letter, candidateName));
    } catch (e: any) {
      toast({ title: 'Cover letter failed', description: e?.message || 'Please try again.' });
    } finally {
      setFreeBusy(false);
    }
  };

  const handleCreatorGenerate = async () => {
    if (!validate()) return;
    setCreatorBusy(true);
    try {
      const res = await api.post('/api/ai/pro/cover-letter', {
        jobTitle,
        company,
        resumeSummary,
        extras,
        candidateName,
        tier: 'creator+',
      });
      const letter = (res.letter as string | undefined) || 'No cover letter returned.';
      setCreatorOutput(applySignature(letter, candidateName));
    } catch (e: any) {
      toast({ title: 'Cover letter failed', description: e?.message || 'Please try again.' });
    } finally {
      setCreatorBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <SensitiveContentShield context="cover-letter" className="max-w-6xl mx-auto pt-14 md:pt-16 px-4">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold">AI Cover Letter Studio</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Start with a solid free template, then unlock a Creator+ version that rewrites your letter in a stronger,
              more tailored voice.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border border-border/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg md:text-xl">Free Cover Letter</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clean template based on your details. Great for quick, ATS-friendly letters.
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Free
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Job title</label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Product Designer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Company</label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. FaceMe Labs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Your name for signature (optional)</label>
                  <Input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Name to show under Sincerely"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Your summary / key experience</label>
                  <Textarea
                    rows={4}
                    value={resumeSummary}
                    onChange={(e) => setResumeSummary(e.target.value)}
                    placeholder="Paste a short summary or key bullet points from your resume."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Extras (optional)</label>
                  <Textarea
                    rows={3}
                    value={extras}
                    onChange={(e) => setExtras(e.target.value)}
                    placeholder="Why you like the company, what excites you about the role, or portfolio links."
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleFreeGenerate}
                    disabled={freeBusy}
                    className="text-sm font-medium"
                  >
                    {freeBusy ? 'Generating…' : 'Generate Free Letter'}
                  </Button>
                </div>
                {freeOutput && (
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
                      <div className="flex-1 overflow-auto rounded-md border bg-muted/40 p-3">
                        <div
                          style={{
                            width: '210mm',
                            minHeight: '297mm',
                            margin: '0 auto',
                            padding: '20mm',
                            background: 'white',
                            color: 'black',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
                            border: '1px solid rgba(0,0,0,0.12)',
                          }}
                          className={`whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                        >
                          {freeOutput}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-[11px]"
                        onClick={() => freeOutput && openPrintWindow('FaceMe Cover Letter', freeOutput)}
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
                  <CardTitle className="text-lg md:text-xl">AI Cover Letter Upgrade</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Creator+ tool that rewrites your cover letter with a stronger, more persuasive voice.
                  </p>
                </div>
                <span className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Creator+
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs md:text-sm text-muted-foreground">
                Uses the same details but lets the local DeepSeek AI rewrite the letter like a senior recruiter or hiring
                manager wrote it for you.
              </p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                <span>Requires Creator or higher. Free users can still use the template on the left.</span>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreatorGenerate}
                  disabled={creatorBusy}
                  className="text-sm font-medium"
                >
                  {creatorBusy ? 'Rewriting…' : 'Upgrade Cover Letter (Creator+)'}
                </Button>
              </div>
              {creatorOutput && (
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Display settings (for this view only)</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="uppercase tracking-wide">Font</span>
                        <select
                          className="border bg-background px-1.5 py-0.5 rounded text-[11px]"
                          value={fontStyle}
                          onChange={(e) => setFontStyle(e.target.value as 'mono' | 'sans' | 'serif' | 'system' | 'document')}
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
                    <div className="flex-1 overflow-auto rounded-md border bg-muted/40 p-3">
                      <div
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
                          margin: '0 auto',
                          padding: '20mm',
                          background: 'white',
                          color: 'black',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
                          border: '1px solid rgba(0,0,0,0.12)',
                        }}
                        className={`whitespace-pre-wrap text-xs md:text-sm ${outputFontClass} ${outputLeadingClass}`}
                      >
                        {creatorOutput}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-[11px]"
                      onClick={() => creatorOutput && openPrintWindow('FaceMe Cover Letter (Creator+)', creatorOutput)}
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
