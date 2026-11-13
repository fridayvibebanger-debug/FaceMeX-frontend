import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWorkspaceQualityInstruction,
  buildWorkspaceBusinessInstruction,
  calculateBusinessScenario,
  calculateCashFlow,
  calculateCustomerAcquisitionCost,
  calculateCustomerLifetimeValue,
  calculateBreakEvenUnits,
  calculateBusinessProfit,
  calculateCompoundInterest,
  calculateLoanPayment,
  calculatePercentage,
  calculateRevenue,
  calculateReturnOnInvestment,
  calculateSimpleInterest,
  classifyBusinessDomains,
  createBusinessCalculationAnswer,
  createDeliveryProfitAnswer,
  formatBusinessCurrency,
} from './workspaceBusinessReasoning.js';

test('calculates the delivery regression as revenue less driver and fuel costs', () => {
  const answer = createDeliveryProfitAnswer(
    'A customer pays R30 for a delivery. The driver receives R15 and fuel costs R7.50. What is the profit margin?',
  );

  assert.ok(answer);
  assert.match(answer, /Revenue: R30\.00/);
  assert.match(answer, /Driver cost: R15\.00/);
  assert.match(answer, /Fuel cost: R7\.50/);
  assert.match(answer, /Remaining profit before other overheads: R7\.50/);
  assert.match(answer, /Profit margin before other overheads: 25%/);
  assert.doesNotMatch(answer, /(?:Revenue|Driver cost): R(?:15|30)\.00\s*(?:as|is)\s+(?:the\s+)?(?:actual\s+)?profit/i);
});

test('does not make up missing costs or omit additional stated rand amounts', () => {
  assert.equal(
    createDeliveryProfitAnswer('A customer pays R30 for delivery and the driver receives R15. Calculate profit.'),
    null,
  );
  assert.equal(
    createDeliveryProfitAnswer('A customer pays R30 for delivery. Driver gets R15, fuel is R7.50, and the platform fee is R2. Calculate profit.'),
    null,
  );
});

test('does not divide by zero when a delivery has no revenue', () => {
  const answer = createDeliveryProfitAnswer(
    'A customer pays R0 for a delivery. The driver receives R15 and fuel costs R7.50. Calculate profit margin.',
  );
  assert.ok(answer);
  assert.match(answer, /Profit margin before other overheads: not defined because revenue is zero/);
  assert.match(answer, /a margin cannot be calculated with zero revenue/i);
});

test('calculates revenue, profit, gross and net margins without treating missing overhead as zero', () => {
  assert.equal(calculateRevenue(30, 1), 30);
  assert.deepEqual(calculateBusinessProfit({ revenue: 30, directCosts: [15, 7.5] }), {
    revenue: 30,
    directCostTotal: 22.5,
    grossProfit: 7.5,
    operatingCostTotal: null,
    netProfit: null,
    grossMarginPercent: 25,
    netMarginPercent: null,
    missingOperatingCosts: true,
  });
  assert.deepEqual(calculateBusinessProfit({
    revenue: 100,
    directCosts: [40],
    operatingCosts: [20],
  }), {
    revenue: 100,
    directCostTotal: 40,
    grossProfit: 60,
    operatingCostTotal: 20,
    netProfit: 40,
    grossMarginPercent: 60,
    netMarginPercent: 40,
    missingOperatingCosts: false,
  });
});

test('calculates interest, percentages and break-even units deterministically', () => {
  assert.equal(calculateSimpleInterest(1000, 10, 2), 200);
  assert.equal(calculateCompoundInterest(1000, 10, 2), 210);
  assert.equal(calculateCompoundInterest(1000, 12, 1, 12), 126.83);
  assert.equal(calculatePercentage(500, 7.5), 37.5);
  assert.equal(calculateBreakEvenUnits(1000, 50, 30), 50);
  assert.throws(() => calculateBreakEvenUnits(1000, 30, 30), /must exceed variable cost/);
});

test('calculates reconciled operating scenarios and does not infer missing overheads', () => {
  assert.deepEqual(calculateBusinessScenario({
    unitsSold: 100,
    pricePerUnit: 20,
    variableCostPerUnit: 8,
    operatingCosts: [500, 100],
  }), {
    revenue: 2000,
    variableCostTotal: 800,
    contribution: 1200,
    operatingCostTotal: 600,
    netProfit: 600,
    netMarginPercent: 30,
    missingOperatingCosts: false,
  });
  assert.deepEqual(calculateBusinessScenario({
    unitsSold: 10,
    pricePerUnit: 30,
    variableCostPerUnit: 10,
  }), {
    revenue: 300,
    variableCostTotal: 100,
    contribution: 200,
    operatingCostTotal: null,
    netProfit: null,
    netMarginPercent: null,
    missingOperatingCosts: true,
  });
});

