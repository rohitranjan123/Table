/**
 * Thin adapter — wires enterprise fintech dataset to VirtualizedGrid props.
 */

import type { CellCoordinate } from '../grid/types'
import type { GridCell, RowHeightSpec } from '../grid/types'
import type { GridSize } from '../grid/types'
import {
  ENTERPRISE_COLUMN_COUNT,
  ENTERPRISE_COLUMNS,
  ENTERPRISE_FROZEN_COLUMNS,
  ENTERPRISE_ROW_COUNT,
  getEnterpriseCell,
} from './enterprise-hierarchy-data'

export {
  ENTERPRISE_COLUMN_COUNT,
  ENTERPRISE_COLUMNS,
  ENTERPRISE_FROZEN_COLUMNS,
  ENTERPRISE_ROW_COUNT,
} from './enterprise-hierarchy-data'

export function createEnterpriseGetCellContent(): (
  cell: CellCoordinate,
) => GridCell {
  return ([col, row]) => {
    const field = ENTERPRISE_COLUMNS[col]?.dataIndex
    if (!field) return { type: 'text', data: '' }
    return getEnterpriseCell(row, field)
  }
}

export const ENTERPRISE_DEMO_CONFIG = {
  id: 'enterprise',
  title: 'Fintech trade ledger (production-scale)',
  description: `${ENTERPRISE_ROW_COUNT.toLocaleString()} trades · ${ENTERPRISE_COLUMN_COUNT} cols · Region → Country → Desk → Product row spans · Counterparty column uses wrap overflow · frozen hierarchy`,
  rowCount: ENTERPRISE_ROW_COUNT,
  columns: ENTERPRISE_COLUMNS,
  frozenColumns: ENTERPRISE_FROZEN_COLUMNS,
  headerHeight: 36,
  rowHeight: 28 as RowHeightSpec,
  width: '100%' as GridSize,
  height: 560 as GridSize,
  getCellContent: createEnterpriseGetCellContent(),
}
