import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Heart, ShieldCheck, RefreshCw } from 'lucide-react';
import { deepseekReply } from '@/utils/ai';
import { toast } from '@/components/ui/use-toast';

type Mood =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'anxiety'
  | 'neutral'
  | 'motivated'
  | 'tired';

type AiResult = {
  mood: Mood;
  confidence: number;
  summary: string;
  suggestions: string[];
};

const FALLBACK_BY_MOOD: Record<Mood, AiResult> = {
  joy: {
    mood: 'joy',
    confidence: 82,
    summary:
      'Your message sounds positive and energetic. This is a good moment to share progress, connect with people, or create something.',
    suggestions: [
      'Share a positive update',
      'Save this moment as a journal note',
      'Turn the energy into one small action',
    ],
  },
  sadness: {
    mood: 'sadness',
    confidence: 76,
    summary:
      'Your message sounds emotionally heavy. A slower pace, a trusted conversation, or a simple reset may help.',
    suggestions: [
      'Take a short pause',
      'Write one thing you need right now',
      'Reach out to someone you trust',
    ],
  },
  anger: {
    mood: 'anger',
    confidence: 78,
    summary:
      'Your message sounds frustrated or tense. It may help to cool down first before replying or making a decision.',
    suggestions: [
      'Wait before sending a strong reply',
      'Write the message, then edit it softer',
      'Take a short walk or breathing break',
    ],
  },
  anxiety: {
    mood: 'anxiety',
    confidence: 80,
    summary:
      'Your message sounds worried or uncertain. Focus on the next small step instead of trying to solve everything at once.',
    suggestions: [
      'Name the one thing you can control',
      'Break the problem into one next step',
      'Use a short grounding exercise',
    ],
  },
  motivated: {
    mood: 'motivated',
    confidence: 84,
    summary:
      'Your message sounds focused and ready for action. This is a good time to plan, execute, and keep momentum.',
    suggestions: [
      'Write your next 3 actions',
      'Send the message or proposal today',
      'Block 30 minutes for execution',
    ],
  },
  tired: {
    mood: 'tired',
    confidence: 74,
    summary:
      'Your message sounds low-energy or drained. A lighter task, rest, or a smaller goal may work better right now.',
    suggestions: [
      'Do one simple task only',
      'Drink water and pause for a few minutes',
      'Move the hardest task to later',
    ],
  },
  neutral: {
    mood: 'neutral',
    confidence: 65,
    summary:
      'Your message sounds balanced. You can use this moment to think clearly, plan calmly, or explore new ideas.',
    suggestions: [
      'Discover new communities',
      'Try a small creative challenge',
      'Review your current goals',
    ],
  },
};

function detectMoodFallback(text: string): AiResult {
  const t = text.toLowerCase();

  if (/(happy|great|love|excited|awesome|good|amazing|proud|win|blessed)/.test(t)) {
    return FALLBACK_BY_MOOD.joy;
  }

  if (/(sad|down|tired of|bad|unhappy|hurt|lonely|cry|empty)/.test(t)) {
    return FALLBACK_BY_MOOD.sadness;
  }

  if (/(angry|mad|annoyed|furious|irritated|hate|frustrated)/.test(t)) {
    return FALLBACK_BY_MOOD.anger;
  }

  if (/(anxious|worried|nervous|stress|stressed|scared|overthinking|panic)/.test(t)) {
    return FALLBACK_BY_MOOD.anxiety;
  }

  if (/(motivated|focused|ready|discipline|execute|build|goal|win big|hustle)/.test(t)) {
    return FALLBACK_BY_MOOD.motivated;
  }

  if (/(tired|exhausted|burned out|sleepy|drained|low energy)/.test(t)) {
    return FALLBACK_BY_MOOD.tired;
  }

  return FALLBACK_BY_MOOD.neutral;
}

function parseAiResult(raw: string, fallback: AiResult): AiResult {
  try {
    const cleaned = raw
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const mood = String(parsed?.mood || fallback.mood).toLowerCase() as Mood;

    const allowed: Mood[] = [
      'joy',
      'sadness',
      'anger',
      'anxiety',
      'neutral',
      'motivated',
      'tired',
    ];

    const finalMood = allowed.includes(mood) ? mood : fallback.mood;

    return {
      mood: finalMood,
      confidence: Number(parsed?.confidence || fallback.confidence),
      summary: String(parsed?.summary || fallback.summary),
      suggestions: Array.isArray(parsed?.suggestions)
        ? parsed.suggestions.slice(0, 3).map((item: unknown) => String(item))
        : fallback.suggestions,
    };
  } catch {
    return fallback;
  }
}

function moodLabel(mood: Mood | null) {
  if (!mood) return 'Not analyzed';
  if (mood === 'joy') return 'Joy';
  if (mood === 'sadness') return 'Low mood';
  if (mood === 'anger') return 'Frustration';
  if (mood === 'anxiety') return 'Worry';
  if (mood === 'motivated') return 'Motivated';
  if (mood === 'tired') return 'Low energy';
  return 'Neutral';
}

function moodBadgeClass(mood: Mood | null) {
  if (mood === 'joy') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
  if (mood === 'sadness') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
  if (mood === 'anger') return 'bg-red-500/10 text-red-700 border-red-500/20';
  if (mood === 'anxiety') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
  if (mood === 'motivated') return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
  if (mood === 'tired') return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
  return 'bg-muted text-muted-foreground border-border';
}

