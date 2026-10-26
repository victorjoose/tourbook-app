// Pure helpers for the map home screen: city search, venue filters and
// "what is inside the current map bounds" lists. No React, no IO.
import {
  WEEKDAY_SHORT_PT,
  inBounds,
  type Band,
  type Bounds,
  type City,
  type MapFilters,
  type Producer,
  type RegionData,
  type Venue,
} from '@tour/core'
import { normalizeText, plural } from '../../lib/text'

export type CityIndex = ReadonlyMap<string, City>

export function indexCities(cities: readonly City[]): CityIndex {
  return new Map(cities.map((c) => [c.id, c]))
}

function comparePopulationDesc(a: City, b: City): number {
  const pa = a.population ?? -1
  const pb = b.population ?? -1
  if (pa !== pb) return pb - pa
  return a.name.localeCompare(b.name, 'pt-BR')
}

/**
 * Accent-insensitive autocompletion: cities whose name starts with the term,
 * biggest cities first, at most `limit` results. Empty term → no results.
 */
export function searchCities(cities: readonly City[], term: string, limit = 8): City[] {
  const q = normalizeText(term)
  if (!q) return []
  return cities
    .filter((c) => normalizeText(c.name).startsWith(q))
    .sort(comparePopulationDesc)
    .slice(0, Math.max(0, limit))
}

export function cityLabel(city: City): string {
  return `${city.name}/${city.state}`
}

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type CapacityPreset = {
  id: 'ate-100' | '100-300' | '300-mais'
  label: string
  min: number | null
  max: number | null
}

export const CAPACITY_PRESETS: readonly CapacityPreset[] = [
  { id: 'ate-100', label: 'até 100', min: null, max: 100 },
  { id: '100-300', label: '100 a 300', min: 100, max: 300 },
  { id: '300-mais', label: '300+', min: 300, max: null },
]

/** Weekdays offered as chips (Thursday to Sunday, the usual show nights). */
export const SHOW_DAY_OPTIONS: readonly number[] = [4, 5, 6, 0]

export function activeCapacityPreset(filters: MapFilters): CapacityPreset | null {
  return CAPACITY_PRESETS.find((p) => p.min === filters.capacityMin && p.max === filters.capacityMax) ?? null
}

export function countActiveFilters(filters: MapFilters): number {
  let n = filters.genres.length
  if (filters.capacityMin !== null || filters.capacityMax !== null) n++
  if (filters.showDay !== null) n++
  if (filters.acceptsTouringOnly) n++
  return n
}

export function hasActiveFilters(filters: MapFilters): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * A venue passes when it satisfies every active filter. Capacity and show
 * days are strict: a venue with unknown capacity (or no show days) is left
 * out while that filter is on, because the band cannot rely on it.
 */
export function matchesFilters(venue: Venue, filters: MapFilters): boolean {
  if (filters.genres.length > 0 && !filters.genres.some((g) => venue.genres.includes(g))) return false
  if (filters.capacityMin !== null || filters.capacityMax !== null) {
    if (venue.capacity === null) return false
    if (filters.capacityMin !== null && venue.capacity < filters.capacityMin) return false
    if (filters.capacityMax !== null && venue.capacity > filters.capacityMax) return false
  }
  if (filters.showDay !== null && !venue.showDays.includes(filters.showDay)) return false
  if (filters.acceptsTouringOnly && !venue.acceptsTouringBands) return false
  return true
}

// ---------------------------------------------------------------------------
// What is inside the current map bounds (null bounds = everything)
// ---------------------------------------------------------------------------

export function venuesInView(venues: readonly Venue[], bounds: Bounds | null, filters: MapFilters): Venue[] {
  return venues.filter((v) => matchesFilters(v, filters) && (bounds === null || inBounds(v, bounds)))
}

/** Producers serving at least one city inside the bounds. */
export function producersInView(producers: readonly Producer[], cities: CityIndex, bounds: Bounds | null): Producer[] {
  if (bounds === null) return [...producers]
  return producers.filter((p) =>
    p.cityIds.some((id) => {
      const city = cities.get(id)
      return city !== undefined && inBounds(city, bounds)
    }),
  )
}

/** Bands whose base city is inside the bounds. */
export function bandsInView(bands: readonly Band[], cities: CityIndex, bounds: Bounds | null): Band[] {
  if (bounds === null) return [...bands]
  return bands.filter((b) => {
    if (!b.cityId) return false
    const city = cities.get(b.cityId)
    return city !== undefined && inBounds(city, bounds)
  })
}

// ---------------------------------------------------------------------------
// City summary
// ---------------------------------------------------------------------------

export type CitySummary = { venues: number; producers: number; bands: number }

export function citySummary(cityId: string, data: Pick<RegionData, 'venues' | 'producers' | 'bands'>): CitySummary {
  return {
    venues: data.venues.filter((v) => v.cityId === cityId).length,
    producers: data.producers.filter((p) => p.cityIds.includes(cityId)).length,
    bands: data.bands.filter((b) => b.cityId === cityId).length,
  }
}

/** "Curitiba/PR · 4 casas · 2 produtoras · 5 bandas" */
export function citySummaryLabel(city: City, summary: CitySummary): string {
  return [
    cityLabel(city),
    plural(summary.venues, 'casa', 'casas'),
    plural(summary.producers, 'produtora', 'produtoras'),
    plural(summary.bands, 'banda', 'bandas'),
  ].join(' · ')
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Monday-first order so "Qui · Sex · Sáb · Dom" reads naturally. */
function weekOrder(day: number): number {
  return (day + 6) % 7
}

export function sortShowDays(days: readonly number[]): number[] {
  return [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => weekOrder(a) - weekOrder(b))
}

export function showDaysLabel(days: readonly number[], separator = ' · '): string {
  return sortShowDays(days)
    .map((d) => WEEKDAY_SHORT_PT[d] ?? '')
    .filter(Boolean)
    .join(separator)
}

export function capacityLabel(capacity: number | null): string {
  if (capacity === null) return 'Capacidade não informada'
  return `${capacity.toLocaleString('pt-BR')} pessoas`
}

/** "@banda" or "banda" or a full URL → https://instagram.com/banda */
export function instagramUrl(handleOrUrl: string): string {
  const raw = handleOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const handle = raw
    .replace(/^@/, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
  return `https://instagram.com/${handle}`
}

export function instagramHandle(handleOrUrl: string): string {
  const url = instagramUrl(handleOrUrl)
  const match = /instagram\.com\/([^/?#]+)/i.exec(url)
  return match?.[1] ? `@${match[1]}` : handleOrUrl.trim()
}

/** Adds https:// when the stored website has no scheme. */
export function websiteUrl(url: string): string {
  const raw = url.trim()
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

export function websiteLabel(url: string): string {
  return websiteUrl(url)
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
}
