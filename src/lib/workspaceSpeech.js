function getCurrencyName(code, amount, locale) {
  try {
    const name = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'name',
      maximumFractionDigits: 2,
    })
      .formatToParts(amount)
      .find((part) => part.type === 'currency')?.value;
    return name && name.toUpperCase() !== code.toUpperCase() ? name : null;
  } catch {
    return null;
  }
}

function expandCurrencyCodes(text, locale) {
  const amountPattern = '([+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)';
  const prefixCode = new RegExp(`(^|[^\\w])([A-Z]{3})\\s*${amountPattern}(?![\\w])`, 'g');
  const suffixCode = new RegExp(`(^|[^\\w])${amountPattern}\\s*([A-Z]{3})(?![\\w])`, 'g');

  const withPrefixCodes = text.replace(prefixCode, (match, boundary, code, amount) => {
    const numericAmount = Number(amount.replace(/,/g, ''));
    const currencyName = Number.isFinite(numericAmount)
      ? getCurrencyName(code, numericAmount, locale)
      : null;
    return Number.isFinite(numericAmount)
      && currencyName
      ? `${boundary}${amount} ${currencyName}`
      : match;
  });

  return withPrefixCodes.replace(suffixCode, (match, boundary, amount, code) => {
    const numericAmount = Number(amount.replace(/,/g, ''));
    const currencyName = Number.isFinite(numericAmount)
      ? getCurrencyName(code, numericAmount, locale)
      : null;
    return Number.isFinite(numericAmount)
      && currencyName
      ? `${boundary}${amount} ${currencyName}`
      : match;
  });
}

function expandCurrencySymbols(text, locale) {
  const symbols = [
    { pattern: /US\$\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'USD' },
    { pattern: /CA\$\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'CAD' },
    { pattern: /A\$\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'AUD' },
    { pattern: /NZ\$\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'NZD' },
    { pattern: /\$\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, currencyName: 'dollars' },
    { pattern: /(^|[^\w])R\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'ZAR', boundary: true },
    { pattern: /€\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'EUR' },
    { pattern: /£\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'GBP' },
    { pattern: /¥\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'JPY' },
    { pattern: /₹\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'INR' },
    { pattern: /₩\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'KRW' },
    { pattern: /₽\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'RUB' },
    { pattern: /₺\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'TRY' },
    { pattern: /₦\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'NGN' },
    { pattern: /₱\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'PHP' },
    { pattern: /฿\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'THB' },
    { pattern: /₪\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/g, code: 'ILS' },
  ];

  return symbols.reduce((spoken, { pattern, code, currencyName, boundary }) => spoken.replace(pattern, (match, first, second) => {
    const prefix = boundary ? first : '';
    const amount = boundary ? second : first;
    const numericAmount = Number(amount.replace(/,/g, ''));
    const name = code ? getCurrencyName(code, numericAmount, locale) : currencyName;
    return Number.isFinite(numericAmount)
      && name
      ? `${prefix}${amount} ${name}`
      : match;
  }), text);
}

export function prepareWorkspaceSpeechText(input, locale = 'en-ZA') {
  if (typeof input !== 'string' || !input.trim()) return '';

  let text = input
    .replace(/```[\w+-]*[^\n]*\n[\s\S]*?```/g, ' ')
    .replace(/```[\s\S]*$/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<https?:\/\/[^>]+>/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, '')
    .replace(/\|/g, ', ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/(\d)\s*\*\s*(\d)/g, '$1 times $2')
    .replace(/[*#_]/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' and ')
    .replace(/&lt;/gi, ' less than ')
    .replace(/&gt;/gi, ' greater than ')
    .replace(/&/g, ' and ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '. ')
    .replace(/(?:\.\s*){2,}/g, '. ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

  text = expandCurrencyCodes(text, locale);
  text = expandCurrencySymbols(text, locale);
  return text.replace(/\s+/g, ' ').trim();
}

export function selectWorkspaceSpeechVoice(voices, locale = 'en-ZA') {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const preferredLocale = locale.toLowerCase();
  const preferredLanguage = preferredLocale.split('-')[0];
  const naturalVoicePattern = /natural|neural|premium|online|aria|jenny|samantha|zira|google.*english/i;
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  if (!englishVoices.length) return null;

  return [...englishVoices].sort((left, right) => {
    const score = (voice) => {
      const voiceLocale = voice.lang?.toLowerCase() || '';
      const name = voice.name || '';
      return (voiceLocale === preferredLocale ? 100 : 0) +
        (voiceLocale.startsWith(`${preferredLanguage}-`) ? 30 : 0) +
        (naturalVoicePattern.test(name) ? 50 : 0) +
        (voice.default ? 5 : 0);
    };
    return score(right) - score(left);
  })[0] || null;
}
