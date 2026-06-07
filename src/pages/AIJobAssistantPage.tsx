import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';

type SearchLink = {
  label: string;
  url: string;
  note?: string;
  image?: string;
  category?: 'jobs' | 'social' | 'government' | 'nearby' | 'business';
};

type SavedCategory = 'career_plan' | 'cv_advice' | 'application_message' | 'research';

type WorkspaceImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pinned?: boolean;
  saved?: boolean;
  savedCategory?: SavedCategory;
  images?: WorkspaceImage[];
};

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 8;

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Career Plan',
  cv_advice: 'CV Advice',
  application_message: 'Application Message',
  research: 'Research',
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
  return Boolean(
    hasTier?.('creator') ||
      hasTier?.('business') ||
      hasTier?.('exclusive') ||
      tier === 'creator' ||
      tier === 'business' ||
      tier === 'exclusive'
  );
}

function getDeepSeekDailyLimit(tier: string, hasTier?: (tier: string) => boolean) {
  if (isCreatorPlusTier(tier, hasTier)) return null;
  if (tier === 'pro') return 10;
  return null;
}

function getDeepSeekUsageKey(tier: string) {
  return `facemex_deepseek_workspace_usage_${tier || 'free'}_${todayKey()}`;
}

function getDeepSeekUsage(tier: string) {
  try {
    return Number(localStorage.getItem(getDeepSeekUsageKey(tier)) || 0);
  } catch {
    return 0;
  }
}

function increaseDeepSeekUsage(tier: string) {
  try {
    const key = getDeepSeekUsageKey(tier);
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
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=128`;
  } catch {
    return '';
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function detectIntent(text: string) {
  const t = text.toLowerCase();

  if (/(start my own|own business|business|logistics|delivery|courier|transport|customers|pricing|make money|launch|startup|side hustle|hustle)/i.test(t)) {
    return 'business-startup';
  }

  if (/(image|photo|picture|screenshot|poster|flyer|this image|these images|look at)/i.test(t)) {
    return 'image-analysis';
  }

  if (/(is .* hiring|are .* hiring|is .* legit|is .* real|is .* fake|verify|scam|legit|can i trust|should i apply|job post|apply link|link in comments|whatsapp job|facebook job|telegram job)/i.test(t)) {
    return 'company-verification';
  }

  if (/(investor|investors|funding|funder|funders|grant|grants|venture|angel|vc|raise capital|capital|pitch|partnership|networking|accelerator|incubator)/i.test(t)) {
    return 'investors-and-networking';
  }

  if (/(email|mail|cover letter|application email|send cv|send my cv|email cv)/i.test(t)) {
    return 'email-application';
  }

  if (/(whatsapp|message|dm|sms|text|apply message)/i.test(t)) {
    return 'message-application';
  }

  if (/(interview|tell me about yourself|questions|prepare|hiring manager)/i.test(t)) {
    return 'interview-prep';
  }

  if (/(cv|resume|profile|linkedin|headline|summary|ats)/i.test(t)) {
    return 'cv-profile';
  }

  if (/(job|jobs|vacancy|vacancies|hiring|opportunities|opportunity|learnership|internship|work|latest job|latest jobs)/i.test(t)) {
    return 'job-search';
  }

  if (/(research|find out|company|market|industry|business idea|analyse|analyze)/i.test(t)) {
    return 'research';
  }

  return 'general-help';
}

function savedCategoryFromIntent(intent: string): SavedCategory {
  if (intent === 'cv-profile') return 'cv_advice';
  if (intent === 'email-application' || intent === 'message-application') return 'application_message';
  if (intent === 'research' || intent === 'investors-and-networking' || intent === 'company-verification' || intent === 'image-analysis') return 'research';
  return 'career_plan';
}

function buildVacancySources(input?: {
  role?: string;
  location?: string;
  industry?: string;
  workMode?: string;
}) {
  const role = clean(input?.role || '') || 'jobs';
  const location = clean(input?.location || '') || 'South Africa';
  const industry = clean(input?.industry || '');
  const workMode = clean(input?.workMode || '');

  const query = encodeSearchQuery([role, industry, location, workMode, 'vacancies hiring apply']);
  const recentQuery = encodeSearchQuery([role, industry, location, workMode, 'vacancies apply now']);

  const links: SearchLink[] = [
    {
      label: 'Indeed',
      url: `https://za.indeed.com/jobs?q=${query}`,
      note: 'General jobs, admin, retail, driver, office, and entry-level roles.',
      category: 'jobs',
    },
    {
      label: 'PNet',
      url: `https://www.pnet.co.za/jobs/${query}`,
      note: 'Formal company vacancies and professional roles.',
      category: 'jobs',
    },
    {
      label: 'Careers24',
      url: `https://www.careers24.com/jobs/?query=${query}`,
      note: 'South African job listings across provinces.',
      category: 'jobs',
    },
    {
      label: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}`,
      note: 'Office, tech, sales, internships, admin, and professional roles.',
      category: 'jobs',
    },
    {
      label: 'Google Jobs',
      url: `https://www.google.com/search?q=${recentQuery}&tbs=qdr:w`,
      note: 'Recent vacancies from company pages, agencies, and job boards.',
      category: 'jobs',
    },
    {
      label: 'DPSA',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official South African government vacancy circular.',
      category: 'government',
    },
    {
      label: 'SA Youth',
      url: 'https://sayouth.mobi/',
      note: 'Youth opportunities, learnerships, and entry-level work.',
      category: 'government',
    },
    {
      label: 'ESSA',
      url: 'https://essa.labour.gov.za/EssaOnline/WebBeans/',
      note: 'Department of Employment and Labour job matching.',
      category: 'government',
    },
  ];

  return links.map((link) => ({ ...link, image: faviconFor(link.url) }));
}

