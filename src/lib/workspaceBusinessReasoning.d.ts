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
export function createDeliveryProfitAnswer(prompt: string): string | null;
export function buildWorkspaceQualityInstruction(prompt?: string): string;
