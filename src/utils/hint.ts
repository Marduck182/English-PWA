export function buildHint(word: string, level: 1 | 2): string {
  const totalLetters = [...word].filter(c => /[a-zA-Z]/.test(c)).length
  const reveal = level === 1
    ? Math.max(1, Math.floor(totalLetters * 0.25))
    : Math.max(2, Math.floor(totalLetters * 0.5))
  let seen = 0
  return [...word].map(c => (/[a-zA-Z]/.test(c) ? (seen++ < reveal ? c : '_') : c)).join('')
}
