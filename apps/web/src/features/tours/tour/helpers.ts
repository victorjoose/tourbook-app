// Pure helpers for the tour page (no React, no IO) so they can be unit tested.
import {
  DEAL_TYPES,
  TOUR_DATE_STATUSES,
  MAX_KM_PER_DAY,
  MIN_KM_PER_DAY,
  addDaysIso,
  driveHoursEstimate,
  formatHours,
  formatKm,
  formatPeriodPt,
  formatTime,
  roadKmEstimate,
  routeTotals,
  todayIso,
  type Band,
  type ChecklistItem,
  type City,
  type DealType,
  type GapSlot,
  type LatLng,
  type Producer,
  type SuggestConstraints,
  type Tour,
  type TourDate,
  type TourDatePatch,
  type TourDateStatus,
  type TourMemberRole,
  type TourWithDates,
  type Venue,
} from '@tour/core'
import { normalizeText } from '../../../lib/text'

// ---------------------------------------------------------------------------
// Text

/** "Joinville/SC" */
export function cityLabel(city: { name: string; state: string }): string {
  return `${city.name}/${city.state}`
}

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/t/${token}`
}

/** Trimmed text or null when empty. */
export function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/** "Banda A, Banda B e Banda C" */
export function joinNamesPt(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1) ?? ''}`
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

