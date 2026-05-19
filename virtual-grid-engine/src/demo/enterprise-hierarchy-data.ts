/**
 * Production-style fintech demo dataset — 10k trades × 200 columns.
 * AG Grid pattern: flat rowData + colDefs (field, pinned, rowSpan).
 */

import type { FrozenColumns } from '../grid/types'
import type { GridCell, GridColumn } from '../grid/types'
import {
  ENTERPRISE_TARGET_COLUMN_COUNT,
  ENTERPRISE_TARGET_ROW_COUNT,
  HIERARCHY_FIELD_FREEZE_KEYS,
  HIERARCHY_FIELD_KEYS,
  TRADE_FIELD_KEYS,
  buildMetricColumnCatalog,
  type HierarchyFieldKey,
} from './enterprise-fintech-catalog'
import {
  assertHierarchicalSpans,
  deriveMetricValue,
  generateEnterpriseTradeRows,
  type EnterpriseTradeRow,
} from './enterprise-dataset-generator'

export type { EnterpriseTradeRow, HierarchyFieldKey }
export { assertHierarchicalSpans, deriveMetricValue }
export {
  ENTERPRISE_TARGET_COLUMN_COUNT,
  ENTERPRISE_TARGET_ROW_COUNT,
} from './enterprise-fintech-catalog'

const METRIC_COLUMNS = buildMetricColumnCatalog()

function buildEnterpriseColumns(): GridColumn[] {
  const hierarchyCols: GridColumn[] = [
    { dataIndex: 'region', title: 'Region', width: 96, spanRows: true },
    { dataIndex: 'country', title: 'Country', width: 112, spanRows: true },
    { dataIndex: 'desk', title: 'Desk', width: 128, spanRows: true },
    { dataIndex: 'product', title: 'Product Line', width: 136, spanRows: true },
  ]

  const tradeCols: GridColumn[] = [
    { dataIndex: 'tradeId', title: 'Trade ID', width: 128 },
    { dataIndex: 'counterparty', title: 'Counterparty', width: 132 },
    { dataIndex: 'side', title: 'Side', width: 64 },
    { dataIndex: 'currency', title: 'CCY', width: 56 },
    { dataIndex: 'notional', title: 'Notional', width: 96 },
    { dataIndex: 'status', title: 'Status', width: 88 },
    { dataIndex: 'tradeDate', title: 'Trade Date', width: 96 },
  ]

  const metricCols: GridColumn[] = METRIC_COLUMNS.map((metric) => ({
    dataIndex: metric.dataIndex,
    title: metric.title,
    width: 88 + (metric.dataIndex.length % 5) * 6,
  }))

  const columns = [...hierarchyCols, ...tradeCols, ...metricCols]
  if (columns.length !== ENTERPRISE_TARGET_COLUMN_COUNT) {
    throw new Error(
      `Expected ${ENTERPRISE_TARGET_COLUMN_COUNT} columns, got ${columns.length}`,
    )
  }
  return columns
}

/** Simulates API response body: materialized trade ledger from booking service. */
export const ENTERPRISE_ROW_DATA: readonly EnterpriseTradeRow[] = Object.freeze(
  generateEnterpriseTradeRows(ENTERPRISE_TARGET_ROW_COUNT),
)

export const ENTERPRISE_ROW_COUNT = ENTERPRISE_ROW_DATA.length

export const ENTERPRISE_COLUMN_COUNT = ENTERPRISE_TARGET_COLUMN_COUNT

export const ENTERPRISE_COLUMNS: GridColumn[] = buildEnterpriseColumns()

/** AG Grid `pinned: 'left'` — hierarchy dimensions stay visible while scrolling metrics. */
export const ENTERPRISE_FROZEN_COLUMNS: FrozenColumns = {
  left: [...HIERARCHY_FIELD_FREEZE_KEYS],
}

const FIELD_INDEX = new Map(
  ENTERPRISE_COLUMNS.map((col, index) => [col.dataIndex, index]),
)

const HIERARCHY_SET = new Set<string>(HIERARCHY_FIELD_KEYS)
const TRADE_SET = new Set<string>(TRADE_FIELD_KEYS)

export function getEnterpriseColumnIndex(dataIndex: string): number {
  const index = FIELD_INDEX.get(dataIndex)
  if (index === undefined) {
    throw new Error(`Unknown enterprise field: ${dataIndex}`)
  }
  return index
}

/**
 * Cell resolver — mirrors server field mapping + derived risk metrics.
 * `getCellContent` in the grid calls this per visible cell only (virtualized).
 */
export function getEnterpriseCell(
  rowIndex: number,
  dataIndex: string,
): GridCell {
  const row = ENTERPRISE_ROW_DATA[rowIndex]
  if (!row) {
    return { type: 'text', data: '' }
  }

  if (HIERARCHY_SET.has(dataIndex)) {
    return {
      type: 'text',
      data: row[dataIndex as HierarchyFieldKey],
    }
  }

  if (TRADE_SET.has(dataIndex)) {
    switch (dataIndex) {
      case 'tradeId':
      case 'counterparty':
      case 'side':
      case 'currency':
      case 'status':
      case 'tradeDate':
        return { type: 'text', data: row[dataIndex] }
      case 'notional':
        return { type: 'number', data: row.notional }
      default:
        return { type: 'text', data: '' }
    }
  }

  if (dataIndex.startsWith('metric_')) {
    return { type: 'number', data: deriveMetricValue(row.rowKey, dataIndex) }
  }

  return { type: 'text', data: '' }
}

/** Dev guard on boot — validates generator output once. */
assertHierarchicalSpans(ENTERPRISE_ROW_DATA)
