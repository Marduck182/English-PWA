import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type DesktopMode = 'typing' | 'speaking'
export type SpeakMode = 'word' | 'sentence'
export type PronunciationSource = 'ipa' | 'ai'

interface SettingsState {
  theme: Theme
  desktopMode: DesktopMode
  speechRate: number
  speechLang: string
  speechVoiceURI: string
  autoPlaySound: boolean
  speakMode: SpeakMode
  speechStrictness: number
  showIPA: boolean
  showBatchList: boolean
  pronunciationSource: PronunciationSource
  autoShowPronunciation: boolean
  toggleTheme: () => void
  setDesktopMode: (m: DesktopMode) => void
  setSpeechRate: (r: number) => void
  setAutoPlaySound: (v: boolean) => void
  setSpeakMode: (m: SpeakMode) => void
  setSpeechVoiceURI: (uri: string) => void
  setSpeechStrictness: (value: number) => void
  setShowIPA: (v: boolean) => void
  setShowBatchList: (v: boolean) => void
  setPronunciationSource: (v: PronunciationSource) => void
  setAutoShowPronunciation: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      desktopMode: 'typing',
      speechRate: 0.95,
      speechLang: 'en-US',
      speechVoiceURI: '',
      autoPlaySound: false,
      speakMode: 'sentence',
      speechStrictness: 0.8,
      showIPA: true,
      showBatchList: false,
      pronunciationSource: 'ipa',
      autoShowPronunciation: false,
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setDesktopMode: (m) => set({ desktopMode: m }),
      setSpeechRate: (r) => set({ speechRate: r }),
      setAutoPlaySound: (v) => set({ autoPlaySound: v }),
      setSpeakMode: (m) => set({ speakMode: m }),
      setSpeechVoiceURI: (uri) => set({ speechVoiceURI: uri }),
      setSpeechStrictness: (value) => set({ speechStrictness: value }),
      setShowIPA: (v) => set({ showIPA: v }),
      setShowBatchList: (v) => set({ showBatchList: v }),
      setPronunciationSource: (v) => set({ pronunciationSource: v }),
      setAutoShowPronunciation: (v) => set({ autoShowPronunciation: v })
    }),
    { name: 'ai-settings' }
  )
)
