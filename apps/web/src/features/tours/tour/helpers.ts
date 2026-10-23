// Pure helpers for the tour page (no React, no IO) so they can be unit tested.
import {
  driveHoursEstimate,
  formatPeriodPt,
  formatTime,
  roadKmEstimate,
  routeTotals,
  todayIso,
  addDaysIso,
  TOUR_DATE_STATUSES,
  type Band,
  type ChecklistItem,
  type City,
  type GapSlot,
  type LatLng,
  type Producer,
  type TourDate,
  type TourDateStatus,
  type TourMember,
  type Venue,
} from '@tour/core'

// ---------------------------------------------------------------------------
// Text

/** Lowercase without accents, for searching ("São José" → "sao jose"). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

/** "Joinville/SC" */
export function cityLabel(city: { name: string; state: string }): string {
  return `${city.name}/${city.state}`
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function errorMessage(error: unknown, fallback = 'Não foi possível concluir. Tente de novo.'): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/t/${token}`
}

// ---------------------------------------------------------------------------
// Dates

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value)
}

/** Sorted copy by ISO date (stable: ties keep the server order). */
export function sortDates(dates: readonly TourDate[]): TourDate[] {
  return [...dates].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Default for "Adicionar data": the day after the last date, or today. */
export function suggestNextDate(dates: readonly TourDate[], today: string = todayIso()): string {
  const last = sortDates(dates).at(-1)
  return last ? addDaysIso(last.date, 1) : today
}

export function tourPeriodLabel(dates: readonly TourDate[]): string | null {
  const sorted = sortDates(dates)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) return null
  return formatPeriodPt(first.date, last.date)
}

const CONFIRMED: ReadonlySet<TourDateStatus> = new Set<TourDateStatus>(['confirmado', 'realizado'])

export function countConfirmed(dates: readonly TourDate[]): number {
  return dates.filter((d) => CONFIRMED.has(d.status)).length
}

export function asTourDateStatus(value: string): TourDateStatus | null {
  return TOUR_DATE_STATUSES.find((s) => s === value) ?? null
}

/** "HH:MM:SS" | "HH:MM" | null → value for <input type="time">. */
export function toTimeInput(value: string | null): string {
  return formatTime(value)
}

/** <input type="time"> value → "HH:MM" or null when empty. */
export function fromTimeInput(value: string): string | null {
  const v = value.trim()
  return v === '' ? null : v.slice(0, 5)
}

const TIME_LABELS: Array<[keyof Pick<TourDate, 'loadInTime' | 'soundcheckTime' | 'doorsTime' | 'setTime'>, string]> = [
  ['loadInTime', 'Load-in'],
  ['soundcheckTime', 'Passagem'],
  ['doorsTime', 'Portas'],
  ['setTime', 'Show'],
]

/** "Load-in 16:00 · Passagem 18:00 · Portas 20:00 · Show 22:00" (empty when no time is set). */
export function timesSummary(date: Pick<TourDate, 'loadInTime' | 'soundcheckTime' | 'doorsTime' | 'setTime'>): string {
  const parts: string[] = []
  for (const [key, label] of TIME_LABELS) {
    const t = formatTime(date[key])
    if (t) parts.push(`${label} ${t}`)
  }
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// Lookups

export type RegionIndex = {
  cities: ReadonlyMap<string, City>
  venues: ReadonlyMap<string, Venue>
  producers: ReadonlyMap<string, Producer>
  bands: ReadonlyMap<string, Band>
}

export type ResolvedTourDate = {
  date: TourDate
  city: City | null
  venue: Venue | null
  producer: Producer | null
  bands: Band[]
}

function lookup<T>(map: ReadonlyMap<string, T>, id: string | null): T | null {
  if (!id) return null
  return map.get(id) ?? null
}

/** Sorted dates with their city / venue / producer / bands resolved from the region index. */
export function resolveDates(dates: readonly TourDate[], index: RegionIndex): ResolvedTourDate[] {
  return sortDates(dates).map((date) => ({
    date,
    city: lookup(index.cities, date.cityId),
    venue: lookup(index.venues, date.venueId),
    producer: lookup(index.producers, date.producerId),
    bands: date.bands.map((b) => index.bands.get(b.bandId)).filter((b): b is Band => b !== undefined),
  }))
}

/** Where the date happens on the map: the venue when known, otherwise the city. */
export function pointOf(resolved: Pick<ResolvedTourDate, 'city' | 'venue'>): LatLng | null {
  const p = resolved.venue ?? resolved.city
  return p ? { lat: p.lat, lng: p.lng } : null
}

export type Leg = { km: number; hours: number }

export function legBetween(a: LatLng | null, b: LatLng | null): Leg | null {
  if (!a || !b) return null
  const km = roadKmEstimate(a, b)
  return { km, hours: driveHoursEstimate(km) }
}

/** Leg between each pair of consecutive dates (length = dates − 1; null when a side has no place). */
export function legsBetween(resolved: readonly ResolvedTourDate[]): Array<Leg | null> {
  const legs: Array<Leg | null> = []
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1]
    const cur = resolved[i]
    legs.push(prev && cur ? legBetween(pointOf(prev), pointOf(cur)) : null)
  }
  return legs
}

export function routePoints(resolved: readonly ResolvedTourDate[]): LatLng[] {
  const out: LatLng[] = []
  for (const r of resolved) {
    const p = pointOf(r)
    if (p) out.push(p)
  }
  return out
}

export type RouteSummary = { km: number; hours: number; dates: number; confirmed: number; cities: number; withoutCity: number }

export function routeSummary(resolved: readonly ResolvedTourDate[]): RouteSummary {
  const totals = routeTotals(routePoints(resolved))
  const cityIds = new Set<string>()
  let withoutCity = 0
  for (const r of resolved) {
    if (r.city) cityIds.add(r.city.id)
    else withoutCity++
  }
  return {
    km: totals.km,
    hours: totals.hours,
    dates: resolved.length,
    confirmed: countConfirmed(resolved.map((r) => r.date)),
    cities: cityIds.size,
    withoutCity,
  }
}

/** Marker colour per status (hex, matches TOUR_DATE_STATUS_COLORS). */
export const STATUS_MARKER_COLORS: Record<TourDateStatus, string> = {
  ideia: '#71717a',
  contato_feito: '#0284c7',
  negociando: '#d97706',
  confirmado: '#059669',
  realizado: '#10b981',
  cancelado: '#dc2626',
}

export type StopMarker = { id: string; lat: number; lng: number; label: string; title: string; color: string }

/** Numbered map markers for the dates with a place (numbering follows the timeline). */
export function stopMarkers(resolved: readonly ResolvedTourDate[]): StopMarker[] {
  const out: StopMarker[] = []
  resolved.forEach((r, i) => {
    const p = pointOf(r)
    if (!p) return
    const place = r.venue ? `${r.venue.name} · ${r.city ? cityLabel(r.city) : ''}`.replace(/ · $/, '') : r.city ? cityLabel(r.city) : ''
    out.push({
      id: r.date.id,
      lat: p.lat,
      lng: p.lng,
      label: String(i + 1),
      title: `${i + 1}. ${place}`,
      color: STATUS_MARKER_COLORS[r.date.status],
    })
  })
  return out
}

// ---------------------------------------------------------------------------
// Permissions

export function canEditTour(
  tour: { ownerId: string; members: readonly TourMember[] },
  userId: string | null | undefined,
): boolean {
  if (!userId) return false
  if (tour.ownerId === userId) return true
  return tour.members.some((m) => m.profileId === userId && m.role === 'editor')
}

// ---------------------------------------------------------------------------
// Checklist

export function checklistProgress(items: readonly ChecklistItem[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length }
}

/** "2/4" */
export function checklistLabel(items: readonly ChecklistItem[]): string {
  const p = checklistProgress(items)
  return `${p.done}/${p.total}`
}

// ---------------------------------------------------------------------------
// Money

export type MoneyParseResult = { ok: true; cents: number | null } | { ok: false; message: string }

const MONEY_INVALID = 'Valor inválido. Use, por exemplo, 1.500,00'

function invalidMoney(): MoneyParseResult {
  return { ok: false, message: MONEY_INVALID }
}

/**
 * "R$ 1.500,00" | "1500" | "1.500" | "1500,5" | "1500.50" → cents. Empty → null.
 * Comma is the decimal separator; a single dot followed by 1–2 digits also counts as decimal.
 */
export function parseBRL(input: string): MoneyParseResult {
  const raw = input.replace(/[\s ]/g, '').replace(/^R\$/i, '')
  if (raw === '') return { ok: true, cents: null }
  if (!/^[\d.,]+$/.test(raw)) return invalidMoney()

  let intPart: string
  let decPart: string
  const comma = raw.lastIndexOf(',')
  if (comma >= 0) {
    intPart = raw.slice(0, comma).replace(/\./g, '')
    decPart = raw.slice(comma + 1)
    if (!/^\d{0,2}$/.test(decPart)) return invalidMoney()
  } else {
    const groups = raw.split('.')
    if (groups.length === 1) {
      intPart = raw
      decPart = ''
    } else if (groups.length === 2 && (groups[1] ?? '').length !== 3) {
      intPart = groups[0] ?? ''
      decPart = groups[1] ?? ''
      if (!/^\d{1,2}$/.test(decPart)) return invalidMoney()
    } else {
      if (groups.slice(1).some((g) => g.length !== 3)) return invalidMoney()
      intPart = groups.join('')
      decPart = ''
    }
  }
  if (!/^\d*$/.test(intPart)) return invalidMoney()
  if (intPart === '' && decPart === '') return invalidMoney()
  const cents = Number(intPart || '0') * 100 + Number(decPart.padEnd(2, '0') || '0')
  if (!Number.isSafeInteger(cents)) return invalidMoney()
  return { ok: true, cents }
}

/** cents → "1.500,00" for a text input (empty when null). */
export function centsToInput(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type FinanceTotals = {
  feeCents: number
  costCents: number
  balanceCents: number
  datesWithFee: number
  datesWithCost: number
}

export function financeTotals(dates: readonly TourDate[]): FinanceTotals {
  let feeCents = 0
  let costCents = 0
  let datesWithFee = 0
  let datesWithCost = 0
  for (const d of dates) {
    if (d.feeCents !== null) {
      feeCents += d.feeCents
      datesWithFee++
    }
    if (d.costCents !== null) {
      costCents += d.costCents
      datesWithCost++
    }
  }
  return { feeCents, costCents, balanceCents: feeCents - costCents, datesWithFee, datesWithCost }
}

// ---------------------------------------------------------------------------
// Gaps

/** Slots for fillGaps: a date counts as fixed when pinned or when it already has a city. */
export function buildGapSlots(dates: readonly TourDate[]): GapSlot[] {
  return sortDates(dates).map((d) => ({ date: d.date, cityId: d.cityId, fixed: d.isFixed || !!d.cityId }))
}

export function datesWithoutCity(dates: readonly TourDate[]): TourDate[] {
  return sortDates(dates).filter((d) => !d.cityId)
}

// ---------------------------------------------------------------------------
// Search

export function searchByName<T extends { name: string }>(items: readonly T[], term: string, limit = 8): T[] {
  const q = normalizeText(term)
  if (!q) return []
  return items.filter((i) => normalizeText(i.name).includes(q)).slice(0, limit)
}

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Venues of a city, name-sorted. */
export function venuesOfCity(venues: readonly Venue[], cityId: string | null): Venue[] {
  if (!cityId) return []
  return sortByName(venues.filter((v) => v.cityId === cityId))
}

/** Producers serving a city, name-sorted. */
export function producersOfCity(producers: readonly Producer[], cityId: string | null): Producer[] {
  if (!cityId) return []
  return sortByName(producers.filter((p) => p.cityIds.includes(cityId)))
}

/** Bands based in a city, name-sorted. */
export function bandsOfCity(bands: readonly Band[], cityId: string | null): Band[] {
  if (!cityId) return []
  return sortByName(bands.filter((b) => b.cityId === cityId))
}

export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}
