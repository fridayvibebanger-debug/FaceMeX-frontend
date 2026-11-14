const MONEY_PATTERN = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?';

function requireFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}

function requireFinite(value, name) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
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

export function calculateBusinessFinancials({
  accountingRevenue,
  expenseItems,
  customerPayments,
  collectedForOthers,
  tax,
}) {
  requireFiniteNonNegative(accountingRevenue, 'Accounting revenue');
  if (!Array.isArray(expenseItems)) throw new TypeError('Expense items must be provided as an array.');
  const costCategories = [
    'costOfSales',
    'variableOperating',
    'fixedOperating',
    'salary',
    'contractor',
    'commission',
    'otherNonOperating',
  ];
  const expenseTotals = Object.fromEntries(costCategories.map((category) => [category, 0]));
  const expenseIds = new Set();
  expenseItems.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError('Each expense item must include a unique id, category, and amount.');
    }
    if (typeof item.id !== 'string' || !item.id.trim()) {
      throw new TypeError('Each expense item must have a non-empty unique id.');
    }
    const expenseId = item.id.trim();
    if (expenseIds.has(expenseId)) throw new RangeError(`Duplicate expense id: ${expenseId}.`);
    expenseIds.add(expenseId);
    if (!Object.prototype.hasOwnProperty.call(expenseTotals, item.category)) {
      throw new RangeError(`Unsupported expense category: ${item.category}.`);
    }
    requireFiniteNonNegative(item.amount, `Expense ${item.id}`);
    expenseTotals[item.category] = roundToCents(expenseTotals[item.category] + item.amount);
  });

  const costOfSalesTotal = expenseTotals.costOfSales;
  const variableOperatingCostTotal = expenseTotals.variableOperating;
  const fixedOperatingCostTotal = expenseTotals.fixedOperating;
  const salaryCostTotal = expenseTotals.salary;
  const contractorPaymentTotal = expenseTotals.contractor;
  const commissionCostTotal = expenseTotals.commission;
  const otherNonOperatingCostTotal = expenseTotals.otherNonOperating;

  if (customerPayments !== undefined) requireFiniteNonNegative(customerPayments, 'Customer payments');
  if (collectedForOthers !== undefined) requireFiniteNonNegative(collectedForOthers, 'Collections for others');
  if (
    customerPayments !== undefined &&
    collectedForOthers !== undefined &&
    collectedForOthers > customerPayments
  ) {
    throw new RangeError('Collections for others cannot exceed customer payments for the same period.');
  }

  const grossProfit = roundToCents(accountingRevenue - costOfSalesTotal);
  const contributionMargin = roundToCents(
    grossProfit - variableOperatingCostTotal - commissionCostTotal,
  );
  const operatingExpenseTotal = roundToCents(
    variableOperatingCostTotal +
    commissionCostTotal +
    fixedOperatingCostTotal +
    salaryCostTotal +
    contractorPaymentTotal,
  );
  const operatingProfit = roundToCents(grossProfit - operatingExpenseTotal);
  const profitBeforeTax = roundToCents(operatingProfit - otherNonOperatingCostTotal);

  let taxEstimate = null;
  let taxAssumption = null;
  if (tax !== undefined) {
    if (!tax || typeof tax !== 'object' || Array.isArray(tax)) {
      throw new TypeError('Tax must be an explicit amount or a rate with an explicit taxable-profit base.');
    }
    if (Object.prototype.hasOwnProperty.call(tax, 'amount')) {
      if (Object.keys(tax).length !== 1) {
        throw new TypeError('Provide either a tax amount or a rate and taxable-profit base, not both.');
      }
      requireFiniteNonNegative(tax.amount, 'Tax amount');
      taxEstimate = roundToCents(tax.amount);
      taxAssumption = 'User-supplied tax amount; not a calculation of legal tax liability.';
    } else if (
      Object.prototype.hasOwnProperty.call(tax, 'ratePercent') &&
      Object.prototype.hasOwnProperty.call(tax, 'taxableProfitBase')
    ) {
      if (Object.keys(tax).length !== 2) {
        throw new TypeError('Provide only a tax rate and explicit taxable-profit base.');
      }
      requireFiniteNonNegative(tax.ratePercent, 'Tax rate');
      requireFiniteNonNegative(tax.taxableProfitBase, 'Taxable-profit base');
      taxEstimate = calculatePercentage(tax.taxableProfitBase, tax.ratePercent);
      taxAssumption = `Illustrative estimate using the supplied ${tax.ratePercent}% rate on the supplied ${tax.taxableProfitBase} taxable-profit base; not legal or tax advice.`;
    } else {
      throw new TypeError('Tax requires an explicit amount or both ratePercent and taxableProfitBase.');
    }
  }

  const netProfit = taxEstimate === null ? null : roundToCents(profitBeforeTax - taxEstimate);
  const cashCollectionDifference = customerPayments === undefined
    ? null
    : roundToCents(customerPayments - accountingRevenue);

  return {
    accountingRevenue: roundToCents(accountingRevenue),
    customerPayments: customerPayments === undefined ? null : roundToCents(customerPayments),
    collectedForOthers: collectedForOthers === undefined ? null : roundToCents(collectedForOthers),
    cashCollectionDifference,
    costOfSalesTotal,
    grossProfit,
    grossMarginPercent: accountingRevenue > 0
      ? roundToCents((grossProfit / accountingRevenue) * 100)
      : null,
    variableOperatingCostTotal,
    commissionCostTotal,
    contributionMargin,
    contributionMarginPercent: accountingRevenue > 0
      ? roundToCents((contributionMargin / accountingRevenue) * 100)
      : null,
    fixedOperatingCostTotal,
    salaryCostTotal,
    contractorPaymentTotal,
    operatingExpenseTotal,
    operatingProfit,
    otherNonOperatingCostTotal,
    profitBeforeTax,
    taxEstimate,
    taxAssumption,
    netProfit,
    netMarginPercent: accountingRevenue > 0 && netProfit !== null
      ? roundToCents((netProfit / accountingRevenue) * 100)
      : null,
    working: {
      grossProfit: `${accountingRevenue} - ${costOfSalesTotal} = ${grossProfit}`,
      contributionMargin: `${grossProfit} - ${variableOperatingCostTotal} - ${commissionCostTotal} = ${contributionMargin}`,
      operatingProfit: `${grossProfit} - ${operatingExpenseTotal} = ${operatingProfit}`,
      profitBeforeTax: `${operatingProfit} - ${otherNonOperatingCostTotal} = ${profitBeforeTax}`,
      netProfit: taxEstimate === null ? null : `${profitBeforeTax} - ${taxEstimate} = ${netProfit}`,
    },
    completenessNote: 'Calculated only from supplied expense items and tax assumptions. Include every relevant period cost, including financing and other non-operating costs, before treating the result as complete net profit.',
    accountingNote: collectedForOthers > 0
      ? 'Customer payments and collections for another party are shown separately from accounting revenue. Principal-versus-agent treatment depends on the contract and applicable accounting standards; confirm classification with an accountant.'
      : 'Customer payments are cash collections, not automatically accounting revenue; timing and principal-versus-agent treatment may differ.',
  };
}

