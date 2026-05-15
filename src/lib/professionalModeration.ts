export type ProfessionalCategory =
  | 'business'
  | 'opportunity'
  | 'invention'
  | 'jobs'
  | 'financial_markets'
  | 'education'
  | 'investors'
  | 'partners'
  | 'achievement';

export const professionalCategories: Array<{
  value: ProfessionalCategory;
  label: string;
}> = [
  { value: 'business', label: 'Business update' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'invention', label: 'Invention / innovation' },
  { value: 'jobs', label: 'Jobs / hiring' },
  { value: 'financial_markets', label: 'Financial markets / statistics' },
  { value: 'education', label: 'Education video or image' },
  { value: 'investors', label: 'Looking for investors' },
  { value: 'partners', label: 'Looking for partners' },
  { value: 'achievement', label: 'Achievement' },
];

const professionalKeywords = [
  'business',
  'startup',
  'company',
  'opportunity',
  'job',
  'hiring',
  'career',
  'market',
  'finance',
  'investor',
  'investment',
  'partner',
  'partnership',
  'project',
  'education',
  'learn',
  'course',
  'training',
  'achievement',
  'award',
  'launch',
  'innovation',
  'invention',
  'revenue',
  'sales',
  'customers',
  'funding',
  'pitch',
  'proposal',
  'statistics',
  'data',
];

const blockedProfessionalKeywords = [
  'dating',
  'crush',
  'gossip',
  'party',
  'drunk',
  'fight',
  'nudes',
  'hookup',
  'bet',
  'gambling',
];

export function validateProfessionalPost(input: {
  content: string;
  category?: string;
  agreed: boolean;
}) {
  const content = input.content.toLowerCase().trim();

  if (!input.agreed) {
    return {
      allowed: false,
      reason: 'You must agree to the Professional Mode posting rules.',
    };
  }

  if (!input.category) {
    return {
      allowed: false,
      reason: 'Choose a Professional Mode category before posting.',
    };
  }

  if (content.length < 10) {
    return {
      allowed: false,
      reason: 'Professional posts must include enough detail.',
    };
  }

  const hasBlockedWord = blockedProfessionalKeywords.some((word) =>
    content.includes(word)
  );

  if (hasBlockedWord) {
    return {
      allowed: false,
      reason:
        'This looks like social content. Please post it in Social Mode instead.',
    };
  }

  const hasProfessionalSignal = professionalKeywords.some((word) =>
    content.includes(word)
  );

  if (!hasProfessionalSignal) {
    return {
      allowed: false,
      reason:
        'Professional Mode is only for business, jobs, education, inventions, finance, investors, partners, opportunities, or achievements.',
    };
  }

  return {
    allowed: true,
    reason: '',
  };
}
