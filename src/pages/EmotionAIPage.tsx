import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  Heart,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Trophy,
  Target,
  Users,
  Briefcase,
  Palette,
  Handshake,
  CheckCircle2,
} from 'lucide-react';
import { deepseekReply } from '@/utils/ai';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabaseClient';

type Mood =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'anxiety'
  | 'neutral'
  | 'motivated'
  | 'tired';

type RiskLevel = 'low' | 'medium' | 'high' | 'urgent';
type ChallengeLevel = 'starter' | 'builder' | 'growth' | 'master';

type AiResult = {
  mood: Mood;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  supportGuidance: string;
  suggestions: string[];
  recommendedChallengeLevel: ChallengeLevel;
};

type EmotionChallenge = {
  id: string;
  title: string;
  level: ChallengeLevel;
  goal: string;
  reviewGoal: string;
  points: number;
  category: string;
};

type FriendMatch = {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  compat: number;
  basis: string;
  matchType: 'growth' | 'creative' | 'professional';
  tags: string[];
};

const STORAGE_JOINED_CHALLENGES = 'facemex_emotion_joined_challenges_v1';

const DANGEROUS_PATTERNS = [
  /kill\s+someone/i,
  /i\s+want\s+to\s+kill/i,
  /hurt\s+someone/i,
  /harm\s+someone/i,
  /murder/i,
  /stab/i,
  /shoot/i,
  /revenge/i,
  /attack/i,
  /fight\s+someone/i,
];

const SELF_HARM_PATTERNS = [
  /end\s+my\s+life/i,
  /i\s+want\s+to\s+die/i,
  /hurt\s+myself/i,
  /self\s*harm/i,
];

const FALLBACK_BY_MOOD: Record<Mood, AiResult> = {
  joy: {
    mood: 'joy',
    riskLevel: 'low',
    confidence: 86,
    summary:
      'Your message sounds positive and energetic. This is a strong moment for creativity, connection, and action.',
    supportGuidance:
      'Use this positive energy wisely. Share progress, encourage someone, or turn the momentum into one useful task.',
    suggestions: [
      'Share one positive update',
      'Encourage someone who needs support',
      'Turn this energy into one completed action',
    ],
    recommendedChallengeLevel: 'builder',
  },
  sadness: {
    mood: 'sadness',
    riskLevel: 'medium',
    confidence: 86,
    summary:
      'Your message sounds emotionally heavy. You may need support, rest, or a safe conversation instead of carrying it alone.',
    supportGuidance:
      'Try not to isolate yourself. Choose one safe person to message, step away from pressure, and focus on what your body needs right now.',
    suggestions: [
      'Message one trusted person',
      'Take a short walk or reset break',
      'Write what you feel before reacting',
    ],
    recommendedChallengeLevel: 'starter',
  },
  anger: {
    mood: 'anger',
    riskLevel: 'medium',
    confidence: 88,
    summary:
      'Your message sounds angry or emotionally intense. This is a moment to slow down before reacting.',
    supportGuidance:
      'Strong anger can push you toward actions you may regret. Create distance from the situation, pause communication, and speak to someone calm before making a decision.',
    suggestions: [
      'Step away from the conflict',
      'Do not send a heated reply yet',
      'Talk to someone calm before acting',
    ],
    recommendedChallengeLevel: 'starter',
  },
  anxiety: {
    mood: 'anxiety',
    riskLevel: 'medium',
    confidence: 86,
    summary:
      'Your message sounds worried or mentally overloaded. You may be trying to solve too much at once.',
    supportGuidance:
      'Bring the pressure down by choosing one controllable action. Do not try to fix everything now. Start with one small step.',
    suggestions: [
      'Focus on one task only',
      'Reduce information overload',
      'Take slow breaths for one minute',
    ],
    recommendedChallengeLevel: 'starter',
  },
  motivated: {
    mood: 'motivated',
    riskLevel: 'low',
    confidence: 88,
    summary:
      'Your message shows ambition and forward momentum. This is a strong moment for execution and consistency.',
    supportGuidance:
      'Use the energy while it is fresh. Write your next action, do it today, then review your progress.',
    suggestions: [
      'Write your next 3 actions',
      'Complete one important task today',
      'Post your progress or goal',
    ],
    recommendedChallengeLevel: 'growth',
  },
  tired: {
    mood: 'tired',
    riskLevel: 'medium',
    confidence: 82,
    summary:
      'Your message suggests low energy or burnout. Recovery may help more than pushing harder right now.',
    supportGuidance:
      'Reduce pressure for a short time. Handle one simple task, hydrate, and give your mind a real pause.',
    suggestions: [
      'Complete one simple task only',
      'Take a short recovery break',
      'Move the hardest task to later',
    ],
    recommendedChallengeLevel: 'starter',
  },
  neutral: {
    mood: 'neutral',
    riskLevel: 'low',
    confidence: 74,
    summary:
      'Your message appears balanced. FaceMeX can still help with growth, networking, and discovery.',
    supportGuidance:
      'This is a good moment to plan calmly, improve your profile, join a challenge, or connect with people who match your goals.',
    suggestions: [
      'Join a useful challenge',
      'Explore people with shared interests',
      'Improve your profile strength',
    ],
    recommendedChallengeLevel: 'builder',
  },
};

