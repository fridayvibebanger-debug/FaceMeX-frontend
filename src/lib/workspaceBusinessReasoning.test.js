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
  assert.match(guidance, /Distinguish information supplied.*verified facts.*estimates.*assumptions/i);
  assert.match(guidance, /Never invent statistics.*case studies.*legal requirements/i);
  assert.match(guidance, /Do not automatically agree.*correct it directly/i);
  assert.match(guidance, /Keep revenue distinct from profit/);
  assert.match(guidance, /Never treat missing costs as zero/);
  assert.match(guidance, /current CIPC, SARS.*trustworthy source/i);
  assert.match(guidance, /sole proprietors must register a company with CIPC/i);
});

test('South African registration answers are instructed not to invent CIPC obligations', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Does my sole proprietor business need CIPC registration in South Africa?',
  );
  assert.match(guidance, /Do not state current CIPC, SARS.*trustworthy source/i);
  assert.match(guidance, /Do not claim that sole proprietors must register a company with CIPC/i);
});

test('unsupported business case studies and statistics must be identified, not invented', () => {
  const guidance = buildWorkspaceQualityInstruction(
    'Give me a case study and customer growth statistics for a small business.',
  );
  assert.match(guidance, /Never invent statistics, customer counts, prices, case studies/i);
  assert.match(guidance, /cannot be verified.*say so/i);
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
