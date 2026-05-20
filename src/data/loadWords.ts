import type { RawWord, Word, Batch } from '../types'
import { stripHtmlImage } from '../utils/normalize'

export const BATCH_SIZE = 50

let cache: { words: Word[]; batches: Batch[] } | null = null

function isValidRaw(w: any): w is RawWord {
  return (
    w &&
    typeof w.palabra === 'string' &&
    w.palabra.trim().length > 0 &&
    w.palabra !== 'FALSE' &&
    typeof w.traduccion === 'string' &&
    typeof w.ejemplo_en === 'string'
  )
}

function adapt(raw: RawWord): Word {
  return {
    id: raw.id,
    english: raw.palabra.trim(),
    spanish: raw.traduccion.trim(),
    ipa: raw.fonetica?.trim() ?? '',
    sentence: raw.ejemplo_en?.trim() ?? '',
    sentenceSpanish: raw.ejemplo_es?.trim() ?? '',
    sentencePhonetic: raw.ejemplo_fonetica?.trim() ?? '',
    imageFile: stripHtmlImage(raw.imagen),
    audioPron: raw.audio_pron,
    audioExample: raw.audio_ejemplo
  }
}

function buildBatches(words: Word[]): Batch[] {
  const batches: Batch[] = []
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const slice = words.slice(i, i + BATCH_SIZE)
    batches.push({
      index: batches.length,
      label: `Lote ${batches.length + 1}`,
      start: i,
      end: i + slice.length,
      size: slice.length,
      wordIds: slice.map((w) => w.id)
    })
  }
  return batches
}

export async function loadWords(): Promise<{ words: Word[]; batches: Batch[] }> {
  if (cache) return cache
  const res = await fetch('/words.json', { cache: 'force-cache' })
  if (!res.ok) throw new Error(`No se pudo cargar words.json: ${res.status}`)
  const raw = (await res.json()) as unknown[]
  const words = raw.filter(isValidRaw).map(adapt)
  const batches = buildBatches(words)
  cache = { words, batches }
  return cache
}
