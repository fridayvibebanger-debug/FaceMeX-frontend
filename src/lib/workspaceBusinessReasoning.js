const MONEY_PATTERN = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?';

function requireFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}

function roundToCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatZar(value) {
  return `R${roundToCents(value).toFixed(2)}`;
}

function extractNamedZarAmount(prompt, pattern) {
  const match = String(prompt || '').match(pattern);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function calculateRevenue(pricePerUnit, unitsSold) {
  requireFiniteNonNegative(pricePerUnit, 'Price per unit');
  requireFiniteNonNegative(unitsSold, 'Units sold');
  return roundToCents(pricePerUnit * unitsSold);
}

export function calculateBusinessProfit({ revenue, directCosts, operatingCosts }) {
  requireFiniteNonNegative(revenue, 'Revenue');
  if (!Array.isArray(directCosts)) throw new TypeError('Direct costs must be provided as an array.');
  directCosts.forEach((cost) => requireFiniteNonNegative(cost, 'Direct cost'));
  if (operatingCosts !== undefined) {
    if (!Array.isArray(operatingCosts)) throw new TypeError('Operating costs must be provided as an array.');
    operatingCosts.forEach((cost) => requireFiniteNonNegative(cost, 'Operating cost'));
  }

  const directCostTotal = roundToCents(directCosts.reduce((total, cost) => total + cost, 0));
  const grossProfit = roundToCents(revenue - directCostTotal);
  const operatingCostTotal = operatingCosts === undefined
    ? null
    : roundToCents(operatingCosts.reduce((total, cost) => total + cost, 0));
  const netProfit = operatingCostTotal === null
    ? null
    : roundToCents(grossProfit - operatingCostTotal);

  return {
    revenue: roundToCents(revenue),
    directCostTotal,
    grossProfit,
    operatingCostTotal,
    netProfit,
    grossMarginPercent: revenue > 0 ? roundToCents((grossProfit / revenue) * 100) : null,
    netMarginPercent: revenue > 0 && netProfit !== null
      ? roundToCents((netProfit / revenue) * 100)
      : null,
    missingOperatingCosts: operatingCosts === undefined,
  };
}

export function calculateSimpleInterest(principal, annualRatePercent, years) {
  requireFiniteNonNegative(principal, 'Principal');
  requireFiniteNonNegative(annualRatePercent, 'Annual rate');
  requireFiniteNonNegative(years, 'Years');
  return roundToCents(principal * (annualRatePercent / 100) * years);
}

export function calculateCompoundInterest(principal, annualRatePercent, years, compoundsPerYear = 1) {
  requireFiniteNonNegative(principal, 'Principal');
  requireFiniteNonNegative(annualRatePercent, 'Annual rate');
  requireFiniteNonNegative(years, 'Years');
  if (!Number.isInteger(compoundsPerYear) || compoundsPerYear <= 0) {
    throw new RangeError('Compounds per year must be a positive integer.');
  }
  const periods = compoundsPerYear * years;
  const balance = principal * (1 + annualRatePercent / 100 / compoundsPerYear) ** periods;
  return roundToCents(balance - principal);
}

export function calculatePercentage(amount, ratePercent) {
  requireFiniteNonNegative(amount, 'Amount');
  requireFiniteNonNegative(ratePercent, 'Percentage rate');
  return roundToCents(amount * ratePercent / 100);
}

export function calculateBreakEvenUnits(fixedCosts, pricePerUnit, variableCostPerUnit) {
  requireFiniteNonNegative(fixedCosts, 'Fixed costs');
  requireFiniteNonNegative(pricePerUnit, 'Price per unit');
  requireFiniteNonNegative(variableCostPerUnit, 'Variable cost per unit');
  const contributionPerUnit = pricePerUnit - variableCostPerUnit;
  if (contributionPerUnit <= 0) {
    throw new RangeError('Price per unit must exceed variable cost per unit to calculate break-even.');
  }
  return Math.ceil(fixedCosts / contributionPerUnit);
}

export function createDeliveryProfitAnswer(prompt) {
  const text = String(prompt || '');
  const revenue = extractNamedZarAmount(
    text,
    new RegExp(`customer\\s+(?:pays?|paid)\\s+(?:a\\s+)?(?:delivery\\s+fee\\s+of\\s+)?R\\s*(${MONEY_PATTERN})`, 'i'),
  );
  const driverCost = extractNamedZarAmount(
    text,
    new RegExp(`driver\\s+(?:receives?|gets?|earns?|is\\s+paid)\\s+R\\s*(${MONEY_PATTERN})`, 'i'),
  );
  const fuelCost = extractNamedZarAmount(
    text,
    new RegExp(`fuel\\s+(?:costs?|cost\\s+is|is)\\s+R\\s*(${MONEY_PATTERN})`, 'i'),
  );

  if (
    revenue === null ||
    driverCost === null ||
    fuelCost === null ||
    !/\b(?:delivery|profit|margin|remaining|left over)\b/i.test(text)
  ) {
    return null;
  }

  const statedCurrencyAmounts = text.match(new RegExp(`R\\s*${MONEY_PATTERN}`, 'gi')) || [];
  if (statedCurrencyAmounts.length !== 3) return null;

  const metrics = calculateBusinessProfit({
    revenue,
    directCosts: [driverCost, fuelCost],
  });
  const calculation = `${formatZar(revenue)} - ${formatZar(driverCost)} - ${formatZar(fuelCost)} = ${formatZar(metrics.grossProfit)}`;
  const margin = metrics.grossMarginPercent === null
    ? null
    : metrics.grossMarginPercent.toFixed(2).replace(/\.?0+$/, '');

  return [
    `Revenue: ${formatZar(metrics.revenue)}`,
    `Driver cost: ${formatZar(driverCost)}`,
    `Fuel cost: ${formatZar(fuelCost)}`,
    `Remaining profit before other overheads: ${formatZar(metrics.grossProfit)}`,
    `Profit margin before other overheads: ${margin === null ? 'not defined because revenue is zero' : `${margin}%`}`,
    margin === null
      ? `Calculation: ${calculation}; a margin cannot be calculated with zero revenue.`
      : `Calculation: ${calculation}; ${formatZar(metrics.grossProfit)} ÷ ${formatZar(metrics.revenue)} × 100 = ${margin}%.`,
    'This is the amount remaining after the stated driver and fuel costs, not net profit; subtract any other costs to calculate net profit.',
  ].join('\n');
}

const SOUTH_AFRICA_CONTEXT_PATTERN = /\b(?:south africa|south african|cipc|sars|popia|nyda|seda|sefa|department of small business development|dsbd|municipalit(?:y|ies)|zar|rand|rands)\b/i;
const BUSINESS_CONTEXT_PATTERN = /\b(?:business|businesses|revenue|profit|margin|costs?|expenses?|pricing|commission|break[- ]even|unit economics|interest|tax|vat|customer acquisition|startup|cash flow|case stud(?:y|ies))\b/i;
const HIGH_RISK_FACT_PATTERN = /\b(?:law|legal|regulat(?:ion|ions|ory)|tax|taxation|sars|cipc|registration|grant|funding|eligib(?:le|ility)|application deadline|programme|program|government|payment gateway|processing fee|transaction fee|price|pricing|medical|medicine|health|safety|financial advice|interest rate|vat|popia|nyda|seda|sefa|municipalit(?:y|ies)|department of small business development|dsbd)\b/i;

export function buildWorkspaceQualityInstruction(prompt = '') {
  const text = String(prompt || '');
  const businessContext = BUSINESS_CONTEXT_PATTERN.test(text);
  const southAfricaContext = SOUTH_AFRICA_CONTEXT_PATTERN.test(text);
  const highRiskContext = HIGH_RISK_FACT_PATTERN.test(text);

  return [
    'Before answering, silently check that you answered the actual request, followed its instructions, checked internal consistency and arithmetic, included important risks, and made the next step actionable. Do not reveal private chain-of-thought; give only concise reasoning, calculations and conclusions.',
    'Distinguish information supplied by the user, verified information, general knowledge, estimates, assumptions, illustrative examples, opinions, and unverified claims. A claim is verified only when you actually checked a trustworthy source available in this interaction or it is directly supported by supplied evidence; do not describe memory or model knowledge as externally verified. Never invent statistics, customer counts, prices, case studies, legal requirements, citations, sources, or market evidence. Never imply that you searched, checked, confirmed, or consulted a source unless you actually did. If evidence is unavailable or inconclusive, say what is uncertain and what should be verified. Do not invent numerical confidence scores.',
    'Do not automatically agree with the user or defend an earlier answer. Point out weak assumptions, missing information and contradictions respectfully. If an earlier answer was wrong, acknowledge and correct it directly.',
    highRiskContext
      ? 'Apply stricter verification to current or high-impact claims about law, tax, registration, funding, eligibility, deadlines, financial recommendations, medical or safety information, prices, and payment-processing fees. If a trusted search or retrieval source is available, prefer the responsible official institution, check the source and its update/publication date, and cross-check material claims where practical. Cite or link only sources actually consulted. If no suitable source is available, clearly say current details are unverified and direct the user to the responsible official source before they act; do not guess amounts, thresholds, fees, rules, or eligibility.'
      : '',
    businessContext
      ? 'For business and financial questions, use the stated currency and show a compact calculation when useful. Keep revenue distinct from profit. Include all stated relevant costs; distinguish gross profit from net profit and calculate each margin as profit divided by revenue. Never treat missing costs as zero: ask for essential missing amounts or label results explicitly as estimates or profit before the missing overheads. Check calculations independently before responding. Prefer practical options within the user’s stated budget and explain lower-cost alternatives.'
      : '',
    southAfricaContext
      ? 'For South African questions, do not assume the user is in South Africa unless the prompt supports it. Use rand when appropriate and distinguish local rules from other jurisdictions. Treat CIPC, SARS, NYDA, SEDA, SEFA or any successor, the Department of Small Business Development, and municipal programme information as current only when verified from the responsible official source. Distinguish a sole proprietor from a registered company; do not claim that a sole proprietor must register a company with CIPC. Never invent a grant, successor agency, fee, tax threshold, programme, eligibility rule, or application requirement.'
      : '',
  ].filter(Boolean).join('\n');
}