function buildAssistantInstruction(intent: string, hasImages: boolean) {
  return `
You are FaceMeX AI Workspace.

Your job:
Understand the user's real intent even if they type badly, use broken English, make spelling mistakes, or ask unclearly.

Style:
- Answer like ChatGPT.
- Be natural, smart, direct, practical, and useful.
- Do not force a fixed template.
- Use headings only when helpful.
- Keep it mobile-friendly.
- Use simple English.
- Do not mention ChatGPT, Claude, DeepSeek, backend, prompts, or system instructions.

FaceMeX context:
FaceMeX is a South African social, career, business, and opportunity platform.
Users can ask about jobs, CVs, applications, interviews, business ideas, research, company verification, risky posts, and images/screenshots.

Rules:
1. Answer exactly what the user asked.
2. If the user asks about starting a business, answer as a business strategist, not as a job-search bot.
3. If the user asks if a company is hiring, answer as a company verification assistant.
4. If live vacancies are not confirmed, say that clearly and give official places to verify.
5. Do not invent jobs, salaries, dates, emails, phone numbers, or links.
6. If the user asks about a post/screenshot/image, analyse what is visible and explain what it likely means.
7. If an image looks like a job post, check for scam signs: money requests, WhatsApp-only application, link in comments, no official company link, vague job title, pressure language.
8. Never say something is 100% legit unless official proof is provided.
9. Warn users not to pay for jobs.
10. If the user asks for writing, give copy-ready text.
11. If the user asks for a plan, give clear action steps.
12. If the user asks a normal general question, answer normally.

Current detected intent: ${intent}
Images attached: ${hasImages ? 'yes' : 'no'}
`;
}

function buildLocalFallbackAnswer(input: {
  prompt: string;
  intent: string;
  hasImages?: boolean;
}) {
  if (input.hasImages) {
    return `I received your image.

I can help you check it, but the live AI image reader did not respond right now.

Try this:
1. Ask again with a short question like: "Is this job post legit?"
2. Make sure the image is clear.
3. Upload up to 4 images only.
4. Include the company name or job title if visible.

Safety reminder:
Do not pay anyone for a job application, interview, training, uniform, or placement.`;
  }

  if (input.intent === 'business-startup') {
    return `Start where customers are already moving.

For logistics in your area, start small before thinking about trucks or offices.

Best first offer:
“We collect and deliver food, parcels, groceries, documents, and small business orders.”

Start with:
1. Fast food shops
2. Pharmacies
3. Spaza shops
4. Laundry shops
5. Phone repair shops
6. Small businesses
7. CBD shops
8. Clinics

Simple pricing:
- Short delivery: R30–R50
- Medium delivery: R60–R90
- Urgent delivery: add R30–R50
- Waiting after 10 minutes: add R30

Message to send:
Good day. I’m starting a local delivery service. I can collect and deliver food, parcels, groceries, documents, and small business orders. Please let me know if your business needs reliable local deliveries.`;
  }

  if (input.intent === 'company-verification') {
    return `I can help you verify this.

I can’t confirm a live vacancy without the official company careers link or job post.

Check this first:
1. Is it on the official company careers page?
2. Does the email use the company domain?
3. Is there a clear job title, location, closing date, and job description?
4. Are they asking for money? If yes, treat it as high risk.
5. Are they saying “WhatsApp only”, “DM me”, or “link in comments”? Treat it as needing verification.

Safe message:
Good day. I saw a post about this opportunity. Please may you confirm the official job title, location, application link, closing date, and official email address for applications?

Never pay anyone for a job.`;
  }

  return `I understand.

Please send one more detail so I can answer properly:
1. What you want to achieve
2. Where you are
3. What you already tried

Then FaceMeX can give you the exact next steps.`;
}

function fileToImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only images are allowed.'));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      reject(new Error(`Image is too large. Max ${MAX_IMAGE_SIZE_MB}MB.`));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');

      const img = new Image();

      img.onload = () => {
        const maxSide = 1280;
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch {
          resolve(result);
        }
      };

      img.onerror = () => resolve(result);
      img.src = result;
    };

    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

function renderInlineText(text: string, isUser = false): ReactNode[] {
  const nodes: ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushTextWithBold = (value: string, keyPrefix: string) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let boldLast = 0;
    let boldMatch: RegExpExecArray | null;
    let count = 0;

    while ((boldMatch = boldRegex.exec(value)) !== null) {
      if (boldMatch.index > boldLast) {
        nodes.push(
          <span key={`${keyPrefix}-t-${count}`}>{value.slice(boldLast, boldMatch.index)}</span>
        );
      }

      nodes.push(
        <strong key={`${keyPrefix}-b-${count}`} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );

      boldLast = boldMatch.index + boldMatch[0].length;
      count += 1;
    }

    if (boldLast < value.length) {
      nodes.push(<span key={`${keyPrefix}-end`}>{value.slice(boldLast)}</span>);
    }
  };

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushTextWithBold(text.slice(lastIndex, match.index), `seg-${lastIndex}`);
    }

    nodes.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className={`font-medium underline underline-offset-4 ${
          isUser ? 'text-white dark:text-black' : 'text-blue-600 dark:text-blue-300'
        }`}
      >
        {match[1]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    pushTextWithBold(text.slice(lastIndex), `seg-${lastIndex}`);
  }

  return nodes;
}

