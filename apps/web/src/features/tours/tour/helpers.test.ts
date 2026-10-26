import type { Band, City, Producer, TourDate, TourWithDates, Venue } from '@tour/core'
import { describe, expect, it } from 'vitest'
import { normalizeText, plural } from '../../../lib/text'
import {
  addChecklistItem,
  alertInputs,
  applyDatePatch,
  asDealType,
  asTourDateStatus,
  buildGapSlots,
  canEditTour,
  centsToInput,
  checklistLabel,
  checklistProgress,
  cityLabel,
  countConfirmed,
  datesWithoutCity,
  editorPatchOf,
  editorValuesOf,
  financeTotals,
  fromTimeInput,
  isIsoDate,
  isTourOwner,
  joinNamesPt,
  legLabel,
  legsBetween,
  mergeDatePatch,
  parseBRL,
  removeChecklistItem,
  removeDate,
  resolveDates,
  routeSummary,
  sameBounds,
  sameIdSet,
  searchByName,
  shareUrl,
  sortDates,
  startCityFor,
  stopMarkers,
  suggestConstraintsOf,
  suggestNextDate,
  textOrNull,
  timesSummary,
  toTimeInput,
  toggleChecklistItem,
  tourEditorPatchOf,
  tourEditorValuesOf,
  tourPeriodLabel,
  venuesOfCity,
  withCity,
  withVenue,
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

function producer(partial: Partial<Producer> & Pick<Producer, 'id' | 'cityIds'>): Producer {
  return {
    name: partial.id,
    slug: partial.id,
    cityId: partial.cityIds[0] ?? null,
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

function tour(partial: Partial<TourWithDates> = {}): TourWithDates {
  return {
    id: 't1',
    ownerId: 'owner',
    bandId: null,
    bandName: 'Banda',
    name: 'Turnê Sul',
    startCityId: null,
    endCityId: null,
    maxKmPerDay: 400,
    allowOffDays: true,
    genres: ['punk'],
    capacityMin: null,
    capacityMax: 300,
    notes: null,
    shareToken: null,
    memberIds: ['owner'],
    memberRoles: { owner: 'editor' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    dates: [],
    members: [],
    ...partial,
  }
}

const joinville = city({ id: 'jve', name: 'Joinville', state: 'SC', lat: -26.3, lng: -48.85 })
const curitiba = city({ id: 'cwb', name: 'Curitiba', state: 'PR', lat: -25.43, lng: -49.27 })
const barX = venue({ id: 'v1', cityId: 'cwb', name: 'Bar X', lat: -25.44, lng: -49.28 })
const index = {
  cities: new Map([joinville, curitiba].map((c) => [c.id, c])),
  venues: new Map([barX].map((v) => [v.id, v])),
  producers: new Map([producer({ id: 'p1', cityIds: ['cwb'] })].map((p) => [p.id, p])),
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

  it('trims text to null and joins names in pt-BR', () => {
    expect(textOrNull('  ')).toBeNull()
    expect(textOrNull(' oi ')).toBe('oi')
    expect(textOrNull(null)).toBeNull()
    expect(joinNamesPt([])).toBe('')
    expect(joinNamesPt(['A'])).toBe('A')
    expect(joinNamesPt(['A', 'B'])).toBe('A e B')
    expect(joinNamesPt(['A', 'B', 'C'])).toBe('A, B e C')
  })
})

describe('parseBRL', () => {
  it('parses pt-BR formatted money with and without the R$ prefix', () => {
    expect(parseBRL('R$ 1.500,00')).toEqual({ ok: true, cents: 150000 })
    expect(parseBRL('R$ 1.500,00')).toEqual({ ok: true, cents: 150000 })
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
  const items = [
    { label: 'a', done: true },
    { label: 'b', done: false },
    { label: 'c', done: true },
    { label: 'd', done: false },
  ]

  it('counts done items', () => {
    expect(checklistProgress(items)).toEqual({ done: 2, total: 4 })
    expect(checklistLabel(items)).toBe('2/4')
    expect(checklistLabel([])).toBe('0/0')
  })

  it('toggles, adds and removes without mutating the original', () => {
    const toggled = toggleChecklistItem(items, 1)
    expect(toggled[1]).toEqual({ label: 'b', done: true })
    expect(items[1]?.done).toBe(false)

    expect(addChecklistItem(items, '  Van alugada ')).toHaveLength(5)
    expect(addChecklistItem(items, '  Van alugada ').at(-1)).toEqual({ label: 'Van alugada', done: false })
    expect(addChecklistItem(items, '   ')).toEqual(items)

    expect(removeChecklistItem(items, 0).map((i) => i.label)).toEqual(['b', 'c', 'd'])
    expect(items).toHaveLength(4)
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

  it('validates ISO dates, statuses and deal types', () => {
    expect(isIsoDate('2026-03-06')).toBe(true)
    expect(isIsoDate('06/03/2026')).toBe(false)
    expect(asTourDateStatus('negociando')).toBe('negociando')
    expect(asTourDateStatus('whatever')).toBeNull()
    expect(asDealType('porta')).toBe('porta')
    expect(asDealType('x')).toBeNull()
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
    expect(legLabel({ km: 130, hours: 1.9 })).toBe('130 km · 1h54')
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

  it('prepares the input for routeAlerts', () => {
    expect(alertInputs(resolved)).toEqual([
      { date: '2026-03-06', city: joinville },
      { date: '2026-03-07', city: curitiba },
      { date: '2026-03-08', city: null },
    ])
  })

  it('compares bounds by value', () => {
    const a = { minLat: 1, minLng: 2, maxLat: 3, maxLng: 4 }
    expect(sameBounds(a, { ...a })).toBe(true)
    expect(sameBounds(a, { ...a, maxLng: 5 })).toBe(false)
    expect(sameBounds(a, null)).toBe(false)
    expect(sameBounds(null, null)).toBe(true)
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

  it('takes the constraints from the tour', () => {
    expect(suggestConstraintsOf(tour({ maxKmPerDay: 300, genres: ['punk', 'hardcore'], capacityMin: 50, capacityMax: null }))).toEqual({
      maxKmPerDay: 300,
      genres: ['punk', 'hardcore'],
      capacityMin: 50,
      capacityMax: null,
    })
  })

  it('falls back to the first date with a city as the start city', () => {
    const resolved = resolveDates(dates, index)
    expect(startCityFor(tour({ startCityId: 'cwb' }), index.cities, resolved)?.id).toBe('cwb')
    expect(startCityFor(tour({ startCityId: 'missing' }), index.cities, resolved)?.id).toBe('jve')
    expect(startCityFor(tour({ startCityId: null }), index.cities, [])).toBeNull()
  })
})

describe('permissions', () => {
  const access = { ownerId: 'owner', memberRoles: { owner: 'editor', editor: 'editor', viewer: 'viewer' } as const }

  it('lets the owner and editors edit, not viewers or strangers', () => {
    expect(canEditTour(access, 'owner')).toBe(true)
    expect(canEditTour(access, 'editor')).toBe(true)
    expect(canEditTour(access, 'viewer')).toBe(false)
    expect(canEditTour(access, 'someone')).toBe(false)
    expect(canEditTour(access, null)).toBe(false)
    expect(canEditTour(access, undefined)).toBe(false)
  })

  it('knows who owns the tour', () => {
    expect(isTourOwner(access, 'owner')).toBe(true)
    expect(isTourOwner(access, 'editor')).toBe(false)
    expect(isTourOwner(access, undefined)).toBe(false)
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

describe('optimistic cache updates', () => {
  const base = tourDate({ id: 'd1', date: '2026-03-06', status: 'ideia', feeCents: 1000, checklist: [{ label: 'a', done: false }] })

  it('merges a patch converting status and deal type', () => {
    const merged = mergeDatePatch(base, { status: 'confirmado', dealType: 'porta', feeCents: null, lodging: 'Casa do Zé' })
    expect(merged.status).toBe('confirmado')
    expect(merged.dealType).toBe('porta')
    expect(merged.feeCents).toBeNull()
    expect(merged.lodging).toBe('Casa do Zé')
    expect(merged.checklist).toEqual(base.checklist)
    // Unknown values keep the current status; an invalid deal type becomes null.
    expect(mergeDatePatch(base, { status: 'nope' }).status).toBe('ideia')
    expect(mergeDatePatch(base, { dealType: 'nope' }).dealType).toBeNull()
  })

  it('copies checklist and bands from the patch', () => {
    const merged = mergeDatePatch(base, { checklist: [{ label: 'x', done: true }], bands: [{ bandId: 'b1', role: 'convidada' }] })
    expect(merged.checklist).toEqual([{ label: 'x', done: true }])
    expect(merged.bands).toEqual([{ bandId: 'b1', role: 'convidada' }])
  })

  it('patches only the matching date in the tour and keeps other identities', () => {
    const other = tourDate({ id: 'd2', date: '2026-03-07' })
    const t = tour({ dates: [base, other] })
    const next = applyDatePatch(t, 'd1', { status: 'negociando' })
    expect(next.dates[0]?.status).toBe('negociando')
    expect(next.dates[1]).toBe(other)
    expect(t.dates[0]?.status).toBe('ideia')
    expect(removeDate(t, 'd1').dates.map((d) => d.id)).toEqual(['d2'])
  })
})

describe('date editor', () => {
  const date = tourDate({
    id: 'd1',
    date: '2026-03-06',
    cityId: 'cwb',
    venueId: 'v1',
    producerId: 'p1',
    status: 'negociando',
    isFixed: true,
    loadInTime: '16:00:00',
    setTime: '22:00',
    dealType: 'misto',
    feeCents: 150000,
    costCents: 2550,
    lodging: 'Hostel',
    notes: 'Levar merch',
    checklist: [{ label: 'Contrato', done: true }],
    bands: [{ bandId: 'b1', role: 'convidada' }],
  })

  it('builds form values from a date', () => {
    const values = editorValuesOf(date)
    expect(values).toMatchObject({
      date: '2026-03-06',
      cityId: 'cwb',
      venueId: 'v1',
      producerId: 'p1',
      status: 'negociando',
      isFixed: true,
      loadInTime: '16:00',
      soundcheckTime: '',
      setTime: '22:00',
      dealType: 'misto',
      fee: '1.500,00',
      cost: '25,50',
      lodging: 'Hostel',
      notes: 'Levar merch',
      bandIds: ['b1'],
    })
    expect(values.checklist).toEqual(date.checklist)
    expect(values.checklist).not.toBe(date.checklist)
  })

  it('round-trips into a single patch with checklist and bands', () => {
    const result = editorPatchOf({ ...editorValuesOf(date), bandIds: ['b1', 'b2', 'b1'], fee: 'R$ 2.000,00', notes: '  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch).toEqual({
      date: '2026-03-06',
      cityId: 'cwb',
      venueId: 'v1',
      producerId: 'p1',
      status: 'negociando',
      isFixed: true,
      loadInTime: '16:00',
      soundcheckTime: null,
      doorsTime: null,
      setTime: '22:00',
      dealType: 'misto',
      feeCents: 200000,
      costCents: 2550,
      lodging: 'Hostel',
      notes: null,
      checklist: [{ label: 'Contrato', done: true }],
      bands: [
        { bandId: 'b1', role: 'convidada' },
        { bandId: 'b2', role: 'convidada' },
      ],
    })
  })

  it('clears venue and producer when there is no city and drops empty checklist labels', () => {
    const result = editorPatchOf({
      ...editorValuesOf(date),
      cityId: null,
      dealType: '',
      fee: '',
      checklist: [
        { label: '  ', done: false },
        { label: ' Rider ', done: true },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.venueId).toBeNull()
    expect(result.patch.producerId).toBeNull()
    expect(result.patch.dealType).toBeNull()
    expect(result.patch.feeCents).toBeNull()
    expect(result.patch.checklist).toEqual([{ label: 'Rider', done: true }])
  })

  it('reports validation errors per field', () => {
    const result = editorPatchOf({ ...editorValuesOf(date), date: '06/03/2026', fee: 'abc', cost: '1,234' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.date).toBeTruthy()
    expect(result.errors.fee).toBeTruthy()
    expect(result.errors.cost).toBeTruthy()
  })

  it('keeps venue and producer only when they belong to the new city', () => {
    const values = editorValuesOf(date)
    const lookups = { venues: index.venues, producers: index.producers }
    expect(withCity(values, 'cwb', lookups)).toMatchObject({ cityId: 'cwb', venueId: 'v1', producerId: 'p1' })
    expect(withCity(values, 'jve', lookups)).toMatchObject({ cityId: 'jve', venueId: null, producerId: null })
    expect(withCity(values, null, lookups)).toMatchObject({ cityId: null, venueId: null, producerId: null })
  })

  it('picking a venue also sets its city', () => {
    const values = { ...editorValuesOf(date), cityId: null, venueId: null }
    expect(withVenue(values, barX)).toMatchObject({ cityId: 'cwb', venueId: 'v1' })
    expect(withVenue(values, null)).toMatchObject({ cityId: null, venueId: null })
  })
})

describe('tour editor', () => {
  it('builds values and validates like the tour schema', () => {
    const values = tourEditorValuesOf(tour({ name: 'Sul 2026', bandName: 'Storm', maxKmPerDay: 350 }))
    expect(values).toEqual({ name: 'Sul 2026', bandName: 'Storm', maxKmPerDay: '350' })
    expect(tourEditorPatchOf({ name: ' Sul 2026 ', bandName: ' Storm ', maxKmPerDay: ' 350 ' })).toEqual({
      ok: true,
      patch: { name: 'Sul 2026', bandName: 'Storm', maxKmPerDay: 350 },
    })
  })

  it('rejects short names, empty band and km outside the limits', () => {
    const result = tourEditorPatchOf({ name: 'A', bandName: '', maxKmPerDay: '20' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual({ name: 'Dê um nome à turnê', bandName: 'Informe a banda', maxKmPerDay: 'Mínimo 50 km' })
    expect(tourEditorPatchOf({ name: 'Ok', bandName: 'B', maxKmPerDay: '2000' }).ok).toBe(false)
    expect(tourEditorPatchOf({ name: 'Ok', bandName: 'B', maxKmPerDay: '12.5' }).ok).toBe(false)
    expect(tourEditorPatchOf({ name: 'Ok', bandName: 'B', maxKmPerDay: '' }).ok).toBe(false)
  })
})
