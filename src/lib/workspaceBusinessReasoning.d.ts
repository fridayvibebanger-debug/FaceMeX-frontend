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
export type BusinessExpenseCategory =
  | 'costOfSales'
  | 'variableOperating'
  | 'fixedOperating'
  | 'salary'
  | 'contractor'
  | 'commission'
  | 'otherNonOperating';
export type BusinessExpenseItem = {
  id: string;
  category: BusinessExpenseCategory;
  amount: number;
};
export type BusinessTaxAssumption =
  | { amount: number }
  | { ratePercent: number; taxableProfitBase: number };
export type BusinessFinancialInput = {
  accountingRevenue: number;
  expenseItems: BusinessExpenseItem[];
  customerPayments?: number;
  collectedForOthers?: number;
  tax?: BusinessTaxAssumption;
};
export type BusinessFinancialMetrics = {
  accountingRevenue: number;
  customerPayments: number | null;
  collectedForOthers: number | null;
  cashCollectionDifference: number | null;
  costOfSalesTotal: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  variableOperatingCostTotal: number;
  commissionCostTotal: number;
  contributionMargin: number;
  contributionMarginPercent: number | null;
  fixedOperatingCostTotal: number;
  salaryCostTotal: number;
  contractorPaymentTotal: number;
  operatingExpenseTotal: number;
  operatingProfit: number;
  otherNonOperatingCostTotal: number;
  profitBeforeTax: number;
  taxEstimate: number | null;
  taxAssumption: string | null;
  netProfit: number | null;
  netMarginPercent: number | null;
  working: {
    grossProfit: string;
    contributionMargin: string;
    operatingProfit: string;
    profitBeforeTax: string;
    netProfit: string | null;
  };
  completenessNote: string;
  accountingNote: string;
};
export function calculateBusinessFinancials(input: BusinessFinancialInput): BusinessFinancialMetrics;
export function calculateCommission(
  pricePerSale: number,
  commissionRatePercent: number,
  fixedCommissionPerSale?: number,
): {
  percentageCommission: number;
  fixedCommissionPerSale: number;
  totalCommission: number;
  proceedsAfterCommission: number;
};
export function calculateUnitContribution(input: {
  pricePerUnit: number;
  costOfSalesPerUnit: number;
  variableOperatingCostPerUnit: number;
  commissionRatePercent?: number;
  fixedCommissionPerUnit?: number;
}): {
  pricePerUnit: number;
  costOfSalesPerUnit: number;
  variableOperatingCostPerUnit: number;
  commissionCostPerUnit: number;
  contribution: number;
  contributionMarginPercent: number | null;
};
export function calculateBreakEvenAnalysis(input: {
  fixedCosts: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  commissionRatePercent?: number;
  fixedCommissionPerUnit?: number;
}): {
  fixedCosts: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  commissionCostPerUnit: number;
  contributionPerUnit: number;
  exactUnits: number;
  breakEvenUnits: number;
  working: string;
};
export function calculateSimpleInterest(principal: number, annualRatePercent: number, years: number): number;
export function calculateCompoundInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  compoundsPerYear?: number,
): number;
export function calculatePercentage(amount: number, ratePercent: number): number;
export function calculateBreakEvenUnits(
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
  commissionRatePercent?: number,
  fixedCommissionPerUnit?: number,
): number;
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
