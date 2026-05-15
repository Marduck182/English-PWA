/**
 * Strip leading/trailing whitespace, normalize internal whitespace, lowercase.
 * Used for typing comparison and pronunciation scoring.
 */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics for tolerant compare
    .toLowerCase()
    .replace(/[.,!?;:¡¿"'`´()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strip HTML tags from a string and return just the inner text/src.
 * Some `imagen` fields come wrapped as `<img src="X.jpg" />` — we keep just `X.jpg`.
 */
export function stripHtmlImage(s: string | undefined): string | undefined {
  if (!s) return undefined
  const match = s.match(/src="([^"]+)"/i)
  if (match) return match[1]
  return s.replace(/<[^>]+>/g, '').trim() || undefined
}
