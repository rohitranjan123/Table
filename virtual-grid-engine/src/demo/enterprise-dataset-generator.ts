/**
 * Deterministic fintech dataset generator — mimics server-side flatten of a
 * booking hierarchy (region → country → desk → product → trades).
 */

import {
  COUNTERPARTIES,
  COUNTRIES_BY_REGION,
  CURRENCIES,
  DESKS,
  ENTERPRISE_TARGET_ROW_COUNT,
  PRODUCT_LINES_BY_DESK,
  REGIONS,
  TRADE_SIDES,
  TRADE_STATUS,
  type HierarchyFieldKey,
} from './enterprise-fintech-catalog'

export interface EnterpriseTradeRow {
  region: string
  country: string
  desk: string
  product: string
  tradeId: string
  counterparty: string
  side: string
  currency: string
  notional: number
  status: string
  tradeDate: string
  /** Stable row key for metric derivation (server row id). */
  rowKey: number
}

/** Mulberry32 — fast seeded PRNG for reproducible demo data. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!
}

function tradeDateForRow(rowKey: number): string {
  const day = (rowKey % 28) + 1
  const month = (rowKey % 12) + 1
  return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Builds exactly `targetRows` flat rows with nested hierarchy fields repeated
 * per subgroup (required for cascading `spanRows: true`).
 */
export function generateEnterpriseTradeRows(
  targetRows: number = ENTERPRISE_TARGET_ROW_COUNT,
  seed = 42,
): EnterpriseTradeRow[] {
  const rng = createSeededRng(seed)
  const rows: EnterpriseTradeRow[] = []
  let rowKey = 0

  while (rowKey < targetRows) {
    const region = pick(rng, REGIONS)
    const countries = COUNTRIES_BY_REGION[region] ?? ['Unknown']
    const countryBlock = 2 + Math.floor(rng() * 4)
    let countriesAdded = 0

    while (rowKey < targetRows && countriesAdded < countryBlock) {
      const country = pick(rng, countries)
      const deskBlock = 1 + Math.floor(rng() * 3)
      let desksAdded = 0

      while (rowKey < targetRows && desksAdded < deskBlock) {
        const desk = pick(rng, DESKS)
        const products = PRODUCT_LINES_BY_DESK[desk] ?? ['General']
        const productBlock = 1 + Math.floor(rng() * 2)
        let productsAdded = 0

        while (rowKey < targetRows && productsAdded < productBlock) {
          const product = pick(rng, products)
          const tradesInProduct = 3 + Math.floor(rng() * 12)

          const deskKey = `${country} — ${desk}`
          const productKey = `${deskKey} — ${product}`

          for (
            let t = 0;
            t < tradesInProduct && rowKey < targetRows;
            t += 1
          ) {
            const cc = country.slice(0, 2).toUpperCase()
            const deskCode = desk
              .split(' ')
              .map((w) => w[0])
              .join('')
            rows.push({
              region,
              country,
              desk: deskKey,
              product: productKey,
              tradeId: `T-${cc}-${deskCode}-${rowKey}`,
              counterparty: pick(rng, COUNTERPARTIES),
              side: pick(rng, TRADE_SIDES),
              currency: pick(rng, CURRENCIES),
              notional: Math.round(50_000 + rng() * 9_950_000),
              status: pick(rng, TRADE_STATUS),
              tradeDate: tradeDateForRow(rowKey),
              rowKey,
            })
            rowKey += 1
          }
          productsAdded += 1
        }
        desksAdded += 1
      }
      countriesAdded += 1
    }
  }

  return rows
}

export const HIERARCHY_FIELDS: readonly HierarchyFieldKey[] = [
  'region',
  'country',
  'desk',
  'product',
]

/**
 * Validates nested span invariant on a row slice (use full set in CI sparingly).
 */
export function assertHierarchicalSpans(
  rows: readonly Pick<EnterpriseTradeRow, HierarchyFieldKey>[],
): void {
  if (rows.length === 0) return

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!
    const curr = rows[i]!

    for (let level = 0; level < HIERARCHY_FIELDS.length; level++) {
      const field = HIERARCHY_FIELDS[level]!
      if (curr[field] !== prev[field]) continue

      for (let parent = 0; parent < level; parent++) {
        const parentField = HIERARCHY_FIELDS[parent]!
        if (curr[parentField] !== prev[parentField]) {
          throw new Error(
            `Row ${i}: equal "${field}" but parent "${parentField}" differs`,
          )
        }
      }
    }
  }
}

/** Deterministic metric value — simulates server-computed risk/pnl columns. */
export function deriveMetricValue(
  rowKey: number,
  dataIndex: string,
): number {
  let hash = rowKey * 2654435761
  for (let i = 0; i < dataIndex.length; i++) {
    hash = Math.imul(hash ^ dataIndex.charCodeAt(i), 2246822519)
  }
  const normalized = ((hash >>> 0) % 10_000) / 10_000
  const sign = hash % 2 === 0 ? 1 : -1
  return Math.round(sign * normalized * 1_000_000) / 100
}
