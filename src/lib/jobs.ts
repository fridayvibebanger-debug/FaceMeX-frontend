export type JobLegitimacyLevel = 'ok' | 'caution' | 'risky';

export type JobLike = {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  type?: string;
  skills?: string[];
  website?: string;
  contactEmail?: string;
};

const normalize = (x: any) => String(x || '').trim().toLowerCase();

const SA_CITY_HINTS = [
  'south africa',
  'za',
  'cape town',
  'johannesburg',
  'joburg',
  'pretoria',
  'durban',
  'gqeberha',
  'port elizabeth',
  'bloemfontein',
  'east london',
  'polokwane',
  'nelspruit',
  'mbombela',
  'kimberley',
];

export function isSouthAfricaLocation(location: string): boolean {
  const l = normalize(location);
  if (!l) return false;
  if (/\bza\b/.test(l)) return true;
  return SA_CITY_HINTS.some((h) => l.includes(h));
}

export function jobRegionRank(job: JobLike): number {
  const l = normalize(job.location);
  if (isSouthAfricaLocation(l)) return 0;
  if (!l) return 2;
  if (l.includes('remote')) return 1;
  return 2;
}

const FREE_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];

export function assessJobLegitimacy(job: JobLike): { level: JobLegitimacyLevel; reasons: string[]; summary: string } {
  const reasons: string[] = [];

  const title = normalize(job.title);
  const company = normalize(job.company);
  const location = normalize(job.location);
  const description = normalize(job.description);
  const website = normalize(job.website);
  const email = normalize(job.contactEmail);

  const hasFeeLanguage = /\b(application\s*fee|processing\s*fee|training\s*fee|pay\s*to\s*apply|starter\s*pack|registration\s*fee)\b/.test(description);
  const asksForMoney = /\b(pay|deposit|transfer|send\s*money|bitcoin|crypto|gift\s*card|voucher)\b/.test(description);
  const urgency = /\b(urgent|immediately|asap|limited\s*time|final\s*notice)\b/.test(description);
  const vagueCompany = !company || company.length < 2 || company.includes('confidential') || company.includes('private');
  const noLocation = !location;
  const noDescription = !description || description.length < 60;

  if (hasFeeLanguage) reasons.push('Mentions fees to apply (common scam pattern).');
  if (asksForMoney) reasons.push('Mentions payments or money transfers.');
  if (urgency) reasons.push('Uses urgency/pressure language.');
  if (vagueCompany) reasons.push('Company details are missing or vague.');
  if (noLocation) reasons.push('Location is missing.');
  if (noDescription) reasons.push('Description is very short or missing.');

  if (email) {
    const domain = email.includes('@') ? email.split('@')[1] : '';
    if (domain && FREE_EMAIL_DOMAINS.includes(domain)) {
      reasons.push('Uses a free email domain for hiring contact.');
    }
  }

  if (website) {
    if (!/^https?:\/\//.test(website)) reasons.push('Website URL format looks unusual.');
  }

  let level: JobLegitimacyLevel = 'ok';
  if (reasons.length >= 3 || hasFeeLanguage || asksForMoney) level = 'risky';
  else if (reasons.length >= 1) level = 'caution';

  const summary =
    level === 'ok'
      ? 'No obvious scam signals. Still verify before sharing sensitive info.'
      : level === 'caution'
        ? 'Some details look incomplete. Verify the employer before applying.'
        : 'This job post looks risky. Avoid paying fees or sharing sensitive info. Verify the company first.';

  return { level, reasons, summary };
}
