import { useEffect, useMemo, useRef, useState } from 'react';
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
  if (intent === 'email-application' || intent === 'message-application') return 'application_message';
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
      label: 'SAYouth',
      url: 'https://sayouth.mobi/',
      note: 'Youth opportunities, entry-level jobs, learnerships, and programmes.',
      category: 'government',
    },
    {
      label: 'ESSA',
      url: 'https://essa.labour.gov.za/EssaOnline/WebBeans/',
      note: 'Official employment services from Department of Employment and Labour.',
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
        const parts: React.ReactNode[] = [];
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
              className="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-300"
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
                className="break-all font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-300"
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
                className="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-300"
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

const premiumCard =
  'w-full overflow-hidden rounded-[28px] border border-black/5 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]';

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
  const [radarCards, setRadarCards] = useState<SearchLink[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const [busy, setBusy] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

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

    trackWorkspaceOpen({
      message_count: messages.length,
      selected_image_count: selectedImages.length,
    });

    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [workspaceOpen]);

  useEffect(() => {
    if (!workspaceOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, workspaceOpen]);

  const recordAIUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const openWorkspace = () => {
    setWorkspaceOpen(true);
  };

  const handlePickImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!cleanPrompt && !hasImages) {
      openWorkspace();
      return;
    }

    const finalPrompt =
      cleanPrompt ||
      'Please analyse these images and tell me what they show, what I should check, and what action I should take.';

    const intent = detectIntent(finalPrompt, hasImages);
    const suggestedSavedCategory = savedCategoryFromIntent(intent);

    openWorkspace();

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
    openWorkspace();
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
            className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className="h-32 w-full object-cover sm:h-40"
              loading="lazy"
            />
          </div>
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
          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'career_plan')} className="h-8 rounded-full px-3 text-[11px]">
            Plan
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'cv_advice')} className="h-8 rounded-full px-3 text-[11px]">
            CV
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'application_message')} className="h-8 rounded-full px-3 text-[11px]">
            Apply
          </Button>

          <Button size="sm" variant="outline" onClick={() => saveMessageAs(message.id, 'research')} className="h-8 rounded-full px-3 text-[11px]">
            Research
          </Button>
        </div>
      )}
    </div>
  );

  const quickButtons = [
    ['Find opportunities', 'I am looking for job opportunities. Help me find opportunities and apply smart.'],
    ['Check fake job', 'Help me check if this job or opportunity looks fake or risky.'],
    ['Interview prep', 'Help me prepare for an interview. Give me questions and strong answers.'],
    ['Send my CV', 'Write a professional email and WhatsApp message to send my CV for an opportunity.'],
    ['Find investors', 'Where can I find investors, funders, or grant opportunities in South Africa?'],
    ['Start business', 'Help me start a small business with low money and get customers fast.'],
  ] as const;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0f0f0f] dark:text-white">
      <Navbar />

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
                  Pro AI: {deepSeekUsage}/20 today
                </Badge>
              ) : (
                <Badge className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80">
                  Free AI: {deepSeekUsage}/5 today
                </Badge>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              FaceMeX Career Workspace
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-white/55 sm:text-base">
              Ask naturally about jobs, CVs, screenshots, opportunities, business, research, and safety.
            </p>

            <div className="mt-5 w-full max-w-xl rounded-[24px] border border-black/5 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              {selectedImages.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-2xl bg-black">
                      <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white"
                  aria-label="Upload image"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask about jobs, screenshots, research, business..."
                  className="max-h-28 min-h-[44px] resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPrompt();
                    }
                  }}
                />

                <Button
                  onClick={() => sendPrompt()}
                  disabled={busy}
                  className="mb-1 h-10 w-10 shrink-0 rounded-full bg-slate-950 p-0 text-white dark:bg-white dark:text-black"
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

              <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-white/45">
                <div className="flex min-w-0 items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    Upload up to {MAX_WORKSPACE_IMAGES} images. Verify before paying.
                  </span>
                </div>

                {selectedImages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelectedImages}
                    className="shrink-0 font-semibold text-red-500"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

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
              onClick={openWorkspace}
              className="mt-6 h-12 rounded-2xl bg-slate-950 px-8 text-white shadow-lg dark:bg-white dark:text-black"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Open workspace
            </Button>

            {deepSeekLimit !== null && (
              <p className="mt-3 text-xs text-slate-400">
                AI uses left today: {remainingAIUses}
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
                Trusted sources to start checking opportunities.
              </p>
            </div>

            {activeRadarCard && (
              <a
                href={activeRadarCard.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackLinkClick(activeRadarCard.url, activeRadarCard.label)}
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
              <span>Soon users can receive alerts when new jobs and opportunities match their profile.</span>
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
                    What do you need help with?
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-white/55">
                    Ask naturally. FaceMeX will understand jobs, business, screenshots, CVs, research, and safety checks.
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
                    className={`max-w-[92vw] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[82%] ${
                      message.role === 'user'
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-black'
                        : 'border border-black/5 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'
                    }`}
                  >
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
                      <div className="max-h-[56vh] overflow-y-auto pr-1">
                        {renderMessageImages(message.images)}

                        <TextWithLinks
                          text={message.content}
                          onLinkClick={handleGeneratedLinkClick}
                        />
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
            <div className="mx-auto w-full max-w-3xl rounded-[24px] border border-black/10 bg-white/95 p-2 shadow-[0_16px_45px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#1a1a1a]/95">
              {selectedImages.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-2 px-1">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-2xl bg-black">
                      <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about jobs, CVs, screenshots, research, business..."
                className="max-h-28 min-h-[48px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 dark:text-white/45">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.08] dark:text-white"
                    aria-label="Upload image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Upload up to 4 images. Verify before paying.</span>
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
