import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WordProgress {
  attempts: number
  correct: number
  isHard: boolean
  lastSeen: number // epoch ms
  lastScore?: number // 0-1, latest score (typing or speaking)
}

interface ProgressState {
  progress: Record<number, WordProgress>
  recordTyping: (wordId: number, correct: boolean) => void
  recordSpeaking: (wordId: number, score: number) => void
  toggleHard: (wordId: number) => void
  markHard: (wordId: number, value: boolean) => void
  resetWord: (wordId: number) => void
  resetAll: () => void
  importProgress: (data: Record<number, WordProgress>) => void
  getProgress: (wordId: number) => WordProgress
}

const empty: WordProgress = { attempts: 0, correct: 0, isHard: false, lastSeen: 0 }

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      getProgress: (id) => get().progress[id] ?? empty,
      recordTyping: (id, correct) =>
        set((s) => {
          const p = s.progress[id] ?? { ...empty }
          return {
            progress: {
              ...s.progress,
              [id]: {
                ...p,
                attempts: p.attempts + 1,
                correct: p.correct + (correct ? 1 : 0),
                lastSeen: Date.now(),
                lastScore: correct ? 1 : 0
              }
            }
          }
        }),
      recordSpeaking: (id, score) =>
        set((s) => {
          const p = s.progress[id] ?? { ...empty }
          const ok = score >= 0.75
          return {
            progress: {
              ...s.progress,
              [id]: {
                ...p,
                attempts: p.attempts + 1,
                correct: p.correct + (ok ? 1 : 0),
                lastSeen: Date.now(),
                lastScore: score
              }
            }
          }
        }),
      toggleHard: (id) =>
        set((s) => {
          const p = s.progress[id] ?? { ...empty }
          return { progress: { ...s.progress, [id]: { ...p, isHard: !p.isHard } } }
        }),
      markHard: (id, value) =>
        set((s) => {
          const p = s.progress[id] ?? { ...empty }
          return { progress: { ...s.progress, [id]: { ...p, isHard: value } } }
        }),
      resetWord: (id) =>
        set((s) => {
          const next = { ...s.progress }
          delete next[id]
          return { progress: next }
        }),
      resetAll: () => set({ progress: {} }),
      importProgress: (data) => set({ progress: data })
    }),
    { name: 'ai-progress' }
  )
)
