import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  ImagePlus,
  Loader2,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useUserStore } from '@/store/userStore';

import {
  trackButtonClick,
  trackError,
  trackFeatureUse,
  trackImageAnalysis,
  trackLinkClick,
  trackUpload,
  trackWorkspaceOpen,
  trackWorkspacePrompt,
  trackWorkspaceResponse,
} from '@/lib/analytics';

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

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Plan',
  cv_advice: 'CV',
  application_message: 'Apply',
  research: 'Research',
};

const MAX_WORKSPACE_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 12;

const quickPrompts = [
  {
    label: 'Find jobs',
    prompt: 'I am looking for job opportunities. Help me find opportunities and apply smart.',
  },
  {
    label: 'Check fake job',
    prompt: 'Help me check if this job or opportunity looks fake or risky.',
  },
  {
    label: 'Send CV',
    prompt: 'Write a professional email and WhatsApp message to send my CV for an opportunity.',
  },
  {
    label: 'Interview',
    prompt: 'Help me prepare for an interview. Give me questions and strong answers.',
  },
  {
    label: 'Business',
    prompt: 'Help me start a small business with low money and get customers fast.',
  },
  {
    label: 'Investors',
    prompt: 'Where can I find investors, funders, or grant opportunities in South Africa?',
  },
];

function clean(value: unknown) {
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
  if (tier === 'pro') return 20;
  return 5;
}

