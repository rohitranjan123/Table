export type {
  ComputeRowSpansParams,
  RowSpanContext,
  SpanMap,
  SpanMeta,
  SpanRowsCallback,
  SpanRowsSpec,
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
  isSpanRowsSpec,
} from './resolve-row-span'
