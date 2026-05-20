import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecognitionError } from './useRecognize'

interface UseWhisperOptions {
  onResult?: (transcript: string, isFinal: boolean) => void
}

export function useWhisper(options: UseWhisperOptions = {}, apiKey: string) {
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<RecognitionError | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const onResultRef = useRef(options.onResult)
  onResultRef.current = options.onResult
  const cancelledRef = useRef(false)

  const reset = useCallback(() => {
    cancelledRef.current = true
    setTranscript('')
    setError(null)
    setLoading(false)
  }, [])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const start = useCallback(async () => {
    cancelledRef.current = false
    setError(null)
    setTranscript('')
    chunksRef.current = []

    if (!apiKey) {
      setError({
        code: 'service',
        message: 'Falta el API key de Groq.',
        hint: 'Agrégalo en Configuración → API key de Groq.',
      })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) ?? ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setListening(false)

        if (cancelledRef.current) return

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        if (blob.size < 500) return

        setLoading(true)
        try {
          const form = new FormData()
          form.append('file', blob, 'audio.webm')
          form.append('model', 'whisper-large-v3-turbo')
          form.append('language', 'en')
          form.append('response_format', 'json')

          const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          })

          if (!res.ok) {
            const msg = await res.text().catch(() => String(res.status))
            throw new Error(msg)
          }

          if (cancelledRef.current) return

          const data = (await res.json()) as { text: string }
          const text = data.text?.trim() ?? ''
          setTranscript(text)
          onResultRef.current?.(text, true)
        } catch (e) {
          if (cancelledRef.current) return
          setError({
            code: 'network',
            message: 'Error al procesar el audio con Groq.',
            hint: (e as Error).message,
          })
        } finally {
          if (!cancelledRef.current) setLoading(false)
        }
      }

      recorder.start()
      setListening(true)
    } catch (e) {
      const err = e as DOMException
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError({
          code: 'permission',
          message: 'Permiso de micrófono denegado.',
          hint: 'Habilita el micrófono para este sitio en la configuración del navegador.',
        })
      } else if (err?.name === 'NotFoundError') {
        setError({
          code: 'audio-capture',
          message: 'No se encontró micrófono.',
          hint: '¿Está conectado y seleccionado como dispositivo de entrada?',
        })
      } else {
        setError({
          code: 'unknown',
          message: `No se pudo acceder al micrófono: ${err?.message ?? 'error desconocido'}`,
        })
      }
    }
  }, [apiKey])

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { start, stop, reset, listening, loading, transcript, interim: '' as string, error, supported: true }
}
