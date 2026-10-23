import { EMPTY_FILTERS, type Band, type Bounds, type City, type Producer, type Venue } from '@tour/core'
import { describe, expect, it } from 'vitest'
import {
  CAPACITY_PRESETS,
  activeCapacityPreset,
  bandsInView,
  capacityLabel,
  citySummary,
  citySummaryLabel,
  countActiveFilters,
  indexCities,
  instagramHandle,
  instagramUrl,
  matchesFilters,
  normalizeText,
  producersInView,
  searchCities,
  showDaysLabel,
  sortByName,
  sortShowDays,
  venuesInView,
  websiteLabel,
  websiteUrl,
} from './filtering'

function city(partial: Partial<City> & Pick<City, 'id' | 'name'>): City {
  return { state: 'PR', slug: partial.id, lat: 0, lng: 0, population: null, ...partial }
}

function venue(partial: Partial<Venue> & Pick<Venue, 'id'>): Venue {
  return {
    createdAt: '2026-01-01T00:00:00Z',
    cityId: 'cwb',
    name: partial.id,
    slug: partial.id,
    address: null,
    lat: 0,
    lng: 0,
    capacity: null,
    genres: [],
    showDays: [],
    dealTypes: [],
    hasPa: false,
    hasBackline: false,
    acceptsTouringBands: true,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    instagram: null,
    website: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    ...partial,
  }
}

function producer(partial: Partial<Producer> & Pick<Producer, 'id'>): Producer {
  return {
    name: partial.id,
    slug: partial.id,
    cityId: null,
    cityIds: [],
    venueIds: [],
    genres: [],
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    instagram: null,
    website: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    ...partial,
  }
}

function band(partial: Partial<Band> & Pick<Band, 'id'>): Band {
  return {
    name: partial.id,
    slug: partial.id,
    cityId: null,
    genres: [],
    links: {},
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    opensForTouring: true,
    ownerId: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    ...partial,
  }
}

const curitiba = city({ id: 'cwb', name: 'Curitiba', state: 'PR', lat: -25.43, lng: -49.27, population: 1_773_718 })
const saoPaulo = city({ id: 'sp', name: 'São Paulo', state: 'SP', lat: -23.55, lng: -46.63, population: 11_451_245 })
const saoJose = city({ id: 'sj', name: 'São José', state: 'SC', lat: -27.61, lng: -48.64, population: 258_585 })
const joinville = city({ id: 'jve', name: 'Joinville', state: 'SC', lat: -26.3, lng: -48.85, population: 616_317 })
const cities = [curitiba, saoPaulo, saoJose, joinville]

/** Box around Paraná/Santa Catarina coast: contains Curitiba and Joinville, not São Paulo. */
const southBounds: Bounds = { minLat: -27, maxLat: -25, minLng: -50, maxLng: -48 }

describe('normalizeText', () => {
  it('removes accents, lowercases and trims', () => {
    expect(normalizeText('  São José ')).toBe('sao jose')
    expect(normalizeText('Florianópolis')).toBe('florianopolis')
  })
})

describe('searchCities', () => {
  it('is accent-insensitive and matches the start of the name', () => {
    expect(searchCities(cities, 'sao').map((c) => c.id)).toEqual(['sp', 'sj'])
    expect(searchCities(cities, 'SÃO J').map((c) => c.id)).toEqual(['sj'])
  })

  it('does not match the middle of a name', () => {
    expect(searchCities(cities, 'ritiba')).toEqual([])
  })

  it('returns nothing for an empty term', () => {
    expect(searchCities(cities, '   ')).toEqual([])
  })

  it('puts bigger cities first and caps the list at the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      city({ id: `c${i}`, name: `Cidade ${i}`, population: i }),
    )
    const result = searchCities(many, 'cid')
    expect(result).toHaveLength(8)
    expect(result[0]?.id).toBe('c11')
    expect(searchCities(many, 'cid', 3)).toHaveLength(3)
  })
})

