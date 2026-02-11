import { api } from '@/lib/api';

export type SafetyRiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface SafetyScanResult {
  level: SafetyRiskLevel;
  reasons: string[];
  summary: string;
}

const normalize = (text: string) => (text || '').toLowerCase();

export function safetyScanText(text: string): SafetyScanResult {
  const t = normalize(text);
  const reasons: string[] = [];

  // Scam / fraud / phishing indicators (lightweight heuristics).
  const hasLink = /(https?:\/\/|www\.)/.test(t);
  const asksForOtp = /\b(otp|one[- ]time\s*pin|verification\s*code|2fa|auth\s*code)\b/.test(t);
  const asksForMoney = /\b(pay|payment|deposit|transfer|send\s*money|bank\s*details|account\s*number|wallet|crypto|bitcoin|gift\s*card|voucher)\b/.test(t);
  const urgency = /\b(urgent|immediately|asap|right\s*now|final\s*notice|limited\s*time)\b/.test(t);
  const offPlatform = /\b(whatsapp|telegram|signal|dm\s*me\s*on|text\s*me\s*on)\b/.test(t);
  const jobScam = /\b(application\s*fee|processing\s*fee|training\s*fee|pay\s*to\s*apply|starter\s*pack)\b/.test(t);
  const impersonation = /\b(verify\s*your\s*account|account\s*suspended|security\s*alert|confirm\s*password|reset\s*your\s*password)\b/.test(t);

  if (hasLink && (asksForOtp || impersonation)) reasons.push('Possible phishing attempt (links + account/OTP request).');
  if (asksForOtp) reasons.push('Requests a verification code/OTP.');
  if (asksForMoney) reasons.push('Requests money, payment, or financial details.');
  if (offPlatform) reasons.push('Asks to move the conversation off-platform.');
  if (jobScam) reasons.push('Mentions application/processing/training fees (common job scam pattern).');
  if (urgency) reasons.push('Uses urgency/pressure tactics.');

  // Very small safety set (non-scam).
  const selfHarm = /\b(suicide|kill\s*myself|self\s*harm)\b/.test(t);
  if (selfHarm) reasons.push('Possible self-harm content.');

  let level: SafetyRiskLevel = 'none';
  if (reasons.length >= 4 || selfHarm) level = 'high';
  else if (reasons.length === 3) level = 'medium';
  else if (reasons.length >= 1) level = 'low';

  const summary =
    level === 'none'
      ? ''
      : level === 'low'
        ? 'This looks potentially risky. Be cautious before sharing personal info.'
        : level === 'medium'
          ? 'This may be a scam or unsafe request. Avoid sharing personal or financial information.'
          : selfHarm
            ? 'This message may indicate someone is at risk. Consider reaching out to local emergency resources.'
            : 'High risk: this looks like fraud/phishing. Do not share codes, money, or banking details.';

  return { level, reasons, summary };
}

export type SafetyReportContext = {
  location: 'messages' | 'posts';
  conversationId?: string;
  postId?: string;
  direction?: 'incoming' | 'outgoing' | 'draft';
};

export async function reportSafetyEvent(payload: {
  content: string;
  scan: SafetyScanResult;
  context: SafetyReportContext;
}) {
  // Best-effort reporting. Backend may not exist yet.
  try {
    await api.post('/api/safety/report-scam', {
      summary: payload.scan.summary,
      reasons: payload.scan.reasons,
      level: payload.scan.level,
      context: payload.context,
      content: payload.content,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}
