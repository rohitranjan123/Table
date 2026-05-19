/** Coalesces scroll/resize work into a single animation frame. */
export class ScrollScheduler {
  private rafId: number | null = null
  private callback: (() => void) | null = null

  schedule(fn: () => void): void {
    this.callback = fn
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      const run = this.callback
      this.callback = null
      run?.()
    })
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.callback = null
  }
}
