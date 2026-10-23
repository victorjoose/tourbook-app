import type { Band, City, TourDate, TourMember, Venue } from '@tour/core'
import { describe, expect, it } from 'vitest'
import {
  asTourDateStatus,
  buildGapSlots,
  canEditTour,
  centsToInput,
  checklistLabel,
  checklistProgress,
  cityLabel,
  countConfirmed,
  datesWithoutCity,
  financeTotals,
  fromTimeInput,
  isIsoDate,
  legsBetween,
  normalizeText,
  parseBRL,
  plural,
  resolveDates,
  routeSummary,
  sameIdSet,
  searchByName,
  shareUrl,
  sortDates,
  stopMarkers,
  suggestNextDate,
  timesSummary,
  toTimeInput,
  tourPeriodLabel,
  venuesOfCity,
} from './helpers'

function city(partial: Partial<City> & Pick<City, 'id' | 'name'>): City {
  return { state: 'SC', slug: partial.id, lat: 0, lng: 0, population: null, ...partial }
}

function venue(partial: Partial<Venue> & Pick<Venue, 'id' | 'cityId'>): Venue {
  return {
    createdAt: '2026-01-01T00:00:00Z',
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

function tourDate(partial: Partial<TourDate> & Pick<TourDate, 'id' | 'date'>): TourDate {
  return {
    createdAt: '2026-01-01T00:00:00Z',
    tourId: 't1',
    cityId: null,
    venueId: null,
    producerId: null,
    status: 'ideia',
    isFixed: false,
    loadInTime: null,
    soundcheckTime: null,
    doorsTime: null,
    setTime: null,
    dealType: null,
    feeCents: null,
    costCents: null,
    lodging: null,
    checklist: [],
    notes: null,
    bands: [],
    ...partial,
  }
}

const joinville = city({ id: 'jve', name: 'Joinville', state: 'SC', lat: -26.3, lng: -48.85 })
const curitiba = city({ id: 'cwb', name: 'Curitiba', state: 'PR', lat: -25.43, lng: -49.27 })
const index = {
  cities: new Map([joinville, curitiba].map((c) => [c.id, c])),
  venues: new Map([venue({ id: 'v1', cityId: 'cwb', name: 'Bar X', lat: -25.44, lng: -49.28 })].map((v) => [v.id, v])),
  producers: new Map(),
  bands: new Map([band({ id: 'b1', name: 'Banda Local', cityId: 'cwb' })].map((b) => [b.id, b])),
}

describe('text helpers', () => {
  it('normalizes accents and case', () => {
    expect(normalizeText('  São José ')).toBe('sao jose')
  })

  it('pluralizes and labels cities', () => {
    expect(plural(1, 'data', 'datas')).toBe('1 data')
    expect(plural(3, 'data', 'datas')).toBe('3 datas')
    expect(cityLabel(joinville)).toBe('Joinville/SC')
  })

  it('builds the public share url without a double slash', () => {
    expect(shareUrl('https://app.test', 'abc')).toBe('https://app.test/t/abc')
    expect(shareUrl('https://app.test/', 'abc')).toBe('https://app.test/t/abc')
  })
})

describe('parseBRL', () => {
  it('parses pt-BR formatted money with and without the R$ prefix', () => {
    expect(parseBRL('R$ 1.500,00')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('R$ 1.500,00')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('1.500,00')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('1500,5')).toEqual({ ok: true, cents: 150050 })
    expect(parseBRL(',50')).toEqual({ ok: true, cents: 50 })
  })

  it('parses plain numbers and thousands separators', () => {
    expect(parseBRL('1500')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('1.500')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('1.500.000')).toEqual({ ok: true, cents: 150000000 })
    expect(parseBRL('0')).toEqual({ ok: true, cents: 0 })
  })

  it('accepts a dot as decimal separator when it is clearly decimal', () => {
    expect(parseBRL('1500.50')).toEqual({ ok: true, cents: 150050 })
    expect(parseBRL('1500.5')).toEqual({ ok: true, cents: 150050 })
  })

  it('returns null for an empty input', () => {
    expect(parseBRL('')).toEqual({ ok: true, cents: null })
    expect(parseBRL('   ')).toEqual({ ok: true, cents: null })
    expect(parseBRL('R$ ')).toEqual({ ok: true, cents: null })
  })

  it('rejects garbage, negatives and too many decimals', () => {
    expect(parseBRL('abc').ok).toBe(false)
    expect(parseBRL('-10').ok).toBe(false)
    expect(parseBRL('1,234').ok).toBe(false)
    expect(parseBRL('12.3456').ok).toBe(false)
    expect(parseBRL('1.50.000').ok).toBe(false)
    expect(parseBRL('1.500,00,00').ok).toBe(false)
  })

  it('round-trips through centsToInput', () => {
    expect(centsToInput(150000)).toBe('1.500,00')
    expect(centsToInput(50)).toBe('0,50')
    expect(centsToInput(null)).toBe('')
    expect(parseBRL(centsToInput(123456))).toEqual({ ok: true, cents: 123456 })
  })
})

describe('finance', () => {
  it('sums fees and costs and counts the dates with each', () => {
    const totals = financeTotals([
      tourDate({ id: 'a', date: '2026-03-06', feeCents: 150000, costCents: 20000 }),
      tourDate({ id: 'b', date: '2026-03-07', feeCents: null, costCents: 5000 }),
      tourDate({ id: 'c', date: '2026-03-08', feeCents: 80000, costCents: null }),
    ])
    expect(totals).toEqual({ feeCents: 230000, costCents: 25000, balanceCents: 205000, datesWithFee: 2, datesWithCost: 2 })
  })

  it('is zero for no dates', () => {
    expect(financeTotals([])).toEqual({ feeCents: 0, costCents: 0, balanceCents: 0, datesWithFee: 0, datesWithCost: 0 })
  })
})

describe('checklist', () => {
  it('counts done items', () => {
    const items = [
      { label: 'a', done: true },
      { label: 'b', done: false },
      { label: 'c', done: true },
      { label: 'd', done: false },
    ]
    expect(checklistProgress(items)).toEqual({ done: 2, total: 4 })
    expect(checklistLabel(items)).toBe('2/4')
    expect(checklistLabel([])).toBe('0/0')
  })
})

describe('dates', () => {
  const dates = [
    tourDate({ id: 'b', date: '2026-03-07', status: 'confirmado' }),
    tourDate({ id: 'a', date: '2026-03-06', status: 'realizado' }),
    tourDate({ id: 'c', date: '2026-03-08', status: 'cancelado' }),
  ]

  it('sorts by ISO date', () => {
    expect(sortDates(dates).map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('suggests the day after the last date, or today', () => {
    expect(suggestNextDate(dates)).toBe('2026-03-09')
    expect(suggestNextDate([], '2026-01-01')).toBe('2026-01-01')
  })

  it('labels the period and counts confirmed dates', () => {
    expect(tourPeriodLabel(dates)).toBe('6 a 8 de março de 2026')
    expect(tourPeriodLabel([])).toBeNull()
    expect(countConfirmed(dates)).toBe(2)
  })

  it('validates ISO dates and statuses', () => {
    expect(isIsoDate('2026-03-06')).toBe(true)
    expect(isIsoDate('06/03/2026')).toBe(false)
    expect(asTourDateStatus('negociando')).toBe('negociando')
    expect(asTourDateStatus('whatever')).toBeNull()
  })

  it('converts times for inputs', () => {
    expect(toTimeInput('20:30:00')).toBe('20:30')
    expect(toTimeInput(null)).toBe('')
    expect(fromTimeInput('')).toBeNull()
    expect(fromTimeInput('20:30')).toBe('20:30')
    expect(fromTimeInput('20:30:00')).toBe('20:30')
  })

  it('summarizes the times of the night', () => {
    expect(timesSummary(tourDate({ id: 'x', date: '2026-03-06', loadInTime: '16:00:00', setTime: '22:00:00' }))).toBe(
      'Load-in 16:00 · Show 22:00',
    )
    expect(timesSummary(tourDate({ id: 'x', date: '2026-03-06' }))).toBe('')
  })
})

describe('route', () => {
  const dates = [
    tourDate({ id: 'd2', date: '2026-03-07', cityId: 'cwb', venueId: 'v1', status: 'confirmado', bands: [{ bandId: 'b1', role: 'abertura' }] }),
    tourDate({ id: 'd1', date: '2026-03-06', cityId: 'jve' }),
    tourDate({ id: 'd3', date: '2026-03-08' }),
  ]
  const resolved = resolveDates(dates, index)

  it('resolves lookups in timeline order', () => {
    expect(resolved.map((r) => r.date.id)).toEqual(['d1', 'd2', 'd3'])
    expect(resolved[0]?.city?.name).toBe('Joinville')
    expect(resolved[1]?.venue?.name).toBe('Bar X')
    expect(resolved[1]?.bands.map((b) => b.name)).toEqual(['Banda Local'])
    expect(resolved[2]?.city).toBeNull()
  })

  it('computes legs between consecutive dates (null when a side has no place)', () => {
    const legs = legsBetween(resolved)
    expect(legs).toHaveLength(2)
    expect(legs[0]?.km).toBeGreaterThan(100)
    expect(legs[0]?.km).toBeLessThan(200)
    expect(legs[0]?.hours).toBeGreaterThan(0)
    expect(legs[1]).toBeNull()
  })

  it('summarizes the route', () => {
    const summary = routeSummary(resolved)
    expect(summary.dates).toBe(3)
    expect(summary.confirmed).toBe(1)
    expect(summary.cities).toBe(2)
    expect(summary.withoutCity).toBe(1)
    expect(summary.km).toBeGreaterThan(100)
  })

  it('numbers the markers following the timeline and uses the venue position', () => {
    const stops = stopMarkers(resolved)
    expect(stops.map((s) => s.label)).toEqual(['1', '2'])
    expect(stops[1]).toMatchObject({ id: 'd2', lat: -25.44, lng: -49.28, title: '2. Bar X · Curitiba/PR' })
    expect(stops[0]?.title).toBe('1. Joinville/SC')
  })
})

describe('gaps', () => {
  const dates = [
    tourDate({ id: 'a', date: '2026-03-06', cityId: 'jve' }),
    tourDate({ id: 'b', date: '2026-03-07', isFixed: true }),
    tourDate({ id: 'c', date: '2026-03-08' }),
  ]

  it('marks dates with a city or pinned as fixed', () => {
    expect(buildGapSlots(dates)).toEqual([
      { date: '2026-03-06', cityId: 'jve', fixed: true },
      { date: '2026-03-07', cityId: null, fixed: true },
      { date: '2026-03-08', cityId: null, fixed: false },
    ])
  })

  it('lists the dates without a city', () => {
    expect(datesWithoutCity(dates).map((d) => d.id)).toEqual(['b', 'c'])
  })
})

describe('permissions', () => {
  const members: TourMember[] = [
    { tourId: 't1', profileId: 'editor', role: 'editor' },
    { tourId: 't1', profileId: 'viewer', role: 'viewer' },
  ]
  const tour = { ownerId: 'owner', members }

  it('lets the owner and editors edit, not viewers or strangers', () => {
    expect(canEditTour(tour, 'owner')).toBe(true)
    expect(canEditTour(tour, 'editor')).toBe(true)
    expect(canEditTour(tour, 'viewer')).toBe(false)
    expect(canEditTour(tour, 'someone')).toBe(false)
    expect(canEditTour(tour, null)).toBe(false)
  })
})

describe('search', () => {
  it('finds by name, accent-insensitive', () => {
    const bands = [band({ id: 'b1', name: 'Ácido Cítrico' }), band({ id: 'b2', name: 'Zumbis' })]
    expect(searchByName(bands, 'acido').map((b) => b.id)).toEqual(['b1'])
    expect(searchByName(bands, 'citr').map((b) => b.id)).toEqual(['b1'])
    expect(searchByName(bands, '')).toEqual([])
  })

  it('filters venues of a city', () => {
    const venues = [venue({ id: 'v2', cityId: 'jve', name: 'Zeta' }), venue({ id: 'v1', cityId: 'jve', name: 'Alfa' }), venue({ id: 'v3', cityId: 'cwb' })]
    expect(venuesOfCity(venues, 'jve').map((v) => v.id)).toEqual(['v1', 'v2'])
    expect(venuesOfCity(venues, null)).toEqual([])
  })

  it('compares id sets ignoring order', () => {
    expect(sameIdSet(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameIdSet(['a'], ['a', 'b'])).toBe(false)
  })
})
