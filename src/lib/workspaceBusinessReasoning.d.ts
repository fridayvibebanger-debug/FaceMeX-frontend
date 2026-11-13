export type BusinessProfitMetrics = {
  revenue: number;
  directCostTotal: number;
  grossProfit: number;
  operatingCostTotal: number | null;
  netProfit: number | null;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
  missingOperatingCosts: boolean;
};

export function calculateRevenue(pricePerUnit: number, unitsSold: number): number;
export function calculateBusinessProfit(input: {
  revenue: number;
  directCosts: number[];
  operatingCosts?: number[];
}): BusinessProfitMetrics;
export function calculateSimpleInterest(principal: number, annualRatePercent: number, years: number): number;
export function calculateCompoundInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  compoundsPerYear?: number,
): number;
export function calculatePercentage(amount: number, ratePercent: number): number;
export function calculateBreakEvenUnits(fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number): number;
export type BusinessScenarioInput = {
  unitsSold: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  operatingCosts?: number[];
};
export type BusinessScenarioMetrics = {
  revenue: number;
  variableCostTotal: number;
  contribution: number;
  operatingCostTotal: number | null;
  netProfit: number | null;
  netMarginPercent: number | null;
  missingOperatingCosts: boolean;
};
export function calculateBusinessScenario(input: BusinessScenarioInput): BusinessScenarioMetrics;
export function calculateCashFlow(input: {
  openingBalance: number;
  inflows: number[];
  outflows: number[];
}): {
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
};
export function calculateCustomerAcquisitionCost(marketingSpend: number, customersAcquired: number): number | null;
export function calculateCustomerLifetimeValue(input: {
  averageOrderValue: number;
  purchasesPerPeriod: number;
  grossMarginPercent: number;
  customerLifetimePeriods: number;
}): number;
export function calculateReturnOnInvestment(totalReturn: number, investment: number): number | null;
export function calculateLoanPayment(
  principal: number,
  annualRatePercent: number,
  termPayments: number,
  paymentsPerYear?: number,
): number;
export function formatBusinessCurrency(amount: number, currency?: string, locale?: string): string;
export function classifyBusinessDomains(prompt?: string): string[];
export function buildWorkspaceBusinessInstruction(prompt?: string): string;
export function createBusinessCalculationAnswer(prompt: string): string | null;
export function createDeliveryProfitAnswer(prompt: string): string | null;
export function buildWorkspaceQualityInstruction(prompt?: string): string;