export function calculateCommission(pricePerSale, commissionRatePercent, fixedCommissionPerSale = 0) {
  requireFiniteNonNegative(pricePerSale, 'Price per sale');
  requireFiniteNonNegative(commissionRatePercent, 'Commission rate');
  requireFiniteNonNegative(fixedCommissionPerSale, 'Fixed commission per sale');
  const percentageCommission = roundToCents(pricePerSale * commissionRatePercent / 100);
  const totalCommission = roundToCents(percentageCommission + fixedCommissionPerSale);
  return {
    percentageCommission,
    fixedCommissionPerSale: roundToCents(fixedCommissionPerSale),
    totalCommission,
    proceedsAfterCommission: roundToCents(pricePerSale - totalCommission),
  };
}

export function calculateUnitContribution({
  pricePerUnit,
  costOfSalesPerUnit,
  variableOperatingCostPerUnit,
  commissionRatePercent = 0,
  fixedCommissionPerUnit = 0,
}) {
  requireFiniteNonNegative(pricePerUnit, 'Price per unit');
  requireFiniteNonNegative(costOfSalesPerUnit, 'Cost of sales per unit');
  requireFiniteNonNegative(variableOperatingCostPerUnit, 'Variable operating cost per unit');
  const commission = calculateCommission(pricePerUnit, commissionRatePercent, fixedCommissionPerUnit);
  const contribution = roundToCents(
    pricePerUnit -
    costOfSalesPerUnit -
    variableOperatingCostPerUnit -
    commission.totalCommission,
  );
  return {
    pricePerUnit: roundToCents(pricePerUnit),
    costOfSalesPerUnit: roundToCents(costOfSalesPerUnit),
    variableOperatingCostPerUnit: roundToCents(variableOperatingCostPerUnit),
    commissionCostPerUnit: commission.totalCommission,
    contribution,
    contributionMarginPercent: pricePerUnit > 0
      ? roundToCents((contribution / pricePerUnit) * 100)
      : null,
  };
}

