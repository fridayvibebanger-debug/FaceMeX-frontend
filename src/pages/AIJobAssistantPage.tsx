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
  category?: 'jobs' | 'social' | 'government' | 'nearby' | 'business' | 'source';
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
  deletedFromChat?: boolean;
  images?: WorkspaceImage[];
};

type SourceCategoryKey =
  | 'facemex_verified_tzaneen_employer'
  | 'official_company_source'
  | 'government_public_institution'
  | 'community_advert_needs_verification'
  | 'high_risk_avoid';

type SourceVerificationCategory = {
  key: SourceCategoryKey;
  title: string;
  note: string;
};

const savedCategoryLabels: Record<SavedCategory, string> = {
  career_plan: 'Plan',
  cv_advice: 'CV',
  application_message: 'Apply',
  research: 'Research',
};

const sourceVerificationCategories: SourceVerificationCategory[] = [
  {
    key: 'facemex_verified_tzaneen_employer',
    title: 'FaceMeX Verified Tzaneen Employer',
    note: 'Directly confirmed by FaceMeX or posted by a known local employer.',
  },
  {
    key: 'official_company_source',
    title: 'Official Company Source',
    note: 'Company website, official career page, or official company email.',
  },
  {
    key: 'government_public_institution',
    title: 'Government / Public Institution',
    note: 'Municipality, department, school, TVET, SETA, or public programme.',
  },
  {
    key: 'community_advert_needs_verification',
    title: 'Community Advert — Needs verification',
    note: 'Facebook, WhatsApp, screenshot, or public advert shared by the community.',
  },
  {
    key: 'high_risk_avoid',
    title: 'High Risk / Avoid',
    note: 'Missing employer details, payment requested, or suspicious application process.',
  },
];

const MAX_WORKSPACE_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 12;

const SOURCE_VERIFICATION_SYSTEM = `
FaceMeX Job AI must prioritize Tzaneen first, then nearby areas:
Tzaneen, Lenyenye, Nkowankowa, Maake, Dan, Burgersdorp, Haenertsburg, Modjadjiskloof, Giyani, Phalaborwa, and Polokwane.

When checking or displaying job posts, use this Source & Verification system:

1. FaceMeX Verified Tzaneen Employer
- The employer is local and directly confirmed by FaceMeX.
- This is the highest trust source.

2. Official Company Source
- The job comes from an official website, official career page, official company social page, or official company email.

3. Government / Public Institution
- Municipality, department, school, TVET, SETA, public programme, or government platform.

4. Community Advert — Needs verification
- Facebook post, WhatsApp post, screenshot, poster, or public advert.
- These can be useful, but users must verify before applying.

5. High Risk / Avoid
- Payment requested.
- No company name.
- No location.
- No contact person.
- Suspicious email.
- Job promises are unrealistic.
- User is asked to pay for training, uniform, interview, placement, or registration.

When responding about a job post, always include:
- Verdict
- Why
- Source & Verification
- Next step
- Copy-ready action if useful

Never say something is verified unless the source is clearly official or directly confirmed.
If the source is only a screenshot, say it needs verification.
Always warn users not to pay money to apply for jobs.
`;

