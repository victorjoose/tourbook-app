// Modelo do tourbook (dados prontos para o PDF e para a página pública).
// Pure and deterministic: everything is derived from the tour, its dates and the lookups.
import { DEAL_TYPE_LABELS, TOUR_DATE_STATUS_LABELS } from './constants'
import { formatDatePt, formatPeriodPt, formatTime, weekdayLabel } from './dates'
import { driveHoursEstimate, mapsUrl, roadKmEstimate, routeTotals } from './geo'
import type { Band, City, LatLng, Producer, Tour, TourDate, TourDateStatus, Venue } from './types'

export type TourbookContact = {
  label: string
  name: string | null
  phone: string | null
  whatsappUrl: string | null
  email: string | null
  instagram: string | null
}

export type TourbookSummaryRow = {
  date: string
  dateLabel: string
  weekday: string
  city: string
  state: string
  venue: string | null
  setTime: string | null
  status: TourDateStatus
  statusLabel: string
}

export type TourbookDay = {
  id: string
  date: string
  dateLabel: string
  weekday: string
  status: TourDateStatus
  statusLabel: string
  city: City | null
  venue: Venue | null
  address: string | null
  mapsUrl: string | null
  contacts: TourbookContact[]
  times: { loadIn: string | null; soundcheck: string | null; doors: string | null; set: string | null }
  deal: { type: string | null; feeLabel: string | null }
  lodging: string | null
  bands: Array<{ name: string; role: string }>
  notes: string | null
  nextLeg: { km: number; hours: number; toCity: string } | null
}

export type Tourbook = {
  title: string
  bandName: string
  period: { start: string; end: string; label: string }
  summary: TourbookSummaryRow[]
  days: TourbookDay[]
  contacts: TourbookContact[]
  totals: { km: number; hours: number; dates: number; confirmed: number; feeCents: number; costCents: number }
}

export type BuildTourbookInput = {
  tour: Tour
  dates: TourDate[]
  lookups: { cities: City[]; venues: Venue[]; bands: Band[]; producers: Producer[] }
  /** Omitir cachê/custos (versão para a equipe). */
  hideMoney?: boolean
}

const CITY_TBD = 'A definir'
const NO_DATES_LABEL = 'Sem datas'
const CONFIRMED_STATUSES: ReadonlySet<TourDateStatus> = new Set<TourDateStatus>(['confirmado', 'realizado'])

type ResolvedDate = {
  date: TourDate
  city: City | null
  venue: Venue | null
  producer: Producer | null
  bands: Array<{ band: Band; role: string }>
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return map
}

function lookup<T>(map: Map<string, T>, id: string | null | undefined): T | null {
  if (!id) return null
  return map.get(id) ?? null
}