export function calculateBreakEvenAnalysis({
  fixedCosts,
  pricePerUnit,
  variableCostPerUnit,
  commissionRatePercent = 0,
  fixedCommissionPerUnit = 0,
}) {
  requireFiniteNonNegative(fixedCosts, 'Fixed costs');
  requireFiniteNonNegative(variableCostPerUnit, 'Variable cost per unit');
  const commission = calculateCommission(pricePerUnit, commissionRatePercent, fixedCommissionPerUnit);
  const unitContribution = roundToCents(
    pricePerUnit - variableCostPerUnit - commission.totalCommission,
  );
  if (unitContribution <= 0) {
    throw new RangeError('Price per unit must exceed variable costs and commissions to calculate break-even.');
  }
  const exactUnits = fixedCosts / unitContribution;
  return {
    fixedCosts: roundToCents(fixedCosts),
    pricePerUnit: roundToCents(pricePerUnit),
    variableCostPerUnit: roundToCents(variableCostPerUnit),
    commissionCostPerUnit: commission.totalCommission,
    contributionPerUnit: unitContribution,
    exactUnits,
    breakEvenUnits: Math.ceil(exactUnits),
    working: `${roundToCents(pricePerUnit)} - ${roundToCents(variableCostPerUnit)} - ${commission.totalCommission} commission = ${unitContribution} contribution per unit; ${roundToCents(fixedCosts)} fixed costs ÷ ${unitContribution} = ${exactUnits} units, rounded up to ${Math.ceil(exactUnits)}.`,
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

export function calculateBreakEvenUnits(
  fixedCosts,
  pricePerUnit,
  variableCostPerUnit,
  commissionRatePercent = 0,
  fixedCommissionPerUnit = 0,
) {
  return calculateBreakEvenAnalysis({
    fixedCosts,
    pricePerUnit,
    variableCostPerUnit,
    commissionRatePercent,
    fixedCommissionPerUnit,
  }).breakEvenUnits;
}

export function calculateBusinessScenario({
  unitsSold,
  pricePerUnit,
  variableCostPerUnit,
  operatingCosts,
}) {
  requireFiniteNonNegative(unitsSold, 'Units sold');
  requireFiniteNonNegative(pricePerUnit, 'Price per unit');
  requireFiniteNonNegative(variableCostPerUnit, 'Variable cost per unit');
  if (operatingCosts !== undefined) {
    if (!Array.isArray(operatingCosts)) throw new TypeError('Operating costs must be provided as an array.');
    operatingCosts.forEach((cost) => requireFiniteNonNegative(cost, 'Operating cost'));
  }

  const revenue = calculateRevenue(pricePerUnit, unitsSold);
  const variableCostTotal = roundToCents(variableCostPerUnit * unitsSold);
  const contribution = roundToCents(revenue - variableCostTotal);
  const operatingCostTotal = operatingCosts === undefined
    ? null
    : roundToCents(operatingCosts.reduce((total, cost) => total + cost, 0));
  const netProfit = operatingCostTotal === null
    ? null
    : roundToCents(contribution - operatingCostTotal);

  return {
    revenue,
    variableCostTotal,
    contribution,
    operatingCostTotal,
    netProfit,
    netMarginPercent: revenue > 0 && netProfit !== null
      ? roundToCents((netProfit / revenue) * 100)
      : null,
    missingOperatingCosts: operatingCostTotal === null,
  };
}

export function calculateCashFlow({ openingBalance, inflows, outflows }) {
  requireFinite(openingBalance, 'Opening balance');
  if (!Array.isArray(inflows) || !Array.isArray(outflows)) {
    throw new TypeError('Cash inflows and outflows must be provided as arrays.');
  }
  inflows.forEach((amount) => requireFiniteNonNegative(amount, 'Cash inflow'));
  outflows.forEach((amount) => requireFiniteNonNegative(amount, 'Cash outflow'));

  const totalInflows = roundToCents(inflows.reduce((total, amount) => total + amount, 0));
  const totalOutflows = roundToCents(outflows.reduce((total, amount) => total + amount, 0));
  const netCashFlow = roundToCents(totalInflows - totalOutflows);

  return {
    openingBalance: roundToCents(openingBalance),
    totalInflows,
    totalOutflows,
    netCashFlow,
    closingBalance: roundToCents(openingBalance + netCashFlow),
  };
}

export function calculateCustomerAcquisitionCost(marketingSpend, customersAcquired) {
  requireFiniteNonNegative(marketingSpend, 'Marketing spend');
  requireFiniteNonNegative(customersAcquired, 'Customers acquired');
  if (!Number.isInteger(customersAcquired)) {
    throw new RangeError('Customers acquired must be a whole number.');
  }
  return customersAcquired === 0 ? null : roundToCents(marketingSpend / customersAcquired);
}

export function calculateCustomerLifetimeValue({
  averageOrderValue,
  purchasesPerPeriod,
  grossMarginPercent,
  customerLifetimePeriods,
}) {
  requireFiniteNonNegative(averageOrderValue, 'Average order value');
  requireFiniteNonNegative(purchasesPerPeriod, 'Purchases per period');
  requireFiniteNonNegative(grossMarginPercent, 'Gross margin');
  if (grossMarginPercent > 100) throw new RangeError('Gross margin must not exceed 100 percent.');
  requireFiniteNonNegative(customerLifetimePeriods, 'Customer lifetime');
  return roundToCents(
    averageOrderValue *
    purchasesPerPeriod *
    (grossMarginPercent / 100) *
    customerLifetimePeriods,
  );
}

export function calculateReturnOnInvestment(totalReturn, investment) {
  requireFiniteNonNegative(totalReturn, 'Total return');
  requireFiniteNonNegative(investment, 'Investment');
  return investment === 0
    ? null
    : roundToCents(((totalReturn - investment) / investment) * 100);
}

export function calculateLoanPayment(principal, annualRatePercent, termPayments, paymentsPerYear = 12) {
  requireFiniteNonNegative(principal, 'Principal');
  requireFiniteNonNegative(annualRatePercent, 'Annual rate');
  if (!Number.isInteger(termPayments) || termPayments <= 0) {
    throw new RangeError('Loan term must be a positive whole number of payments.');
  }
  if (!Number.isInteger(paymentsPerYear) || paymentsPerYear <= 0) {
    throw new RangeError('Payments per year must be a positive integer.');
  }

  const periodicRate = annualRatePercent / 100 / paymentsPerYear;
  if (periodicRate === 0) return roundToCents(principal / termPayments);

  const growth = (1 + periodicRate) ** termPayments;
  return roundToCents((principal * periodicRate * growth) / (growth - 1));
}

export function formatBusinessCurrency(amount, currency = 'ZAR', locale = 'en-US') {
  requireFinite(amount, 'Amount');
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError('Currency must be a three-letter ISO 4217 code.');
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function extractLabeledAmount(text, labelPattern) {
  const match = text.match(new RegExp(
    `(?:${labelPattern})\\s*(?::|=|is|of)?\\s*(?:(\\b(?:ZAR|USD|EUR|GBP|CAD|AUD|NZD|JPY|CHF|INR|NGN|KES|BWP)\\b)\\s*|([R$€])\\s*)?(${MONEY_PATTERN})\\s*(%?)`,
    'i',
  ));
  if (!match) return null;

  const currencyMarker = (match[1] || match[2] || '').toUpperCase();
  const currency = currencyMarker === 'R' ? 'ZAR'
    : currencyMarker === '€' ? 'EUR'
      : match[1] ? currencyMarker
        : null;

  return {
    value: Number(match[3].replace(/,/g, '')),
    currency,
    currencySymbol: currencyMarker === '$' ? '$' : null,
    isPercent: Boolean(match[4]),
  };
}

function getPromptNumbers(text) {
  return text.match(/(?:(?:ZAR|USD|EUR)\s*|[R$€]\s*)?\d[\d,]*(?:\.\d+)?%?/gi) || [];
}

function formatCalculatedAmount(amount, currency, currencySymbol) {
  const formatted = currency
    ? formatBusinessCurrency(amount, currency)
    : new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundToCents(amount));
  return currencySymbol ? `${currencySymbol}${formatted}` : formatted;
}

function getConsistentCurrency(values) {
  const currencies = new Set(values.map((value) => value.currency || value.currencySymbol).filter(Boolean));
  return currencies.size > 1
    ? { valid: false, currency: null, currencySymbol: null }
    : {
      valid: true,
      currency: values.find((value) => value.currency)?.currency || null,
      currencySymbol: values.find((value) => value.currencySymbol)?.currencySymbol || null,
    };
}

function hasDirectCalculationIntent(text, metricPattern) {
  return /\b(?:calculate|work out|what is|find|how much)\b/i.test(text) &&
    metricPattern.test(text);
}

export function createBusinessCalculationAnswer(prompt) {
  const text = String(prompt || '');
  const deliveryAnswer = createDeliveryProfitAnswer(text);
  if (deliveryAnswer) return deliveryAnswer;

  const cashFlowRequest = /\b(?:cash flow|cash position)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:cash flow|cash position)\b/i);
  if (cashFlowRequest) {
    const openingBalance = extractLabeledAmount(text, 'opening balance|opening cash');
    const inflows = extractLabeledAmount(text, 'total (?:cash )?inflows|inflows');
    const outflows = extractLabeledAmount(text, 'total (?:cash )?outflows|outflows');
    if (!openingBalance || !inflows || !outflows || getPromptNumbers(text).length !== 3) return null;
    const currencyContext = getConsistentCurrency([openingBalance, inflows, outflows]);
    if (!currencyContext.valid) return null;
    const result = calculateCashFlow({
      openingBalance: openingBalance.value,
      inflows: [inflows.value],
      outflows: [outflows.value],
    });
    const { currency, currencySymbol } = currencyContext;
    return [
      `Opening balance: ${formatCalculatedAmount(result.openingBalance, currency, currencySymbol)}`,
      `Total inflows: ${formatCalculatedAmount(result.totalInflows, currency, currencySymbol)}`,
      `Total outflows: ${formatCalculatedAmount(result.totalOutflows, currency, currencySymbol)}`,
      `Net cash flow: ${formatCalculatedAmount(result.netCashFlow, currency, currencySymbol)}`,
      `Closing balance: ${formatCalculatedAmount(result.closingBalance, currency, currencySymbol)}`,
      `Working: ${formatCalculatedAmount(result.totalInflows, currency, currencySymbol)} - ${formatCalculatedAmount(result.totalOutflows, currency, currencySymbol)} = ${formatCalculatedAmount(result.netCashFlow, currency, currencySymbol)} net cash flow; ${formatCalculatedAmount(result.openingBalance, currency, currencySymbol)} + ${formatCalculatedAmount(result.netCashFlow, currency, currencySymbol)} = ${formatCalculatedAmount(result.closingBalance, currency, currencySymbol)} closing balance.`,
      'Cash flow is not the same as accounting profit.',
    ].join('\n');
  }

  const acquisitionRequest = /\b(?:cac|customer acquisition cost)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:cac|customer acquisition cost)\b/i);
  if (acquisitionRequest) {
    const spend = extractLabeledAmount(text, 'marketing spend|acquisition spend');
    const customers = extractLabeledAmount(text, 'customers acquired|new customers|acquired customers');
    if (!spend || !customers || getPromptNumbers(text).length !== 2 || !Number.isInteger(customers.value)) return null;
    const result = calculateCustomerAcquisitionCost(spend.value, customers.value);
    if (result === null) return null;
    const { currency, currencySymbol } = getConsistentCurrency([spend]);
    return [
      `Customer acquisition cost (CAC): ${formatCalculatedAmount(result, currency, currencySymbol)} per customer`,
      `Calculation: ${formatCalculatedAmount(spend.value, currency, currencySymbol)} ÷ ${customers.value} acquired customers.`,
      'This uses only the stated marketing or acquisition spend; include other acquisition costs if they were excluded.',
    ].join('\n');
  }

  const lifetimeValueRequest = /\b(?:ltv|customer lifetime value|lifetime value)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:ltv|customer lifetime value|lifetime value)\b/i);
  if (lifetimeValueRequest) {
    const averageOrderValue = extractLabeledAmount(text, 'average order value');
    const purchasesPerPeriod = extractLabeledAmount(text, 'purchases per period');
    const grossMargin = extractLabeledAmount(text, 'gross margin');
    const lifetimePeriods = extractLabeledAmount(text, 'customer lifetime periods|lifetime periods');
    if (
      !averageOrderValue ||
      !purchasesPerPeriod ||
      !grossMargin ||
      !lifetimePeriods ||
      !grossMargin.isPercent ||
      getPromptNumbers(text).length !== 4
    ) return null;
    const currencyContext = getConsistentCurrency([averageOrderValue]);
    if (!currencyContext.valid) return null;
    const result = calculateCustomerLifetimeValue({
      averageOrderValue: averageOrderValue.value,
      purchasesPerPeriod: purchasesPerPeriod.value,
      grossMarginPercent: grossMargin.value,
      customerLifetimePeriods: lifetimePeriods.value,
    });
    const { currency, currencySymbol } = currencyContext;
    return [
      `Estimated gross-profit customer lifetime value: ${formatCalculatedAmount(result, currency, currencySymbol)}`,
      `Calculation: ${formatCalculatedAmount(averageOrderValue.value, currency, currencySymbol)} average order value × ${purchasesPerPeriod.value} purchases per period × ${grossMargin.value}% gross margin × ${lifetimePeriods.value} periods.`,
      'This simple estimate assumes the stated purchase frequency and lifetime remain constant; it does not discount future cash flows or model churn.',
    ].join('\n');
  }

  const roiRequest = /\b(?:roi|return on investment)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:roi|return on investment)\b/i);
  if (roiRequest) {
    const totalReturn = extractLabeledAmount(text, 'total return|return received');
    const investment = extractLabeledAmount(text, 'initial investment|investment');
    if (!totalReturn || !investment || getPromptNumbers(text).length !== 2 || investment.value === 0) return null;
    const currencyContext = getConsistentCurrency([totalReturn, investment]);
    if (!currencyContext.valid) return null;
    const result = calculateReturnOnInvestment(totalReturn.value, investment.value);
    const { currency, currencySymbol } = currencyContext;
    return [
      `Return on investment (ROI): ${result}%`,
      `Calculation: (${formatCalculatedAmount(totalReturn.value, currency, currencySymbol)} total return − ${formatCalculatedAmount(investment.value, currency, currencySymbol)} investment) ÷ ${formatCalculatedAmount(investment.value, currency, currencySymbol)} × 100.`,
      'This uses only the stated total return and investment; it excludes any taxes, fees, or additional costs not included in those figures.',
    ].join('\n');
  }

  const loanRequest = /\b(?:loan payment|loan repayment|monthly repayment|debt repayment)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:loan payment|loan repayment|monthly repayment|debt repayment)\b/i);
  if (loanRequest) {
    const principal = extractLabeledAmount(text, 'loan principal|principal');
    const annualRate = extractLabeledAmount(text, 'annual interest rate|annual rate');
    const term = extractLabeledAmount(text, 'term payments|term months|number of monthly payments');
    if (
      !principal ||
      !annualRate ||
      !term ||
      !annualRate.isPercent ||
      getPromptNumbers(text).length !== 3 ||
      !Number.isInteger(term.value) ||
      term.value <= 0
    ) return null;
    const currencyContext = getConsistentCurrency([principal]);
    if (!currencyContext.valid) return null;
    const result = calculateLoanPayment(principal.value, annualRate.value, term.value);
    const { currency, currencySymbol } = currencyContext;
    return [
      `Estimated monthly payment: ${formatCalculatedAmount(result, currency, currencySymbol)}`,
      `Calculation uses a principal of ${formatCalculatedAmount(principal.value, currency, currencySymbol)}, ${annualRate.value}% annual rate, and ${term.value} monthly payments.`,
      'This assumes a fixed annual rate with monthly payments and excludes lender fees, insurance, taxes, and rate changes.',
    ].join('\n');
  }

  const breakEvenRequest = /\b(?:break[- ]even|break even point)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:break[- ]even|break even point)\b/i);
  if (breakEvenRequest) {
    const fixedCosts = extractLabeledAmount(text, 'fixed costs|fixed overheads');
    const pricePerUnit = extractLabeledAmount(text, 'price per unit|selling price per unit');
    const variableCostPerUnit = extractLabeledAmount(text, 'variable cost per unit');
    const commissionRate = extractLabeledAmount(text, 'commission rate|commission percentage');
    const fixedCommission = extractLabeledAmount(text, 'fixed commission per unit|fixed commission per sale');
    if (
      !fixedCosts ||
      !pricePerUnit ||
      !variableCostPerUnit ||
      fixedCosts.isPercent ||
      pricePerUnit.isPercent ||
      variableCostPerUnit.isPercent ||
      (commissionRate && !commissionRate.isPercent) ||
      fixedCommission?.isPercent ||
      getPromptNumbers(text).length !== 3 + Number(Boolean(commissionRate)) + Number(Boolean(fixedCommission))
    ) return null;
    const amounts = [fixedCosts, pricePerUnit, variableCostPerUnit, fixedCommission].filter(Boolean);
    const currencyContext = getConsistentCurrency(amounts);
    if (!currencyContext.valid) return null;
    const statedCommission = calculateCommission(
      pricePerUnit.value,
      commissionRate?.value || 0,
      fixedCommission?.value || 0,
    );
    if (pricePerUnit.value - variableCostPerUnit.value - statedCommission.totalCommission <= 0) return null;
    const analysis = calculateBreakEvenAnalysis({
      fixedCosts: fixedCosts.value,
      pricePerUnit: pricePerUnit.value,
      variableCostPerUnit: variableCostPerUnit.value,
      commissionRatePercent: commissionRate?.value || 0,
      fixedCommissionPerUnit: fixedCommission?.value || 0,
    });
    const { currency, currencySymbol } = currencyContext;
    const amount = (value) => formatCalculatedAmount(value, currency, currencySymbol);
    return [
      `Contribution per unit: ${amount(analysis.contributionPerUnit)}`,
      `Break-even point: ${analysis.breakEvenUnits} units`,
      `Working: ${amount(pricePerUnit.value)} price - ${amount(variableCostPerUnit.value)} variable cost - ${amount(analysis.commissionCostPerUnit)} commission = ${amount(analysis.contributionPerUnit)} contribution per unit; ${amount(fixedCosts.value)} fixed costs ÷ ${amount(analysis.contributionPerUnit)} = ${analysis.exactUnits} units, rounded up to ${analysis.breakEvenUnits}.`,
    ].join('\n');
  }

  const scenarioRequest = /\b(?:business scenario|scenario analysis|net profit|operating scenario)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:business scenario|scenario analysis|net profit|operating scenario)\b/i);
  if (scenarioRequest) {
    const unitsSold = extractLabeledAmount(text, 'units sold');
    const pricePerUnit = extractLabeledAmount(text, 'price per unit|selling price per unit');
    const variableCostPerUnit = extractLabeledAmount(text, 'variable cost per unit');
    const operatingCosts = extractLabeledAmount(text, 'operating costs|total operating costs');
    if (
      !unitsSold ||
      !pricePerUnit ||
      !variableCostPerUnit ||
      !operatingCosts ||
      getPromptNumbers(text).length !== 4
    ) return null;
    const currencyContext = getConsistentCurrency([pricePerUnit, variableCostPerUnit, operatingCosts]);
    if (!currencyContext.valid) return null;
    const result = calculateBusinessScenario({
      unitsSold: unitsSold.value,
      pricePerUnit: pricePerUnit.value,
      variableCostPerUnit: variableCostPerUnit.value,
      operatingCosts: [operatingCosts.value],
    });
    const { currency, currencySymbol } = currencyContext;
    return [
      `Revenue: ${formatCalculatedAmount(result.revenue, currency, currencySymbol)}`,
      `Variable costs: ${formatCalculatedAmount(result.variableCostTotal, currency, currencySymbol)}`,
      `Contribution before operating costs: ${formatCalculatedAmount(result.contribution, currency, currencySymbol)}`,
      `Stated operating costs: ${formatCalculatedAmount(result.operatingCostTotal, currency, currencySymbol)}`,
      `Net profit before taxes, financing, and other unstated costs: ${formatCalculatedAmount(result.netProfit, currency, currencySymbol)}`,
      `Net margin before taxes, financing, and other unstated costs: ${result.netMarginPercent === null ? 'not defined because revenue is zero' : `${result.netMarginPercent}%`}`,
      `Working: ${unitsSold.value} units × ${formatCalculatedAmount(pricePerUnit.value, currency, currencySymbol)} = ${formatCalculatedAmount(result.revenue, currency, currencySymbol)} revenue; ${unitsSold.value} × ${formatCalculatedAmount(variableCostPerUnit.value, currency, currencySymbol)} = ${formatCalculatedAmount(result.variableCostTotal, currency, currencySymbol)} variable costs; ${formatCalculatedAmount(result.revenue, currency, currencySymbol)} - ${formatCalculatedAmount(result.variableCostTotal, currency, currencySymbol)} = ${formatCalculatedAmount(result.contribution, currency, currencySymbol)} contribution; ${formatCalculatedAmount(result.contribution, currency, currencySymbol)} - ${formatCalculatedAmount(result.operatingCostTotal, currency, currencySymbol)} = ${formatCalculatedAmount(result.netProfit, currency, currencySymbol)} before unstated costs.`,
    ].join('\n');
  }

  const financialStatementRequest = /\b(?:financial statement|income statement|profit reconciliation)\b/i.test(text) &&
    hasDirectCalculationIntent(text, /\b(?:financial statement|income statement|profit reconciliation)\b/i);
  if (financialStatementRequest) {
    const fields = [
      ['accountingRevenue', 'accounting revenue|recognized revenue|revenue'],
      ['costOfSales', 'cost of sales'],
      ['variableOperating', 'variable operating costs?'],
      ['fixedOperating', 'fixed operating costs?|overheads?'],
      ['salary', 'salary costs?|payroll costs?'],
      ['contractor', 'contractor payments?|contractor costs?'],
      ['commission', 'commission costs?'],
      ['otherNonOperating', 'other non-operating costs?|financing costs?|interest costs?'],
    ];
    const values = fields.map(([, pattern]) => extractLabeledAmount(text, pattern));
    const customerPayments = extractLabeledAmount(text, 'customer payments|payments collected');
    const collectedForOthers = extractLabeledAmount(
      text,
      'collected for others|collections for others|amount collected on behalf of others',
    );
    const taxAmount = extractLabeledAmount(text, 'tax amount|tax paid');
    const taxRate = extractLabeledAmount(text, 'tax rate|assumed tax rate');
    const taxableProfitBase = extractLabeledAmount(text, 'taxable profit base|taxable income base');
    if (values.some((value) => !value || value.isPercent)) return null;
    if (
      [customerPayments, collectedForOthers].some((value) => value?.isPercent) ||
      taxAmount?.isPercent ||
      (taxRate && !taxRate.isPercent) ||
      (taxableProfitBase && taxableProfitBase.isPercent) ||
      (taxAmount && (taxRate || taxableProfitBase)) ||
      Boolean(taxRate) !== Boolean(taxableProfitBase)
    ) return null;

    const monetaryValues = [
      ...values,
      customerPayments,
      collectedForOthers,
      taxAmount,
      taxableProfitBase,
    ].filter(Boolean);
    if (getPromptNumbers(text).length !== monetaryValues.length + (taxRate ? 1 : 0)) return null;
    const currencyContext = getConsistentCurrency(monetaryValues);
    if (!currencyContext.valid) return null;
    if (
      customerPayments &&
      collectedForOthers &&
      collectedForOthers.value > customerPayments.value
    ) return null;

    const expenseItems = fields.slice(1).map(([category], index) => ({
      id: category,
      category,
      amount: values[index + 1].value,
    }));
    const tax = taxAmount
      ? { amount: taxAmount.value }
      : taxRate
        ? { ratePercent: taxRate.value, taxableProfitBase: taxableProfitBase.value }
        : undefined;
    const result = calculateBusinessFinancials({
      accountingRevenue: values[0].value,
      expenseItems,
      customerPayments: customerPayments?.value,
      collectedForOthers: collectedForOthers?.value,
      tax,
    });
    const { currency, currencySymbol } = currencyContext;
    const amount = (value) => formatCalculatedAmount(value, currency, currencySymbol);
    const percent = (value) => value === null ? 'not defined because revenue is zero' : `${value}%`;
    return [
      `Accounting revenue: ${amount(result.accountingRevenue)}`,
      customerPayments ? `Customer payments collected: ${amount(result.customerPayments)}` : '',
      customerPayments
        ? `Cash collection less accounting revenue: ${amount(result.cashCollectionDifference)}; timing and accounting recognition may differ.`
        : '',
      collectedForOthers ? `Collected for others (not automatically accounting revenue): ${amount(result.collectedForOthers)}` : '',
      `Cost of sales: ${amount(result.costOfSalesTotal)}`,
      `Gross profit: ${amount(result.grossProfit)} (${percent(result.grossMarginPercent)} gross margin)`,
      `Variable operating costs: ${amount(result.variableOperatingCostTotal)}`,
      `Commissions: ${amount(result.commissionCostTotal)}`,
      `Contribution margin: ${amount(result.contributionMargin)} (${percent(result.contributionMarginPercent)})`,
      `Fixed operating costs: ${amount(result.fixedOperatingCostTotal)}`,
      `Salary costs: ${amount(result.salaryCostTotal)}`,
      `Contractor payments: ${amount(result.contractorPaymentTotal)}`,
      `Total operating expenses: ${amount(result.operatingExpenseTotal)}`,
      `Operating profit: ${amount(result.operatingProfit)}`,
      `Other non-operating costs: ${amount(result.otherNonOperatingCostTotal)}`,
      `Profit before tax: ${amount(result.profitBeforeTax)}`,
      result.taxEstimate === null
        ? 'Net profit: not calculated because no explicit tax amount or rate-and-taxable-base assumption was supplied.'
        : `Tax used: ${amount(result.taxEstimate)}. ${result.taxAssumption}`,
      result.netProfit === null
        ? ''
        : `Net profit using the supplied tax assumption: ${amount(result.netProfit)} (${percent(result.netMarginPercent)} net margin)`,
      `Working: ${amount(result.accountingRevenue)} - ${amount(result.costOfSalesTotal)} = ${amount(result.grossProfit)} gross profit; ${amount(result.grossProfit)} - ${amount(result.variableOperatingCostTotal)} variable operating costs - ${amount(result.commissionCostTotal)} commissions = ${amount(result.contributionMargin)} contribution; ${amount(result.grossProfit)} - ${amount(result.operatingExpenseTotal)} operating expenses = ${amount(result.operatingProfit)} operating profit; ${amount(result.operatingProfit)} - ${amount(result.otherNonOperatingCostTotal)} other non-operating costs = ${amount(result.profitBeforeTax)} profit before tax${result.taxEstimate === null ? '' : `; ${amount(result.profitBeforeTax)} - ${amount(result.taxEstimate)} tax = ${amount(result.netProfit)} net profit`}.`,
      result.accountingNote,
      result.completenessNote,
    ].filter(Boolean).join('\n');
  }

  return null;
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
const BUSINESS_CONTEXT_PATTERN = /\b(?:business|businesses|revenue|profit|margin|costs?|expenses?|pricing|commission|break[- ]even|unit economics|interest|tax|vat|customer acquisition|startup|cash flow|case stud(?:y|ies)|market|competitor|sales|marketing|brand|inventory|supplier|operations?|staff|employee|human resources|funding|investor|pitch|business plan|proposal|automation|crm|scal(?:e|ing)|growth|retention|conversion|customer lifetime value|roi|return on investment|working capital|procurement|logistics|manufactur(?:e|ing)|e-commerce|software|consult(?:ing|ancy)|restaurant|construction|contractor|mvp|minimum viable product)\b/i;
const HIGH_RISK_FACT_PATTERN = /\b(?:law|legal|regulat(?:ion|ions|ory)|tax|taxation|sars|cipc|registration|grant|funding|eligib(?:le|ility)|application deadline|programme|program|government|payment gateway|processing fee|transaction fee|price|pricing|medical|medicine|health|safety|financial advice|interest rate|vat|popia|nyda|seda|sefa|municipalit(?:y|ies)|department of small business development|dsbd|consumer protection|contractor classification|independent contractor|employment status|transport permit|fraud|data protection|privacy)\b/i;