describe('matchesFilters', () => {
  const punkBar = venue({ id: 'a', capacity: 80, genres: ['punk', 'hardcore'], showDays: [5, 6], acceptsTouringBands: true })
  const bigClub = venue({ id: 'b', capacity: 500, genres: ['rock'], showDays: [4, 5, 6, 0], acceptsTouringBands: false })
  const unknown = venue({ id: 'c', capacity: null, genres: [], showDays: [] })

  it('accepts everything with empty filters', () => {
    for (const v of [punkBar, bigClub, unknown]) expect(matchesFilters(v, EMPTY_FILTERS)).toBe(true)
  })

  it('matches any of the selected genres', () => {
    const f = { ...EMPTY_FILTERS, genres: ['hardcore', 'metal'] }
    expect(matchesFilters(punkBar, f)).toBe(true)
    expect(matchesFilters(bigClub, f)).toBe(false)
    expect(matchesFilters(unknown, f)).toBe(false)
  })

  it('applies the capacity presets and leaves unknown capacity out', () => {
    const [upTo100, mid, large] = CAPACITY_PRESETS
    const small = { ...EMPTY_FILTERS, capacityMin: upTo100?.min ?? null, capacityMax: upTo100?.max ?? null }
    const medium = { ...EMPTY_FILTERS, capacityMin: mid?.min ?? null, capacityMax: mid?.max ?? null }
    const big = { ...EMPTY_FILTERS, capacityMin: large?.min ?? null, capacityMax: large?.max ?? null }
    expect(matchesFilters(punkBar, small)).toBe(true)
    expect(matchesFilters(punkBar, medium)).toBe(false)
    expect(matchesFilters(bigClub, big)).toBe(true)
    expect(matchesFilters(bigClub, small)).toBe(false)
    expect(matchesFilters(unknown, small)).toBe(false)
  })

  it('filters by show day (strict for venues without days)', () => {
    const sunday = { ...EMPTY_FILTERS, showDay: 0 }
    expect(matchesFilters(punkBar, sunday)).toBe(false)
    expect(matchesFilters(bigClub, sunday)).toBe(true)
    expect(matchesFilters(unknown, sunday)).toBe(false)
  })

  it('filters venues that accept touring bands', () => {
    const f = { ...EMPTY_FILTERS, acceptsTouringOnly: true }
    expect(matchesFilters(punkBar, f)).toBe(true)
    expect(matchesFilters(bigClub, f)).toBe(false)
  })

  it('combines filters with AND', () => {
    const f = { ...EMPTY_FILTERS, genres: ['punk'], showDay: 6, acceptsTouringOnly: true }
    expect(matchesFilters(punkBar, f)).toBe(true)
    expect(matchesFilters({ ...punkBar, showDays: [5] }, f)).toBe(false)
  })
})

describe('capacity preset helpers', () => {
  it('finds the active preset from the filters', () => {
    expect(activeCapacityPreset(EMPTY_FILTERS)).toBeNull()
    expect(activeCapacityPreset({ ...EMPTY_FILTERS, capacityMin: 100, capacityMax: 300 })?.id).toBe('100-300')
    expect(activeCapacityPreset({ ...EMPTY_FILTERS, capacityMin: 50, capacityMax: 300 })).toBeNull()
  })

  it('counts active filters', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
    expect(
      countActiveFilters({ genres: ['punk', 'rock'], capacityMin: null, capacityMax: 100, showDay: 5, acceptsTouringOnly: true }),
    ).toBe(5)
  })
})

