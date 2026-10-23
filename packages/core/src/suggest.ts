// Suggestion engine (rules + scoring). Pure and deterministic: no IO, no clock, no randomness.
import { DEFAULT_MAX_KM_PER_DAY, WEEKDAYS_PT, genreLabel } from './constants'
import { addDaysIso, diffDays, formatDatePt, weekdayOf } from './dates'
import { driveHoursEstimate, formatHours, formatKm, roadKmEstimate } from './geo'
import type { Band, City, Producer, RegionData, Venue } from './types'

export type SuggestConstraints = {
  maxKmPerDay: number
  genres: string[]
  capacityMin?: number | null
  capacityMax?: number | null
  states?: string[]
  excludeCityIds?: string[]
}

export type CitySuggestion = {
  city: City
  score: number
  kmFromPrev: number
  hoursFromPrev: number
  kmToNext?: number
  venues: Venue[]
  producers: Producer[]
  bands: Band[]
  reasons: string[]
  /** Venues (among `venues`) that confirmed shows on the weekday of the slot. */
  openVenueCount?: number
  /** Venues (among `venues`) without show days on record (possible, scored lower). */
  unknownDaysVenueCount?: number
  /** True when the city has no venue, producer or local band after filtering. */
  isEmpty?: boolean
}

export type SuggestNextCitiesInput = {
  prevCity: City | null
  nextFixed?: { city: City; date: string } | null
  date: string
  constraints: SuggestConstraints
  data: RegionData
  limit?: number
}

export const DEFAULT_SUGGEST_LIMIT = 5

/** Scoring weights (points). Documented here so the UI can explain a score. */
export const SUGGEST_WEIGHTS = {
  /** Max points for proximity: DISTANCE * (1 - kmFromPrev / maxKmPerDay). */
  DISTANCE: 40,
  /** At least one venue with a confirmed show day on the slot's weekday. */
  VENUE_OPEN_ON_DAY: 25,
  /** No venue confirmed for the weekday, but at least one with unknown show days. */
  VENUE_UNKNOWN_DAYS: 12,
  /** Per additional venue beyond the first, capped at EXTRA_VENUES_CAP. */
  EXTRA_VENUE: 10,
  EXTRA_VENUES_CAP: 20,
  /** At least one venue whose genres overlap the band's genres. */
  GENRE_MATCH: 15,
  /** At least one producer serving the city. */
  PRODUCER: 10,
  /** At least one local band willing to open. */
  LOCAL_BAND: 8,
  /** Moving toward the next fixed date / end city. */
  TOWARD_NEXT: 12,
  /** Moving away from the next fixed date / end city. */
  AWAY_FROM_NEXT: -15,
  /** City with no venue, no producer and no local band. */
  EMPTY_CITY: -30,
} as const

/**
 * A candidate only counts as "moving away" when its distance to the next fixed city
 * exceeds the current distance by more than this fraction (sideways moves are neutral).
 */
export const AWAY_TOLERANCE = 0.1

/** Gaps longer than this (in calendar days between consecutive dates) raise a warning. */
export const MAX_GAP_DAYS = 3

// ---------------------------------------------------------------------------
// Helpers

function normalizeGenres(genres: readonly string[]): string[] {
  const out: string[] = []
  for (const g of genres) {
    const n = g.trim().toLowerCase()
    if (n.length > 0 && !out.includes(n)) out.push(n)
  }
  return out
}

/** Items of `wanted` (in order) that also appear in `have`. */
function genreOverlap(wanted: readonly string[], have: readonly string[]): string[] {
  const set = new Set(normalizeGenres(have))
  return wanted.filter((g) => set.has(g))
}

function hasGenreMatch(wanted: readonly string[], have: readonly string[]): boolean {
  return wanted.length > 0 && have.length > 0 && genreOverlap(wanted, have).length > 0
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'pt-BR')
}

/** "na sexta", "no sábado", "no domingo". */
function weekdayPhrase(weekday: number): string {
  const label = (WEEKDAYS_PT[weekday] ?? '').toLowerCase()
  const article = weekday === 0 || weekday === 6 ? 'no' : 'na'
  return `${article} ${label}`
}

