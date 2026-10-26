// Small pt-BR text helpers shared by the features (no React, no IO).

/** Lowercase, trimmed, without diacritics ("São José" → "sao jose"), for searching. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** "1 casa" / "3 casas". */
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
