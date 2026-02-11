import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';
import Navbar from '@/components/layout/Navbar';

export default function AIJobAssistantPage() {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [preferences, setPreferences] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [industry, setIndustry] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { tier, hasTier } = useUserStore();

  const handleGenerate = async () => {
    if (!role.trim() && !location.trim() && !preferences.trim()) {
      toast({ title: 'Add job search details', description: 'Provide at least a role, location, or preference.' });
      return;
    }
    const isCreatorPlus = hasTier('creator');

    if (!isCreatorPlus) {
      toast({
        title: 'Creator+ recommended',
        description:
          'On free plans the job assistant uses a template plan. Upgrade to Creator+ to unlock DeepSeek-powered strategies.',
      });
    }

    setBusy(true);
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
      });
      const list = Array.isArray(res.suggestions) ? (res.suggestions as string[]) : [];
      setSuggestions(list);
      setOutput(
        list.length ? list.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n\n') : 'No suggestions returned.'
      );
    } catch (e: any) {
      toast({ title: 'Job assistant failed', description: e?.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSavePlan = () => {
    const text =
      suggestions && suggestions.length
        ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        : (output || '').toString();

    if (!text.trim()) {
      toast({ title: 'Nothing to save', description: 'Generate strategies first, then save them.' });
      return;
    }
    setSavedPlan(text);
    toast({ title: 'Plan saved for this session', description: 'Scroll down to view your saved job search plan.' });
  };

  const labels = [
    'Role focus & where to search',
    'CV and profile improvements',
    'Application strategy',
    'Networking & outreach',
    'Weekly routine & habit',
  ];

  const handleCopyAll = async () => {
    const text =
      suggestions && suggestions.length
        ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        : (output || '').toString();

    if (!text.trim()) {
      toast({ title: 'Nothing to copy', description: 'Generate strategies first, then copy them.' });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard', description: 'Job search strategies are ready to paste into your notes.' });
    } catch (err) {
      console.error('copy strategies failed', err);
      toast({ title: 'Copy failed', description: 'Select the text manually and copy it instead.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-14 md:pt-16 px-4">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">AI Job Assistant</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Generate a practical job-search plan and next steps.</p>
        </div>

        <Card className="rounded-2xl border border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Job search strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get personalized job search strategies from the local DeepSeek AI.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Target role</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Preferred location</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, Berlin, Lagos"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Preferences (optional)</label>
                <Input
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g. remote only, fintech, startups"
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
                  placeholder="e.g. Tech, Marketing, Hospitality"
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
            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={busy} className="text-sm font-medium">
                {busy ? 'Generating…' : 'Get Strategies'}
              </Button>
            </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
