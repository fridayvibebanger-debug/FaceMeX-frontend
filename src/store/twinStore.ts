import { create } from 'zustand';

export type TwinMode = 'off' | 'suggest' | 'auto';

export interface TwinProfile {
  tone: 'casual' | 'professional' | 'friendly' | 'playful';
  formality: number; // 0-100
  emojis: boolean;
  topics: string[]; // preferred topics/keywords
  boundaries: string[]; // things to avoid
  bioNotes: string; // short notes
}

export function applySafety(out: string, consent: TwinConsent): { text: string; escalated: boolean } {
  let text = out || '';
  const s = consent.safety;
  let escalated = false;
  if (s) {
    // blocklist masking
    if (s.blocklist && s.blocklist.length) {
      for (const word of s.blocklist) {
        if (!word) continue;
        const re = new RegExp(word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig');
        text = text.replace(re, '[redacted]');
      }
    }
    // max length
    if (s.maxLength && text.length > s.maxLength) text = text.slice(0, s.maxLength - 1).trim() + '…';
    // emoji cap
    if (s.emojiMax) {
      const chars = Array.from(text);
      let count = 0;
      text = chars.filter((ch) => {
        const isEmoji = /\p{Extended_Pictographic}/u.test(ch);
        if (isEmoji) {
          count += 1;
          return count <= s.emojiMax;
        }
        return true;
      }).join('');
    }
    // escalate triggers
    if (s.escalate && s.escalate.length) {
      const lower = text.toLowerCase();
      if (s.escalate.some(k => lower.includes(k.toLowerCase()))) {
        escalated = true;
      }
    }
  }
  return { text, escalated };
}

export interface TwinConsent {
  messages: boolean;
  feedSuggestions: boolean;
  showBadge: boolean;
  dailyMaxAuto: number;
  cooldownSec: number;
  mode: TwinMode;
  allowList?: string[]; // contact/user IDs allowed for auto
  denyList?: string[];  // contact/user IDs denied for auto
  quietHours?: { start: number; end: number }; // 0-23 local hours
  overrides?: Record<string, TwinMode>; // per-conversation override
  safety?: {
    blocklist: string[];
    maxLength: number;
    emojiMax: number; // max emoji count
    escalate: string[]; // keywords to require approval
  };
}

export interface TwinLog {
  id: string;
  ts: string;
  surface: 'messages' | 'feed';
  inputPreview: string;
  output: string;
  mode: 'suggest' | 'auto';
  approved?: boolean;
}

interface TwinState {
  profile: TwinProfile;
  consent: TwinConsent;
  logs: TwinLog[];
  training: { id: string; ts: string; text: string; score: 1 | -1 }[];
  load: () => void;
  saveProfile: (p: Partial<TwinProfile>) => void;
  saveConsent: (c: Partial<TwinConsent>) => void;
  addLog: (log: Omit<TwinLog, 'id' | 'ts'>) => void;
  clearLogs: () => void;
  addTraining: (text: string, score: 1 | -1) => void;
  removeTraining: (id: string) => void;
}

const readLS = (k: string) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveLS = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const useTwinStore = create<TwinState>((set, get) => ({
  profile: {
    tone: 'friendly',
    formality: 50,
    emojis: true,
    topics: ['community', 'creativity'],
    boundaries: ['politics', 'finance advice'],
    bioNotes: 'Helpful and kind. Short, clear answers.',
  },
  consent: {
    messages: true,
    feedSuggestions: true,
    showBadge: true,
    dailyMaxAuto: 5,
    cooldownSec: 120,
    mode: 'suggest',
    allowList: [],
    denyList: [],
    quietHours: { start: 22, end: 7 },
    overrides: {},
    safety: {
      blocklist: ['password', 'credit card', 'ssn'],
      maxLength: 220,
      emojiMax: 6,
      escalate: ['urgent payment', 'wire transfer', 'legal notice'],
    },
  },
  logs: [],
  training: [],
  load: () => {
    const p = readLS('twin:profile');
    const c = readLS('twin:consent');
    const l = readLS('twin:logs');
    const t = readLS('twin:train');
    if (p) set({ profile: p });
    if (c) set({ consent: c });
    if (Array.isArray(l)) set({ logs: l });
    if (Array.isArray(t)) set({ training: t });
  },
  saveProfile: (p) => {
    const next = { ...get().profile, ...p };
    set({ profile: next });
    saveLS('twin:profile', next);
  },
  saveConsent: (c) => {
    const next = { ...get().consent, ...c };
    set({ consent: next });
    saveLS('twin:consent', next);
  },
  addLog: (log) => {
    const withMeta = { id: String(Date.now()), ts: new Date().toISOString(), ...log } as TwinLog;
    const next = [withMeta, ...get().logs].slice(0, 100);
    set({ logs: next });
    saveLS('twin:logs', next);
  },
  clearLogs: () => {
    set({ logs: [] });
    saveLS('twin:logs', []);
  },
  addTraining: (text, score) => {
    const item = { id: String(Date.now()), ts: new Date().toISOString(), text, score };
    const next = [item, ...(get().training || [])].slice(0, 200);
    set({ training: next });
    saveLS('twin:train', next);
  },
  removeTraining: (id) => {
    const next = (get().training || []).filter(t => t.id !== id);
    set({ training: next });
    saveLS('twin:train', next);
  },
}));

export function buildStylePrompt(p: TwinProfile) {
  const tone = p.tone;
  const form = p.formality;
  const emo = p.emojis ? 'Include tasteful emojis where natural.' : 'Do not use emojis.';
  const topics = p.topics?.length ? `Prefer topics: ${p.topics.join(', ')}.` : '';
  const bounds = p.boundaries?.length ? `Avoid: ${p.boundaries.join(', ')}.` : '';
  const bio = p.bioNotes ? `Notes: ${p.bioNotes}.` : '';
  return `Tone: ${tone}. Formality: ${form}/100. ${emo} ${topics} ${bounds} ${bio}`.trim();
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)] }
function maybe(arr: string[], p = 0.5) { return Math.random() < p ? rand(arr) : '' }