test('calculates cash flow, customer economics, ROI, debt service, and currency formatting', () => {
  assert.deepEqual(calculateCashFlow({
    openingBalance: 1000,
    inflows: [500, 200],
    outflows: [300, 250],
  }), {
    openingBalance: 1000,
    totalInflows: 700,
    totalOutflows: 550,
    netCashFlow: 150,
    closingBalance: 1150,
  });
  assert.equal(calculateCustomerAcquisitionCost(6000, 120), 50);
  assert.equal(calculateCustomerAcquisitionCost(6000, 0), null);
  assert.equal(calculateCustomerLifetimeValue({
    averageOrderValue: 100,
    purchasesPerPeriod: 2,
    grossMarginPercent: 60,
    customerLifetimePeriods: 12,
  }), 1440);
  assert.throws(() => calculateCustomerLifetimeValue({
    averageOrderValue: 100,
    purchasesPerPeriod: 2,
    grossMarginPercent: 101,
    customerLifetimePeriods: 12,
  }), /must not exceed 100 percent/);
  assert.equal(calculateReturnOnInvestment(1200, 1000), 20);
  assert.equal(calculateReturnOnInvestment(800, 1000), -20);
  assert.equal(calculateReturnOnInvestment(100, 0), null);
  assert.equal(calculateLoanPayment(1200, 0, 12), 100);
  assert.equal(calculateLoanPayment(1200, 12, 12), 106.62);
  assert.match(formatBusinessCurrency(1234.5, 'ZAR'), /ZAR/);
  assert.match(formatBusinessCurrency(1234.5, 'USD'), /\$/);
  assert.match(formatBusinessCurrency(1234.5, 'EUR'), /€/);
  assert.throws(() => formatBusinessCurrency(10, 'US'), /three-letter ISO 4217/);
});

test('routes explicitly labeled financial inputs through deterministic calculations', () => {
  const cashFlow = createBusinessCalculationAnswer(
    'Calculate cash flow: opening balance R1000, total inflows R700, total outflows R550.',
  );
  assert.match(cashFlow, /Net cash flow: ZAR\s+150\.00/);
  assert.match(cashFlow, /Closing balance: ZAR\s+1,150\.00/);
  assert.match(cashFlow, /not the same as accounting profit/i);

  const cac = createBusinessCalculationAnswer(
    'Calculate CAC: marketing spend USD 6000, customers acquired 120.',
  );
  assert.match(cac, /Customer acquisition cost \(CAC\): \$50\.00 per customer/);
  assert.match(cac, /6,000\.00 ÷ 120 acquired customers/);
  const ambiguousDollarCAC = createBusinessCalculationAnswer(
    'Calculate CAC: marketing spend $6000, customers acquired 120.',
  );
  assert.match(ambiguousDollarCAC, /Customer acquisition cost \(CAC\): \$50\.00 per customer/);
  assert.doesNotMatch(ambiguousDollarCAC, /USD/);

  const ltv = createBusinessCalculationAnswer(
    'Calculate customer lifetime value: average order value EUR 100, purchases per period 2, gross margin 60%, customer lifetime periods 12.',
  );
  assert.match(ltv, /Estimated gross-profit customer lifetime value: €1,440\.00/);

  const roi = createBusinessCalculationAnswer(
    'Calculate ROI: total return R1200, initial investment R1000.',
  );
  assert.match(roi, /Return on investment \(ROI\): 20%/);

  const repayment = createBusinessCalculationAnswer(
    'Calculate monthly loan repayment: loan principal R1200, annual interest rate 12%, term months 12.',
  );
  assert.match(repayment, /Estimated monthly payment: ZAR\s+106\.62/);

  const scenario = createBusinessCalculationAnswer(
    'Calculate this business scenario net profit: units sold 100, price per unit R20, variable cost per unit R8, operating costs R600.',
  );
  assert.match(scenario, /Revenue: ZAR\s+2,000\.00/);
  assert.match(scenario, /Contribution before operating costs: ZAR\s+1,200\.00/);
  assert.match(scenario, /Net profit before taxes, financing, and other unstated costs: ZAR\s+600\.00/);
});

