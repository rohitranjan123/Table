export type {
  ComputeRowSpansParams,
  RowSpanContext,
  SpanMap,
  SpanMeta,
  SpanCellCallback,
  SpanCellSpec,
  SpanSegment,
} from './types'
export { computeRowSpans } from './compute-row-spans'
export {
  collectSpanAnchorsForColumn,
  collectSpanAnchorsToPaint,
} from './collect-span-anchors'
export {
  getSpanningColumnIndices,
  hasRowSpanning,
  isSpanCellSpec,
} from './resolve-row-span'
