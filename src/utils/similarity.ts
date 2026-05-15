import { normalize } from './normalize'

/**
 * Levenshtein distance between two strings.
 * Iterative two-row implementation, O(n*m) time, O(min(n,m)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure a is the shorter one to minimize memory
  if (a.length > b.length) [a, b] = [b, a]

  const prev = new Array(a.length + 1)
  const curr = new Array(a.length + 1)
  for (let i = 0; i <= a.length; i++) prev[i] = i

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(curr[i - 1] + 1, prev[i] + 1, prev[i - 1] + cost)
    }
    for (let i = 0; i <= a.length; i++) prev[i] = curr[i]
  }
  return prev[a.length]
}

/**
 * Returns a similarity score in [0, 1] between two strings,
 * normalized (case-insensitive, no diacritics, no punctuation).
 */
export function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na && !nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  const dist = levenshtein(na, nb)
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Word-level similarity that also rewards getting the right tokens, even if order differs slightly.
 * Useful for sentence pronunciation scoring.
 */
export function sentenceSimilarity(transcript: string, target: string): number {
  const charScore = similarity(transcript, target)

  const ta = new Set(normalize(transcript).split(' ').filter(Boolean))
  const tb = new Set(normalize(target).split(' ').filter(Boolean))
  const intersection = [...ta].filter((w) => tb.has(w)).length
  const denom = Math.max(ta.size, tb.size)
  const tokenScore = denom === 0 ? 1 : intersection / denom

  // Weighted average: char distance dominates, token presence helps
  return 0.7 * charScore + 0.3 * tokenScore
}

export function scoreToPercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100)
}

export function scoreLabel(score: number): { label: string; color: string } {
  const pct = scoreToPercent(score)
  if (pct >= 90) return { label: '¡Excelente!', color: 'text-emerald-400' }
  if (pct >= 75) return { label: 'Muy bien', color: 'text-green-400' }
  if (pct >= 60) return { label: 'Aceptable', color: 'text-yellow-400' }
  if (pct >= 40) return { label: 'Sigue practicando', color: 'text-orange-400' }
  return { label: 'Inténtalo de nuevo', color: 'text-rose-400' }
}