test('declines deterministic financial output when required inputs are absent or ambiguous', () => {
  assert.equal(
    createBusinessCalculationAnswer('Calculate CAC: marketing spend R6000.'),
    null,
  );
  assert.equal(
    createBusinessCalculationAnswer('Calculate ROI: total return R1200, investment R1000, plus fees R100.'),
    null,
  );
  assert.equal(
    createBusinessCalculationAnswer('Calculate loan repayment: principal R1200, annual rate 12%, term 12 months.'),
    null,
  );
  assert.equal(
    createBusinessCalculationAnswer('Calculate ROI: total return R1200, initial investment USD1000.'),
    null,
  );
});

test('business-plan guidance preserves evidence and reconciles assumptions across sections', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Create a business plan and investor proposal for a South African online store with a tight budget.',
  );
  assert.match(guidance, /customer, operating, staffing, pricing, and financial assumptions consistent across sections/i);
  assert.match(guidance, /lowest-cost immediate action/i);
  assert.match(guidance, /organic or lower-cost alternative/i);
  assert.match(guidance, /research-backed findings, estimates, assumptions, and recommendations/i);
  assert.match(guidance, /Never invent statistics/i);
  assert.match(guidance, /do not convert currencies without a rate and date/i);
});

test('business guidance requires evidence, complete costs and a candid correction', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Should my South African business register with CIPC, and can you show profit from revenue and expenses?',
  );
  assert.match(guidance, /Distinguish information supplied.*verified information.*estimates.*assumptions/i);
  assert.match(guidance, /Never invent statistics.*case studies.*legal requirements/i);
  assert.match(guidance, /Do not automatically agree.*correct it directly/i);
  assert.match(guidance, /Keep revenue distinct from profit/);
  assert.match(guidance, /Never treat missing costs as zero/);
  assert.match(guidance, /Treat CIPC, SARS.*verified from the responsible official source/i);
  assert.match(guidance, /do not claim that a sole proprietor must register a company with CIPC/i);
});

test('South African registration answers are instructed not to invent CIPC obligations', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Does my sole proprietor business need CIPC registration in South Africa?',
  );
  assert.match(guidance, /Treat CIPC, SARS.*verified from the responsible official source/i);
  assert.match(guidance, /do not claim that a sole proprietor must register a company with CIPC/i);
});

test('unsupported business case studies and statistics must be identified, not invented', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Give me a case study and customer growth statistics for a small business.',
  );
  assert.match(guidance, /Never invent statistics, customer counts, prices, case studies/i);
  assert.match(guidance, /If evidence is unavailable or inconclusive, say what is uncertain/i);
});

test('factual claims distinguish checked evidence from model knowledge and avoid fake citations', () => {
  const guidance = buildWorkspaceQualityInstruction('What facts can you verify about this company?');
  assert.match(guidance, /verified information, general knowledge, estimates, assumptions/i);
  assert.match(guidance, /only when you actually checked a trustworthy source/i);
  assert.match(guidance, /Never imply that you searched, checked, confirmed, or consulted a source/i);
  assert.match(guidance, /Never invent.*citations, sources/i);
  assert.match(guidance, /Do not invent numerical confidence scores/i);
});

test('high-risk claims require current authoritative verification or explicit uncertainty', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'What are the current legal requirements, tax thresholds, and payment processing fees?',
  );
  assert.match(guidance, /Apply stricter verification to current or high-impact claims/i);
  assert.match(guidance, /responsible official institution/i);
  assert.match(guidance, /update\/publication date/i);
  assert.match(guidance, /Cite or link only sources actually consulted/i);
  assert.match(guidance, /If no suitable source is available, clearly say current details are unverified/i);
});

test('South African institution and funding claims require official-source checking', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Check NYDA grant eligibility, SEDA and SEFA funding, and the relevant municipality programme in South Africa.',
  );
  assert.match(guidance, /CIPC, SARS, NYDA, SEDA, SEFA or any successor/i);
  assert.match(guidance, /responsible official source/i);
  assert.match(guidance, /Never invent a grant, successor agency.*eligibility rule/i);
});