const FACE_MEX_ANSWER_STYLE = `
Respond like ChatGPT in a clean, calm, premium, professional style.
Use short clear sections.
Use bold headings.
Use numbered lists for options, steps, or job listings.
Use bullet points only when helpful.
When a table is useful, write a proper markdown table using pipes and a separator row.
Give direct answers first.
Avoid messy long paragraphs.

FaceMeX is Tzaneen-first.
When the user asks for jobs, prioritize Tzaneen, Lenyenye, Nkowankowa, Maake, Dan, Burgersdorp, Haenertsburg, Modjadjiskloof, Giyani, Phalaborwa, and Polokwane before broader Limpopo or South Africa.

When giving jobs or opportunities, show:
1. Role/title
2. Location/company
3. Source & Verification
4. Why it fits
5. Action to take
6. Link/source if available

When checking a job advert or screenshot, respond in this structure:

**Verdict:** Verified / Needs verification / Avoid

Short explanation.

**Why**
- Main reason
- Main reason
- Main reason

**Source & Verification**
Source type: FaceMeX Verified Tzaneen Employer / Official Company Source / Government/Public Institution / Community Advert — Needs verification / High Risk/Avoid
Verification status: Verified / Needs verification / Avoid
Apply method: Email / Website / WhatsApp / In person / Not clear
Safety note: Never pay money to apply.

**Next step**
Give one clear action.

When helping with applications, include copy-ready messages.
If the user replies with a short answer like "yes", "okay", "continue", "do it", or "no", use the previous conversation context and continue from the last assistant question. Do not ask what they mean unless the previous context is missing.
End with a simple next step.
`;

const quickPrompts = [
  {
    label: 'Tzaneen jobs',
    prompt:
      'I am looking for job opportunities around Tzaneen, Lenyenye, Nkowankowa, Maake, and nearby areas. Help me find opportunities and apply smart.',
  },
  {
    label: 'Check fake job',
    prompt: 'Help me check if this job or opportunity looks fake or risky. Use Source & Verification.',
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
    label: 'Submit job',
    prompt:
      'Help me clean and prepare a local Tzaneen job post for FaceMeX Jobs. Include source type, verification status, apply method, and safety note.',
  },
  {
    label: 'Business',
    prompt: 'Help me start a small business with low money and get customers fast.',
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
    /(fake|scam|legit|legitimate|verify|verified|verification|safe|pay money|registration fee|upfront|is this real|is it real|risky|check job|check this|ligit|source)/i.test(
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
    /(job|jobs|vacancy|vacancies|hiring|opportunities|opportunity|learnership|internship|work|latest job|latest jobs|employment|tzaneen|lenyenye|nkowankowa|maake|polokwane)/i.test(
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
  const tzaneenJobsQuery = encodeSearchQuery([
    'Tzaneen Lenyenye Nkowankowa Maake jobs vacancies apply now',
  ]);
  const tzaneenDriverQuery = encodeSearchQuery([
    'Tzaneen driver general worker cashier cleaner admin jobs',
  ]);
  const governmentTzaneenQuery = encodeSearchQuery([
    'Tzaneen municipality vacancies government jobs learnerships',
  ]);
  const localBusinessQuery = encodeSearchQuery([
    'Tzaneen businesses hiring jobs vacancies',
  ]);

  const links: SearchLink[] = [
    {
      label: 'Tzaneen Jobs Search',
      url: `https://www.google.com/search?q=${tzaneenJobsQuery}&tbs=qdr:w`,
      note: 'Fresh local vacancies around Tzaneen, Lenyenye, Nkowankowa, and Maake.',
      category: 'nearby',
    },
    {
      label: 'Driver & General Work',
      url: `https://www.google.com/search?q=${tzaneenDriverQuery}&tbs=qdr:w`,
      note: 'Useful for drivers, general workers, cleaners, cashiers, and admin roles.',
      category: 'nearby',
    },
    {
      label: 'Government / Municipality',
      url: `https://www.google.com/search?q=${governmentTzaneenQuery}&tbs=qdr:m`,
      note: 'Municipality, public institution, learnerships, and government-related vacancies.',
      category: 'government',
    },
    {
      label: 'Local Businesses Hiring',
      url: `https://www.google.com/search?q=${localBusinessQuery}&tbs=qdr:w`,
      note: 'Find local shops, lodges, farms, restaurants, and transport businesses hiring.',
      category: 'business',
    },
    {
      label: 'SAYouth',
      url: 'https://sayouth.mobi/',
      note: 'Youth opportunities, entry-level jobs, learnerships, and programmes.',
      category: 'government',
    },
    {
      label: 'ESSA Labour',
      url: 'https://essa.labour.gov.za/EssaOnline/WebBeans/',
      note: 'Official employment services from the Department of Employment and Labour.',
      category: 'government',
    },
    {
      label: 'DPSA',
      url: 'https://www.dpsa.gov.za/newsroom/psvc/',
      note: 'Official South African government vacancy circular.',
      category: 'government',
    },
    {
      label: 'Indeed Tzaneen',
      url: `https://za.indeed.com/jobs?q=${encodeURIComponent('jobs')}&l=${encodeURIComponent(
        'Tzaneen, Limpopo'
      )}`,
      note: 'General local vacancies from employers and job boards.',
      category: 'jobs',
    },
    {
      label: 'LinkedIn Jobs Tzaneen',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
        'jobs'
      )}&location=${encodeURIComponent('Tzaneen, Limpopo, South Africa')}`,
      note: 'Company-posted jobs, sales, office roles, internships, and professional roles.',
      category: 'jobs',
    },
    {
      label: 'PNet Limpopo',
      url: `https://www.pnet.co.za/jobs/limpopo`,
      note: 'Formal vacancies and professional roles across Limpopo.',
      category: 'jobs',
    },
    {
      label: 'Careers24 Limpopo',
      url: `https://www.careers24.com/jobs/lc-limpopo/`,
      note: 'South African job listings across Limpopo industries.',
      category: 'jobs',
    },
    {
      label: 'Google Jobs South Africa',
      url: `https://www.google.com/search?q=${encodeSearchQuery([
        'jobs South Africa vacancies hiring apply',
      ])}&tbs=qdr:w`,
      note: 'Use when Tzaneen results are too limited.',
      category: 'jobs',
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

function normalizeBrokenMarkdownLinks(text: string) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\s*\(\s*(https?:\/\/[^)\s]+)\s*\)/gi, '[$1]($2)')
    .replace(
      /\[([^\]]+)\]\s*\(\s*((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^)\s]*)?)\s*\)/gi,
      '[$1]($2)'
    );
}