const BUSINESS_DOMAIN_RULES = [
  { key: 'validation', pattern: /\b(?:idea|validate|validation|customer problem|market demand|mvp|minimum viable product|test assumptions?)\b/i },
  { key: 'planning', pattern: /\b(?:business plan|business model|value proposition|revenue model|operating plan|roadmap|proposal)\b/i },
  { key: 'financials', pattern: /\b(?:financial|revenue|profit|margin|cash flow|budget|forecast|break[- ]even|unit economics|working capital|customer acquisition cost|lifetime value|roi|loan|debt|equity dilution|pricing)\b/i },
  { key: 'sales', pattern: /\b(?:sales?|customer acquisition|sales funnel|conversion|objection|retention|partnership|outreach|repeat purchase|first customers?)\b/i },
  { key: 'marketing', pattern: /\b(?:marketing|brand|seo|social media|campaign|advertising|content calendar|email marketing|whatsapp marketing|referral|reputation)\b/i },
  { key: 'operations', pattern: /\b(?:operations?|sop|standard operating procedure|inventory|supplier|procurement|logistics|quality control|customer support|business continuity)\b/i },
  { key: 'people', pattern: /\b(?:human resources|workforce|job description|recruit(?:ment|ing)|onboarding|staff|employee|compensation|leadership|team structure)\b/i },
  { key: 'compliance', pattern: /\b(?:legal|law|compliance|tax|registration|licen[cs]e|permit|contract|consumer protection|data privacy|intellectual property|employment regulation)\b/i },
  { key: 'funding', pattern: /\b(?:funding|grant|investor|pitch deck|valuation|due diligence|funding application|capital raise)\b/i },
  { key: 'market', pattern: /\b(?:market|competitor|competitive|swot|market gap|market trend|differentiation|industry research)\b/i },
  { key: 'technology', pattern: /\b(?:technology|automation|crm|accounting system|inventory software|e-commerce|api integration|dashboard|workflow)\b/i },
  { key: 'growth', pattern: /\b(?:scal(?:e|ing)|expan(?:d|sion)|new market|product line|franchis(?:e|ing)|international|growth strategy)\b/i },
];

