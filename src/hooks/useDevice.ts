import { useEffect, useState } from 'react'
import { isMobileViewport, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '../utils/device'

export function useDevice() {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport())
  const [recognitionSupported] = useState<boolean>(() => isSpeechRecognitionSupported())
  const [synthesisSupported] = useState<boolean>(() => isSpeechSynthesisSupported())

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = () => setIsMobile(isMobileViewport())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return { isMobile, recognitionSupported, synthesisSupported }
}
