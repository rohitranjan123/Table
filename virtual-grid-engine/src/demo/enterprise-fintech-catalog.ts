/**
 * Fintech reference catalogs — stable ids for server-style row generation.
 */

export const ENTERPRISE_TARGET_ROW_COUNT = 10_000
export const ENTERPRISE_TARGET_COLUMN_COUNT = 200

export const REGIONS = [
  'Americas',
  'EMEA',
  'APAC',
  'MENA',
] as const

export const COUNTRIES_BY_REGION: Record<string, readonly string[]> = {
  Americas: [
    'United States',
    'Canada',
    'Brazil',
    'Mexico',
    'Chile',
    'Colombia',
  ],
  EMEA: [
    'United Kingdom',
    'Germany',
    'France',
    'Switzerland',
    'Netherlands',
    'Ireland',
    'Sweden',
  ],
  APAC: [
    'Singapore',
    'Japan',
    'Australia',
    'Hong Kong',
    'India',
    'South Korea',
  ],
  MENA: ['UAE', 'Saudi Arabia', 'Qatar', 'Israel'],
}

export const DESKS = [
  'Equities Cash',
  'Equities Derivatives',
  'Fixed Income',
  'FX Spot',
  'FX Derivatives',
  'Commodities',
  'Prime Services',
  'Treasury',
  'Structured Products',
] as const

export const PRODUCT_LINES_BY_DESK: Record<string, readonly string[]> = {
  'Equities Cash': ['Cash Equity', 'ETF Liquidity', 'Program Trading'],
  'Equities Derivatives': ['Index Futures', 'Single Stock Options', 'Variance Swaps'],
  'Fixed Income': ['Gov Bonds', 'Corporate Credit', 'Municipals', 'Securitized'],
  'FX Spot': ['G10 Spot', 'EM Spot', 'NDF'],
  'FX Derivatives': ['FX Options', 'FX Swaps', 'Cross-Currency Basis'],
  'Commodities': ['Energy', 'Metals', 'Agriculture'],
  'Prime Services': ['Securities Lending', 'Margin Financing', 'Custody Overlay'],
  Treasury: ['Liquidity Pool', 'Internal Funding', 'Collateral Optimization'],
  'Structured Products': ['Notes', 'Autocallables', 'CLNs'],
}

export const COUNTERPARTIES = [
  'Goldman Sachs',
  'JPMorgan',
  'Morgan Stanley',
  'Citadel Securities',
  'BlackRock',
  'BNP Paribas',
  'Deutsche Bank',
  'UBS',
  'HSBC',
  'Nomura',
  'Standard Chartered',
  'Citi',
] as const

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'SGD', 'AUD'] as const

export const TRADE_STATUS = ['BOOKED', 'SETTLED', 'PENDING', 'FAILED'] as const

export const TRADE_SIDES = ['BUY', 'SELL'] as const

/** Hierarchy columns (AG Grid rowSpan + pinned left). */
export const HIERARCHY_FIELD_KEYS = [
  'region',
  'country',
  'desk',
  'product',
] as const

export const HIERARCHY_FIELD_FREEZE_KEYS = [
  'region',
  'country',
  'desk',
] as const

export type HierarchyFieldKey = (typeof HIERARCHY_FIELD_KEYS)[number]

/** Identity / trade columns immediately after hierarchy (no row span). */
export const TRADE_FIELD_KEYS = [
  'tradeId',
  'counterparty',
  'side',
  'currency',
  'notional',
  'status',
  'tradeDate',
] as const

export type TradeFieldKey = (typeof TRADE_FIELD_KEYS)[number]

export interface MetricColumnDef {
  dataIndex: string
  title: string
  category: string
}

const METRIC_CATEGORIES: { category: string; labels: string[] }[] = [
  {
    category: 'PnL',
    labels: [
      'Day PnL',
      'MTD PnL',
      'YTD PnL',
      'Realized',
      'Unrealized',
      'FX PnL',
      'Funding PnL',
      'Dividend PnL',
      'Theta',
      'Vega PnL',
    ],
  },
  {
    category: 'Risk',
    labels: [
      'Delta',
      'Gamma',
      'Vega',
      'DV01',
      'CS01',
      'Beta',
      'VaR 1D',
      'VaR 10D',
      'Stress Down',
      'Stress Up',
      'IRC',
      'CVA',
    ],
  },
  {
    category: 'Exposure',
    labels: [
      'Gross Exp',
      'Net Exp',
      'Long Exp',
      'Short Exp',
      'Leverage',
      'Margin Req',
      'Collateral Posted',
      'Collateral Received',
      'Limit Util %',
      'Concentration',
    ],
  },
  {
    category: 'Market',
    labels: [
      'Bid',
      'Ask',
      'Mid',
      'Last',
      'Volume',
      'Open Int',
      'Spread bps',
      'Implied Vol',
      'Hist Vol',
      'Basis',
    ],
  },
  {
    category: 'Compliance',
    labels: [
      'KYC Status',
      'AML Score',
      'Sanctions Flag',
      'PEP Flag',
      'Limit Breach',
      'Reg Reportable',
      'MiFID Cost',
      'Best Ex',
      'Surveillance',
      'Audit Trail',
    ],
  },
  {
    category: 'Operations',
    labels: [
      'Settlement Date',
      'Fail Days',
      'Confirm Status',
      'SSI Match',
      'Break Amount',
      'Rec Status',
      'Custodian',
      'Triparty',
      'Coupon Accrual',
      'Accrued Days',
    ],
  },
]

export function buildMetricColumnCatalog(): MetricColumnDef[] {
  const out: MetricColumnDef[] = []
  let index = 0
  for (const group of METRIC_CATEGORIES) {
    for (const label of group.labels) {
      const slug = label
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
      out.push({
        dataIndex: `metric_${index}_${slug}`,
        title: label,
        category: group.category,
      })
      index += 1
    }
  }
  while (out.length < ENTERPRISE_TARGET_COLUMN_COUNT - 11) {
    const cat = METRIC_CATEGORIES[index % METRIC_CATEGORIES.length]!.category
    out.push({
      dataIndex: `metric_${index}_ext`,
      title: `${cat} Ext ${index}`,
      category: cat,
    })
    index += 1
  }
  return out.slice(0, ENTERPRISE_TARGET_COLUMN_COUNT - 11)
}