const INDUSTRY_MODEL_GUIDANCE = [
  {
    key: 'delivery',
    pattern: /\b(?:delivery|courier|dispatch|last[- ]mile|logistics)\b/i,
    instruction: 'For delivery or logistics, adapt operations to dispatch, route density, driver capacity and cost, service coverage, and proof of delivery.',
  },
  {
    key: 'manufacturing',
    pattern: /\b(?:manufactur(?:e|er|ing)|factory|production)\b/i,
    instruction: 'For manufacturing, account for raw materials, production capacity, machinery, quality control, stock, and distribution.',
  },
  {
    key: 'ecommerce',
    pattern: /\b(?:e[- ]commerce|online store|online shop)\b/i,
    instruction: 'For e-commerce, account for inventory, orders, payments, fulfilment, returns, and customer acquisition.',
  },
  {
    key: 'software',
    pattern: /\b(?:software|saas|app|technology startup)\b/i,
    instruction: 'For software, account for product development, user acquisition, activation, retention, infrastructure, and support.',
  },
  {
    key: 'consulting',
    pattern: /\b(?:consult(?:ing|ant|ancy)|professional services)\b/i,
    instruction: 'For consulting or professional services, account for expertise, client acquisition, scoped delivery, utilisation, and repeat work.',
  },
  {
    key: 'restaurant',
    pattern: /\b(?:restaurant|cafe|café|food business|catering)\b/i,
    instruction: 'For restaurants or food businesses, account for stock control, food safety, staff scheduling, waste, and customer service.',
  },
  {
    key: 'construction',
    pattern: /\b(?:construction|building contractor|construction business)\b/i,
    instruction: 'For construction, account for project-based quotes, materials, labour and subcontractors, site safety, equipment, permits and local requirements; verify legal and municipal requirements for the specific location and work.',
  },
];

