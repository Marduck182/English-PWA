import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'

// Webkit type shim
type SpeechRecognitionCtor = new () => SpeechRecognition

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  length: number
  isFinal: boolean
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

interface UseRecognizeOptions {
  onResult?: (transcript: string, isFinal: boolean) => void
}

export interface RecognitionError {
  code: 'no-support' | 'insecure-context' | 'permission' | 'network' | 'no-speech' | 'audio-capture' | 'service' | 'unknown'
  message: string
  hint?: string
}

function isSecureish(): boolean {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

export function useRecognize(options: UseRecognizeOptions = {}) {
  const lang = useSettingsStore((s) => s.speechLang)
  const Ctor = (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null
  const supported = !!Ctor

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<RecognitionError | null>(null)
  const onResultRef = useRef(options.onResult)
  onResultRef.current = options.onResult
  const retryCountRef = useRef(0)
  const shouldRestartRef = useRef(false)
  const lastFinalRef = useRef('')
  const startRef = useRef<(isAutoRetry?: boolean) => Promise<void>>(async () => {})

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }, [])

  const start = useCallback(async (isAutoRetry = false) => {
    if (!isAutoRetry) retryCountRef.current = 0
    shouldRestartRef.current = false
    lastFinalRef.current = ''
    setError(null)
    setTranscript('')
    setInterim('')

    if (!Ctor) {
      setError({
        code: 'no-support',
        message: 'Reconocimiento de voz no soportado en este navegador.',
        hint: 'Usa Chrome o Edge en desktop, o Chrome para Android.'
      })
      return
    }

    if (!isSecureish()) {
      setError({
        code: 'insecure-context',
        message: 'El micrófono requiere HTTPS o localhost.',
        hint: 'Estás accediendo por una IP de LAN sobre HTTP. Crea un túnel HTTPS con `ngrok http 5173` o `cloudflared tunnel --url http://localhost:5173` y abre la URL https que te da.'
      })
      return
    }

    // Pre-flight permission request via getUserMedia.
    // This explicitly triggers the browser's mic permission dialog,
    // which SpeechRecognition by itself doesn't always do reliably on mobile.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop()) // we just wanted permission
      }
    } catch (e) {
      const err = e as DOMException
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError({
          code: 'permission',
          message: 'Permiso de micrófono denegado.',
          hint: 'Habilita el micrófono para este sitio en la configuración del navegador, luego recarga la página.'
        })
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setError({
          code: 'audio-capture',
          message: 'No se encontró un micrófono disponible.',
          hint: '¿Está conectado y seleccionado como dispositivo de entrada?'
        })
      } else {
        setError({
          code: 'unknown',
          message: `No se pudo acceder al micrófono: ${err?.message || err?.name || 'error desconocido'}`,
          hint: 'Revisa permisos del sitio en la barra de direcciones.'
        })
      }
      return
    }

    const rec = new Ctor()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onstart = () => {
      setListening(true)
      shouldRestartRef.current = true
    }
    rec.onend = () => {
      setListening(false)
      if (shouldRestartRef.current) {
        // Browser stopped silently (pause, no-speech timeout, etc.) — restart transparently
        const capturedRef = shouldRestartRef
        setTimeout(() => {
          if (capturedRef.current) startRef.current(true)
        }, 300)
      }
    }
    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      setListening(false)
      switch (ev.error) {
        case 'not-allowed':
          shouldRestartRef.current = false
          setError({
            code: 'permission',
            message: 'Permiso de micrófono denegado.',
            hint: 'Habilita el micrófono para este sitio en la configuración del navegador y recarga.'
          })
          break
        case 'service-not-allowed':
          shouldRestartRef.current = false
          setError({
            code: 'service',
            message: 'El navegador bloqueó el servicio de reconocimiento.',
            hint: 'Si el sitio no es HTTPS, usa un túnel HTTPS (ngrok / cloudflared).'
          })
          break
        case 'no-speech':
          // Let onend handle the restart silently — no error shown
          break
        case 'audio-capture':
          shouldRestartRef.current = false
          setError({
            code: 'audio-capture',
            message: 'No se pudo capturar audio.',
            hint: 'Revisa que el micrófono esté conectado y seleccionado en el sistema.'
          })
          break
        case 'network':
          // Prevent double-restart: onend will fire after this, but shouldRestart will be false
          shouldRestartRef.current = false
          if (retryCountRef.current < 2) {
            retryCountRef.current++
            setTimeout(() => startRef.current(true), 800)
          } else {
            setError({
              code: 'network',
              message: 'El servicio de voz no respondió.',
              hint: 'Suele pasar de forma aleatoria — intenta de nuevo. Si persiste, desactiva extensiones del navegador temporalmente.'
            })
          }
          break
        case 'aborted':
          shouldRestartRef.current = false
          break
        default:
          shouldRestartRef.current = false
          setError({
            code: 'unknown',
            message: `Error: ${ev.error}`,
            hint: ev.message || undefined
          })
      }
    }
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      // Rebuild full transcript from all results to avoid duplication on mobile
      // (Chrome mobile sometimes resets ev.resultIndex to 0 mid-session)
      let allFinals = ''
      let interimText = ''
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) allFinals += r[0].transcript + ' '
        else interimText += r[0].transcript
      }

      const finalTrimmed = allFinals.trim()
      if (finalTrimmed) {
        shouldRestartRef.current = false
        setTranscript(finalTrimmed)
        setInterim('')
        // Only fire onResult when we have genuinely new final text
        if (finalTrimmed !== lastFinalRef.current) {
          lastFinalRef.current = finalTrimmed
          onResultRef.current?.(finalTrimmed, true)
        }
      }
      if (interimText) {
        setInterim(interimText)
        onResultRef.current?.(interimText.trim(), false)
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch (e) {
      setError({
        code: 'unknown',
        message: (e as Error).message
      })
      setListening(false)
    }
  }, [Ctor, lang])

  useEffect(() => {
    startRef.current = start
  }, [start])

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  return { start, stop, reset, listening, transcript, interim, error, supported }
}