export function asDealType(value: string): DealType | null {
  return DEAL_TYPES.find((d) => d === value) ?? null
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

/** "130 km · 1h50" */
export function legLabel(leg: Leg): string {
  return `${formatKm(leg.km)} · ${formatHours(leg.hours)}`
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

/** Input for `routeAlerts` (date + resolved city). */
export function alertInputs(resolved: readonly ResolvedTourDate[]): Array<{ date: string; city: City | null }> {
  return resolved.map((r) => ({ date: r.date.date, city: r.city }))
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

export function sameBounds(
  a: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null,
  b: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.minLat === b.minLat && a.minLng === b.minLng && a.maxLat === b.maxLat && a.maxLng === b.maxLng
}

// ---------------------------------------------------------------------------
// Permissions (SPEC: owner or memberRoles[uid] === 'editor')

export type TourAccess = { ownerId: string; memberRoles: Record<string, TourMemberRole> }

export function canEditTour(tour: TourAccess, userId: string | null | undefined): boolean {
  if (!userId) return false
  if (tour.ownerId === userId) return true
  return tour.memberRoles[userId] === 'editor'
}

export function isTourOwner(tour: Pick<TourAccess, 'ownerId'>, userId: string | null | undefined): boolean {
  return !!userId && tour.ownerId === userId
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

export function toggleChecklistItem(items: readonly ChecklistItem[], index: number): ChecklistItem[] {
  return items.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
}

/** Appends a trimmed label; ignores empty labels. */
export function addChecklistItem(items: readonly ChecklistItem[], label: string): ChecklistItem[] {
  const trimmed = label.trim()
  if (trimmed === '') return [...items]
  return [...items, { label: trimmed, done: false }]
}

export function removeChecklistItem(items: readonly ChecklistItem[], index: number): ChecklistItem[] {
  return items.filter((_, i) => i !== index)
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
  const raw = input.replace(/[\s ]/g, '').replace(/^R\$/i, '')
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

/** Constraints for the suggestion engine, taken from the tour. */
export function suggestConstraintsOf(tour: Pick<Tour, 'maxKmPerDay' | 'genres' | 'capacityMin' | 'capacityMax'>): SuggestConstraints {
  return {
    maxKmPerDay: tour.maxKmPerDay,
    genres: tour.genres,
    capacityMin: tour.capacityMin,
    capacityMax: tour.capacityMax,
  }
}

/** Start city for fillGaps: the tour's start city, otherwise the first date that already has a city. */
export function startCityFor(
  tour: Pick<Tour, 'startCityId'>,
  cities: ReadonlyMap<string, City>,
  resolved: readonly ResolvedTourDate[],
): City | null {
  const fromTour = lookup(cities, tour.startCityId)
  if (fromTour) return fromTour
  return resolved.find((r) => r.city !== null)?.city ?? null
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

// ---------------------------------------------------------------------------
// Optimistic cache updates

/** Applies an `updateTourDate` patch to a cached TourDate (same conversions the mappers do). */
export function mergeDatePatch(date: TourDate, patch: TourDatePatch): TourDate {
  const next: TourDate = { ...date }
  if (patch.date !== undefined) next.date = patch.date
  if (patch.cityId !== undefined) next.cityId = patch.cityId
  if (patch.venueId !== undefined) next.venueId = patch.venueId
  if (patch.producerId !== undefined) next.producerId = patch.producerId
  if (patch.status !== undefined) next.status = asTourDateStatus(patch.status) ?? date.status
  if (patch.isFixed !== undefined) next.isFixed = patch.isFixed
  if (patch.loadInTime !== undefined) next.loadInTime = patch.loadInTime
  if (patch.soundcheckTime !== undefined) next.soundcheckTime = patch.soundcheckTime
  if (patch.doorsTime !== undefined) next.doorsTime = patch.doorsTime
  if (patch.setTime !== undefined) next.setTime = patch.setTime
  if (patch.dealType !== undefined) next.dealType = patch.dealType === null ? null : asDealType(patch.dealType)
  if (patch.feeCents !== undefined) next.feeCents = patch.feeCents
  if (patch.costCents !== undefined) next.costCents = patch.costCents
  if (patch.lodging !== undefined) next.lodging = patch.lodging
  if (patch.notes !== undefined) next.notes = patch.notes
  if (patch.checklist !== undefined) next.checklist = patch.checklist.map((i) => ({ label: i.label, done: i.done }))
  if (patch.bands !== undefined) next.bands = patch.bands.map((b) => ({ bandId: b.bandId, role: b.role }))
  return next
}

/** New cached tour with one date patched (dates not matching `dateId` keep their identity). */
export function applyDatePatch(tour: TourWithDates, dateId: string, patch: TourDatePatch): TourWithDates {
  return { ...tour, dates: tour.dates.map((d) => (d.id === dateId ? mergeDatePatch(d, patch) : d)) }
}

/** New cached tour without the date (for an optimistic delete). */
export function removeDate(tour: TourWithDates, dateId: string): TourWithDates {
  return { ...tour, dates: tour.dates.filter((d) => d.id !== dateId) }
}

// ---------------------------------------------------------------------------
// Date editor (form state ↔ patch)

export type DateEditorValues = {
  date: string
  cityId: string | null
  venueId: string | null
  producerId: string | null
  status: TourDateStatus
  isFixed: boolean
  loadInTime: string
  soundcheckTime: string
  doorsTime: string
  setTime: string
  /** '' = no deal type chosen. */
  dealType: DealType | ''
  /** Money as typed ("1.500,00"). */
  fee: string
  cost: string
  lodging: string
  notes: string
  checklist: ChecklistItem[]
  bandIds: string[]
}

export type DateEditorErrors = Partial<Record<'date' | 'fee' | 'cost', string>>

export function editorValuesOf(date: TourDate): DateEditorValues {
  return {
    date: date.date,
    cityId: date.cityId,
    venueId: date.venueId,
    producerId: date.producerId,
    status: date.status,
    isFixed: date.isFixed,
    loadInTime: toTimeInput(date.loadInTime),
    soundcheckTime: toTimeInput(date.soundcheckTime),
    doorsTime: toTimeInput(date.doorsTime),
    setTime: toTimeInput(date.setTime),
    dealType: date.dealType ?? '',
    fee: centsToInput(date.feeCents),
    cost: centsToInput(date.costCents),
    lodging: date.lodging ?? '',
    notes: date.notes ?? '',
    checklist: date.checklist.map((i) => ({ label: i.label, done: i.done })),
    bandIds: date.bands.map((b) => b.bandId),
  }
}

export type EditorPatchResult = { ok: true; patch: TourDatePatch } | { ok: false; errors: DateEditorErrors }

/** Validates the form and builds the single `updateTourDate` patch. */
export function editorPatchOf(values: DateEditorValues): EditorPatchResult {
  const errors: DateEditorErrors = {}
  if (!isIsoDate(values.date)) errors.date = 'Informe a data do show'
  const fee = parseBRL(values.fee)
  if (!fee.ok) errors.fee = fee.message
  const cost = parseBRL(values.cost)
  if (!cost.ok) errors.cost = cost.message
  if (!fee.ok || !cost.ok || errors.date) return { ok: false, errors }

  const uniqueBandIds = [...new Set(values.bandIds)]
  return {
    ok: true,
    patch: {
      date: values.date,
      cityId: values.cityId,
      venueId: values.cityId ? values.venueId : null,
      producerId: values.cityId ? values.producerId : null,
      status: values.status,
      isFixed: values.isFixed,
      loadInTime: fromTimeInput(values.loadInTime),
      soundcheckTime: fromTimeInput(values.soundcheckTime),
      doorsTime: fromTimeInput(values.doorsTime),
      setTime: fromTimeInput(values.setTime),
      dealType: values.dealType === '' ? null : values.dealType,
      feeCents: fee.cents,
      costCents: cost.cents,
      lodging: textOrNull(values.lodging),
      notes: textOrNull(values.notes),
      checklist: values.checklist
        .map((i) => ({ label: i.label.trim(), done: i.done }))
        .filter((i) => i.label !== ''),
      bands: uniqueBandIds.map((bandId) => ({ bandId, role: 'convidada' })),
    },
  }
}

/**
 * When the city changes, a venue / producer from another city no longer applies.
 * Returns the values with those references cleared when needed.
 */
export function withCity(
  values: DateEditorValues,
  cityId: string | null,
  lookups: { venues: ReadonlyMap<string, Venue>; producers: ReadonlyMap<string, Producer> },
): DateEditorValues {
  const venue = lookup(lookups.venues, values.venueId)
  const producer = lookup(lookups.producers, values.producerId)
  const keepVenue = cityId !== null && venue !== null && venue.cityId === cityId
  const keepProducer = cityId !== null && producer !== null && producer.cityIds.includes(cityId)
  return {
    ...values,
    cityId,
    venueId: keepVenue ? values.venueId : null,
    producerId: keepProducer ? values.producerId : null,
  }
}

/** Picking a venue also sets its city. */
export function withVenue(values: DateEditorValues, venue: Venue | null): DateEditorValues {
  if (!venue) return { ...values, venueId: null }
  return { ...values, venueId: venue.id, cityId: venue.cityId }
}

// ---------------------------------------------------------------------------
// Tour editor (name / band / km per day)

export type TourEditorValues = { name: string; bandName: string; maxKmPerDay: string }

export type TourEditorErrors = Partial<Record<keyof TourEditorValues, string>>

export { MAX_KM_PER_DAY, MIN_KM_PER_DAY }

export function tourEditorValuesOf(tour: Pick<Tour, 'name' | 'bandName' | 'maxKmPerDay'>): TourEditorValues {
  return { name: tour.name, bandName: tour.bandName, maxKmPerDay: String(tour.maxKmPerDay) }
}

export type TourEditorResult =
  | { ok: true; patch: { name: string; bandName: string; maxKmPerDay: number } }
  | { ok: false; errors: TourEditorErrors }

/** Same limits as `tourFormSchema`. */
export function tourEditorPatchOf(values: TourEditorValues): TourEditorResult {
  const errors: TourEditorErrors = {}
  const name = values.name.trim()
  const bandName = values.bandName.trim()
  if (name.length < 2) errors.name = 'Dê um nome à turnê'
  else if (name.length > 80) errors.name = 'Máximo de 80 caracteres'
  if (bandName.length < 1) errors.bandName = 'Informe a banda'
  else if (bandName.length > 80) errors.bandName = 'Máximo de 80 caracteres'
  const km = Number(values.maxKmPerDay.trim())
  if (values.maxKmPerDay.trim() === '' || !Number.isInteger(km)) errors.maxKmPerDay = 'Informe um número inteiro de km'
  else if (km < MIN_KM_PER_DAY) errors.maxKmPerDay = `Mínimo ${MIN_KM_PER_DAY} km`
  else if (km > MAX_KM_PER_DAY) errors.maxKmPerDay = `Máximo ${MAX_KM_PER_DAY} km`
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, patch: { name, bandName, maxKmPerDay: km } }
}