function getDeepSeekUsageKey(tier: string) {
  return `facemex_workspace_ai_usage_${tier || 'free'}_${todayKey()}`;
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

function unwrapApiResponse(res: any) {
  return res?.data || res;
}

function detectIntent(text: string, hasImages = false) {
  const t = clean(text).toLowerCase();

  if (hasImages) return 'image_or_document_analysis';

  if (
    /(fake|scam|legit|legitimate|verify|safe|pay money|registration fee|upfront|is this real|is it real|risky|check job|check this|ligit)/i.test(
      t
    )
  ) {
    return 'verify-opportunity';
  }

  if (
    /(investor|investors|funding|funder|funders|grant|grants|venture|angel|vc|raise capital|capital|startup|pitch|business opportunity|business opportunities|partnership|networking|accelerator|incubator)/i.test(
      t
    )
  ) {
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

  if (
    /(job|jobs|vacancy|vacancies|hiring|opportunities|opportunity|learnership|internship|work|latest job|latest jobs|employment)/i.test(
      t
    )
  ) {
    return 'job-search';
  }

  if (/(research|find out|company|market|industry|business idea|analyse|analyze)/i.test(t)) {
    return 'research';
  }

  if (/(business|logistics|delivery|courier|transport|customer|money|sell|start my own)/i.test(t)) {
    return 'business-advice';
  }

  return 'general-question';
}

function savedCategoryFromIntent(intent: string): SavedCategory {
  if (intent === 'cv-profile') return 'cv_advice';

  if (intent === 'email-application' || intent === 'message-application') {
    return 'application_message';
  }

  if (
    intent === 'research' ||
    intent === 'investors-and-networking' ||
    intent === 'image_or_document_analysis' ||
    intent === 'verify-opportunity'
  ) {
    return 'research';
  }

  return 'career_plan';
}

function buildVacancySources() {
  const query = encodeSearchQuery(['jobs', 'South Africa', 'vacancies hiring apply']);
  const recentQuery = encodeSearchQuery(['jobs', 'South Africa', 'vacancies apply now']);

  const links: SearchLink[] = [
    {
      label: 'Google Jobs',
      url: `https://www.google.com/search?q=${recentQuery}&tbs=qdr:w`,
      note: 'Recent vacancies from company pages and job boards.',
      category: 'jobs',
    },
    {
      label: 'Indeed',
      url: `https://za.indeed.com/jobs?q=${query}`,
      note: 'General jobs, retail, admin, drivers, and entry-level roles.',
      category: 'jobs',
    },
    {
      label: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}`,
      note: 'Professional jobs, internships, admin, sales, and tech roles.',
      category: 'jobs',
    },
    {
      label: 'DPSA',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official South African government vacancy circular.',
      category: 'government',
    },
    {
      label: 'SAYouth',
      url: 'https://sayouth.mobi/',
      note: 'Youth opportunities, entry-level jobs, learnerships, and programmes.',
      category: 'government',
    },
  ];

  return links.map((link) => ({ ...link, image: faviconFor(link.url) }));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));

    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl: string, maxWidth = 1280, quality = 0.82) {
  return new Promise<string>((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed || dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function imageFileToWorkspaceImage(file: File): Promise<WorkspaceImage> {
  const raw = await readFileAsDataUrl(file);
  const dataUrl = await resizeImageDataUrl(raw);

  return {
    id: safeId(),
    name: file.name || 'image',
    type: file.type || 'image/jpeg',
    size: file.size,
    dataUrl,
  };
}

function createUnavailableAnswer(hasImages: boolean) {
  if (hasImages) {
    return 'FaceMeX AI image analysis is temporarily unavailable. Please try again shortly. If this continues, check that your backend image-analysis route and vision API key are configured correctly.';
  }

  return 'FaceMeX AI is temporarily unavailable. Please try again shortly.';
}

function normalizeAnswerText(raw: any, fallback: string) {
  const answer =
    raw?.answer ||
    raw?.reply ||
    raw?.response ||
    raw?.text ||
    raw?.content ||
    raw?.message ||
    (Array.isArray(raw?.suggestions) ? raw.suggestions.join('\n\n') : '') ||
    '';

  return clean(answer) || fallback;
}

function splitMarkdownLink(text: string) {
  const match = text.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);

  if (!match) return null;

  return {
    label: match[1],
    url: match[2],
  };
}

function TextWithLinks({
  text,
  onLinkClick,
}: {
  text: string;
  onLinkClick?: (url: string, label?: string) => void;
}) {
  const lines = String(text || '').split('\n');

  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, lineIndex) => {
        const parts: ReactNode[] = [];
        let remaining = line;
        let key = 0;

        const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = markdownRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }

          const label = match[1];
          const url = match[2];

          parts.push(
            <a
              key={`md-${lineIndex}-${key++}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onLinkClick?.(url, label)}
              className="font-semibold text-slate-950 underline underline-offset-4 dark:text-white"
            >
              {label}
            </a>
          );

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          remaining = line.slice(lastIndex);

          const urlRegex = /(https?:\/\/[^\s]+)/gi;
          let urlLastIndex = 0;
          let urlMatch: RegExpExecArray | null;

          while ((urlMatch = urlRegex.exec(remaining)) !== null) {
            if (urlMatch.index > urlLastIndex) {
              parts.push(remaining.slice(urlLastIndex, urlMatch.index));
            }

            const url = urlMatch[1];

            parts.push(
              <a
                key={`url-${lineIndex}-${key++}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onLinkClick?.(url, url)}
                className="break-all font-semibold text-slate-950 underline underline-offset-4 dark:text-white"
              >
                {url}
              </a>
            );

            urlLastIndex = urlMatch.index + url.length;
          }

          if (urlLastIndex < remaining.length) {
            parts.push(remaining.slice(urlLastIndex));
          }
        }

        const onlyMd = splitMarkdownLink(line.trim());

        if (onlyMd) {
          return (
            <p key={lineIndex} className="mb-2 last:mb-0">
              <a
                href={onlyMd.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onLinkClick?.(onlyMd.url, onlyMd.label)}
                className="font-semibold text-slate-950 underline underline-offset-4 dark:text-white"
              >
                {onlyMd.label}
              </a>
            </p>
          );
        }

        return (
          <p key={lineIndex} className={line.trim() ? 'mb-2 last:mb-0' : 'h-3'}>
            {parts.length ? parts : line}
          </p>
        );
      })}
    </div>
  );
}

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
  const [selectedImages, setSelectedImages] = useState<WorkspaceImage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SearchLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedFilter, setSavedFilter] = useState<SavedCategory | 'all'>('all');

  const canUseAI = useMemo(() => {
    if (deepSeekLimit === null) return true;
    return deepSeekUsage < deepSeekLimit;
  }, [deepSeekLimit, deepSeekUsage]);

  const remainingAIUses = useMemo(() => {
    if (deepSeekLimit === null) return null;
    return Math.max(0, deepSeekLimit - deepSeekUsage);
  }, [deepSeekLimit, deepSeekUsage]);

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

  const usageLabel = useMemo(() => {
    if (creatorPlus) return 'Unlimited';
    if (currentTier === 'pro') return `${deepSeekUsage}/20`;
    return `${deepSeekUsage}/5`;
  }, [creatorPlus, currentTier, deepSeekUsage]);

  useEffect(() => {
    setDeepSeekUsage(getDeepSeekUsage(currentTier));

    try {
      const rawMessages = localStorage.getItem('facemex_opportunities_workspace_messages');
      setMessages(rawMessages ? JSON.parse(rawMessages) : []);
    } catch {
      setMessages([]);
    }

    setSourceLinks(buildVacancySources());

    trackWorkspaceOpen({
      message_count: 0,
      selected_image_count: 0,
    });
  }, [currentTier]);

  useEffect(() => {
    try {
      localStorage.setItem('facemex_opportunities_workspace_messages', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  const recordAIUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const handlePickImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    );

    event.currentTarget.value = '';

    if (!files.length) return;

    const remaining = MAX_WORKSPACE_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      toast({
        title: 'Image limit reached',
        description: `You can upload up to ${MAX_WORKSPACE_IMAGES} images.`,
        variant: 'destructive',
      });
      return;
    }

    const filesToUse = files.slice(0, remaining);
    const tooLarge = filesToUse.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);

    if (tooLarge) {
      toast({
        title: 'Image too large',
        description: `Each image must be under ${MAX_IMAGE_SIZE_MB}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const converted = await Promise.all(filesToUse.map(imageFileToWorkspaceImage));

      setSelectedImages((prev) => [...prev, ...converted].slice(0, MAX_WORKSPACE_IMAGES));

      trackUpload({
        uploadType: 'image',
        count: converted.length,
        metadata: {
          feature: 'FaceMeX Career Workspace',
          action: 'workspace_images_selected',
        },
      });
    } catch (error: any) {
      trackError('workspace_image_select_failed', error?.message || 'Could not select image.');

      toast({
        title: 'Image failed',
        description: 'Could not prepare the image. Try another screenshot.',
        variant: 'destructive',
      });
    }
  };

  const removeSelectedImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((image) => image.id !== id));
  };

  const clearSelectedImages = () => {
    setSelectedImages([]);
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const cleanPrompt = clean(overridePrompt || prompt);
    const attachedImages = selectedImages;
    const hasImages = attachedImages.length > 0;

    if (!cleanPrompt && !hasImages) return;

    const finalPrompt =
      cleanPrompt ||
      'Please analyse these images and tell me what they show, what I should check, and what action I should take.';

    const intent = detectIntent(finalPrompt, hasImages);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

    const userMessage: ChatMessage = {
      id: safeId(),
      role: 'user',
      content: finalPrompt,
      createdAt: new Date().toISOString(),
      images: attachedImages,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setSelectedImages([]);
    setBusy(true);

    trackWorkspacePrompt({
      prompt: finalPrompt,
      intent,
      metadata: {
        image_count: attachedImages.length,
        has_images: hasImages,
        tier: currentTier,
      },
    });

    if (hasImages) {
      trackImageAnalysis(attachedImages.length, finalPrompt, undefined, {
        intent,
        tier: currentTier,
      });
    }

    if (!canUseAI) {
      const answer =
        currentTier === 'free'
          ? 'Your free AI limit is finished for today. Try again tomorrow or upgrade when you are ready.'
          : 'Your AI limit is finished for today. Try again tomorrow or upgrade when you are ready.';

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

      setBusy(false);
      return;
    }

    try {
      const payload = {
        prompt: finalPrompt,
        message: finalPrompt,
        question: finalPrompt,
        tier: currentTier,
        creatorPlus,
        intent,
        source: 'facemex-career-workspace',
        imageCount: attachedImages.length,
        imageDataUrls: attachedImages.map((image) => image.dataUrl),
        images: attachedImages.map((image) => ({
          name: image.name,
          type: image.type,
          size: image.size,
          dataUrl: image.dataUrl,
        })),
        attachments: attachedImages.map((image) => ({
          type: 'image',
          name: image.name,
          mimeType: image.type,
          size: image.size,
          dataUrl: image.dataUrl,
        })),
      };

      let data: any = null;

      try {
        const res = await api.post('/api/ai/pro/job-assistant', payload);
        data = unwrapApiResponse(res);
      } catch {
        const res = await api.post('/api/ai/workspace', payload);
        data = unwrapApiResponse(res);
      }

      const answer = normalizeAnswerText(data, createUnavailableAnswer(hasImages));

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

      recordAIUse();

      trackWorkspaceResponse({
        intent,
        image_count: attachedImages.length,
        source: data?.source || 'unknown',
        answer_length: answer.length,
      });
    } catch (error: any) {
      const answer = createUnavailableAnswer(hasImages);

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

      trackError('workspace_ai_failed', error?.message || 'AI failed', {
        intent,
        image_count: attachedImages.length,
      });
    } finally {
      setBusy(false);
    }
  };

  const quickAsk = (text: string) => {
    trackButtonClick('workspace_quick_prompt', undefined, {
      prompt_preview: text.slice(0, 80),
    });

    sendPrompt(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      trackFeatureUse({
        feature: 'FaceMeX Career Workspace',
        action: 'workspace_copy_message',
      });

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

    trackFeatureUse({
      feature: 'FaceMeX Career Workspace',
      action: 'workspace_saved_answer',
      metadata: {
        category,
      },
    });

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

  const handleGeneratedLinkClick = (url: string, label?: string) => {
    trackLinkClick(url, label || 'workspace_generated_link', undefined, {
      feature: 'FaceMeX Career Workspace',
    });
  };

  const renderMessageImages = (images?: WorkspaceImage[]) => {
    if (!images?.length) return null;

    return (
      <div className="mb-3 grid grid-cols-2 gap-2">
        {images.slice(0, 4).map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-2xl border border-black/5 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]"
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className="h-28 w-full object-cover sm:h-40"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  };

  const messageActions = (message: ChatMessage) => (
    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-black/5 pt-2 opacity-80 dark:border-white/10">
      <Button size="sm" variant="ghost" onClick={() => copyText(message.content)} className="h-8 rounded-full px-2">
        <Copy className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => startEdit(message)} className="h-8 rounded-full px-2">
        <Edit3 className="h-3.5 w-3.5" />
      </Button>

      <Button size="sm" variant="ghost" onClick={() => togglePin(message.id)} className="h-8 rounded-full px-2">
        {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>

      <Button size="sm" variant="ghost" onClick={() => researchMessage(message)} className="h-8 rounded-full px-2">
        <Search className="h-3.5 w-3.5" />
      </Button>

      {message.role === 'assistant' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => saveMessageAs(message.id, message.savedCategory || 'career_plan')}
          className="h-8 rounded-full px-2"
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button size="sm" variant="ghost" onClick={() => deleteMessage(message.id)} className="ml-auto h-8 rounded-full px-2 text-red-500">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0b0b0c] dark:text-white">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-4xl flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-16 sm:px-4 md:pt-20">
        <section className="flex min-h-[calc(100dvh-150px)] flex-1 flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.045] sm:rounded-[30px] md:min-h-[calc(100dvh-120px)]">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 px-3 dark:border-white/10 sm:h-16 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1]"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold sm:text-base">
                    FaceMeX Job AI
                  </h1>

                  <Badge className="hidden rounded-full border border-black/5 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 shadow-none hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/50 sm:inline-flex">
                    {creatorPlus && <Crown className="mr-1 h-3 w-3" />}
                    {usageLabel}
                  </Badge>
                </div>

                <p className="truncate text-[11px] text-slate-500 dark:text-white/45">
                  Jobs, CVs, interviews, screenshots
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSourcesOpen(true)}
                className="h-9 w-9 rounded-full"
                aria-label="Sources"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSavedOpen(true)}
                className="h-9 w-9 rounded-full"
                aria-label="Saved"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.length === 0 && !busy && (
                <div className="mx-auto flex min-h-[40vh] max-w-xl flex-col items-center justify-center text-center sm:min-h-[46vh]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-black">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <h2 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                    What can I help you with?
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-white/50">
                    Ask one clear question. Upload a screenshot when checking a job post,
                    CV, advert, or opportunity.
                  </p>

                  <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">
                    {quickPrompts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => quickAsk(item.prompt)}
                        className="rounded-full border border-black/5 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.1]"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex w-full gap-2 sm:gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-black">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[82%] sm:rounded-[24px] ${
                      message.role === 'user'
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                        : 'border border-black/5 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                    }`}
                  >
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[120px] rounded-2xl bg-white dark:bg-black/20"
                        />

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
                      <>
                        {renderMessageImages(message.images)}

                        <TextWithLinks
                          text={message.content}
                          onLinkClick={handleGeneratedLinkClick}
                        />
                      </>
                    )}

                    {editingMessageId !== message.id && messageActions(message)}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-black">
                    <Sparkles className="h-4 w-4" />
                  </div>

                  <div className="rounded-[22px] border border-black/5 bg-slate-50 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-black/5 bg-white/95 p-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:p-4">
            <div className="mx-auto w-full max-w-3xl">
              {selectedImages.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-2xl bg-black">
                      <img src={image.dataUrl} alt={image.name} className="h-16 w-full object-cover sm:h-20" />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-[22px] border border-black/10 bg-white p-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#171717] sm:rounded-[24px]">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Message FaceMeX Job AI..."
                  className="max-h-28 min-h-[48px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:max-h-32 sm:min-h-[52px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPrompt();
                    }
                  }}
                />

                <div className="flex items-center justify-between gap-2 border-t border-black/5 px-1 pt-2 dark:border-white/10">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white"
                      aria-label="Upload image"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 text-[11px] text-slate-500 dark:text-white/45">
                      <div className="flex min-w-0 items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Upload screenshots. Verify before paying.</span>
                      </div>

                      {selectedImages.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSelectedImages}
                          className="font-semibold text-red-500"
                        >
                          Clear images
                        </button>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => sendPrompt()}
                    disabled={busy || (!prompt.trim() && selectedImages.length === 0)}
                    className="h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    aria-label="Send"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickImages}
                />
              </div>

              {remainingAIUses !== null && (
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  AI uses left today: {remainingAIUses}
                </div>
              )}
            </div>
          </footer>
        </section>
      </main>

      {savedOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setSavedOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c]"
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
                {visibleSavedMessages.length === 0 ? (
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50">
                    No saved items yet.
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

      {sourcesOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setSourcesOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col bg-[#f7f7f5] shadow-2xl dark:bg-[#0b0b0c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/90">
              <div>
                <h2 className="text-base font-semibold">Sources</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">Trusted opportunity links</p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setSourcesOpen(false)} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {sourceLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackLinkClick(link.url, link.label)}
                    className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.08]">
                      {link.image ? (
                        <img src={link.image} alt={link.label} className="h-6 w-6 rounded-lg object-contain" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-slate-400" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{link.label}</span>
                      <span className="line-clamp-2 text-xs text-slate-500 dark:text-white/50">{link.note}</span>
                    </span>

                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
