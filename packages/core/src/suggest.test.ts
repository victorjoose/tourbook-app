import { describe, expect, it } from 'vitest'
import { roadKmEstimate } from './geo'
import {
  AWAY_TOLERANCE,
  SUGGEST_WEIGHTS,
  fillGaps,
  routeAlerts,
  suggestNextCities,
  type SuggestConstraints,
} from './suggest'
import type { Band, City, Producer, RegionData, Venue } from './types'

// ---------------------------------------------------------------------------
// Fixture (real cities, fictional venues/producers/bands)

function city(id: string, name: string, state: string, lat: number, lng: number): City {
  return { id, name, state, slug: id, lat, lng, population: null }
}

const joinville = city('joinville', 'Joinville', 'SC', -26.3045, -48.8487)
const curitiba = city('curitiba', 'Curitiba', 'PR', -25.4284, -49.2733)
const pontaGrossa = city('ponta-grossa', 'Ponta Grossa', 'PR', -25.0916, -50.1668)
const florianopolis = city('florianopolis', 'Florianópolis', 'SC', -27.5954, -48.548)
const londrina = city('londrina', 'Londrina', 'PR', -23.3045, -51.1696)
const saoPaulo = city('sao-paulo', 'São Paulo', 'SP', -23.5505, -46.6333)
const campinas = city('campinas', 'Campinas', 'SP', -22.9099, -47.0626)

const cities = [joinville, curitiba, pontaGrossa, florianopolis, londrina, saoPaulo, campinas]

function venue(id: string, c: City, name: string, overrides: Partial<Venue> = {}): Venue {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    cityId: c.id,
    name,
    slug: id,
    address: null,
    lat: c.lat,
    lng: c.lng,
    capacity: 200,
    genres: [],
    showDays: [],
    dealTypes: [],
    hasPa: true,
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
    ...overrides,
  }
}

function producer(id: string, name: string, cityIds: string[], genres: string[] = []): Producer {
  return {
    id,
    name,
    slug: id,
    cityId: cityIds[0] ?? null,
    cityIds,
    venueIds: [],
    genres,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    instagram: null,
    website: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
  }
}

function band(id: string, name: string, c: City, genres: string[], opensForTouring = true): Band {
  return {
    id,
    name,
    slug: id,
    cityId: c.id,
    genres,
    links: {},
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    opensForTouring,
    ownerId: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
  }
}

const venues: Venue[] = [
  venue('v-ctba-punk', curitiba, 'Porão Punk', { genres: ['punk', 'hardcore'], showDays: [5, 6], capacity: 300 }),
  // Unknown genres and unknown show days: neutral on both filters.
  venue('v-ctba-rock', curitiba, 'Bar do Rock', { genres: [], showDays: [], capacity: 150 }),
  venue('v-floripa-1', florianopolis, 'Galpão da Ilha', { genres: ['rock', 'punk'], showDays: [5, 6, 0], capacity: 200 }),
  venue('v-floripa-2', florianopolis, 'Casa Sertaneja', { genres: ['sertanejo'], showDays: [5, 6], capacity: 500 }),
  venue('v-pg-closed', pontaGrossa, 'Clube Fechado', { genres: [], showDays: [6], acceptsTouringBands: false }),
  venue('v-sp-1', saoPaulo, 'Hangar Hardcore', { genres: ['hardcore'], showDays: [4, 5, 6], capacity: 800 }),
  venue('v-ldn-1', londrina, 'Toca Punk', { genres: ['punk'], showDays: [5, 6], capacity: 250 }),
]

const producers: Producer[] = [
  producer('p-sul', 'Produtora Sul', [curitiba.id, pontaGrossa.id], ['punk', 'hardcore']),
  producer('p-sp', 'Produtora Paulista', [saoPaulo.id, campinas.id], ['rock']),
]

const bands: Band[] = [
  band('b-ctba-1', 'Os Revoltados', curitiba, ['hardcore']),
  band('b-ctba-2', 'Banda Caseira', curitiba, ['rock'], false),
  band('b-floripa-1', 'Maré Punk', florianopolis, ['punk']),
  band('b-jlle-1', 'Ferrugem', joinville, ['rock']),
]

const data: RegionData = { cities, venues, producers, bands }

const baseConstraints: SuggestConstraints = { maxKmPerDay: 400, genres: ['punk', 'hardcore'] }

const FRIDAY = '2026-03-06'
const SATURDAY = '2026-03-07'
const WEDNESDAY = '2026-03-04'

function ids(list: Array<{ city: City }>): string[] {
  return list.map((s) => s.city.id)
}

// ---------------------------------------------------------------------------