/** ISO dates sort correctly as plain strings. */
function compareIso(a: TourDate, b: TourDate): number {
  if (a.date < b.date) return -1
  if (a.date > b.date) return 1
  return 0
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function textOrNull(s: string | null | undefined): string | null {
  const trimmed = s?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

function timeOrNull(t: string | null): string | null {
  const formatted = formatTime(t)
  return formatted === '' ? null : formatted
}

function cityLabel(city: City): string {
  return `${city.name}/${city.state}`
}

function toLatLng(p: LatLng): LatLng {
  return { lat: p.lat, lng: p.lng }
}

/** Builds a contact entry; returns null when there is no way to reach the person. */
function makeContact(
  label: string,
  name: string | null,
  phone: string | null,
  email: string | null,
  instagram: string | null,
): TourbookContact | null {
  const phoneText = textOrNull(phone)
  const emailText = textOrNull(email)
  const instagramText = textOrNull(instagram)
  if (!phoneText && !emailText && !instagramText) return null
  return {
    label,
    name: textOrNull(name),
    phone: phoneText,
    whatsappUrl: phoneText ? whatsappUrl(phoneText) : null,
    email: emailText,
    instagram: instagramText,
  }
}

function dayContacts(r: ResolvedDate): TourbookContact[] {
  const out: TourbookContact[] = []
  const push = (c: TourbookContact | null): void => {
    if (c) out.push(c)
  }
  if (r.venue) {
    push(
      makeContact(
        'Casa',
        r.venue.contactName ?? r.venue.name,
        r.venue.contactPhone,
        r.venue.contactEmail,
        r.venue.instagram,
      ),
    )
  }
  if (r.producer) {
    push(
      makeContact(
        'Produtora',
        r.producer.contactName ?? r.producer.name,
        r.producer.contactPhone,
        r.producer.contactEmail,
        r.producer.instagram,
      ),
    )
  }
  for (const { band } of r.bands) {
    push(makeContact(`Banda: ${band.name}`, band.contactName, band.contactPhone, band.contactEmail, band.links.instagram ?? null))
  }
  return out
}

/** Keys used to spot the same person across dates (phone digits, e-mail, Instagram handle). */
function contactKeys(c: TourbookContact): string[] {
  const keys: string[] = []
  if (c.phone) {
    const digits = c.phone.replace(/\D/g, '')
    if (digits) keys.push(`tel:${digits}`)
  }
  if (c.email) keys.push(`mail:${c.email.toLowerCase()}`)
  if (c.instagram) {
    const handle = c.instagram.toLowerCase().replace(/^@/, '')
    if (handle) keys.push(`ig:${handle}`)
  }
  return keys
}

function resolveDates(input: BuildTourbookInput): ResolvedDate[] {
  const cities = indexById(input.lookups.cities)
  const venues = indexById(input.lookups.venues)
  const producers = indexById(input.lookups.producers)
  const bands = indexById(input.lookups.bands)
  return [...input.dates].sort(compareIso).map((date) => {
    const nightBands: Array<{ band: Band; role: string }> = []
    for (const ref of date.bands) {
      const band = lookup(bands, ref.bandId)
      if (band) nightBands.push({ band, role: ref.role })
    }
    return {
      date,
      city: lookup(cities, date.cityId),
      venue: lookup(venues, date.venueId),
      producer: lookup(producers, date.producerId),
      bands: nightBands,
    }
  })
}

function nextLegOf(resolved: ResolvedDate[], index: number): TourbookDay['nextLeg'] {
  const current = resolved[index]
  if (!current?.city) return null
  for (let i = index + 1; i < resolved.length; i++) {
    const next = resolved[i]
    if (!next?.city) continue
    const km = roadKmEstimate(current.city, next.city)
    return { km, hours: driveHoursEstimate(km), toCity: cityLabel(next.city) }
  }
  return null
}

function buildSummaryRow(r: ResolvedDate): TourbookSummaryRow {
  const { date, city, venue } = r
  return {
    date: date.date,
    dateLabel: formatDatePt(date.date, 'numeric'),
    weekday: weekdayLabel(date.date, 'short'),
    city: city?.name ?? CITY_TBD,
    state: city?.state ?? '',
    venue: venue?.name ?? null,
    setTime: timeOrNull(date.setTime),
    status: date.status,
    statusLabel: TOUR_DATE_STATUS_LABELS[date.status],
  }
}

function buildDay(resolved: ResolvedDate[], index: number, hideMoney: boolean): TourbookDay | null {
  const r = resolved[index]
  if (!r) return null
  const { date, city, venue } = r
  const point = venue ?? city
  const feeCents = date.feeCents
  return {
    id: date.id,
    date: date.date,
    dateLabel: capitalize(formatDatePt(date.date, 'long')),
    weekday: weekdayLabel(date.date, 'long'),
    status: date.status,
    statusLabel: TOUR_DATE_STATUS_LABELS[date.status],
    city,
    venue,
    address: venue?.address ?? null,
    mapsUrl: point ? mapsUrl(toLatLng(point)) : null,
    contacts: dayContacts(r),
    times: {
      loadIn: timeOrNull(date.loadInTime),
      soundcheck: timeOrNull(date.soundcheckTime),
      doors: timeOrNull(date.doorsTime),
      set: timeOrNull(date.setTime),
    },
    deal: {
      type: date.dealType ? DEAL_TYPE_LABELS[date.dealType] : null,
      feeLabel: !hideMoney && feeCents !== null ? formatCurrencyBRL(feeCents) : null,
    },
    lodging: textOrNull(date.lodging),
    bands: r.bands.map(({ band, role }) => ({ name: band.name, role })),
    notes: textOrNull(date.notes),
    nextLeg: nextLegOf(resolved, index),
  }
}

/** Every contact seen across the days, first occurrence wins; the label gains the city. */
function collectContacts(resolved: ResolvedDate[], days: TourbookDay[]): TourbookContact[] {
  const seen = new Set<string>()
  const out: TourbookContact[] = []
  days.forEach((day, i) => {
    const city = resolved[i]?.city ?? null
    for (const contact of day.contacts) {
      const keys = contactKeys(contact)
      if (keys.some((k) => seen.has(k))) continue
      for (const k of keys) seen.add(k)
      out.push({ ...contact, label: city ? `${contact.label} · ${city.name}` : contact.label })
    }
  })
  return out
}

export function buildTourbook(input: BuildTourbookInput): Tourbook {
  const hideMoney = input.hideMoney === true
  const resolved = resolveDates(input)

  const days: TourbookDay[] = []
  for (let i = 0; i < resolved.length; i++) {
    const day = buildDay(resolved, i, hideMoney)
    if (day) days.push(day)
  }

  const first = resolved[0]
  const last = resolved[resolved.length - 1]
  const start = first?.date.date ?? ''
  const end = last?.date.date ?? ''
  const periodLabel = start && end ? formatPeriodPt(start, end) : NO_DATES_LABEL

  const routePoints: LatLng[] = []
  let confirmed = 0
  let feeCents = 0
  let costCents = 0
  for (const r of resolved) {
    if (r.city) routePoints.push(toLatLng(r.city))
    if (CONFIRMED_STATUSES.has(r.date.status)) confirmed++
    if (!hideMoney) {
      feeCents += r.date.feeCents ?? 0
      costCents += r.date.costCents ?? 0
    }
  }
  const route = routeTotals(routePoints)

  return {
    title: input.tour.name,
    bandName: input.tour.bandName,
    period: { start, end, label: periodLabel },
    summary: resolved.map(buildSummaryRow),
    days,
    contacts: collectContacts(resolved, days),
    totals: {
      km: route.km,
      hours: route.hours,
      dates: resolved.length,
      confirmed,
      feeCents,
      costCents,
    },
  }
}

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Telefone BR em qualquer formato → link wa.me (assume DDI 55 quando ausente). */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const hasCountryCode = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
  const withCountry = hasCountryCode ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
}
