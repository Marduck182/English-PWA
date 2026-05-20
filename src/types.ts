// Raw structure as stored in /public/words.json
export interface RawWord {
  id: number
  palabra: string
  imagen?: string
  audio_pron?: string
  audio_ejemplo?: string
  traduccion: string
  ejemplo_en: string
  ejemplo_es: string
  fonetica: string
  ejemplo_fonetica?: string
}

// Normalized structure used throughout the app
export interface Word {
  id: number
  english: string
  spanish: string
  ipa: string // Merriam-Webster phonetic — kept as-is
  sentence: string
  sentenceSpanish: string
  sentencePhonetic: string // Spanish phonetic approximation from words.json
  imageFile?: string
  audioPron?: string
  audioExample?: string
}

export interface Batch {
  index: number // 0-based
  label: string // "Lote 1"
  start: number // inclusive
  end: number // exclusive
  size: number
  wordIds: number[]
}

export type PracticeMode = 'typing' | 'speaking'
