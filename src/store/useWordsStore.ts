import { create } from 'zustand'
import type { Word, Batch } from '../types'
import { loadWords } from '../data/loadWords'

interface WordsState {
  words: Word[]
  batches: Batch[]
  byId: Map<number, Word>
  loading: boolean
  error: string | null
  loaded: boolean
  load: () => Promise<void>
}

export const useWordsStore = create<WordsState>((set, get) => ({
  words: [],
  batches: [],
  byId: new Map(),
  loading: false,
  error: null,
  loaded: false,
  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      const { words, batches } = await loadWords()
      const byId = new Map(words.map((w) => [w.id, w]))
      set({ words, batches, byId, loading: false, loaded: true })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  }
}))