const CHALLENGES: Record<Mood, EmotionChallenge[]> = {
  joy: [
    {
      id: 'joy-share-progress',
      title: 'Share your win',
      level: 'builder',
      goal: 'Post one positive progress update.',
      reviewGoal: 'Review how many people engaged or commented.',
      points: 40,
      category: 'Connection',
    },
    {
      id: 'joy-encourage-three',
      title: 'Encourage 3 people',
      level: 'builder',
      goal: 'Send support or encouragement to 3 people.',
      reviewGoal: 'Review how the conversations made you feel.',
      points: 50,
      category: 'Community',
    },
  ],
  sadness: [
    {
      id: 'sadness-check-in',
      title: 'Check-in with someone',
      level: 'starter',
      goal: 'Message one trusted person and say you need support.',
      reviewGoal: 'Review whether you felt less alone after reaching out.',
      points: 30,
      category: 'Support',
    },
    {
      id: 'sadness-reset-walk',
      title: '10-minute reset',
      level: 'starter',
      goal: 'Take a short walk or quiet reset break.',
      reviewGoal: 'Review your mood before and after.',
      points: 25,
      category: 'Recovery',
    },
  ],
  anger: [
    {
      id: 'anger-no-reply',
      title: 'No heated reply',
      level: 'starter',
      goal: 'Wait before replying to anything that could escalate conflict.',
      reviewGoal: 'Review whether waiting helped you respond better.',
      points: 35,
      category: 'Self-control',
    },
    {
      id: 'anger-calm-plan',
      title: 'Calm first plan',
      level: 'starter',
      goal: 'Step away, breathe, and write what happened without sending it.',
      reviewGoal: 'Review what triggered the emotion.',
      points: 35,
      category: 'Safety',
    },
  ],
  anxiety: [
    {
      id: 'anxiety-one-task',
      title: 'One task only',
      level: 'starter',
      goal: 'Choose one small task and complete only that.',
      reviewGoal: 'Review how much pressure reduced after completing it.',
      points: 30,
      category: 'Focus',
    },
    {
      id: 'anxiety-grounding',
      title: 'Grounding reset',
      level: 'starter',
      goal: 'Pause and name what you can see, hear, and feel around you.',
      reviewGoal: 'Review whether your body felt calmer.',
      points: 25,
      category: 'Calm',
    },
  ],
  motivated: [
    {
      id: 'motivated-deep-work',
      title: '30-minute execution sprint',
      level: 'growth',
      goal: 'Work on your top goal for 30 minutes without distraction.',
      reviewGoal: 'Review what moved forward and what blocked you.',
      points: 70,
      category: 'Growth',
    },
    {
      id: 'motivated-public-progress',
      title: 'Public progress post',
      level: 'growth',
      goal: 'Post one goal and one action you completed.',
      reviewGoal: 'Review accountability and engagement.',
      points: 60,
      category: 'Accountability',
    },
  ],
  tired: [
    {
      id: 'tired-light-task',
      title: 'Light task challenge',
      level: 'starter',
      goal: 'Complete one easy task only.',
      reviewGoal: 'Review whether you regained momentum.',
      points: 25,
      category: 'Recovery',
    },
    {
      id: 'tired-recovery',
      title: 'Recovery block',
      level: 'starter',
      goal: 'Take a short rest and avoid heavy decisions while drained.',
      reviewGoal: 'Review what your body needed.',
      points: 25,
      category: 'Wellbeing',
    },
  ],
  neutral: [
    {
      id: 'neutral-profile',
      title: 'Profile strength review',
      level: 'builder',
      goal: 'Improve your bio, interests, or professional headline.',
      reviewGoal: 'Review whether your profile better represents you.',
      points: 40,
      category: 'Profile',
    },
    {
      id: 'neutral-connect',
      title: 'Find one useful connection',
      level: 'builder',
      goal: 'Connect with one person who shares your interests.',
      reviewGoal: 'Review whether the match supports your goals.',
      points: 45,
      category: 'Networking',
    },
  ],
};

