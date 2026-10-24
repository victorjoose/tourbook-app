// Pure helpers shared by the PDF document, the HTML rendering and the pages (unit-tested).
import { buildTourbook, formatCurrencyBRL, formatDatePt, formatHours, formatKm, slugify, toIsoDate } from '@tour/core'
import { isValid } from 'date-fns'
import { safeHttpUrl } from '../../lib/safeUrl'
import type { RegionData, Tourbook, TourbookContact, TourbookDay, TourWithDates } from '@tour/core'

export const PDF_FILE_SUFFIX = '-tourbook.pdf'
const FALLBACK_SLUG = 'turne'

/** '<slug do título>-tourbook.pdf'; titles without letters or digits fall back to 'turne'. */
export function tourbookFileName(title: string): string {
  const slug = slugify(title)
  return `${slug || FALLBACK_SLUG}${PDF_FILE_SUFFIX}`
}

/** Tourbook for a tour the user owns, using the region data as lookups. */
export function buildTourbookFromTour(tour: TourWithDates, region: RegionData, hideMoney: boolean): Tourbook {
  return buildTourbook({
    tour,
    dates: tour.dates,
    lookups: { cities: region.cities, venues: region.venues, bands: region.bands, producers: region.producers },
    hideMoney,
  })
}

export { safeHttpUrl }

const INSTAGRAM_HOST = /^(?:https?:\/\/)?(?:www\.)?instagram\.com(?:\/|$)/i
const HANDLE = /^[A-Za-z0-9._]{1,30}$/

/** '@handle', 'handle', 'instagram.com/handle' or a full URL → 'handle'; null when it is not a usable handle. */
export function instagramHandle(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return null
  let candidate = trimmed
  if (INSTAGRAM_HOST.test(trimmed)) {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      candidate = new URL(withScheme).pathname.split('/').filter(Boolean)[0] ?? ''
    } catch {
      return null
    }
  }
  const handle = candidate.replace(/^@+/, '')
  return HANDLE.test(handle) ? handle : null
}

/** Safe profile link (always https://instagram.com/<handle>) or null. */
export function instagramUrl(value: string | null | undefined): string | null {
  const handle = instagramHandle(value)
  return handle ? `https://instagram.com/${handle}` : null
}

/** '@handle' for display; falls back to the raw text when the handle cannot be parsed. */
export function instagramLabel(value: string): string {
  const handle = instagramHandle(value)
  return handle ? `@${handle}` : value.trim()
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function mailtoUrl(email: string | null | undefined): string | null {
  const trimmed = email?.trim() ?? ''
  return EMAIL.test(trimmed) ? `mailto:${trimmed}` : null
}

/** Display name of a contact: the person, or the place when no name was given. */
export function contactName(contact: TourbookContact): string {
  return contact.name ?? contact.label
}

/**
 * 'Cachê fixo · R$ 1.500,00' | 'Cachê fixo' | 'R$ 1.500,00'.
 * Null in the team version (hideMoney) or when nothing about the deal is known.
 */
export function dealLabel(deal: TourbookDay['deal'], hideMoney: boolean): string | null {
  if (hideMoney) return null
  const parts = [deal.type, deal.feeLabel].filter((p): p is string => p !== null && p !== '')
  return parts.length > 0 ? parts.join(' · ') : null
}

export type LabeledValue = { label: string; value: string }

export const TIME_LABELS = {
  loadIn: 'Load-in',
  soundcheck: 'Passagem de som',
  doors: 'Porta',
  set: 'Show',
} as const

/** Only the times that were filled in, in the order of the night. */
export function timeRows(times: TourbookDay['times']): LabeledValue[] {
  const rows: LabeledValue[] = []
  if (times.loadIn) rows.push({ label: TIME_LABELS.loadIn, value: times.loadIn })
  if (times.soundcheck) rows.push({ label: TIME_LABELS.soundcheck, value: times.soundcheck })
  if (times.doors) rows.push({ label: TIME_LABELS.doors, value: times.doors })
  if (times.set) rows.push({ label: TIME_LABELS.set, value: times.set })
  return rows
}

/** 'Próximo trecho: 130 km (~2h) até Curitiba/PR' */
export function nextLegLabel(leg: NonNullable<TourbookDay['nextLeg']>): string {
  return `Próximo trecho: ${formatKm(leg.km)} (~${formatHours(leg.hours)}) até ${leg.toCity}`
}

/** Cover numbers: dates, confirmed, km, hours (+ the fee total in the full version). */
export function totalsItems(tourbook: Tourbook, hideMoney: boolean): LabeledValue[] {
  const t = tourbook.totals
  const items: LabeledValue[] = [
    { label: 'Datas', value: String(t.dates) },
    { label: 'Confirmadas', value: String(t.confirmed) },
    { label: 'Estrada', value: formatKm(t.km) },
    { label: 'Horas de estrada', value: formatHours(t.hours) },
  ]
  if (!hideMoney && t.feeCents > 0) items.push({ label: 'Cachê previsto', value: formatCurrencyBRL(t.feeCents) })
  return items
}

/** Cities in timeline order, without repeating consecutive ones: 'Joinville/SC · Curitiba/PR'. */
export function routeLabel(tourbook: Tourbook): string | null {
  const labels: string[] = []
  for (const day of tourbook.days) {
    const label = day.city ? `${day.city.name}/${day.city.state}` : null
    if (label && labels[labels.length - 1] !== label) labels.push(label)
  }
  return labels.length > 0 ? labels.join(' · ') : null
}

export function dayCounter(index: number, total: number): string {
  return `Dia ${index + 1} de ${total}`
}

export function cityLabelOf(day: TourbookDay): string {
  return day.city ? `${day.city.name}/${day.city.state}` : 'Cidade a definir'
}

/** 'Banda X · abertura' or just the name. */
export function bandLine(band: TourbookDay['bands'][number]): string {
  const role = band.role.trim()
  return role ? `${band.name} · ${role}` : band.name
}

/** 'sex, 06/03' from an ISO timestamp; null when the value is not a date. */
export function generatedAtLabel(generatedAt: string | null | undefined): string | null {
  if (!generatedAt) return null
  // Instante UTC → dia do calendário local (às 22h em Brasília ainda é "hoje").
  const instant = new Date(generatedAt)
  return isValid(instant) ? formatDatePt(toIsoDate(instant), 'short') : null
}
