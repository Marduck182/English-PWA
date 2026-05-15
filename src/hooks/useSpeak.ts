import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'

/**
 * Hook for browser-native Text-to-Speech using SpeechSynthesis API.
 * Picks the best available English voice.
 */
export function useSpeak() {
  const lang = useSettingsStore((s) => s.speechLang)
  const rate = useSettingsStore((s) => s.speechRate)
  const speechVoiceURI = useSettingsStore((s) => s.speechVoiceURI)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const update = () => setVoices(window.speechSynthesis.getVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!voices.length) return undefined
    if (speechVoiceURI) {
      const saved = voices.find((v) => v.voiceURI === speechVoiceURI)
      if (saved) return saved
    }
    const langPrefix = lang.split('-')[0]
    const exact = voices.find((v) => v.lang === lang)
    if (exact) return exact
    const sameLang = voices.find((v) => v.lang.startsWith(langPrefix))
    if (sameLang) return sameLang
    return voices[0]
  }, [voices, lang, speechVoiceURI])

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      u.rate = rate
      u.pitch = 1
      const v = pickVoice()
      if (v) u.voice = v
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      utteranceRef.current = u
      window.speechSynthesis.speak(u)
    },
    [lang, rate, pickVoice]
  )

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, voices, supported: typeof window !== 'undefined' && 'speechSynthesis' in window }
}