function safeJsonParse(raw: string, fallback: AiResult): AiResult {
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const allowedMoods: Mood[] = [
      'joy',
      'sadness',
      'anger',
      'anxiety',
      'neutral',
      'motivated',
      'tired',
    ];

    const allowedRisks: RiskLevel[] = ['low', 'medium', 'high', 'urgent'];

    const allowedLevels: ChallengeLevel[] = [
      'starter',
      'builder',
      'growth',
      'master',
    ];

    const mood = String(parsed?.mood || fallback.mood).toLowerCase() as Mood;
    const riskLevel = String(
      parsed?.riskLevel || fallback.riskLevel
    ).toLowerCase() as RiskLevel;

    const recommendedChallengeLevel = String(
      parsed?.recommendedChallengeLevel || fallback.recommendedChallengeLevel
    ).toLowerCase() as ChallengeLevel;

    return {
      mood: allowedMoods.includes(mood) ? mood : fallback.mood,
      riskLevel: allowedRisks.includes(riskLevel)
        ? riskLevel
        : fallback.riskLevel,
      confidence: Math.min(
        100,
        Math.max(0, Number(parsed?.confidence || fallback.confidence))
      ),
      summary: String(parsed?.summary || fallback.summary),
      supportGuidance: String(
        parsed?.supportGuidance || fallback.supportGuidance
      ),
      suggestions: Array.isArray(parsed?.suggestions)
        ? parsed.suggestions.slice(0, 4).map((item: unknown) => String(item))
        : fallback.suggestions,
      recommendedChallengeLevel: allowedLevels.includes(recommendedChallengeLevel)
        ? recommendedChallengeLevel
        : fallback.recommendedChallengeLevel,
    };
  } catch {
    return fallback;
  }
}