export function classifyBusinessDomains(prompt = '') {
  const text = String(prompt || '');
  return BUSINESS_DOMAIN_RULES
    .filter(({ pattern }) => pattern.test(text))
    .map(({ key }) => key);
}

export function buildWorkspaceBusinessInstruction(prompt = '') {
  const text = String(prompt || '');
  const domains = classifyBusinessDomains(text);
  if (!BUSINESS_CONTEXT_PATTERN.test(text) && domains.length === 0) return '';

  const industryGuidance = INDUSTRY_MODEL_GUIDANCE
    .filter(({ pattern }) => pattern.test(text))
    .map(({ instruction }) => instruction);
  const stage = /\b(?:scale|scaling|expand|expansion|new market|franchise|international)\b/i.test(text)
    ? 'scaling or expansion'
    : /\b(?:already operating|existing customers|current customers|my business|our business|we sell|we currently)\b/i.test(text)
      ? 'operating'
      : /\b(?:launch|starting|start a business|set up|opening|first customers)\b/i.test(text)
        ? 'launch'
        : /\b(?:idea|validate|test demand|mvp|minimum viable product)\b/i.test(text)
          ? 'validation or ideation'
          : '';

  return [
    `Business response focus: ${domains.length ? domains.join(', ') : 'identify the user’s actual objective before choosing an approach'}.`,
    `Adapt recommendations to the stated business model, industry, stage${stage ? ` (the prompt suggests ${stage}; treat this as an inference, not a confirmed fact)` : ''}, country, budget, resources, audience, and objective. Do not assume missing details. If industry clues match, apply only the relevant guidance: ${industryGuidance.length ? industryGuidance.join(' ') : 'do not force an industry-specific template onto the business.'}`,
    'Distinguish a promising idea from validated demand. Separate user-provided facts, research-backed findings, estimates, assumptions, and recommendations; never guarantee success or invent customers, competitors, market statistics, programmes, or results.',
    'Make advice executable when useful: identify the lowest-cost immediate action, what requires money, what requires external approval, the responsible person, a measurable indicator, and the next review point. Match paid marketing or technology recommendations to the stated budget; include an organic or lower-cost alternative when relevant. For no- or low-capital pilots, prioritize customer discovery and demand tests before registration costs, software subscriptions, hiring, vehicles, offices, or paid advertising unless a verified legal or safety requirement makes an expense necessary.',
    'For substantial plans, keep customer, operating, staffing, pricing, and financial assumptions consistent across sections. Recalculate each example only from its own stated inputs; do not carry figures between examples. Show formulas and working, distinguish customer payments and collections for another party from accounting revenue, and distinguish supplier/driver payouts from business profit. Never infer principal-versus-agent accounting treatment; flag contract and accounting-standard questions for a qualified accountant. Name material omissions instead of silently treating them as zero. Ask at most one focused question when missing information would materially change the recommendation; otherwise state a reasonable, clearly marked assumption and proceed.',
    'Identify material financial, legal/compliance, customer, supplier/contractor, safety, data-protection, payment/fraud, and continuity risks that apply to the stated business. Recommend proportionate controls suitable for the scale and budget; do not prescribe enterprise systems to a small pilot.',
    domains.includes('market')
      ? 'For competitor and market analysis, distinguish sourced information from analysis and hypotheses. Without current sources, provide a research method or comparison template rather than invented market facts.'
      : '',
    domains.includes('compliance') || domains.includes('funding')
      ? 'For legal, tax, compliance, and funding matters, provide general information rather than professional advice. Verify current jurisdiction-specific claims against the responsible official source when retrieval is available; otherwise say current details need confirmation and never invent requirements, fees, deadlines, eligibility, or approval.'
      : '',
  ].filter(Boolean).join('\n');
}