test('classifies all major business disciplines for task-specific guidance', () => {
  const cases = [
    ['validation', 'Validate demand for my business idea and test the MVP assumptions.'],
    ['planning', 'Build a business plan and revenue model.'],
    ['financials', 'Forecast cash flow, ROI, CAC, LTV and break-even.'],
    ['sales', 'Write an outreach script and improve sales conversion.'],
    ['marketing', 'Plan an organic social media campaign and content calendar.'],
    ['operations', 'Create an inventory SOP and supplier procurement process.'],
    ['people', 'Write a job description and onboarding plan for staff.'],
    ['compliance', 'Check local tax, licensing and data privacy compliance.'],
    ['funding', 'Prepare a funding application and investor pitch deck.'],
    ['market', 'Compare competitors and identify market gaps.'],
    ['technology', 'Choose CRM and workflow automation software.'],
    ['growth', 'Plan scaling into a new market and expanding product lines.'],
  ];

  for (const [domain, prompt] of cases) {
    assert.ok(classifyBusinessDomains(prompt).includes(domain), `${domain}: ${prompt}`);
  }
});

test('adapts business guidance to industry, stage, budget, execution, and uncertainty', () => {
  const guidance = buildWorkspaceBusinessInstruction(
    'I am launching a delivery business. I have R500, need to validate demand and find first customers. Make a low-cost plan.',
  );
  assert.match(guidance, /Business response focus: validation, sales/);
  assert.match(guidance, /delivery or logistics/i);
  assert.match(guidance, /launch/i);
  assert.match(guidance, /lowest-cost immediate action/i);
  assert.match(guidance, /what requires money.*external approval/i);
  assert.match(guidance, /Do not assume missing details/i);
  assert.match(guidance, /Distinguish a promising idea from validated demand/i);
  assert.match(guidance, /measurable indicator/i);
  assert.doesNotMatch(buildWorkspaceBusinessInstruction('Explain photosynthesis.'), /Business response focus/);
});

test('tailors practical operating guidance to distinct business models', () => {
  const cases = [
    ['manufacturing', 'Plan a manufacturing business production and quality control workflow.'],
    ['e-commerce', 'Create an e-commerce business order and fulfilment plan.'],
    ['software', 'Help my software startup improve user retention.'],
    ['consulting', 'Build a consulting business client delivery model.'],
    ['restaurant', 'Create a restaurant business stock and staff scheduling process.'],
  ];
  for (const [industry, prompt] of cases) {
    assert.match(buildWorkspaceBusinessInstruction(prompt), new RegExp(industry, 'i'));
  }
});

test('fact-verification regression prompts cover requested risky claim categories', async (t) => {
  const prompts = [
    ['sole proprietor vs CIPC company registration', 'Does a sole proprietor need to register a company with CIPC?'],
    ['South African tax obligations', 'What are my current SARS and VAT obligations in South Africa?'],
    ['NYDA grant eligibility', 'Am I eligible for an NYDA grant and what documents are required?'],
    ['government funding verification', 'What current government funding programmes can my startup apply for?'],
    ['payment gateway fees', 'What are the current payment gateway processing fees?'],
    ['delivery pricing and profit', 'A customer pays R30 for a delivery. The driver receives R15 and fuel costs R7.50. What is profit?'],
    ['unsupported market statistics', 'Give me verified market statistics and customer growth figures for this business.'],
    ['outdated legal information', 'Are these current labour-law requirements still valid?'],
    ['unsupported business examples', 'Give me a real business case study proving this strategy works.'],
    ['missing sources', 'Cite the official source for these current grant requirements.'],
  ];

  for (const [name, prompt] of prompts) {
    await t.test(name, () => {
      const guidance = buildWorkspaceQualityInstruction(prompt);
      assert.match(guidance, /verified information, general knowledge, estimates, assumptions/i);
      assert.match(guidance, /Never invent statistics.*citations, sources/i);
      if (/\b(?:current|grant|grant requirements|tax|VAT|law|legal|fee|eligib|CIPC|NYDA|funding)\b/i.test(prompt)) {
        assert.match(guidance, /Apply stricter verification/i);
      }
    });
  }
});

test('self-correction, conflicting assumptions and multi-step instructions are explicit quality checks', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'My plan says revenue is R1,000 but costs are R1,200. Check the calculation and give me three steps.',
  );
  assert.match(guidance, /checked internal consistency and arithmetic/i);
  assert.match(guidance, /Point out weak assumptions, missing information and contradictions/i);
  assert.match(guidance, /acknowledge and correct it directly/i);
  assert.match(guidance, /followed its instructions/i);
});

test('general answer quality guidance stays concise and does not add business-only assumptions', () => {
  const guidance = buildWorkspaceQualityInstruction('How do I keep my notes organised?');
  assert.match(guidance, /answered the actual request/i);
  assert.match(guidance, /Do not reveal private chain-of-thought/i);
  assert.doesNotMatch(guidance, /sole proprietors|profit margin/i);
});
