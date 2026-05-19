// Convert Merriam-Webster phonetic notation to Spanish phonetic string
// Examples: "ˈbōt" → "bóut", "ə-ˈgrē" → "egrí", "ˈwīn" → "uáin"

const TILDE: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' }

function addTilde(s: string): string {
  return s.replace(/[aeiou]/, m => TILDE[m] ?? m)
}

type CharResult = { consumed: number; output: string; isVowel: boolean }

function convertAt(s: string, i: number, stressed: boolean): CharResult {
  const c = s[i]
  const two = s.slice(i, i + 2)

  // Multi-char sequences (check before single chars)
  if (two === 'sh') return { consumed: 2, output: 'sh', isVowel: false }
  if (two === 'ch') return { consumed: 2, output: 'ch', isVowel: false }
  if (two === 'th') return { consumed: 2, output: 'd', isVowel: false }
  if (two === 'ng') return { consumed: 2, output: 'ng', isVowel: false }
  if (two === 'zh') return { consumed: 2, output: 'sh', isVowel: false }

  // MW special vowels
  const specialVowels: Record<string, string> = {
    'ā': 'ei', 'ē': 'i', 'ī': 'ai', 'ō': 'ou', 'ü': 'u', 'ȯ': 'o',
  }
  if (c in specialVowels) {
    const out = specialVowels[c]
    return { consumed: 1, output: stressed ? addTilde(out) : out, isVowel: true }
  }

  // Schwa: stressed ə = /ʌ/ → 'a', unstressed ə = /ə/ → 'e'
  if (c === 'ə') {
    return { consumed: 1, output: stressed ? 'á' : 'e', isVowel: true }
  }

  // Simple vowels
  if ('aeiou'.includes(c)) {
    return { consumed: 1, output: stressed ? addTilde(c) : c, isVowel: true }
  }

  // Consonants
  const consonants: Record<string, string> = {
    b: 'b', d: 'd', f: 'f', g: 'g', h: 'j',
    j: 'y', k: 'k', l: 'l', m: 'm', n: 'n',
    p: 'p', r: 'r', s: 's', t: 't', v: 'v',
    w: 'u', y: 'y', z: 's',
  }
  if (c in consonants) return { consumed: 1, output: consonants[c], isVowel: false }

  // Unknown char — drop it
  return { consumed: 1, output: '', isVowel: false }
}

export function mwToSpanish(mw: string): string {
  if (!mw) return ''

  let s = mw
    .replace(/\([^)]*\)/g, '')         // remove optional sounds: (t)
    .replace(/[̀-ͯ]/g, '')   // remove combining diacriticals (t͟h → th)
    .replace(/ᵊ/g, '')            // remove superscript schwa ᵊ
    .replace(/-/g, '')                 // remove syllable separators
    .replace(/ˌ/g, '')                 // remove secondary stress

  let result = ''
  let stressed = false
  let i = 0

  while (i < s.length) {
    if (s[i] === 'ˈ') {
      stressed = true
      i++
      continue
    }

    const { consumed, output, isVowel } = convertAt(s, i, stressed)
    result += output
    if (isVowel) stressed = false
    i += consumed
  }

  return result
}
