import type { CSSProperties } from 'react'

export interface SpacingValue {
  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
  all?: string | number
}

export interface StyleProperties {
  backgroundColor?: string
  color?: string
  fontSize?: string | number
  fontWeight?: string | number
  lineHeight?: string | number
  fontFamily?: string
  letterSpacing?: string | number
  padding?: string | number | SpacingValue
  margin?: string | number | SpacingValue
  borderWidth?: string | number
  borderColor?: string
  borderStyle?: string
  borderRadius?: string | number
  width?: string | number
  height?: string | number
  minWidth?: string | number
  minHeight?: string | number
  maxWidth?: string | number
  maxHeight?: string | number
  boxShadow?: string
  opacity?: number
  gap?: string | number
  accentColor?: string
  hover?: Partial<StyleProperties>
  active?: Partial<StyleProperties>
  disabled?: Partial<StyleProperties>
  selected?: Partial<StyleProperties>
}

export interface ResolvedStyle {
  className?: string
  style: CSSProperties
  inlineHtml: Record<string, string>
}
