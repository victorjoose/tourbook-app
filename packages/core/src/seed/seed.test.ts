import { describe, expect, it } from 'vitest'
import { DEAL_TYPES, GENRES, PILOT_STATES } from '../constants'
import { SEED_DATA } from './index'

const { cities, venues, producers, bands } = SEED_DATA

const cityIds = new Set(cities.map((c) => c.id))
const venueIds = new Set(venues.map((v) => v.id))
const genreSet = new Set<string>(GENRES)
const dealTypeSet = new Set<string>(DEAL_TYPES)
const stateSet = new Set<string>(PILOT_STATES)

// Bounding box that covers SC, PR and SP with some slack.
const BOX = { minLat: -30, maxLat: -19, minLng: -55, maxLng: -44 }

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const id of ids) (seen.has(id) ? dups : seen).add(id)
  return [...dups]
}

function inBox(p: { lat: number; lng: number }): boolean {
  return p.lat >= BOX.minLat && p.lat <= BOX.maxLat && p.lng >= BOX.minLng && p.lng <= BOX.maxLng
}

describe('SEED_DATA', () => {
  it('has at least the expected volume of sample data', () => {
    expect(cities.length).toBeGreaterThanOrEqual(60)
    expect(venues.length).toBeGreaterThanOrEqual(40)
    expect(producers.length).toBeGreaterThanOrEqual(10)
    expect(bands.length).toBeGreaterThanOrEqual(20)
  })

  it('has unique ids per collection, equal to the slug', () => {
    for (const items of [cities, venues, producers, bands]) {
      expect(duplicates(items.map((i) => i.id))).toEqual([])
      expect(duplicates(items.map((i) => i.slug))).toEqual([])
      for (const item of items) expect(item.id, `${item.name}`).toBe(item.slug)
    }
  })

  it('only uses the pilot states and real-looking city rows', () => {
    for (const c of cities) {
      expect(stateSet.has(c.state), `${c.id} state ${c.state}`).toBe(true)
      expect(c.slug.endsWith(`-${c.state.toLowerCase()}`), `${c.id} slug suffix`).toBe(true)
      expect(c.name.length).toBeGreaterThan(1)
      expect(c.population === null || c.population > 0, `${c.id} population`).toBe(true)
    }
  })

  it('every venue.cityId exists in cities', () => {
    for (const v of venues) expect(cityIds.has(v.cityId), `venue ${v.id} → city ${v.cityId}`).toBe(true)
  })

  it('every producer city and venue reference exists', () => {
    const venueCity = new Map(venues.map((v) => [v.id, v.cityId]))
    for (const p of producers) {
      expect(p.cityId !== null && cityIds.has(p.cityId), `producer ${p.id} → city ${p.cityId}`).toBe(true)
      expect(p.cityIds.length, `producer ${p.id} cityIds`).toBeGreaterThan(0)
      expect(duplicates(p.cityIds)).toEqual([])
      if (p.cityId) expect(p.cityIds, `producer ${p.id} base city in cityIds`).toContain(p.cityId)
      for (const id of p.cityIds) expect(cityIds.has(id), `producer ${p.id} → city ${id}`).toBe(true)
      expect(duplicates(p.venueIds)).toEqual([])
      for (const id of p.venueIds) {
        expect(venueIds.has(id), `producer ${p.id} → venue ${id}`).toBe(true)
        // A producer only works with venues in cities it covers.
        const cityOfVenue = venueCity.get(id)
        expect(cityOfVenue !== undefined && p.cityIds.includes(cityOfVenue), `producer ${p.id} → venue ${id} outside its cities`).toBe(true)
      }
    }
  })

  it('every band.cityId exists in cities', () => {
    for (const b of bands) expect(b.cityId !== null && cityIds.has(b.cityId), `band ${b.id} → city ${b.cityId}`).toBe(true)
  })

  it('only uses genres from GENRES, with at least one per entity', () => {
    for (const items of [venues, producers, bands]) {
      for (const item of items) {
        expect(item.genres.length, `${item.id} genres`).toBeGreaterThan(0)
        expect(duplicates(item.genres)).toEqual([])
        for (const g of item.genres) expect(genreSet.has(g), `${item.id} genre ${g}`).toBe(true)
      }
    }
  })

  it('keeps venue showDays within 0..6 and dealTypes within DEAL_TYPES', () => {
    for (const v of venues) {
      expect(duplicates(v.showDays.map(String))).toEqual([])
      for (const d of v.showDays) {
        expect(Number.isInteger(d), `${v.id} showDay ${d}`).toBe(true)
        expect(d, `${v.id} showDay`).toBeGreaterThanOrEqual(0)
        expect(d, `${v.id} showDay`).toBeLessThanOrEqual(6)
      }
      expect(v.dealTypes.length, `${v.id} dealTypes`).toBeGreaterThan(0)
      for (const t of v.dealTypes) expect(dealTypeSet.has(t), `${v.id} dealType ${t}`).toBe(true)
      expect(v.capacity === null || v.capacity > 0, `${v.id} capacity`).toBe(true)
    }
  })

  it('places every city and venue inside the SC/PR/SP bounding box', () => {
    for (const c of cities) expect(inBox(c), `${c.id} at ${c.lat},${c.lng}`).toBe(true)
    for (const v of venues) expect(inBox(v), `${v.id} at ${v.lat},${v.lng}`).toBe(true)
  })

  it('uses obviously fake contacts everywhere', () => {
    for (const items of [venues, producers, bands]) {
      for (const item of items) {
        expect(item.contactPhone, `${item.id} phone`).toContain('99999-')
        expect(item.contactEmail, `${item.id} email`).toMatch(/@exemplo\.com\.br$/)
      }
    }
    for (const item of [...venues, ...producers]) expect(item.instagram, `${item.id} instagram`).toMatch(/^@[a-z0-9-]+$/)
  })

  it('gives every band full URLs as links', () => {
    for (const b of bands) {
      const entries = Object.entries(b.links)
      expect(entries.length, `${b.id} links`).toBeGreaterThan(0)
      for (const [key, url] of entries) {
        expect(['instagram', 'spotify', 'youtube', 'bandcamp'], `${b.id} link key ${key}`).toContain(key)
        expect(url, `${b.id} ${key}`).toMatch(/^https:\/\/[^\s]+$/)
      }
    }
  })
})