export default function EmotionAIPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const mood = result?.mood || null;

  const isLowMood =
    mood === 'sadness' ||
    mood === 'anger' ||
    mood === 'anxiety' ||
    mood === 'tired';

  const suggestions = useMemo(() => {
    return result?.suggestions || FALLBACK_BY_MOOD.neutral.suggestions;
  }, [result]);

  const friendMatches = useMemo(
    () => [
      {
        id: 'u1',
        name: 'Growth Partner',
        compat: 92,
        basis: 'similar execution mindset',
      },
      {
        id: 'u2',
        name: 'Creative Builder',
        compat: 88,
        basis: 'matching content interests',
      },
      {
        id: 'u3',
        name: 'Professional Network',
        compat: 85,
        basis: 'overlapping goals and activity',
      },
    ],
    []
  );

  const detectFromText = async () => {
    const clean = text.trim();

    if (!clean) {
      toast({
        title: 'Add text first',
        description: 'Type a message, journal note, or post draft to analyze.',
      });
      return;
    }

    setAnalyzing(true);
    setUsedFallback(false);

    const fallback = detectMoodFallback(clean);

    try {
      const prompt = `
Analyze the emotion of this text for a social media wellbeing feature.

Return ONLY valid JSON.
Do not include markdown.
Do not give medical diagnosis.
Do not mention any AI model.
Do not include crisis instructions.
Keep the tone supportive, short and practical.

Allowed mood values:
joy, sadness, anger, anxiety, neutral, motivated, tired

JSON format:
{
  "mood": "neutral",
  "confidence": 75,
  "summary": "short user-friendly explanation",
  "suggestions": ["short action 1", "short action 2", "short action 3"]
}

Text:
"${clean}"
`;

      const raw = await deepseekReply(prompt);
      const parsed = parseAiResult(raw, fallback);

      setResult(parsed);
    } catch {
      setResult(fallback);
      setUsedFallback(true);

      toast({
        title: 'Quick template used',
        description:
          'Analysis was completed using a built-in template because smart analysis was not available.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setText('');
    setResult(null);
    setUsedFallback(false);
    setShowResources(false);
  };

  const resourcesBody = (
    <div className="space-y-3 text-xs sm:text-sm">
      <p className="text-muted-foreground">
        These are short support tools for difficult moments. They are not medical
        care and do not replace help from a trusted professional, trusted adult,
        or emergency service.
      </p>

      <div className="space-y-2">
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="font-medium">Breathing reset</div>
          <p className="mt-1 text-muted-foreground">
            Sit comfortably, breathe in slowly, pause, then breathe out slowly.
            Repeat a few times.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="font-medium">Grounding reset</div>
          <p className="mt-1 text-muted-foreground">
            Look around and name a few things you can see, hear, and feel around
            you. This helps bring attention back to the present.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="font-medium">Talk to someone</div>
          <p className="mt-1 text-muted-foreground">
            When it feels safe, message or call someone you trust and tell them
            you need support.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        If you feel in immediate danger, contact your local emergency services or
        a trusted person near you right now.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-2">
        <div className="space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-sm">
            <CardHeader className="space-y-1 pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Emotion Check
                </CardTitle>

                <Badge variant="outline" className="rounded-full text-[10px]">
                  Private preview
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Paste a message, caption, or journal note. FaceMeX will detect
                the emotional tone and suggest safe next steps.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              <Textarea
                placeholder="Type something you want to understand..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[130px] resize-none rounded-2xl"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  onClick={detectFromText}
                  disabled={analyzing || !text.trim()}
                  className="rounded-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze Text
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAnalysis}
                  disabled={analyzing && !text}
                  className="rounded-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-full border ${moodBadgeClass(mood)}`}
                  >
                    Mood: {moodLabel(mood)}
                  </Badge>

                  {result?.confidence ? (
                    <Badge variant="secondary" className="rounded-full">
                      {Math.min(100, Math.max(0, result.confidence))}% confidence
                    </Badge>
                  ) : null}
                </div>
              </div>

              {usedFallback && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                  Smart analysis was slow, so FaceMeX used a quick built-in
                  template to save time.
                </div>
              )}

              {result && (
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {result.summary}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                Video emotion analysis can be connected later through uploaded
                clips or camera-based signals. For launch, text analysis is safer,
                faster, and easier to control.
              </div>
            </CardContent>
          </Card>

          {isLowMood && (
            <Card className="rounded-2xl border border-amber-300/70 bg-amber-50/60 shadow-sm dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-amber-600" />
                  Support tools available
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-xs sm:text-sm">
                <p className="text-muted-foreground">
                  This message may describe a difficult moment. You can open
                  short supportive tools if that helps.
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShowResources(true)}
                >
                  View support tools
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Emotion-based Recommendations</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion}
                  className="rounded-2xl border bg-card px-3 py-3 text-sm"
                >
                  {suggestion}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Friend Matching</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {friendMatches.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between rounded-2xl border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{friend.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {friend.basis}
                    </div>
                  </div>

                  <Badge className="rounded-full">{friend.compat}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Safe Use
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                This feature should guide content recommendations, reflection,
                and safer conversations. It should not label users permanently or
                make serious decisions about them.
              </p>

              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                Safe prediction categories: mood tone, content interest,
                community fit, and helpful next actions.
              </div>

              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setShowResources(true)}
              >
                Open support tools
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Launch Rules</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="rounded-xl border bg-card p-3">
                Do not use emotional signals for discrimination, shame, or
                manipulation.
              </div>

              <div className="rounded-xl border bg-card p-3">
                Do not show sensitive labels publicly. Keep analysis private to
                the user.
              </div>

              <div className="rounded-xl border bg-card p-3">
                Use results for better recommendations, not for judging the user.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                Supportive tools & information
              </h2>

              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setShowResources(false)}
              >
                Close
              </button>
            </div>

            {resourcesBody}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setShowResources(false)}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
