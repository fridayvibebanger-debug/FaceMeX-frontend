import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWorkspaceQualityInstruction,
  calculateBreakEvenUnits,
  calculateBusinessProfit,
  calculateCompoundInterest,
  calculatePercentage,
  calculateRevenue,
  calculateSimpleInterest,
  createDeliveryProfitAnswer,
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