function stripTrailingPunctuation(value: string) {
  const trimmed = value.trim();
  const trailing = trimmed.match(/[),.;:!?]+$/)?.[0] || '';
  const cleanValue = trailing ? trimmed.slice(0, -trailing.length) : trimmed;

  return {
    cleanValue,
    trailing,
  };
}

function getLinkHref(rawUrl: string) {
  const { cleanValue } = stripTrailingPunctuation(rawUrl);

  if (/^https?:\/\//i.test(cleanValue)) return cleanValue;

  return `https://${cleanValue}`;
}

function getLinkLabel(rawUrl: string) {
  const { cleanValue } = stripTrailingPunctuation(rawUrl);

  try {
    const href = getLinkHref(cleanValue);
    const host = new URL(href).hostname.replace(/^www\./, '');

    return host;
  } catch {
    return cleanValue;
  }
}

function SourceChip({
  label,
  url,
  onClick,
}: {
  label: string;
  url: string;
  onClick?: (url: string, label?: string) => void;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => onClick?.(url, label)}
      className="mx-1 inline-flex max-w-full translate-y-[-1px] items-center rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold leading-none text-slate-700 no-underline transition hover:bg-slate-300 dark:bg-white/[0.12] dark:text-white/70 dark:hover:bg-white/[0.2]"
    >
      <span className="max-w-[140px] truncate">{label}</span>
    </a>
  );
}

