import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function EmotionAIPage() {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResources, setShowResources] = useState(false);

  const detectFromText = async () => {
    setAnalyzing(true);
    setTimeout(() => {
      const t = text.toLowerCase();
      if (/(happy|great|love|excited|awesome|good)/.test(t)) setMood('joy');
      else if (/(sad|down|tired|bad|unhappy)/.test(t)) setMood('sadness');
      else if (/(angry|mad|annoyed|furious)/.test(t)) setMood('anger');
      else if (/(anxious|worried|nervous)/.test(t)) setMood('anxiety');
      else setMood('neutral');
      setAnalyzing(false);
    }, 500);
  };

  const suggestions = useMemo(() => {
    switch (mood) {
      case 'joy':
        return ['Share your win 🎉', 'Upbeat playlist', 'Photo dump with friends'];
      case 'sadness':
        return ['Soothing content', 'Gratitude journal prompt', 'Reach out to a friend'];
      case 'anger':
        return ['Cool-down tips', 'Expressive art post', 'Guided breathing track'];
      case 'anxiety':
        return ['Calming video', 'Grounding exercise', 'Nature photos'];
      case 'neutral':
      default:
        return ['Trending topics', 'Discover new communities', 'Try a mini challenge'];
    }
  }, [mood]);

  const friendMatches = useMemo(() => (
    [
      { id: 'u1', name: 'Ava', compat: 92, basis: 'shared upbeat content' },
      { id: 'u2', name: 'Noah', compat: 88, basis: 'similar posting times' },
      { id: 'u3', name: 'Mia', compat: 85, basis: 'overlapping interests' },
    ]
  ), []);

  const isLowMood = mood === 'sadness' || mood === 'anger' || mood === 'anxiety';

  const resourcesBody = (
    <div className="space-y-3 text-xs sm:text-sm">
      <p className="text-muted-foreground">
        The tools below are designed as short, supportive practices. They are not clinical care and cannot assess risk. If you are concerned about safety or are in immediate danger, contact local emergency or crisis services.
      </p>
      <ul className="space-y-1 list-disc list-inside text-muted-foreground">
        <li><span className="font-medium text-foreground">Breathing reset:</span> Inhale for 4 seconds, hold for 4 seconds, and exhale for 6 seconds. Repeat several times while seated comfortably.</li>
        <li><span className="font-medium text-foreground">Grounding:</span> Notice 5 things you can see, 4 things you can touch, 3 sounds you can hear, 2 things you can smell, and 1 thing you can taste or imagine tasting.</li>
        <li><span className="font-medium text-foreground">Contact with others:</span> When it feels safe, consider letting a trusted person know how you are feeling.</li>
      </ul>
      <p className="text-[11px] text-muted-foreground">
        If you notice ongoing changes in mood, sleep, or day‑to‑day functioning, contacting a licensed mental health professional or healthcare provider may be helpful. In South Africa, non‑emergency support is available from SADAG (0800 567 567 or 0800 21 22 23), LifeLine (0861 322 322), and the Cipla 24‑hour Mental Health Helpline (0800 456 789). These examples are not exhaustive and do not cover every country or language. Please refer to national health services or trusted local providers to find up‑to‑date services that operate in your region and language.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-5xl mx-auto p-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detect Emotions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Type something..." value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex items-center gap-2">
                <Button onClick={detectFromText} disabled={analyzing}>{analyzing ? 'Analyzing...' : 'Analyze Text'}</Button>
                {mood && <Badge variant="secondary">Mood: {mood}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">Video emotion analysis mock: attach a short clip on the Share page for richer signals.</div>
            </CardContent>
          </Card>

          {isLowMood && (
            <Card className="border-yellow-300/70 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="text-sm">It appears you may be describing distress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm">
                <p className="text-muted-foreground">
                  You can view brief supportive tools and information if that would be helpful. These materials do not replace professional or emergency care.
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowResources(true)}>
                  View support tools
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Emotion-based Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s) => (
                <div key={s} className="p-3 border rounded-lg bg-card">{s}</div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Friend Matching</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {friendMatches.map(f => (
                <div key={f.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.basis}</div>
                  </div>
                  <Badge>{f.compat}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feeling overwhelmed?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                If recent experiences feel difficult to manage, it may help to pause, use a brief exercise, or consider talking with someone you trust.
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowResources(true)}>
                Open support tools
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border bg-background shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Supportive tools &amp; information</h2>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowResources(false)}
              >
                Close
              </button>
            </div>
            {resourcesBody}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowResources(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