describe('suggestNextCities', () => {
  it('cuts candidates farther than maxKmPerDay from the previous city', () => {
    const result = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    const got = ids(result)
    expect(got).not.toContain('londrina')
    expect(got).not.toContain('campinas')
    expect(got).not.toContain('sao-paulo')
    expect(got).not.toContain('joinville')
    expect(got).toContain('curitiba')
    expect(got).toContain('florianopolis')
    for (const s of result) expect(s.kmFromPrev).toBeLessThanOrEqual(400)

    const wide = suggestNextCities({
      prevCity: joinville,
      date: FRIDAY,
      constraints: { ...baseConstraints, maxKmPerDay: 600 },
      data,
    })
    expect(ids(wide)).toContain('sao-paulo')
  })

  it('filters venues by weekday, keeping venues with unknown show days', () => {
    const friday = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    const ctbaFri = friday.find((s) => s.city.id === 'curitiba')
    expect(ctbaFri).toBeDefined()
    expect(ctbaFri?.venues.map((v) => v.id)).toEqual(['v-ctba-punk', 'v-ctba-rock'])
    expect(ctbaFri?.openVenueCount).toBe(1)
    expect(ctbaFri?.unknownDaysVenueCount).toBe(1)
    expect(ctbaFri?.reasons).toContain('1 casa com show na sexta')

    const wednesday = suggestNextCities({ prevCity: joinville, date: WEDNESDAY, constraints: baseConstraints, data })
    const ctbaWed = wednesday.find((s) => s.city.id === 'curitiba')
    expect(ctbaWed?.venues.map((v) => v.id)).toEqual(['v-ctba-rock'])
    expect(ctbaWed?.openVenueCount).toBe(0)
    // Unknown days still count, but score lower than a confirmed show day.
    expect(ctbaWed?.score).toBeLessThan(ctbaFri?.score ?? 0)
    expect(ctbaWed?.reasons.some((r) => r.includes('com show'))).toBe(false)
  })

  it('filters venues by genre overlap and touring acceptance', () => {
    const result = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    const floripa = result.find((s) => s.city.id === 'florianopolis')
    expect(floripa?.venues.map((v) => v.id)).toEqual(['v-floripa-1'])
    expect(floripa?.reasons).toContain('Punk na cena local')

    const pg = result.find((s) => s.city.id === 'ponta-grossa')
    expect(pg?.venues).toEqual([])
    expect(pg?.producers.map((p) => p.id)).toEqual(['p-sul'])
    expect(pg?.reasons).toContain('Produtora Produtora Sul atende a cidade')
  })

  it('filters venues by capacity when given', () => {
    const result = suggestNextCities({
      prevCity: joinville,
      date: FRIDAY,
      constraints: { ...baseConstraints, capacityMin: 250 },
      data,
    })
    const ctba = result.find((s) => s.city.id === 'curitiba')
    expect(ctba?.venues.map((v) => v.id)).toEqual(['v-ctba-punk'])
  })

  it('only lists local bands that open for touring bands', () => {
    const result = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    const ctba = result.find((s) => s.city.id === 'curitiba')
    expect(ctba?.bands.map((b) => b.id)).toEqual(['b-ctba-1'])
    expect(ctba?.reasons).toContain('1 banda local topa abrir')
  })

  it('gives a direction bonus toward the next fixed date and a penalty when moving away', () => {
    const nextFixed = { city: saoPaulo, date: '2026-03-09' }
    const without = suggestNextCities({ prevCity: joinville, date: SATURDAY, constraints: baseConstraints, data })
    const withNext = suggestNextCities({
      prevCity: joinville,
      nextFixed,
      date: SATURDAY,
      constraints: baseConstraints,
      data,
    })

    const kmPrevToNext = roadKmEstimate(joinville, saoPaulo)
    const ctbaBefore = without.find((s) => s.city.id === 'curitiba')
    const ctbaAfter = withNext.find((s) => s.city.id === 'curitiba')
    expect(ctbaAfter?.kmToNext).toBe(roadKmEstimate(curitiba, saoPaulo))
    expect(ctbaAfter?.kmToNext ?? Infinity).toBeLessThan(kmPrevToNext)
    expect(ctbaAfter?.score).toBeCloseTo((ctbaBefore?.score ?? 0) + SUGGEST_WEIGHTS.TOWARD_NEXT, 5)
    expect(ctbaAfter?.reasons).toContain('No caminho para São Paulo (dia 09/03)')

    const floripaBefore = without.find((s) => s.city.id === 'florianopolis')
    const floripaAfter = withNext.find((s) => s.city.id === 'florianopolis')
    expect(floripaAfter?.kmToNext ?? 0).toBeGreaterThan(kmPrevToNext * (1 + AWAY_TOLERANCE))
    expect(floripaAfter?.score).toBeCloseTo((floripaBefore?.score ?? 0) + SUGGEST_WEIGHTS.AWAY_FROM_NEXT, 5)
    expect(floripaAfter?.reasons).toContain('Afasta de São Paulo (dia 09/03)')
  })

  it('gives no direction signal when the previous city is the next fixed city (round trip home)', () => {
    const withNext = suggestNextCities({
      prevCity: joinville,
      nextFixed: { city: joinville, date: '2026-03-15' },
      date: SATURDAY,
      constraints: baseConstraints,
      data,
    })
    const without = suggestNextCities({ prevCity: joinville, date: SATURDAY, constraints: baseConstraints, data })
    expect(withNext.length).toBeGreaterThan(0)
    for (const s of withNext) {
      const base = without.find((b) => b.city.id === s.city.id)
      expect(s.score).toBeCloseTo(base?.score ?? NaN, 5)
      expect(s.reasons.some((r) => r.startsWith('Afasta de'))).toBe(false)
    }
  })

  it('cuts candidates that cannot reach the next fixed date in time', () => {
    // São Paulo the very next day: nothing within 400 km of Joinville is also within 400 km of SP.
    const result = suggestNextCities({
      prevCity: joinville,
      nextFixed: { city: saoPaulo, date: '2026-03-08' },
      date: SATURDAY,
      constraints: baseConstraints,
      data,
    })
    expect(result).toEqual([])

    // Two days later the budget doubles and Curitiba fits.
    const later = suggestNextCities({
      prevCity: joinville,
      nextFixed: { city: saoPaulo, date: '2026-03-09' },
      date: SATURDAY,
      constraints: baseConstraints,
      data,
    })
    expect(ids(later)).toContain('curitiba')
  })

  it('respects excludeCityIds and states', () => {
    const excluded = suggestNextCities({
      prevCity: joinville,
      date: FRIDAY,
      constraints: { ...baseConstraints, excludeCityIds: ['curitiba'] },
      data,
    })
    expect(ids(excluded)).not.toContain('curitiba')
    expect(ids(excluded)).toContain('florianopolis')

    const onlySc = suggestNextCities({
      prevCity: curitiba,
      date: FRIDAY,
      constraints: { ...baseConstraints, states: ['SC'] },
      data,
    })
    expect(ids(onlySc).every((id) => ['joinville', 'florianopolis'].includes(id))).toBe(true)
    expect(ids(onlySc)).toContain('joinville')
  })

  it('works for the first date (no previous city) and includes the distance reason otherwise', () => {
    const first = suggestNextCities({ prevCity: null, date: FRIDAY, constraints: baseConstraints, data })
    expect(first.length).toBeGreaterThan(0)
    for (const s of first) {
      expect(s.kmFromPrev).toBe(0)
      expect(s.hoursFromPrev).toBe(0)
    }

    const next = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    const ctba = next.find((s) => s.city.id === 'curitiba')
    expect(ctba?.reasons[0]).toMatch(/^A \d+ km de Joinville \(cerca de (\d+h(\d{2})?|\d+ min)\)$/)
  })

  it('sorts by score, then distance, then name and applies the limit', () => {
    const result = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data })
    expect(ids(result)[0]).toBe('curitiba')
    for (let i = 1; i < result.length; i++) {
      const a = result[i - 1]
      const b = result[i]
      if (!a || !b) continue
      expect(a.score).toBeGreaterThanOrEqual(b.score)
    }
    const limited = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data, limit: 1 })
    expect(limited).toHaveLength(1)
  })

  it('penalizes empty cities and drops them when enough cities have something', () => {
    const sparse: RegionData = { ...data, producers: [], bands: [] }
    const all = suggestNextCities({ prevCity: joinville, date: FRIDAY, constraints: baseConstraints, data: sparse })
    const pg = all.find((s) => s.city.id === 'ponta-grossa')
    expect(pg?.isEmpty).toBe(true)
    expect(pg?.reasons).toContain('Nenhuma casa, produtora ou banda cadastrada ainda')
    expect(ids(all).at(-1)).toBe('ponta-grossa')

    const limited = suggestNextCities({
      prevCity: joinville,
      date: FRIDAY,
      constraints: baseConstraints,
      data: sparse,
      limit: 2,
    })
    expect(ids(limited)).not.toContain('ponta-grossa')
  })

  it('is deterministic', () => {
    const input = {
      prevCity: joinville,
      nextFixed: { city: saoPaulo, date: '2026-03-09' },
      date: SATURDAY,
      constraints: baseConstraints,
      data,
    }
    const a = suggestNextCities(input)
    const b = suggestNextCities(input)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('fillGaps', () => {
  it('keys only the empty slots and excludes cities already in the tour', () => {
    const slots = [
      { date: '2026-03-06', cityId: 'joinville', fixed: true },
      { date: '2026-03-07', cityId: null, fixed: false },
      { date: '2026-03-09', cityId: 'sao-paulo', fixed: true },
      { date: '2026-03-13', fixed: false },
      { date: '2026-03-14', cityId: null, fixed: false },
    ]
    const result = fillGaps({ slots, constraints: baseConstraints, data, startCity: joinville, endCity: joinville })
    expect([...result.keys()]).toEqual(['2026-03-07', '2026-03-13', '2026-03-14'])

    const gap = result.get('2026-03-07') ?? []
    expect(gap.length).toBeGreaterThan(0)
    for (const s of gap) {
      expect(['joinville', 'sao-paulo']).not.toContain(s.city.id)
      expect(s.kmToNext).toBeDefined()
      // Previous filled city is Joinville.
      expect(s.kmFromPrev).toBe(roadKmEstimate(joinville, s.city))
    }

    // After São Paulo the band heads home (endCity); Campinas is the only city within reach.
    const tail = result.get('2026-03-13') ?? []
    expect(ids(tail)).toEqual(['campinas'])
    expect(tail[0]?.kmFromPrev).toBe(roadKmEstimate(saoPaulo, campinas))
  })

  it('uses startCity for the first slot when it has no city', () => {
    const slots = [
      { date: '2026-03-06', cityId: null, fixed: false },
      { date: '2026-03-07', cityId: 'curitiba', fixed: true },
    ]
    const result = fillGaps({ slots, constraints: baseConstraints, data, startCity: joinville })
    expect([...result.keys()]).toEqual(['2026-03-06'])
    const first = result.get('2026-03-06') ?? []
    for (const s of first) {
      expect(s.city.id).not.toBe('joinville')
      expect(s.city.id).not.toBe('curitiba')
      expect(s.kmFromPrev).toBe(roadKmEstimate(joinville, s.city))
      expect(s.kmToNext).toBe(roadKmEstimate(s.city, curitiba))
    }
  })

  it('returns an empty map when every slot is filled', () => {
    const slots = [
      { date: '2026-03-06', cityId: 'joinville', fixed: true },
      { date: '2026-03-07', cityId: 'curitiba', fixed: false },
    ]
    const result = fillGaps({ slots, constraints: baseConstraints, data, startCity: joinville })
    expect(result.size).toBe(0)
  })
})

describe('routeAlerts', () => {
  it('flags legs above maxKmPerDay, allowing longer legs over several days', () => {
    const tight = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-07', city: saoPaulo },
      ],
      400,
    )
    expect(tight).toHaveLength(1)
    expect(tight[0]?.level).toBe('error')
    expect(tight[0]?.date).toBe('2026-03-07')
    expect(tight[0]?.message).toMatch(
      /^Trecho de \d+ km entre Joinville e São Paulo passa do limite de 400 km por dia$/,
    )

    const relaxed = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-08', city: saoPaulo },
      ],
      400,
    )
    expect(relaxed).toEqual([])
  })

  it('warns about two dates on the same day', () => {
    const alerts = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-06', city: curitiba },
      ],
      400,
    )
    expect(alerts.some((a) => a.level === 'warn' && a.message === 'Duas datas no mesmo dia')).toBe(true)
  })

  it('warns about gaps longer than 3 days', () => {
    const alerts = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-10', city: curitiba },
      ],
      400,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.level).toBe('warn')
    expect(alerts[0]?.date).toBe('2026-03-10')
    expect(alerts[0]?.message).toMatch(/^3 dias sem show entre /)

    const fine = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-09', city: curitiba },
      ],
      400,
    )
    expect(fine).toEqual([])
  })

  it('warns about dates without a city and skips them for legs', () => {
    const alerts = routeAlerts(
      [
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-07', city: null },
        { date: '2026-03-08', city: saoPaulo },
      ],
      400,
    )
    expect(alerts).toEqual([{ date: '2026-03-07', level: 'warn', message: 'Sem cidade definida' }])
  })

  it('returns alerts sorted by date, errors first', () => {
    const alerts = routeAlerts(
      [
        { date: '2026-03-08', city: null },
        { date: '2026-03-07', city: saoPaulo },
        { date: '2026-03-06', city: joinville },
        { date: '2026-03-07', city: saoPaulo },
      ],
      400,
    )
    expect(alerts.map((a) => a.date)).toEqual(['2026-03-07', '2026-03-07', '2026-03-08'])
    expect(alerts[0]?.level).toBe('error')
    expect(alerts[1]?.message).toBe('Duas datas no mesmo dia')
  })
})
