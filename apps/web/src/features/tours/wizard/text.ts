/** Lowercase without accents, for searching ("São José" → "sao jose"). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

/** "Joinville – SC" */
export function cityLabel(city: { name: string; state: string }): string {
  return `${city.name} – ${city.state}`
}