describe('in-view lists', () => {
  const inCwb = venue({ id: 'v1', cityId: 'cwb', lat: -25.43, lng: -49.27, genres: ['punk'], showDays: [5] })
  const inJve = venue({ id: 'v2', cityId: 'jve', lat: -26.3, lng: -48.85, genres: ['rock'], showDays: [6] })
  const inSp = venue({ id: 'v3', cityId: 'sp', lat: -23.55, lng: -46.63, genres: ['punk'], showDays: [5] })
  const venues = [inCwb, inJve, inSp]
  const index = indexCities(cities)

  it('venuesInView applies bounds and filters', () => {
    expect(venuesInView(venues, southBounds, EMPTY_FILTERS).map((v) => v.id)).toEqual(['v1', 'v2'])
    expect(venuesInView(venues, southBounds, { ...EMPTY_FILTERS, genres: ['punk'] }).map((v) => v.id)).toEqual(['v1'])
  })

  it('venuesInView treats null bounds as the whole region', () => {
    expect(venuesInView(venues, null, EMPTY_FILTERS)).toHaveLength(3)
    expect(venuesInView(venues, null, { ...EMPTY_FILTERS, showDay: 6 }).map((v) => v.id)).toEqual(['v2'])
  })

  it('producersInView keeps producers serving any city inside the bounds', () => {
    const south = producer({ id: 'p1', cityIds: ['cwb', 'jve'] })
    const spOnly = producer({ id: 'p2', cityIds: ['sp'] })
    const mixed = producer({ id: 'p3', cityIds: ['sp', 'jve'] })
    const orphan = producer({ id: 'p4', cityIds: ['nope'] })
    expect(producersInView([south, spOnly, mixed, orphan], index, southBounds).map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(producersInView([south, spOnly, mixed, orphan], index, null)).toHaveLength(4)
  })

  it('bandsInView uses the base city', () => {
    const local = band({ id: 'b1', cityId: 'jve' })
    const away = band({ id: 'b2', cityId: 'sp' })
    const nomad = band({ id: 'b3', cityId: null })
    expect(bandsInView([local, away, nomad], index, southBounds).map((b) => b.id)).toEqual(['b1'])
    expect(bandsInView([local, away, nomad], index, null)).toHaveLength(3)
  })
})

describe('citySummary', () => {
  it('counts venues, producers (served cities) and bands of a city', () => {
    const data = {
      venues: [venue({ id: 'v1', cityId: 'cwb' }), venue({ id: 'v2', cityId: 'cwb' }), venue({ id: 'v3', cityId: 'sp' })],
      producers: [producer({ id: 'p1', cityIds: ['cwb', 'sp'] }), producer({ id: 'p2', cityIds: ['sp'] })],
      bands: [band({ id: 'b1', cityId: 'cwb' })],
    }
    const summary = citySummary('cwb', data)
    expect(summary).toEqual({ venues: 2, producers: 1, bands: 1 })
    expect(citySummaryLabel(curitiba, summary)).toBe('Curitiba/PR · 2 casas · 1 produtora · 1 banda')
    expect(citySummaryLabel(saoPaulo, citySummary('sp', data))).toBe('São Paulo/SP · 1 casa · 2 produtoras · 0 bandas')
  })
})

describe('display helpers', () => {
  it('sorts by name with pt-BR collation', () => {
    const names = sortByName([{ name: 'Zé' }, { name: 'Ácido' }, { name: 'banda' }, { name: 'Casa' }]).map((x) => x.name)
    expect(names).toEqual(['Ácido', 'banda', 'Casa', 'Zé'])
  })

  it('orders show days Monday-first and labels them', () => {
    expect(sortShowDays([0, 6, 4, 5, 4])).toEqual([4, 5, 6, 0])
    expect(showDaysLabel([0, 5, 6])).toBe('Sex · Sáb · Dom')
    expect(showDaysLabel([])).toBe('')
  })

  it('formats capacity', () => {
    expect(capacityLabel(null)).toBe('Capacidade não informada')
    expect(capacityLabel(150)).toBe('150 pessoas')
  })

  it('builds Instagram links from handles or URLs', () => {
    expect(instagramUrl('@banda_x')).toBe('https://instagram.com/banda_x')
    expect(instagramUrl('banda_x')).toBe('https://instagram.com/banda_x')
    expect(instagramUrl('instagram.com/banda_x/')).toBe('https://instagram.com/banda_x')
    expect(instagramUrl('https://www.instagram.com/banda_x')).toBe('https://www.instagram.com/banda_x')
    expect(instagramHandle('https://www.instagram.com/banda_x/')).toBe('@banda_x')
    expect(instagramHandle('banda_x')).toBe('@banda_x')
  })

  it('normalizes websites', () => {
    expect(websiteUrl('casa.com.br')).toBe('https://casa.com.br')
    expect(websiteUrl('http://casa.com.br')).toBe('http://casa.com.br')
    expect(websiteLabel('https://www.casa.com.br/')).toBe('casa.com.br')
  })
})
