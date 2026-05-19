import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CacheState {
  cache: Record<string, string>
  getEntry: (text: string) => string | null
  setEntry: (text: string, value: string) => void
  deleteEntry: (text: string) => void
}

function key(text: string): string {
  return text.toLowerCase().trim()
}

export const usePronunciationCache = create<CacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      getEntry: (text) => get().cache[key(text)] ?? null,
      setEntry: (text, value) =>
        set((s) => ({ cache: { ...s.cache, [key(text)]: value } })),
      deleteEntry: (text) =>
        set((s) => { const next = { ...s.cache }; delete next[key(text)]; return { cache: next } }),
    }),
    { name: 'pronunciation-cache' }
  )
)
