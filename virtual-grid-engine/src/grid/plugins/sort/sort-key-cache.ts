import type { SortKeyCache } from './types'

export function createSortKeyCache(): SortKeyCache {
  const store = new Map<string, readonly string[]>()
  return {
    get(columnId) {
      return store.get(columnId)
    },
    set(columnId, keys) {
      store.set(columnId, keys)
    },
    clear() {
      store.clear()
    },
  }
}
