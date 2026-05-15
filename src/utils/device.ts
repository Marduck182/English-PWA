export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  const narrow = window.matchMedia('(max-width: 768px)').matches
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  return narrow && touch
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window
}