export function generateTwinReply(input: string, p: TwinProfile, training?: { text: string; score: 1 | -1 }[]) {
  const text = (input || '').toLowerCase();
  const isQuestion = /\?|\b(how|what|when|where|why|which|can|do|did|are|is)\b/.test(text);
  const hasThanks = /\b(thanks|thank you|appreciate)\b/.test(text);
  const hasSchedule = /(\b\d{1,2}(:\d{2})?\s?(am|pm)?\b|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|sat|sun)/.test(text);
  const positive = /\b(amazing|great|awesome|cool|love|nice|good)\b/.test(text);
  const negative = /\b(sad|bad|issue|problem|angry|upset|delay)\b/.test(text);

  const emojisOn = p.emojis;
  const emoPool = ['✨','😊','👍','🙌','🤝','💫','🙂','⭐'];
  const polite = ['Thanks for the update','Appreciate the heads-up','Noted, thank you'];
  const agree = ['Sounds good','Got it','Works for me','All good','I’m in'];
  const schedule = ['I can make that time','That time works','Let’s lock it in','I’ll be there'];
  const ask = ['Could you share a bit more?','Any details I should know?','What would be best next steps?','Happy to help — what do you prefer?'];
  const empath = ['Sorry to hear that','I get how that feels','Let’s sort this out together','Thanks for flagging this'];

  // topics hint
  const topicHint = p.topics && p.topics.length ? maybe([`Re ${p.topics[0]}`,`On ${p.topics[0]}`], 0.3) : '';

  // training positive snippets influence tone (very light)
  const posTrain = (training||[]).filter(t => t.score === 1);
  const trainSuffix = posTrain.length ? maybe([' Appreciate it.',' Let’s do it.',' Keen to proceed.'], 0.3) : '';

  // base clause
  let clauses: string[] = [];
  if (hasThanks) clauses.push(rand(polite));
  if (hasSchedule) clauses.push(rand(schedule));
  if (isQuestion) clauses.push(rand(ask));
  if (positive) clauses.push(rand(agree));
  if (negative) clauses.push(rand(empath));
  if (clauses.length === 0) clauses = [rand(agree)];

  // assemble with variability
  let out = clauses.join('. ');
  if (topicHint) out = `${topicHint}: ${out}`;
  out = out.replace(/\s+/g, ' ').trim();

  // tone/formality adjustments
  if (p.tone === 'professional') {
    out = out.replace(/\b(got it)\b/ig, 'Understood').replace(/\b(all good)\b/ig, 'All good on my side');
  } else if (p.tone === 'playful') {
    out = rand([
      `${out} ${maybe(['😄','😎','🎉'])}`.trim(),
      `${out} ${maybe(['😉','✨'])}`.trim(),
    ]);
  }
  if (p.formality > 70) out = out.replace(/\b(yeah|cool)\b/ig, 'Yes');

  if (trainSuffix) out = `${out}${trainSuffix}`;
  if (emojisOn && !/\p{Extended_Pictographic}/u.test(out)) out = `${out} ${rand(emoPool)}`.trim();

  // avoid repeats: compare with last outs
  try {
    const raw = localStorage.getItem('twin:lastouts');
    const arr = raw ? JSON.parse(raw) as string[] : [];
    if (arr[0] && arr[0].toLowerCase() === out.toLowerCase()) {
      out = out + (emojisOn ? ' 🙂' : '!');
    }
    const next = [out, ...arr].slice(0, 5);
    localStorage.setItem('twin:lastouts', JSON.stringify(next));
  } catch {}

  return out;
}
