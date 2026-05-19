import type { GridColumn } from '../../types'
import type { FrozenColumns, ResolvedFreeze } from './types'

export function resolveFrozenColumns(
  columns: GridColumn[],
  spec?: FrozenColumns,
): ResolvedFreeze {
  const colCount = columns.length
  const left = indicesFromDataIndexes(columns, spec?.left ?? [])
  const right = indicesFromDataIndexes(columns, spec?.right ?? []).filter(
    (i) => !left.includes(i),
  )

  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const leftWidth = sumWidths(columns, left)
  const rightWidth = sumWidths(columns, right)

  const scrollableLefts: number[] = new Array(colCount)
  let scrollableWidth = 0
  for (let i = 0; i < colCount; i++) {
    if (leftSet.has(i) || rightSet.has(i)) {
      scrollableLefts[i] = -1
    } else {
      scrollableLefts[i] = scrollableWidth
      scrollableWidth += columns[i].width
    }
  }

  return {
    left,
    right,
    leftWidth,
    rightWidth,
    leftSet,
    rightSet,
    scrollableLefts,
    scrollableWidth,
    layoutWidth: leftWidth + scrollableWidth + rightWidth,
  }
}

function indicesFromDataIndexes(
  columns: GridColumn[],
  dataIndexes: readonly string[],
): number[] {
  const map = new Map(columns.map((col, index) => [col.dataIndex, index]))
  const out: number[] = []
  const seen = new Set<number>()
  for (const key of dataIndexes) {
    const index = map.get(key)
    if (index === undefined || seen.has(index)) continue
    seen.add(index)
    out.push(index)
  }
  return out
}

function sumWidths(columns: GridColumn[], indices: number[]): number {
  let w = 0
  for (const i of indices) w += columns[i].width
  return w
}