function renderInlineText(text: string, onLinkClick?: (url: string, label?: string) => void) {
  const nodes: ReactNode[] = [];
  const safeText = normalizeBrokenMarkdownLinks(text);

  const regex =
    /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+|(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s)]*)?)\)|((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(safeText)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(safeText.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(
        <strong key={`bold-${key++}`} className="font-semibold text-slate-950 dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3] && match[4]) {
      const label = match[3];
      const rawUrl = match[4];
      const href = getLinkHref(rawUrl);
      const { trailing } = stripTrailingPunctuation(rawUrl);

      nodes.push(
        <SourceChip key={`md-link-${key++}`} label={label} url={href} onClick={onLinkClick} />
      );

      if (trailing) nodes.push(trailing);
    } else if (match[5]) {
      const rawUrl = match[5];
      const href = getLinkHref(rawUrl);
      const label = getLinkLabel(rawUrl);
      const { trailing } = stripTrailingPunctuation(rawUrl);

      nodes.push(
        <SourceChip key={`domain-link-${key++}`} label={label} url={href} onClick={onLinkClick} />
      );

      if (trailing) nodes.push(trailing);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < safeText.length) {
    nodes.push(safeText.slice(lastIndex));
  }

  return nodes.length ? nodes : safeText;
}

function isTableSeparator(line: string) {
  const value = line.trim();

  if (!value.includes('|')) return false;

  const cells = value
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  if (cells.length < 2) return false;

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isLikelyTableRow(line: string) {
  const value = line.trim();
  if (!value.includes('|')) return false;

  const cells = value
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  return cells.length >= 2;
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderMarkdownTable(
  tableLines: string[],
  key: string,
  onLinkClick?: (url: string, label?: string) => void
) {
  const header = parseTableRow(tableLines[0]);
  const body = tableLines.slice(2).map(parseTableRow);
  const columnCount = Math.max(header.length, ...body.map((row) => row.length));

  return (
    <div
      key={key}
      className="my-4 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
    >
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-slate-100 dark:bg-white/[0.06]">
          <tr>
            {Array.from({ length: columnCount }).map((_, index) => (
              <th
                key={`head-${index}`}
                className="border-b border-slate-200 px-3 py-3 font-semibold text-slate-950 dark:border-white/10 dark:text-white"
              >
                {renderInlineText(header[index] || '', onLinkClick)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {body.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-b border-slate-100 last:border-0 dark:border-white/10"
            >
              {Array.from({ length: columnCount }).map((_, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="align-top px-3 py-3 text-slate-700 dark:text-white/75"
                >
                  {renderInlineText(row[cellIndex] || '', onLinkClick)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChatGPTStyleText({
  text,
  onLinkClick,
}: {
  text: string;
  onLinkClick?: (url: string, label?: string) => void;
}) {
  const safeText = normalizeBrokenMarkdownLinks(text);
  const lines = safeText.split('\n');
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (
      isLikelyTableRow(line) &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;

      while (index < lines.length && isLikelyTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      index -= 1;

      blocks.push(renderMarkdownTable(tableLines, `table-${index}`, onLinkClick));
      continue;
    }

    if (!line) {
      blocks.push(<div key={`space-${index}`} className="h-1" />);
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3
          key={`heading-${index}`}
          className="pt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          {renderInlineText(heading[1], onLinkClick)}
        </h3>
      );
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      blocks.push(
        <div key={`number-${index}`} className="flex gap-3">
          <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">
            {numbered[1]}
          </span>

          <div className="min-w-0 flex-1">{renderInlineText(numbered[2], onLinkClick)}</div>
        </div>
      );
      continue;
    }

    const bullet = line.match(/^[-•*]\s+(.+)$/);
    if (bullet) {
      blocks.push(
        <div key={`bullet-${index}`} className="flex gap-3">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-white/50" />
          <div className="min-w-0 flex-1">{renderInlineText(bullet[1], onLinkClick)}</div>
        </div>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className="text-slate-800 dark:text-white/85">
        {renderInlineText(line, onLinkClick)}
      </p>
    );
  }

  return <div className="space-y-3 text-[15px] leading-7 text-slate-800 dark:text-white/85">{blocks}</div>;
}

function isShortContextReply(text: string) {
  return /^(yes|yebo|yeah|yep|ok|okay|sure|continue|do it|please do|go ahead|no|not now|send it|draft it)$/i.test(
    clean(text)
  );
}

function buildConversationContext(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.deletedFromChat)
    .slice(-10)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n');
}

function sourceCategoryIconStyle(key: SourceCategoryKey) {
  if (key === 'facemex_verified_tzaneen_employer') {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  if (key === 'official_company_source') {
    return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300';
  }

  if (key === 'government_public_institution') {
    return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300';
  }

  if (key === 'community_advert_needs_verification') {
    return 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300';
  }

  return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300';
}

function SourceCategoryIcon({ categoryKey }: { categoryKey: SourceCategoryKey }) {
  if (categoryKey === 'facemex_verified_tzaneen_employer') {
    return <ShieldCheck className="h-4 w-4" />;
  }

  if (categoryKey === 'official_company_source') {
    return <Briefcase className="h-4 w-4" />;
  }

  if (categoryKey === 'government_public_institution') {
    return <ExternalLink className="h-4 w-4" />;
  }

  if (categoryKey === 'community_advert_needs_verification') {
    return <Search className="h-4 w-4" />;
  }

  return <X className="h-4 w-4" />;
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

  const chatMessages = useMemo(() => {
    return messages.filter((message) => !message.deletedFromChat);
  }, [messages]);

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
  }, [chatMessages.length, busy]);

  const recordAIUse = () => {
    if (deepSeekLimit === null) return;
    setDeepSeekUsage(increaseDeepSeekUsage(currentTier));
  };

  const handlePickImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));

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

    const conversationContext = buildConversationContext(messages);
    const shouldUseContext = isShortContextReply(finalPrompt) && conversationContext;

    const contextualPrompt = shouldUseContext
      ? `Use the recent conversation to understand this short reply and continue from the last assistant question.

Recent conversation:
${conversationContext}

Latest user reply:
${finalPrompt}

Respond based on the previous question/task. Do not ask what the user means if the context is clear.`
      : finalPrompt;

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
        local_focus: 'tzaneen_first',
      },
    });

    if (hasImages) {
      trackImageAnalysis(attachedImages.length, finalPrompt, undefined, {
        intent,
        tier: currentTier,
        local_focus: 'tzaneen_first',
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
      const fullSystemInstruction = `${FACE_MEX_ANSWER_STYLE}\n\n${SOURCE_VERIFICATION_SYSTEM}`;

      const payload = {
        prompt: contextualPrompt,
        message: contextualPrompt,
        question: contextualPrompt,
        originalPrompt: finalPrompt,
        conversationContext,
        conversationMessages: messages
          .filter((message) => !message.deletedFromChat)
          .slice(-10)
          .map((message) => ({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
          })),
        tier: currentTier,
        creatorPlus,
        intent,
        source: 'facemex-career-workspace',
        responseStyle: 'chatgpt-premium',
        answerStyle: fullSystemInstruction,
        systemInstruction: fullSystemInstruction,
        localFocus: 'tzaneen_first',
        priorityAreas: [
          'Tzaneen',
          'Lenyenye',
          'Nkowankowa',
          'Maake',
          'Dan',
          'Burgersdorp',
          'Haenertsburg',
          'Modjadjiskloof',
          'Giyani',
          'Phalaborwa',
          'Polokwane',
        ],
        sourceVerificationCategories,
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

  const removeFromSaved = (id: string) => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (message.id !== id) return [message];

        if (message.deletedFromChat) return [];

        return [
          {
            ...message,
            saved: false,
            savedCategory: undefined,
          },
        ];
      })
    );

    toast({ title: 'Removed', description: 'Item removed from Saved.' });
  };

  const togglePin = (id: string) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, pinned: !message.pinned } : message))
    );
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (message.id !== id) return [message];

        if (message.saved) {
          return [
            {
              ...message,
              deletedFromChat: true,
            },
          ];
        }

        return [];
      })
    );

    toast({
      title: 'Deleted',
      description: 'Removed from chat. Saved copy stays in Saved.',
    });
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
  };

  const saveEdit = () => {
    setMessages((prev) =>
      prev.map((message) => (message.id === editingMessageId ? { ...message, content: editText } : message))
    );

    setEditingMessageId(null);
    setEditText('');
  };

  const researchMessage = (message: ChatMessage) => {
    setPrompt(`Research this deeper and give me a stronger practical answer:\n\n${message.content}`);
  };

  const clearSavedItems = () => {
    setMessages((prev) =>
      prev.flatMap((message) => {
        if (!message.saved) return [message];

        if (message.deletedFromChat) return [];

        return [
          {
            ...message,
            saved: false,
            savedCategory: undefined,
          },
        ];
      })
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

      <Button
        size="sm"
        variant="ghost"
        onClick={() => deleteMessage(message.id)}
        className="ml-auto h-8 rounded-full px-2 text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen max-w-full flex-col overflow-hidden bg-[#f7f7f5] text-slate-950 dark:bg-[#0b0b0c] dark:text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white/95 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:h-16 sm:px-5">
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
              <h1 className="truncate text-sm font-semibold sm:text-base">FaceMeX Job AI</h1>

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
            aria-label="Source and verification"
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

      <main className="min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-4 sm:py-4">
        <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.045] sm:rounded-[30px]">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {chatMessages.length === 0 && !busy && (
                <div className="mx-auto flex min-h-[48vh] max-w-xl flex-col items-center justify-center text-center">
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

              {chatMessages.map((message) => (
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
                      <div className={message.role === 'assistant' ? 'max-h-[52vh] overflow-y-auto pr-1' : ''}>
                        {renderMessageImages(message.images)}

                        {message.role === 'assistant' ? (
                          <ChatGPTStyleText text={message.content} onLinkClick={handleGeneratedLinkClick} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        )}
                      </div>
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

          <footer className="shrink-0 border-t border-black/5 bg-white/95 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111]/95 sm:p-4">
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
                        <span className="truncate">Upload screenshots. Verify before acting.</span>
                      </div>

                      {selectedImages.length > 0 && (
                        <button type="button" onClick={clearSelectedImages} className="font-semibold text-red-500">
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

                {(['career_plan', 'cv_advice', 'application_message', 'research'] as SavedCategory[]).map(
                  (category) => (
                    <Button
                      key={category}
                      variant={savedFilter === category ? 'default' : 'outline'}
                      onClick={() => setSavedFilter(category)}
                      className="h-9 rounded-full px-4 text-xs"
                    >
                      {savedCategoryLabels[category]} ({savedStats[category]})
                    </Button>
                  )
                )}
              </div>

              <div className="mt-5">
                {visibleSavedMessages.length === 0 ? (
                  <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50">
                    No saved items yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleSavedMessages.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08]">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>

                          <button type="button" onClick={() => setSavedOpen(false)} className="min-w-0 flex-1 text-left">
                            <div className="line-clamp-1 text-sm font-semibold">
                              {item.savedCategory ? savedCategoryLabels[item.savedCategory] : 'Saved item'}
                            </div>

                            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                              {item.content}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromSaved(item.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                            aria-label="Delete saved item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <MoreVertical className="hidden h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </div>
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
                <h2 className="text-base font-semibold">Source & Verification</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/45">
                  Tzaneen-first trusted source system
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => setSourcesOpen(false)} className="h-10 w-10 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-black">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">How FaceMeX checks jobs</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">
                      Every job should show where it came from, how safe it is, and what action the user should take before applying.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 text-sm font-semibold">Better source categories</h3>

                <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                  {sourceVerificationCategories.map((category) => (
                    <div
                      key={category.key}
                      className="flex items-center gap-3 border-b border-black/5 p-3 last:border-0 dark:border-white/10"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${sourceCategoryIconStyle(
                          category.key
                        )}`}
                      >
                        <SourceCategoryIcon categoryKey={category.key} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{category.title}</span>
                        <span className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/50">
                          {category.note}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 text-sm font-semibold">Local source links</h3>

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

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                <strong className="block text-sm">Safety rule</strong>
                FaceMeX should not mark community screenshots as verified unless the employer, official source, or application method is confirmed. Users must never pay money to apply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