function detectMoodFallback(text: string): AiResult {
  const t = text.toLowerCase();

  if (
    DANGEROUS_PATTERNS.some((pattern) => pattern.test(t)) ||
    SELF_HARM_PATTERNS.some((pattern) => pattern.test(t))
  ) {
    return {
      mood: 'anger',
      riskLevel: 'urgent',
      confidence: 98,
      summary:
        'FaceMeX detected intense distress or harmful language. This should not be treated as a normal mood check.',
      supportGuidance:
        'Pause immediately and create distance from the situation. Do not act while the emotion is high. Contact a trusted person, trusted adult, local emergency support, or someone nearby who can help keep everyone safe.',
      suggestions: [
        'Move away from the conflict or pressure point',
        'Do not confront anyone while emotions are high',
        'Contact someone you trust right now',
        'Use emergency help if anyone may be in danger',
      ],
      recommendedChallengeLevel: 'starter',
    };
  }

  if (/(sad|down|hurt|lonely|cry|empty|heartbroken|hopeless|broken)/.test(t)) {
    return FALLBACK_BY_MOOD.sadness;
  }

  if (/(angry|mad|annoyed|furious|irritated|hate|frustrated|rage)/.test(t)) {
    return FALLBACK_BY_MOOD.anger;
  }

  if (
    /(anxious|worried|nervous|stress|stressed|scared|overthinking|panic|fear)/.test(
      t
    )
  ) {
    return FALLBACK_BY_MOOD.anxiety;
  }

  if (
    /(motivated|focused|ready|discipline|execute|build|goal|success|business|growth|hustle)/.test(
      t
    )
  ) {
    return FALLBACK_BY_MOOD.motivated;
  }

  if (/(tired|exhausted|burned out|sleepy|drained|low energy)/.test(t)) {
    return FALLBACK_BY_MOOD.tired;
  }

  if (
    /(happy|great|love|excited|awesome|good|amazing|proud|win|blessed)/.test(t)
  ) {
    return FALLBACK_BY_MOOD.joy;
  }

  return FALLBACK_BY_MOOD.neutral;
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

function moodBadgeClass(mood: Mood | null, riskLevel?: RiskLevel) {
  if (riskLevel === 'urgent' || riskLevel === 'high') {
    return 'bg-red-500/10 text-red-700 border-red-500/30';
  }

  if (mood === 'joy') {
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
  }

  if (mood === 'sadness') {
    return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
  }

  if (mood === 'anger') {
    return 'bg-red-500/10 text-red-700 border-red-500/20';
  }

  if (mood === 'anxiety') {
    return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
  }

  if (mood === 'motivated') {
    return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
  }

  if (mood === 'tired') {
    return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
  }

  return 'bg-muted text-muted-foreground border-border';
}

function riskLabel(level?: RiskLevel) {
  if (level === 'urgent') return 'Urgent support';
  if (level === 'high') return 'High support';
  if (level === 'medium') return 'Support needed';
  return 'Low risk';
}

function readJoinedChallenges(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_JOINED_CHALLENGES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveJoinedChallenges(value: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_JOINED_CHALLENGES, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function normalizeList(values: unknown[]): string[] {
  return values
    .flatMap((item) => {
      if (Array.isArray(item)) return item;
      if (typeof item === 'object' && item !== null) return Object.values(item);
      return item;
    })
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

function extractProfileTags(profile: any): string[] {
  return normalizeList([
    profile?.interests,
    profile?.skills,
    profile?.industry,
    profile?.headline,
    profile?.bio,
    profile?.professional,
    profile?.career_goals,
    profile?.careerGoals,
    profile?.category,
  ]);
}

function scoreMatch(myTags: string[], otherTags: string[]) {
  if (!myTags.length || !otherTags.length) return 0;

  const mine = new Set(myTags);
  let score = 0;

  otherTags.forEach((tag) => {
    if (mine.has(tag)) score += 14;

    myTags.forEach((myTag) => {
      if (tag.includes(myTag) || myTag.includes(tag)) score += 4;
    });
  });

  return Math.min(99, score);
}

function chooseMatchType(tags: string[]): FriendMatch['matchType'] {
  const text = tags.join(' ');

  if (/(creator|design|music|video|art|fashion|content|photo|media)/.test(text)) {
    return 'creative';
  }

  if (
    /(career|job|skills|education|developer|engineering|data|technology|ai|industry|professional)/.test(
      text
    )
  ) {
    return 'professional';
  }

  return 'growth';
}

function matchTitle(type: FriendMatch['matchType']) {
  if (type === 'creative') return 'Creative Builder';
  if (type === 'professional') return 'Professional Network';
  return 'Growth Partner';
}

export default function EmotionAIPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [joinedChallenges, setJoinedChallenges] = useState<Record<string, boolean>>(
    () => readJoinedChallenges()
  );
  const [realMatches, setRealMatches] = useState<FriendMatch[]>([]);

  const auth = useAuthStore() as any;
  const userStore = useUserStore() as any;

  const currentUser = auth?.user || {};
  const professional = userStore?.professional || {};

  const profileInterests = useMemo(() => {
    return normalizeList([
      currentUser?.interests,
      userStore?.interests,
      professional?.skills,
      professional?.industryInterests,
      professional?.headline,
      professional?.careerGoals,
      professional?.experienceLevel,
      currentUser?.bio,
      currentUser?.location,
    ]);
  }, [currentUser, userStore, professional]);

  useEffect(() => {
    let mounted = true;

    async function loadRealMatches() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(40);

        if (error || !Array.isArray(data)) return;

        const currentId = currentUser?.id || userStore?.id || '';

        const mapped: FriendMatch[] = data
          .filter((profile: any) => profile?.id && profile.id !== currentId)
          .map((profile: any) => {
            const tags = extractProfileTags(profile);
            const rawScore = scoreMatch(profileInterests, tags);
            const matchType = chooseMatchType(tags);

            const name =
              profile?.full_name ||
              profile?.name ||
              profile?.username ||
              profile?.email?.split('@')?.[0] ||
              matchTitle(matchType);

            return {
              id: `match-${profile.id}`,
              userId: profile.id,
              name,
              avatar: profile?.avatar_url || profile?.avatar || '',
              compat: Math.max(60, rawScore || 60),
              basis:
                rawScore > 0
                  ? `matches your ${
                      matchType === 'growth'
                        ? 'growth and business'
                        : matchType === 'creative'
                          ? 'creative and content'
                          : 'professional and industry'
                    } interests`
                  : `can help expand your ${
                      matchType === 'growth'
                        ? 'growth'
                        : matchType === 'creative'
                          ? 'creative'
                          : 'professional'
                    } network`,
              matchType,
              tags: tags.slice(0, 3),
            };
          })
          .sort((a, b) => b.compat - a.compat)
          .slice(0, 6);

        if (mounted) setRealMatches(mapped);
      } catch {
        // Keep fallback matching
      }
    }

    loadRealMatches();

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, userStore?.id, profileInterests.join('|')]);

  const mood = result?.mood || null;
  const riskLevel = result?.riskLevel || 'low';

  const isSupportNeeded =
    riskLevel === 'urgent' ||
    riskLevel === 'high' ||
    riskLevel === 'medium' ||
    mood === 'sadness' ||
    mood === 'anger' ||
    mood === 'anxiety' ||
    mood === 'tired';

  const suggestions = useMemo(() => {
    return result?.suggestions || FALLBACK_BY_MOOD.neutral.suggestions;
  }, [result]);

  const activeChallenges = useMemo(() => {
    if (!mood) return CHALLENGES.neutral;
    return CHALLENGES[mood] || CHALLENGES.neutral;
  }, [mood]);

  const friendMatches = useMemo<FriendMatch[]>(() => {
    if (realMatches.length > 0) return realMatches;

    const interestText = profileInterests.join(' ');

    const businessScore =
      /(business|sales|entrepreneur|startup|logistics|finance|marketing|growth)/.test(
        interestText
      )
        ? 97
        : 86;

    const creativeScore =
      /(creator|design|music|video|art|fashion|content|photography|media)/.test(
        interestText
      )
        ? 96
        : 84;

    const professionalScore =
      /(developer|engineering|career|job|skills|education|data|technology|ai|professional)/.test(
        interestText
      )
        ? 95
        : 87;

    const fallbackMatches: FriendMatch[] = [
      {
        id: 'growth-partner',
        name: 'Growth Partner',
        compat: businessScore,
        basis:
          businessScore >= 95
            ? 'matches your business, growth, and execution interests'
            : 'matches users who want accountability and personal growth',
        matchType: 'growth',
        tags: ['business', 'goals', 'accountability'],
      },
      {
        id: 'creative-builder',
        name: 'Creative Builder',
        compat: creativeScore,
        basis:
          creativeScore >= 95
            ? 'matches your creator, design, or content interests'
            : 'matches users building creative projects and content',
        matchType: 'creative',
        tags: ['creator', 'content', 'collaboration'],
      },
      {
        id: 'professional-network',
        name: 'Professional Network',
        compat: professionalScore,
        basis:
          professionalScore >= 95
            ? 'matches your skills, career goals, or industry interests'
            : 'matches users focused on careers, skills, and opportunities',
        matchType: 'professional',
        tags: ['career', 'skills', 'industry'],
      },
    ];

    return fallbackMatches.sort((a, b) => b.compat - a.compat);
  }, [realMatches, profileInterests]);

  const getInternetSupportGuidance = async (
    cleanText: string,
    fallback: AiResult
  ): Promise<Partial<AiResult> | null> => {
    try {
      const res = (await api.post('/api/emotion-support', {
        text: cleanText,
        mood: fallback.mood,
        riskLevel: fallback.riskLevel,
      })) as any;

      if (!res || typeof res !== 'object') return null;

      return {
        supportGuidance:
          typeof res.supportGuidance === 'string'
            ? res.supportGuidance
            : undefined,
        suggestions: Array.isArray(res.suggestions)
          ? res.suggestions.slice(0, 4).map((item: unknown) => String(item))
          : undefined,
      };
    } catch {
      return null;
    }
  };

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

    const fallback = detectMoodFallback(clean);

    if (fallback.riskLevel === 'urgent') {
      const webGuidance = await getInternetSupportGuidance(clean, fallback);

      setResult({
        ...fallback,
        ...webGuidance,
        suggestions: webGuidance?.suggestions || fallback.suggestions,
      });

      setShowResources(true);
      setAnalyzing(false);
      return;
    }

    try {
      const prompt = `
You are the emotional intelligence system for FaceMeX.

Analyze the emotional state of this user text carefully.

VERY IMPORTANT:
- Never classify harmful, violent, threatening, extreme anger, or self-harm language as neutral.
- Detect anger, distress, anxiety, sadness, burnout, motivation, joy, and neutral tone.
- Keep the response supportive and practical.
- Do not give a diagnosis.
- Do not mention any AI model.
- Do not include markdown.
- Return ONLY valid JSON.

Allowed moods:
joy, sadness, anger, anxiety, neutral, motivated, tired

Risk levels:
low, medium, high, urgent

Challenge levels:
starter, builder, growth, master

JSON format:
{
  "mood": "anger",
  "riskLevel": "high",
  "confidence": 95,
  "summary": "short explanation",
  "supportGuidance": "helpful emotional support guidance",
  "suggestions": ["short action 1", "short action 2", "short action 3", "short action 4"],
  "recommendedChallengeLevel": "starter"
}

User text:
"${clean}"
`;

      const raw = await deepseekReply(prompt);
      const parsed = safeJsonParse(raw, fallback);

      const webGuidance = await getInternetSupportGuidance(clean, parsed);

      setResult({
        ...parsed,
        ...webGuidance,
        suggestions: webGuidance?.suggestions || parsed.suggestions,
      });
    } catch {
      setResult(fallback);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setText('');
    setResult(null);
    setShowResources(false);
  };

  const joinChallenge = (challenge: EmotionChallenge) => {
    const next = {
      ...joinedChallenges,
      [challenge.id]: !joinedChallenges[challenge.id],
    };

    setJoinedChallenges(next);
    saveJoinedChallenges(next);

    toast({
      title: next[challenge.id] ? 'Challenge joined' : 'Challenge removed',
      description: next[challenge.id]
        ? `${challenge.title} added to your growth goals.`
        : `${challenge.title} removed from your active goals.`,
    });
  };

  const resourcesBody = (
    <div className="space-y-3 text-xs sm:text-sm">
      <p className="text-muted-foreground">
        These tools are for support and reflection. They do not replace help from
        a trusted person, professional, trusted adult, or emergency service.
      </p>

      <div className="space-y-2">
        <div className="rounded-xl border bg-muted/30 p-3.5">
          <div className="font-medium">Immediate safety pause</div>
          <p className="mt-1 text-muted-foreground">
            Move away from conflict, stop replying, and create physical and
            emotional distance before doing anything else.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3.5">
          <div className="font-medium">Calm your body first</div>
          <p className="mt-1 text-muted-foreground">
            Slow your breathing, sit down if possible, and wait until the
            strongest emotion drops before making decisions.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3.5">
          <div className="font-medium">Contact someone safe</div>
          <p className="mt-1 text-muted-foreground">
            Reach out to a trusted person nearby. If anyone may be in danger,
            use local emergency support immediately.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        FaceMeX keeps this private and uses it only to guide safer next steps and
        better recommendations.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-14 md:pt-16">
      <div className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-4 md:grid-cols-2 md:py-5">
        <div className="space-y-4">
          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="space-y-1.5 pb-3.5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Emotion Check
                </CardTitle>

                <Badge variant="outline" className="rounded-full text-[10px]">
                  Private
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Paste a message, caption, or journal note. FaceMeX checks the
                emotional tone, safety level, next steps, challenges, and better
                matches.
              </p>
            </CardHeader>

            <CardContent className="space-y-3.5">
              <Textarea
                placeholder="Type something you want to understand..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[155px] resize-none rounded-3xl text-sm leading-relaxed px-4 py-3"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  onClick={detectFromText}
                  disabled={analyzing || !text.trim()}
                  className="h-10 rounded-full px-5 font-medium shadow-sm active:scale-[0.98] transition"
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
                  className="h-10 rounded-full px-5 font-medium shadow-sm active:scale-[0.98] transition"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-full border ${moodBadgeClass(
                      mood,
                      riskLevel
                    )}`}
                  >
                    Mood: {moodLabel(mood)}
                  </Badge>

                  {result?.riskLevel ? (
                    <Badge
                      variant="outline"
                      className={`rounded-full border ${moodBadgeClass(
                        mood,
                        result.riskLevel
                      )}`}
                    >
                      {riskLabel(result.riskLevel)}
                    </Badge>
                  ) : null}

                  {result?.confidence ? (
                    <Badge variant="secondary" className="rounded-full">
                      {Math.min(100, Math.max(0, result.confidence))}% confidence
                    </Badge>
                  ) : null}
                </div>
              </div>

              {result?.riskLevel === 'urgent' && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Urgent support recommended
                  </div>
                  <p className="text-sm leading-relaxed text-red-800">
                    {result.supportGuidance}
                  </p>
                </div>
              )}

              {result && result.riskLevel !== 'urgent' && (
                <div className="rounded-2xl border bg-muted/30 p-3.5">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {result.summary}
                  </p>
                </div>
              )}

              {result?.riskLevel !== 'urgent' && result?.supportGuidance && (
                <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Guidance
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.supportGuidance}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border bg-muted/20 p-3.5 text-xs text-muted-foreground">
                Emotion AI is private. It should guide reflection,
                recommendations, safe actions, challenges, and better matching.
              </div>
            </CardContent>
          </Card>

          {isSupportNeeded && (
            <Card className="rounded-3xl border border-amber-300/70 bg-amber-50/60 shadow-sm dark:bg-amber-950/10">
              <CardHeader className="pb-3.5">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-amber-600" />
                  Support tools available
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3.5 text-xs sm:text-sm">
                <p className="text-muted-foreground">
                  FaceMeX detected that support may be useful right now.
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full font-medium shadow-sm active:scale-[0.98] transition"
                  onClick={() => setShowResources(true)}
                >
                  View support tools
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Emotion-based Recommendations
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion}
                  className="rounded-2xl border bg-card px-3.5 py-3 text-sm shadow-sm"
                >
                  {suggestion}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-primary" />
                Emotion Challenges
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {activeChallenges.map((challenge) => {
                const joined = !!joinedChallenges[challenge.id];

                return (
                  <div
                    key={challenge.id}
                    className="rounded-2xl border bg-card p-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-sm">
                            {challenge.title}
                          </div>
                          <Badge variant="secondary" className="rounded-full">
                            {challenge.level}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {challenge.points} pts
                          </Badge>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Goal: {challenge.goal}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Review: {challenge.reviewGoal}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={joined ? 'secondary' : 'default'}
                        className="shrink-0 rounded-full font-medium shadow-sm active:scale-[0.98] transition"
                        onClick={() => joinChallenge(challenge)}
                      >
                        {joined ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Joined
                          </>
                        ) : (
                          'Join'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Friend Matching
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {friendMatches.map((friend) => {
                const Icon =
                  friend.matchType === 'creative'
                    ? Palette
                    : friend.matchType === 'professional'
                      ? Briefcase
                      : Handshake;

                return (
                  <div
                    key={friend.id}
                    className="rounded-2xl border bg-card p-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
                          {friend.avatar ? (
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon className="h-4 w-4 text-primary" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {friend.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {friend.basis}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {friend.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="rounded-full text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Badge className="rounded-full">{friend.compat}%</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Safe Use
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3.5 text-sm">
              <p className="text-muted-foreground">
                Emotion AI should guide support, safer recommendations,
                challenges, and better matching. It must not shame users, expose
                private emotion labels, or make serious decisions about them.
              </p>

              <div className="rounded-2xl border bg-muted/30 p-3.5 text-xs text-muted-foreground">
                Safe prediction categories: mood tone, risk level, helpful next
                step, challenge level, interest matching, and support guidance.
              </div>

              <div className="rounded-2xl border bg-muted/30 p-3.5 text-xs text-muted-foreground">
                Private by default. Do not show a user’s emotional signal
                publicly unless they choose to share it.
              </div>

              <Button
                size="sm"
                variant="outline"
                className="rounded-full font-medium shadow-sm active:scale-[0.98] transition"
                onClick={() => setShowResources(true)}
              >
                Open support tools
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/70 shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="text-base">Launch Rules</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="rounded-xl border bg-card p-3.5">
                Never classify violent or harmful messages as neutral.
              </div>

              <div className="rounded-xl border bg-card p-3.5">
                Do not use emotion signals for discrimination, manipulation, or
                public ranking.
              </div>

              <div className="rounded-xl border bg-card p-3.5">
                Use emotion signals to support the user, recommend healthier
                actions, and improve discovery.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md space-y-3.5 rounded-3xl border bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                Supportive tools & information
              </h2>

              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
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