/** ["Rock", "Hardcore", "Punk"] → "Rock, hardcore e punk". */
function joinGenresPt(genres: readonly string[]): string {
  const labels = genres.map((g, i) => {
    const label = genreLabel(g)
    return i === 0 ? label : label.toLowerCase()
  })
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1) ?? ''}`
}

/** "2026-03-20" → "20/03". */
function dayMonth(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

type VenuePick = {
  venues: Venue[]
  openCount: number
  unknownCount: number
  /** Band genres (normalized) found in at least one picked venue, in the band's order. */
  matchedGenres: string[]
}

function pickVenues(
  city: City,
  data: RegionData,
  weekday: number,
  wantedGenres: readonly string[],
  constraints: SuggestConstraints,
): VenuePick {
  const capacityMin = constraints.capacityMin ?? null
  const capacityMax = constraints.capacityMax ?? null
  const picked: Array<{ venue: Venue; open: boolean; unknown: boolean; genre: boolean }> = []
  const matched = new Set<string>()

  for (const venue of data.venues) {
    if (venue.cityId !== city.id) continue
    if (!venue.acceptsTouringBands) continue
    const unknown = venue.showDays.length === 0
    const open = !unknown && venue.showDays.includes(weekday)
    if (!open && !unknown) continue
    const venueGenres = normalizeGenres(venue.genres)
    const overlap = genreOverlap(wantedGenres, venueGenres)
    // Genre filter only applies when both sides declare genres.
    if (wantedGenres.length > 0 && venueGenres.length > 0 && overlap.length === 0) continue
    // Capacity filter only applies to venues with a known capacity.
    if (venue.capacity !== null) {
      if (capacityMin !== null && venue.capacity < capacityMin) continue
      if (capacityMax !== null && venue.capacity > capacityMax) continue
    }
    for (const g of overlap) matched.add(g)
    picked.push({ venue, open, unknown, genre: overlap.length > 0 })
  }

  // Confirmed day first, then genre matches, then name.
  picked.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1
    if (a.genre !== b.genre) return a.genre ? -1 : 1
    return byName(a.venue, b.venue)
  })

  return {
    venues: picked.map((p) => p.venue),
    openCount: picked.filter((p) => p.open).length,
    unknownCount: picked.filter((p) => p.unknown).length,
    matchedGenres: wantedGenres.filter((g) => matched.has(g)),
  }
}

function pickProducers(city: City, data: RegionData, wantedGenres: readonly string[]): Producer[] {
  const list = data.producers.filter((p) => p.cityIds.includes(city.id))
  list.sort((a, b) => {
    const ga = hasGenreMatch(wantedGenres, a.genres)
    const gb = hasGenreMatch(wantedGenres, b.genres)
    if (ga !== gb) return ga ? -1 : 1
    return byName(a, b)
  })
  return list
}

function pickBands(city: City, data: RegionData, wantedGenres: readonly string[]): Band[] {
  const list = data.bands.filter((b) => b.cityId === city.id && b.opensForTouring)
  list.sort((a, b) => {
    const ga = hasGenreMatch(wantedGenres, a.genres)
    const gb = hasGenreMatch(wantedGenres, b.genres)
    if (ga !== gb) return ga ? -1 : 1
    return byName(a, b)
  })
  return list
}

// ---------------------------------------------------------------------------
// suggestNextCities

export function suggestNextCities(input: SuggestNextCitiesInput): CitySuggestion[] {
  const { prevCity, date, data, constraints } = input
  const nextFixed = input.nextFixed ?? null
  const limit = input.limit ?? DEFAULT_SUGGEST_LIMIT
  if (limit <= 0) return []

  const maxKm = constraints.maxKmPerDay > 0 ? constraints.maxKmPerDay : DEFAULT_MAX_KM_PER_DAY
  const wantedGenres = normalizeGenres(constraints.genres)
  const states = new Set((constraints.states ?? []).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0))
  const excluded = new Set(constraints.excludeCityIds ?? [])
  if (prevCity) excluded.add(prevCity.id)

  const weekday = weekdayOf(date)
  const daysToNext = nextFixed ? Math.max(1, diffDays(date, nextFixed.date)) : 0
  const kmPrevToNext = prevCity && nextFixed ? roadKmEstimate(prevCity, nextFixed.city) : null

  const scored: CitySuggestion[] = []

  for (const city of data.cities) {
    if (excluded.has(city.id)) continue
    if (states.size > 0 && !states.has(city.state.toUpperCase())) continue

    const kmFromPrev = prevCity ? roadKmEstimate(prevCity, city) : 0
    if (prevCity && kmFromPrev > maxKm) continue

    let kmToNext: number | undefined
    if (nextFixed) {
      kmToNext = roadKmEstimate(city, nextFixed.city)
      // The band must still be able to reach the next fixed date in time.
      if (kmToNext > maxKm * daysToNext) continue
    }

    const hoursFromPrev = driveHoursEstimate(kmFromPrev)
    const picked = pickVenues(city, data, weekday, wantedGenres, constraints)
    const producers = pickProducers(city, data, wantedGenres)
    const bands = pickBands(city, data, wantedGenres)
    const isEmpty = picked.venues.length === 0 && producers.length === 0 && bands.length === 0

    let score = 0
    const reasons: string[] = []

    // Distance: closer is better. Without a previous city there is no distance signal.
    if (prevCity) {
      score += SUGGEST_WEIGHTS.DISTANCE * (1 - kmFromPrev / maxKm)
      reasons.push(`A ${formatKm(kmFromPrev)} de ${prevCity.name} (cerca de ${formatHours(hoursFromPrev)})`)
    }

    // Venues.
    if (picked.openCount > 0) {
      score += SUGGEST_WEIGHTS.VENUE_OPEN_ON_DAY
      reasons.push(`${plural(picked.openCount, 'casa', 'casas')} com show ${weekdayPhrase(weekday)}`)
    } else if (picked.unknownCount > 0) {
      score += SUGGEST_WEIGHTS.VENUE_UNKNOWN_DAYS
    }
    if (picked.unknownCount > 0) {
      reasons.push(
        picked.unknownCount === 1
          ? '1 casa sem dias de show informados'
          : `${picked.unknownCount} casas sem dias de show informados`,
      )
    }
    if (picked.venues.length > 1) {
      score += Math.min(SUGGEST_WEIGHTS.EXTRA_VENUES_CAP, SUGGEST_WEIGHTS.EXTRA_VENUE * (picked.venues.length - 1))
    }
    if (picked.matchedGenres.length > 0) {
      score += SUGGEST_WEIGHTS.GENRE_MATCH
      reasons.push(`${joinGenresPt(picked.matchedGenres)} na cena local`)
    }

    // Producers.
    if (producers.length > 0) {
      score += SUGGEST_WEIGHTS.PRODUCER
      const first = producers[0]
      reasons.push(
        producers.length === 1 && first
          ? `Produtora ${first.name} atende a cidade`
          : `${producers.length} produtoras atendem a cidade`,
      )
    }

    // Local bands.
    if (bands.length > 0) {
      score += SUGGEST_WEIGHTS.LOCAL_BAND
      reasons.push(bands.length === 1 ? '1 banda local topa abrir' : `${bands.length} bandas locais topam abrir`)
    }

    // Direction relative to the next fixed date / end city.
    if (nextFixed && kmToNext !== undefined) {
      const target = `${nextFixed.city.name} (dia ${dayMonth(nextFixed.date)})`
      if (kmPrevToNext !== null) {
        if (kmToNext < kmPrevToNext) {
          score += SUGGEST_WEIGHTS.TOWARD_NEXT
          reasons.push(`No caminho para ${target}`)
        } else if (kmToNext > kmPrevToNext * (1 + AWAY_TOLERANCE)) {
          score += SUGGEST_WEIGHTS.AWAY_FROM_NEXT
          reasons.push(`Afasta de ${target}`)
        } else {
          reasons.push(`A ${formatKm(kmToNext)} de ${target}`)
        }
      } else {
        reasons.push(`A ${formatKm(kmToNext)} de ${target}`)
      }
    }

    if (isEmpty) {
      score += SUGGEST_WEIGHTS.EMPTY_CITY
      reasons.push('Nenhuma casa, produtora ou banda cadastrada ainda')
    }

    const suggestion: CitySuggestion = {
      city,
      score: round1(score),
      kmFromPrev,
      hoursFromPrev,
      venues: picked.venues,
      producers,
      bands,
      reasons,
      openVenueCount: picked.openCount,
      unknownDaysVenueCount: picked.unknownCount,
      isEmpty,
    }
    if (kmToNext !== undefined) suggestion.kmToNext = kmToNext
    scored.push(suggestion)
  }

  // Empty cities are only shown when there are not enough cities with something.
  const withSomething = scored.filter((s) => !s.isEmpty)
  const pool = withSomething.length >= limit ? withSomething : scored

  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.kmFromPrev !== b.kmFromPrev) return a.kmFromPrev - b.kmFromPrev
    return byName(a.city, b.city)
  })

  return pool.slice(0, limit)
}

// ---------------------------------------------------------------------------
// fillGaps

export type GapSlot = { date: string; cityId?: string | null; fixed: boolean }

export type FillGapsInput = {
  slots: GapSlot[]
  constraints: SuggestConstraints
  data: RegionData
  startCity: City
  endCity?: City | null
}

export function fillGaps(input: FillGapsInput): Map<string, CitySuggestion[]> {
  const out = new Map<string, CitySuggestion[]>()
  const cityById = new Map<string, City>(input.data.cities.map((c) => [c.id, c]))
  const slots = [...input.slots].sort((a, b) => a.date.localeCompare(b.date))
  const endCity = input.endCity ?? null
  const lastSlot = slots.at(-1)

  // Every city already placed in the tour is excluded from suggestions.
  const used = new Set<string>(input.constraints.excludeCityIds ?? [])
  for (const slot of slots) if (slot.cityId) used.add(slot.cityId)
  const constraints: SuggestConstraints = { ...input.constraints, excludeCityIds: [...used] }

  let prevCity: City = input.startCity

  for (const [index, slot] of slots.entries()) {
    if (slot.cityId) {
      const city = cityById.get(slot.cityId)
      if (city) prevCity = city
      continue
    }

    let nextFixed: { city: City; date: string } | null = null
    for (let j = index + 1; j < slots.length; j++) {
      const candidate = slots[j]
      if (!candidate?.cityId) continue
      const city = cityById.get(candidate.cityId)
      if (city) {
        nextFixed = { city, date: candidate.date }
        break
      }
    }
    // No fixed date ahead: the band drives home (endCity) the day after the last slot.
    if (!nextFixed && endCity && lastSlot) nextFixed = { city: endCity, date: addDaysIso(lastSlot.date, 1) }

    out.set(
      slot.date,
      suggestNextCities({ prevCity, nextFixed, date: slot.date, constraints, data: input.data }),
    )
  }

  return out
}

// ---------------------------------------------------------------------------
// routeAlerts

export type RouteAlert = { date: string; message: string; level: 'warn' | 'error' }

type DatedCity = { date: string; city: City | null }
type DatedCityWithCity = { date: string; city: City }

function hasCity(d: DatedCity): d is DatedCityWithCity {
  return d.city !== null
}

export function routeAlerts(dates: Array<{ date: string; city: City | null }>, maxKmPerDay: number): RouteAlert[] {
  const alerts: RouteAlert[] = []
  const maxKm = maxKmPerDay > 0 ? maxKmPerDay : DEFAULT_MAX_KM_PER_DAY
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date))

  // Two (or more) dates on the same day.
  const counts = new Map<string, number>()
  for (const d of sorted) counts.set(d.date, (counts.get(d.date) ?? 0) + 1)
  for (const [date, n] of counts) {
    if (n > 1) alerts.push({ date, level: 'warn', message: n === 2 ? 'Duas datas no mesmo dia' : `${n} datas no mesmo dia` })
  }

  // Dates without a city.
  for (const d of sorted) {
    if (!d.city) alerts.push({ date: d.date, level: 'warn', message: 'Sem cidade definida' })
  }

  // Long gaps between consecutive (distinct) dates.
  const distinctDates = [...counts.keys()]
  for (let i = 1; i < distinctDates.length; i++) {
    const prev = distinctDates[i - 1]
    const cur = distinctDates[i]
    if (prev === undefined || cur === undefined) continue
    const gap = diffDays(prev, cur)
    if (gap > MAX_GAP_DAYS) {
      const offDays = gap - 1
      alerts.push({
        date: cur,
        level: 'warn',
        message: `${plural(offDays, 'dia', 'dias')} sem show entre ${formatDatePt(prev)} e ${formatDatePt(cur)}`,
      })
    }
  }

  // Legs between consecutive dates with a city.
  const withCity = sorted.filter(hasCity)
  for (let i = 1; i < withCity.length; i++) {
    const a = withCity[i - 1]
    const b = withCity[i]
    if (!a || !b || a.city.id === b.city.id) continue
    const km = roadKmEstimate(a.city, b.city)
    const days = Math.max(1, diffDays(a.date, b.date))
    if (km > maxKm * days) {
      const suffix = days > 1 ? ` (${days} dias entre as datas)` : ''
      alerts.push({
        date: b.date,
        level: 'error',
        message: `Trecho de ${formatKm(km)} entre ${a.city.name} e ${b.city.name} passa do limite de ${formatKm(maxKm)} por dia${suffix}`,
      })
    }
  }

  alerts.sort((x, y) => {
    if (x.date !== y.date) return x.date.localeCompare(y.date)
    if (x.level !== y.level) return x.level === 'error' ? -1 : 1
    return 0
  })
  return alerts
}
