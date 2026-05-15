import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type DesktopMode = 'typing' | 'speaking'
export type SpeakMode = 'word' | 'sentence'

interface SettingsState {
  theme: Theme
  desktopMode: DesktopMode
  speechRate: number
  speechLang: string
  speechVoiceURI: string
  autoPlaySound: boolean
  speakMode: SpeakMode
  toggleTheme: () => void
  setDesktopMode: (m: DesktopMode) => void
  setSpeechRate: (r: number) => void
  setAutoPlaySound: (v: boolean) => void
  setSpeakMode: (m: SpeakMode) => void
  setSpeechVoiceURI: (uri: string) => void
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
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setDesktopMode: (m) => set({ desktopMode: m }),
      setSpeechRate: (r) => set({ speechRate: r }),
      setAutoPlaySound: (v) => set({ autoPlaySound: v }),
      setSpeakMode: (m) => set({ speakMode: m }),
      setSpeechVoiceURI: (uri) => set({ speechVoiceURI: uri })
    }),
    { name: 'ai-settings' }
  )
)