function MessageContent({ content, isUser }: { content: string; isUser?: boolean }) {
  const lines = String(content || '').split(/\r?\n/);

  return (
    <div className="space-y-2 break-words">
      {lines.map((line, index) => {
        const raw = line;
        const trimmed = raw.trim();

        if (!trimmed) return <div key={index} className="h-2" />;

        if (/^#{1,3}\s+/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,3}\s+/, '');

          return (
            <h3 key={index} className="pt-2 text-[16px] font-semibold leading-snug">
              {renderInlineText(text, isUser)}
            </h3>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const number = trimmed.match(/^(\d+\.)\s+/)?.[1] || '';
          const text = trimmed.replace(/^\d+\.\s+/, '');

          return (
            <div key={index} className="flex gap-2 leading-relaxed">
              <span className="shrink-0 font-semibold">{number}</span>
              <span>{renderInlineText(text, isUser)}</span>
            </div>
          );
        }

        if (/^[-•]\s+/.test(trimmed)) {
          const text = trimmed.replace(/^[-•]\s+/, '');

          return (
            <div key={index} className="flex gap-2 leading-relaxed">
              <span className="mt-[2px] shrink-0">•</span>
              <span>{renderInlineText(text, isUser)}</span>
            </div>
          );
        }

        if (/^>\s*/.test(trimmed)) {
          const text = trimmed.replace(/^>\s*/, '');

          return (
            <div
              key={index}
              className={`rounded-r-2xl border-l-4 px-3 py-2 ${
                isUser
                  ? 'border-white/40 bg-white/10'
                  : 'border-slate-300 bg-slate-50 dark:border-white/20 dark:bg-white/[0.05]'
              }`}
            >
              {renderInlineText(text, isUser)}
            </div>
          );
        }

        return (
          <p key={index} className="leading-relaxed">
            {renderInlineText(trimmed, isUser)}
          </p>
        );
      })}
    </div>
  );
}

const premiumCard =
  'w-full overflow-hidden rounded-[30px] border border-black/5 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]';

export default function AIJobAssistantPage() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const { tier, hasTier } = useUserStore();

  const currentTier = normalizeTier(tier);
  const creatorPlus = isCreatorPlusTier(currentTier, hasTier);
  const deepSeekLimit = getDeepSeekDailyLimit(currentTier, hasTier);

  const [deepSeekUsage, setDeepSeekUsage] = useState(0);
  const [prompt, setPrompt] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SearchLink[]>([]);
  const [radarCards, setRadarCards] = useState<SearchLink[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const [busy, setBusy] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  const [pendingImages, setPendingImages] = useState<WorkspaceImage[]>([]);
  const [imageBusy, setImageBusy] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedFilter, setSavedFilter] = useState<SavedCategory | 'all'>('all');

  const remainingDeepSeekUses = useMemo(() => {
    if (deepSeekLimit === null) return null;
    return Math.max(0, deepSeekLimit - deepSeekUsage);
  }, [deepSeekLimit, deepSeekUsage]);

  const activeRadarCard = radarCards[activeCard];

  const savedMessages = useMemo(() => {
    return messages.filter((message) => message.saved && message.savedCategory);
  }, [messages]);

  const savedStats = useMemo(() => {
    return {
      career_plan: savedMessages.filter((message) => message.savedCategory === 'career_plan').length,
      cv_advice: savedMessages.filter((message) => message.savedCategory === 'cv_advice').length,
      application_message: savedMessages.filter((message) => message.savedCategory === 'application_message').length,
      research: savedMessages.filter((message) => message.savedCategory === 'research').length,
    };
  }, [savedMessages]);

  const visibleSavedMessages = useMemo(() => {
    if (savedFilter === 'all') return savedMessages;
    return savedMessages.filter((message) => message.savedCategory === savedFilter);
  }, [savedFilter, savedMessages]);

  useEffect(() => {
    setDeepSeekUsage(getDeepSeekUsage(currentTier));

    try {
      const rawMessages = localStorage.getItem('facemex_opportunities_workspace_messages');
      setMessages(rawMessages ? JSON.parse(rawMessages) : []);
    } catch {
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
      localStorage.setItem('facemex_opportunities_workspace_messages', JSON.stringify(messages));
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
    if (!workspaceOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, workspaceOpen]);

  const recordDeepSeekUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const openImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageFiles = async (files: FileList | File[]) => {
    const list = Array.from(files || []);

    if (!list.length) return;

    const availableSlots = MAX_IMAGES - pendingImages.length;

    if (availableSlots <= 0) {
      toast({
        title: 'Image limit reached',
        description: `You can upload up to ${MAX_IMAGES} images at once.`,
        variant: 'destructive',
      });
      return;
    }

    const selected = list.slice(0, availableSlots);

    if (list.length > availableSlots) {
      toast({
        title: 'Only 4 images allowed',
        description: `FaceMeX added ${availableSlots} image(s). Remove one to add more.`,
      });
    }

    setImageBusy(true);

    try {
      const processed = await Promise.all(
        selected.map(async (file) => {
          const dataUrl = await fileToImageDataUrl(file);

          return {
            id: safeId(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
          };
        })
      );

      setPendingImages((prev) => [...prev, ...processed].slice(0, MAX_IMAGES));
      setWorkspaceOpen(true);
    } catch (error: any) {
      toast({
        title: 'Image upload failed',
        description: error?.message || 'Please choose a clear image under 8MB.',
        variant: 'destructive',
      });
    } finally {
      setImageBusy(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((image) => image.id !== id));
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const cleanPrompt = clean(overridePrompt || prompt);
    const selectedImages = pendingImages;

    if (!cleanPrompt && !selectedImages.length) {
      setWorkspaceOpen(true);
      return;
    }

    const finalPrompt =
      cleanPrompt ||
      'Please analyse these images and tell me what they mean, what I should do, and whether anything looks risky.';

    const hasImages = selectedImages.length > 0;
    const intent = detectIntent(`${finalPrompt} ${hasImages ? ' image screenshot photo' : ''}`);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

    setWorkspaceOpen(true);

    setMessages((prev) => [
      ...prev,
      {
        id: safeId(),
        role: 'user',
        content: finalPrompt,
        createdAt: new Date().toISOString(),
        images: selectedImages,
      },
    ]);

    setPrompt('');
    setPendingImages([]);
    setBusy(true);

    const fallbackAnswer = buildLocalFallbackAnswer({
      prompt: finalPrompt,
      intent,
      hasImages,
    });

    try {
      const res = (await api.post('/api/ai/pro/job-assistant', {
        prompt: finalPrompt,
        tier: currentTier,
        intent,
        instruction: buildAssistantInstruction(intent, hasImages),
        hasImages,
        imageDataUrls: selectedImages.map((image) => image.dataUrl),
        images: selectedImages.map((image) => ({
          id: image.id,
          name: image.name,
          type: image.type,
          size: image.size,
          dataUrl: image.dataUrl,
        })),
      })) as any;

      const rawAnswer =
        res?.answer ||
        res?.reply ||
        res?.response ||
        res?.text ||
        res?.content ||
        (Array.isArray(res?.suggestions) ? res.suggestions.join('\n\n') : '') ||
        fallbackAnswer;

      const answer = clean(rawAnswer) || fallbackAnswer;

      if (Array.isArray(res?.links) && res.links.length) {
        const mappedLinks = res.links.map((link: SearchLink) => ({
          ...link,
          image: link.image || faviconFor(link.url),
        }));

        setSourceLinks(mappedLinks);
        setRadarCards(mappedLinks);
        setActiveCard(0);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
        },
      ]);

      recordDeepSeekUse();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: 'assistant',
          content: fallbackAnswer,
          createdAt: new Date().toISOString(),
          savedCategory: suggestedSavedCategory,
        },
      ]);

      toast({
        title: 'FaceMeX used fallback',
        description: 'Live AI was unavailable for a moment.',
      });
    } finally {
      setBusy(false);
    }
  };

  const quickAsk = (text: string) => {
    sendPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Text copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  const saveMessageAs = (id: string, category: SavedCategory) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              saved: true,
              savedCategory: category,
            }
          : message
      )
    );

    toast({ title: `${savedCategoryLabels[category]} saved`, description: 'Saved in Workspace.' });
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, pinned: !message.pinned } : message
      )
    );
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

  const clearSavedItems = () => {
    setMessages((prev) =>
      prev.map((message) => ({
        ...message,
        saved: false,
        savedCategory: undefined,
      }))
    );

    toast({ title: 'Saved items cleared', description: 'Your saved workspace list is now empty.' });
  };

  const renderMessageImages = (images?: WorkspaceImage[]) => {
    if (!images?.length) return null;

    return (
      <div className="mb-3 grid grid-cols-2 gap-2">
        {images.map((image) => (
          <a
            key={image.id}
            href={image.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/5 dark:bg-white/[0.06]"
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] text-white">
              <span className="line-clamp-1">{image.name}</span>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const messageActions = (message: ChatMessage) => (
    <div className="mt-3 space-y-2 border-t border-black/5 pt-2 dark:border-white/10">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2">
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2">
          <Edit3 className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => deleteMessage(message.id)} className="h-8 rounded-full px-2 text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2">
          {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2">
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {message.role === 'assistant' && (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'career_plan')} className="h-8 rounded-full px-2 text-[11px]">
            Plan
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'cv_advice')} className="h-8 rounded-full px-2 text-[11px]">
            CV
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'application_message')} className="h-8 rounded-full px-2 text-[11px]">
            Apply
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'research')} className="h-8 rounded-full px-2 text-[11px]">
            Research
          </Button>
        </div>
      )}
    </div>
  );

  const pendingImagePreview = pendingImages.length ? (
    <div className="grid grid-cols-4 gap-2 px-2 pt-2">
      {pendingImages.map((image) => (
        <div key={image.id} className="relative overflow-hidden rounded-2xl border border-black/10 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
          <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />
          <button
            type="button"
            onClick={() => removePendingImage(image.id)}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] text-white">
            <span className="line-clamp-1">{formatBytes(image.size)}</span>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  const quickButtons = [
    ['Find opportunities', 'I am looking for job opportunities. Help me find opportunities and apply smart.'],
    ['Interview prep', 'Help me prepare for an interview. Give me questions and strong answers.'],
    ['Send my CV', 'Write a professional email and WhatsApp message to send my CV for an opportunity.'],
    ['Check fake job', 'Help me check if this job or opportunity looks fake or risky.'],
    ['Find investors', 'Where can I find investors, funders, or grant opportunities in South Africa?'],
    ['Start business', 'Where can I start my own logistics or delivery business?'],
  ] as const;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImageFiles(e.target.files);
        }}
      />

      <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 pb-40 pt-14 sm:px-4 md:pt-20">
        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col items-center px-4 py-8 text-center sm:px-8 sm:py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-lg dark:bg-white dark:text-black">
              <MessageCircle className="h-8 w-8" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {creatorPlus ? (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  Creator+: Unlimited AI
                </Badge>
              ) : currentTier === 'pro' ? (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  Pro AI: {deepSeekUsage}/10 today
                </Badge>
              ) : (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  Smart Workspace
                </Badge>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              FaceMeX Career Workspace
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-white/55 sm:text-base">
              Ask about jobs, CVs, interviews, business, research, company verification, or upload screenshots.
            </p>

            <div className="mt-5 w-full max-w-xl rounded-[24px] border border-black/5 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              {pendingImagePreview}

              <div className="flex items-center gap-2 px-1 py-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={openImagePicker}
                  disabled={imageBusy || pendingImages.length >= MAX_IMAGES}
                  className="h-10 w-10 shrink-0 rounded-full"
                >
                  {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </Button>

                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask anything or upload a screenshot..."
                  className="h-10 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendPrompt();
                    }
                  }}
                />

                <Button
                  onClick={() => sendPrompt()}
                  disabled={busy}
                  className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Upload up to 4 images.
            </p>

            <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
              {quickButtons.map(([label, text]) => (
                <Button
                  key={label}
                  onClick={() => quickAsk(text)}
                  variant="outline"
                  className="h-10 rounded-full border-black/10 bg-white/80 px-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              onClick={() => setWorkspaceOpen(true)}
              className="mt-6 h-12 rounded-2xl bg-slate-950 px-8 text-white shadow-lg dark:bg-white dark:text-black"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Open workspace
            </Button>

            {remainingDeepSeekUses !== null && (
              <p className="mt-3 text-xs text-slate-400">
                AI uses left today: {remainingDeepSeekUses}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Briefcase className="h-5 w-5" />
                Opportunity Radar
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-white/50">
                Trusted places to search and verify opportunities.
              </p>
            </div>

            {activeRadarCard && (
              <a
                href={activeRadarCard.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[24px] border border-black/5 bg-white p-3 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                    {activeRadarCard.image ? (
                      <img src={activeRadarCard.image} alt={activeRadarCard.label} className="h-9 w-9 rounded-xl object-contain" />
                    ) : (
                      <Briefcase className="h-7 w-7 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-semibold">{activeRadarCard.label}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-white/50">{activeRadarCard.note}</p>
                  </div>

                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
              </a>
            )}

            <div className="flex w-full gap-2 overflow-x-auto pb-1">
              {sourceLinks.slice(0, 8).map((link, index) => (
                <button
                  key={link.url}
                  type="button"
                  onClick={() => setActiveCard(index)}
                  className={`flex min-w-[76px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-[11px] transition ${
                    activeCard === index
                      ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-black/5 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.04]'
                  }`}
                >
                  {link.image && <img src={link.image} alt={link.label} className="h-6 w-6 rounded-lg object-contain" />}
                  <span className="line-clamp-1 max-w-[58px]">{link.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`${premiumCard} mt-4`}>
          <CardContent className="flex flex-col gap-3 p-5 text-center text-sm text-slate-500 dark:text-white/55">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              <span>FaceMeX helps users ask smarter questions, verify risky posts, and take action faster.</span>
            </div>

            <Button size="sm" variant="ghost" onClick={() => navigate('/pricing')} className="mx-auto rounded-full">
              View tiers
            </Button>
          </CardContent>
        </Card>
      </main>

      {workspaceOpen && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen max-w-full flex-col overflow-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-black/5 bg-white/90 px-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90 sm:px-4">
            <div className="flex min-w-0 items-center gap-1">
              <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">FaceMeX Career Workspace</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-white/45">
                  Jobs, CVs, research, images, business
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button onClick={() => setSavedOpen(true)} size="icon" variant="ghost" className="h-10 w-10 rounded-full">
                <Save className="h-5 w-5" />
              </Button>

              <Button onClick={() => setWorkspaceOpen(false)} size="icon" variant="ghost" className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-4">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {messages.length === 0 && !busy && (
                <div className="flex min-h-[56vh] flex-col items-center justify-center px-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white dark:bg-white dark:text-black">
                    <Sparkles className="h-8 w-8" />
                  </div>

                  <h2 className="mt-5 text-2xl font-semibold">
                    Ask anything useful
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-white/55">
                    Ask about jobs, business, screenshots, risky posts, company verification, or upload images.
                  </p>

                  <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
                    {quickButtons.map(([label, text]) => (
                      <Button
                        key={label}
                        variant="outline"
                        onClick={() => quickAsk(text)}
                        className="rounded-full border-black/10 bg-white/80 text-xs shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:text-sm"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92vw] rounded-[26px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
                      message.role === 'user'
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                        : 'border border-black/5 bg-white text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                    }`}
                  >
                    {renderMessageImages(message.images)}

                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[120px] rounded-2xl" />

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
                      <div className="max-h-[58vh] overflow-y-auto pr-1">
                        <MessageContent content={message.content} isUser={message.role === 'user'} />
                      </div>
                    )}

                    {editingMessageId !== message.id && messageActions(message)}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-[22px] border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    FaceMeX is thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-black/5 bg-[#f7f7f5]/95 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f0f]/95 sm:px-4">
            <div className="mx-auto w-full max-w-3xl rounded-[26px] border border-black/10 bg-white/95 p-2 shadow-[0_16px_45px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#1a1a1a]/95">
              {pendingImagePreview}

              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about jobs, CVs, screenshots, research, business..."
                className="max-h-28 min-h-[48px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                onPaste={(e) => {
                  const imageFiles = Array.from(e.clipboardData.files || []).filter((file) => file.type.startsWith('image/'));
                  if (imageFiles.length) {
                    handleImageFiles(imageFiles);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openImagePicker}
                    disabled={imageBusy || pendingImages.length >= MAX_IMAGES}
                    className="h-10 w-10 shrink-0 rounded-full"
                  >
                    {imageBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </Button>

                  <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 dark:text-white/45">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Upload up to 4 images. Verify before paying or sending documents.</span>
                  </div>
                </div>

                <Button
                  onClick={() => sendPrompt()}
                  disabled={busy}
                  className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {savedOpen && (
            <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setSavedOpen(false)}>
              <div
                className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0f0f0f]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
                  <div>
                    <h2 className="text-base font-semibold">Saved</h2>
                    <p className="text-[11px] text-slate-500 dark:text-white/45">Workspace history</p>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => setSavedOpen(false)} className="h-10 w-10 rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={savedFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setSavedFilter('all')}
                      className="h-9 rounded-full px-4 text-xs"
                    >
                      All
                    </Button>

                    {(['career_plan', 'cv_advice', 'application_message', 'research'] as SavedCategory[]).map((category) => (
                      <Button
                        key={category}
                        variant={savedFilter === category ? 'default' : 'outline'}
                        onClick={() => setSavedFilter(category)}
                        className="h-9 rounded-full px-4 text-xs"
                      >
                        {savedCategoryLabels[category]} ({savedStats[category]})
                      </Button>
                    ))}
                  </div>

                  <div className="mt-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Recent
                    </h3>

                    {visibleSavedMessages.length === 0 ? (
                      <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50">
                        No saved items yet. Save useful answers from your workspace.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visibleSavedMessages.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSavedOpen(false)}
                            className="block w-full rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                                <FileText className="h-4 w-4 text-slate-500" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 text-sm font-semibold">
                                  {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                                </div>

                                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                                  {item.content}
                                </div>
                              </div>

                              <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <Button
                    variant="ghost"
                    onClick={clearSavedItems}
                    className="w-full rounded-2xl text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear saved items
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
