/** @internal Canvas text measurement for wrap height estimation. */

export const BODY_FONT = '13px system-ui, sans-serif'
export const HEADER_FONT = '600 13px system-ui, sans-serif'
/** Matches `.vgrid { font: 13px/1.2 ... }` line box. */
export const LINE_HEIGHT_PX = Math.ceil(13 * 1.2)
export const CELL_PADDING_X = 16
export const CELL_PADDING_Y = 8

let bodyCanvas: CanvasRenderingContext2D | null = null
let headerCanvas: CanvasRenderingContext2D | null = null

function getContext(isHeader: boolean): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (isHeader) {
    if (!headerCanvas) {
      const canvas = document.createElement('canvas')
      headerCanvas = canvas.getContext('2d')
      if (headerCanvas) headerCanvas.font = HEADER_FONT
    }
    return headerCanvas
  }
  if (!bodyCanvas) {
    const canvas = document.createElement('canvas')
    bodyCanvas = canvas.getContext('2d')
    if (bodyCanvas) bodyCanvas.font = BODY_FONT
  }
  return bodyCanvas
}

export function contentWidthForColumn(columnWidth: number): number {
  return Math.max(0, columnWidth - CELL_PADDING_X)
}

/** Greedy word wrap; long tokens break by character when needed. */
export function measureWrappedLineCount(
  text: string,
  maxWidth: number,
  isHeader: boolean,
): number {
  if (!text) return 1
  if (maxWidth <= 0) return 1

  const ctx = getContext(isHeader)
  if (!ctx) {
    const approxCharWidth = 7
    const charsPerLine = Math.max(1, Math.floor(maxWidth / approxCharWidth))
    return text.split('\n').reduce((sum, paragraph) => {
      const len = paragraph.length || 1
      return sum + Math.max(1, Math.ceil(len / charsPerLine))
    }, 0)
  }

  const measure = (value: string) => ctx.measureText(value).width
  const spaceWidth = measure(' ')

  let totalLines = 0
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      totalLines += 1
      continue
    }

    const words = paragraph.split(/\s+/).filter(Boolean)
    let lineWidth = 0
    let paragraphLines = 0

    const commitLine = () => {
      paragraphLines += 1
      lineWidth = 0
    }

    const appendToken = (token: string) => {
      const tokenWidth = measure(token)
      if (tokenWidth <= maxWidth) {
        if (lineWidth === 0) {
          lineWidth = tokenWidth
          if (paragraphLines === 0) paragraphLines = 1
        } else if (lineWidth + spaceWidth + tokenWidth <= maxWidth) {
          lineWidth += spaceWidth + tokenWidth
        } else {
          commitLine()
          lineWidth = tokenWidth
        }
        return
      }

      let chunk = ''
      for (const char of token) {
        const next = chunk + char
        if (measure(next) > maxWidth && chunk) {
          if (paragraphLines === 0) paragraphLines = 1
          else commitLine()
          chunk = char
        } else {
          chunk = next
        }
      }
      if (chunk) {
        const chunkWidth = measure(chunk)
        if (lineWidth === 0) {
          lineWidth = chunkWidth
          if (paragraphLines === 0) paragraphLines = 1
        } else if (lineWidth + spaceWidth + chunkWidth <= maxWidth) {
          lineWidth += spaceWidth + chunkWidth
        } else {
          commitLine()
          lineWidth = chunkWidth
        }
      }
    }

    for (const word of words) {
      appendToken(word)
    }

    totalLines += Math.max(1, paragraphLines)
  }

  return Math.max(1, totalLines)
}

export function heightForWrappedLines(
  lineCount: number,
  minHeight: number,
): number {
  const contentHeight = lineCount * LINE_HEIGHT_PX + CELL_PADDING_Y
  return Math.max(minHeight, contentHeight)
}