export function buildWorkspaceQualityInstruction(prompt = '') {
  const text = String(prompt || '');
  const businessContext = BUSINESS_CONTEXT_PATTERN.test(text);
  const southAfricaContext = SOUTH_AFRICA_CONTEXT_PATTERN.test(text);
  const highRiskContext = HIGH_RISK_FACT_PATTERN.test(text);
  const businessInstruction = buildWorkspaceBusinessInstruction(text);

  return [
    'Before answering, silently check that you answered the actual request, followed its instructions, checked internal consistency and arithmetic, included important risks, and made the next step actionable. Do not reveal private chain-of-thought; give only concise reasoning, calculations and conclusions.',
    'Distinguish information supplied by the user, verified information, general knowledge, estimates, assumptions, illustrative examples, opinions, and unverified claims. A claim is verified only when you actually checked a trustworthy source available in this interaction or it is directly supported by supplied evidence; do not describe memory or model knowledge as externally verified. Never invent statistics, customer counts, prices, case studies, legal requirements, citations, sources, or market evidence. Never imply that you searched, checked, confirmed, or consulted a source unless you actually did. If evidence is unavailable or inconclusive, say what is uncertain and what should be verified. Do not invent numerical confidence scores.',
    'Do not automatically agree with the user or defend an earlier answer. Point out weak assumptions, missing information and contradictions respectfully. If an earlier answer was wrong, acknowledge and correct it directly.',
    highRiskContext
      ? 'Apply stricter verification to current or high-impact claims about law, tax, registration, funding, eligibility, deadlines, financial recommendations, medical or safety information, prices, and payment-processing fees. If a trusted search or retrieval source is available, prefer the responsible official institution, check the source and its update/publication date, and cross-check material claims where practical. Cite or link only sources actually consulted. If no suitable source is available, clearly say current details are unverified and direct the user to the responsible official source before they act; do not guess amounts, thresholds, fees, rules, or eligibility.'
      : '',
    businessContext
      ? 'For business and financial questions, use the stated currency and show formulas and numeric working for calculations. Recalculate from only the current example, check arithmetic, identify contradictory inputs, and correct them rather than combining examples or double-counting costs. Keep revenue distinct from profit. Keep customer payments, accounting revenue, collections for another party, supplier/driver payouts, gross margin, operating profit, net profit, and available cash distinct. Recognize that principal-versus-agent accounting treatment depends on the contract and applicable standards; do not guess and flag it for an accountant. Separate cost of sales, variable costs, commissions, payroll/contractors, and fixed overheads; distinguish contribution margin from gross margin. Treat cash flow separately from accounting profit. Any tax calculation must state its supplied tax base, rate/amount, period, and assumptions; do not imply a legal tax rate or liability without current authoritative verification. CAC is acquisition spend divided by new customers; simple gross-profit LTV needs average order value, purchase frequency, gross margin, and customer lifetime, with those assumptions stated; ROI is (total return minus investment) divided by investment; loan payments require the rate, term, and payment frequency. Never treat missing costs as zero: ask for essential missing amounts or label results explicitly as estimates or profit before the missing overheads. Do not convert currencies without a rate and date from a trustworthy source. Prefer practical options within the user’s stated budget and explain lower-cost alternatives. Before sending, check calculation accuracy, consistency, assumptions, source support, affordability, risks, beginner-executable steps, and whether facts, estimates, and opinions are distinguished; correct failures first.'
      : '',
    southAfricaContext
      ? 'For South African questions, do not assume the user is in South Africa unless the prompt supports it. Use rand when appropriate and distinguish local rules from other jurisdictions. Treat CIPC, SARS, NYDA, SEDA, SEFA or any successor, VAT, POPIA, the Consumer Protection Act, employment or independent-contractor classification, transport and municipal requirements, the Department of Small Business Development, and municipal programme information as current only when verified from the responsible official source. Prefer official sources and include the actual consulted source and date where retrieval is available; if not, identify the detail as unverified and direct the user to the responsible authority or qualified professional. Distinguish a sole proprietor from a registered company; do not claim that a sole proprietor must register a company with CIPC. Never invent a grant, successor agency, fee, tax threshold, programme, eligibility rule, or application requirement.'
      : '',
    businessInstruction,
  ].filter(Boolean).join('\n');
}
