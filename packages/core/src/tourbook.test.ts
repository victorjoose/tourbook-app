import { describe, expect, it } from 'vitest'
import { driveHoursEstimate, roadKmEstimate, routeTotals } from './geo'
import { buildTourbook, formatCurrencyBRL, whatsappUrl } from './tourbook'
import type { Band, City, Producer, Tour, TourDate, Venue } from './types'

// ---------- fixture ----------

const curitiba: City = {
  id: 'city-cwb',
  name: 'Curitiba',
  state: 'PR',
  slug: 'curitiba-pr',
  population: 1_963_726,
  lat: -25.4284,
  lng: -49.2733,
}

const joinville: City = {
  id: 'city-jvl',
  name: 'Joinville',
  state: 'SC',
  slug: 'joinville-sc',
  population: 616_317,
  lat: -26.3045,
  lng: -48.8487,
}

function makeVenue(overrides: Partial<Venue> & Pick<Venue, 'id' | 'cityId' | 'name' | 'lat' | 'lng'>): Venue {
  return {
    slug: overrides.id,
    address: null,
    capacity: 200,
    genres: ['punk'],
    showDays: [5, 6],
    dealTypes: ['porta'],
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
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeBand(overrides: Partial<Band> & Pick<Band, 'id' | 'name'>): Band {
  return {
    slug: overrides.id,
    cityId: null,
    genres: ['hardcore'],
    links: {},
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    opensForTouring: true,
    ownerId: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    ...overrides,
  }
}

function makeDate(overrides: Partial<TourDate> & Pick<TourDate, 'id' | 'date'>): TourDate {
  return {
    tourId: 'tour-1',
    cityId: null,
    venueId: null,
    producerId: null,
    status: 'ideia',
    createdAt: '2026-01-01T00:00:00Z',
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
    ...overrides,
  }
}

const venueCwb = makeVenue({
  id: 'venue-cwb',
  cityId: curitiba.id,
  name: 'Bar do Rock',
  address: 'Rua das Flores, 100 - Centro',
  lat: -25.43,
  lng: -49.27,
  contactName: 'Zé',
  contactPhone: '(41) 98888-0002',
})

const venueJvl = makeVenue({
  id: 'venue-jvl',
  cityId: joinville.id,
  name: 'Galpão Punk',
  address: 'Av. Beira Rio, 42',
  lat: -26.3,
  lng: -48.85,
  contactName: 'Maria',
  contactPhone: '(47) 99999-0001',
  contactEmail: 'galpao@example.com',
  instagram: '@galpaopunk',
})

const producer: Producer = {
  id: 'prod-1',
  name: 'Coletivo Sul',
  slug: 'coletivo-sul',
  cityId: joinville.id,
  cityIds: [joinville.id, curitiba.id],
  venueIds: [venueJvl.id],
  genres: ['punk', 'hardcore'],
  contactName: 'Carla',
  contactPhone: '+55 47 97777-0003',
  contactEmail: 'carla@example.com',
  instagram: null,
  website: null,
  notes: null,
  status: 'verified',
  submittedBy: null,
}

const bandWithContact = makeBand({
  id: 'band-a',
  name: 'Os Vândalos',
  cityId: joinville.id,
  contactName: 'Tião',
  contactPhone: '47 96666-0004',
  links: { instagram: 'osvandalos' },
})

const bandWithoutContact = makeBand({ id: 'band-b', name: 'Silêncio Total', cityId: joinville.id })

const tour: Tour = {
  id: 'tour-1',
  ownerId: 'user-1',
  bandId: null,
  bandName: 'Ratos de Garagem',
  name: 'Turnê Sul 2026',
  startCityId: curitiba.id,
  endCityId: null,
  maxKmPerDay: 400,
  allowOffDays: true,
  genres: ['punk'],
  capacityMin: null,
  capacityMax: null,
  notes: null,
  shareToken: null,
  memberIds: ['user-1'],
  memberRoles: { 'user-1': 'editor' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

// Dates are passed out of order on purpose.
const dates: TourDate[] = [
  makeDate({
    id: 'd3',
    date: '2026-03-14',
    cityId: joinville.id,
    venueId: venueJvl.id,
    producerId: producer.id,
    status: 'confirmado',
    loadInTime: '18:00:00',
    soundcheckTime: '19:30:00',
    doorsTime: '21:00:00',
    setTime: '23:00:00',
    dealType: 'cache_fixo',
    feeCents: 150_000,
    costCents: 40_000,
    lodging: 'Casa do Tião',
    notes: 'Levar banner.',
    bands: [
      { bandId: bandWithContact.id, role: 'abertura' },
      { bandId: bandWithoutContact.id, role: 'local' },
      { bandId: 'band-missing', role: 'fantasma' },
    ],
  }),
  makeDate({
    id: 'd1',
    date: '2026-03-06',
    cityId: curitiba.id,
    venueId: venueCwb.id,
    // Same producer as the Joinville date → must be deduplicated in tour-level contacts.
    producerId: producer.id,
    status: 'realizado',
    setTime: '22:00',
    dealType: 'porta',
    feeCents: 80_000,
    costCents: 10_000,
  }),
  makeDate({ id: 'd2', date: '2026-03-07', status: 'negociando', feeCents: 50_000, costCents: 5_000 }),
]

const lookups = {
  cities: [curitiba, joinville],
  venues: [venueCwb, venueJvl],
  producers: [producer],
  bands: [bandWithContact, bandWithoutContact],
}

const normalize = (s: string): string => s.replace(/ /g, ' ')

// ---------- tests ----------

describe('buildTourbook', () => {
  const book = buildTourbook({ tour, dates, lookups })

  it('fills the header from the tour and the sorted dates', () => {
    expect(book.title).toBe('Turnê Sul 2026')
    expect(book.bandName).toBe('Ratos de Garagem')
    expect(book.period).toEqual({ start: '2026-03-06', end: '2026-03-14', label: '6 a 14 de março de 2026' })
  })

  it('orders dates ascending in summary and days', () => {
    expect(book.summary.map((r) => r.date)).toEqual(['2026-03-06', '2026-03-07', '2026-03-14'])
    expect(book.days.map((d) => d.id)).toEqual(['d1', 'd2', 'd3'])
  })

  it('builds summary rows with pt-BR labels', () => {
    const [cwb, tbd, jvl] = book.summary
    expect(cwb).toEqual({
      date: '2026-03-06',
      dateLabel: '06/03/2026',
      weekday: 'Sex',
      city: 'Curitiba',
      state: 'PR',
      venue: 'Bar do Rock',
      setTime: '22:00',
      status: 'realizado',
      statusLabel: 'Realizado',
    })
    expect(tbd).toMatchObject({ city: 'A definir', state: '', venue: null, setTime: null, statusLabel: 'Em negociação' })
    expect(jvl).toMatchObject({ weekday: 'Sáb', city: 'Joinville', state: 'SC', venue: 'Galpão Punk', setTime: '23:00' })
  })

  it('builds a full day page for the Joinville date', () => {
    const day = book.days[2]
    expect(day).toBeDefined()
    if (!day) return
    expect(day.dateLabel).toBe('Sábado, 14 de março de 2026')
    expect(day.weekday).toBe('Sábado')
    expect(day.city?.id).toBe(joinville.id)
    expect(day.venue?.id).toBe(venueJvl.id)
    expect(day.address).toBe('Av. Beira Rio, 42')
    expect(day.mapsUrl).toBe('https://www.google.com/maps/search/?api=1&query=-26.3,-48.85')
    expect(day.times).toEqual({ loadIn: '18:00', soundcheck: '19:30', doors: '21:00', set: '23:00' })
    expect(day.deal.type).toBe('Cachê fixo')
    expect(normalize(day.deal.feeLabel ?? '')).toBe('R$ 1.500,00')
    expect(day.lodging).toBe('Casa do Tião')
    expect(day.notes).toBe('Levar banner.')
    // Missing band ids are dropped, never thrown on.
    expect(day.bands).toEqual([
      { name: 'Os Vândalos', role: 'abertura' },
      { name: 'Silêncio Total', role: 'local' },
    ])
    expect(day.nextLeg).toBeNull()
  })

  it('lists only reachable contacts for a day, with labels and WhatsApp links', () => {
    const day = book.days[2]
    expect(day?.contacts.map((c) => c.label)).toEqual(['Casa', 'Produtora', 'Banda: Os Vândalos'])
    expect(day?.contacts[0]).toEqual({
      label: 'Casa',
      name: 'Maria',
      phone: '(47) 99999-0001',
      whatsappUrl: 'https://wa.me/5547999990001',
      email: 'galpao@example.com',
      instagram: '@galpaopunk',
    })
    expect(day?.contacts[2]).toMatchObject({ name: 'Tião', instagram: 'osvandalos', whatsappUrl: 'https://wa.me/5547966660004' })
  })

  it('handles a date without city: no map link, no contacts, no next leg', () => {
    const day = book.days[1]
    expect(day).toMatchObject({ city: null, venue: null, address: null, mapsUrl: null, contacts: [], nextLeg: null })
    expect(day?.times).toEqual({ loadIn: null, soundcheck: null, doors: null, set: null })
    // A fee can exist before the city is decided.
    expect(day?.deal.type).toBeNull()
    expect(normalize(day?.deal.feeLabel ?? '')).toBe('R$ 500,00')
  })

  it('computes nextLeg to the next date that has a city, skipping undefined ones', () => {
    const km = roadKmEstimate(curitiba, joinville)
    expect(km).toBeGreaterThan(0)
    expect(book.days[0]?.nextLeg).toEqual({ km, hours: driveHoursEstimate(km), toCity: 'Joinville/SC' })
  })

  it('deduplicates tour-level contacts by phone/e-mail, keeping the first occurrence and its city', () => {
    expect(book.contacts.map((c) => c.label)).toEqual([
      'Casa · Curitiba',
      'Produtora · Curitiba',
      'Casa · Joinville',
      'Banda: Os Vândalos · Joinville',
    ])
    expect(book.contacts.filter((c) => c.email === 'carla@example.com')).toHaveLength(1)
  })

  it('sums totals over the dates', () => {
    const route = routeTotals([curitiba, joinville])
    expect(book.totals).toEqual({
      km: route.km,
      hours: route.hours,
      dates: 3,
      confirmed: 2,
      feeCents: 280_000,
      costCents: 55_000,
    })
  })

  it('hides money when hideMoney is set', () => {
    const hidden = buildTourbook({ tour, dates, lookups, hideMoney: true })
    expect(hidden.days.every((d) => d.deal.feeLabel === null)).toBe(true)
    expect(hidden.days[2]?.deal.type).toBe('Cachê fixo')
    expect(hidden.totals.feeCents).toBe(0)
    expect(hidden.totals.costCents).toBe(0)
  })

  it('handles an empty tour', () => {
    const empty = buildTourbook({ tour, dates: [], lookups })
    expect(empty.period).toEqual({ start: '', end: '', label: 'Sem datas' })
    expect(empty.summary).toEqual([])
    expect(empty.days).toEqual([])
    expect(empty.contacts).toEqual([])
    expect(empty.totals).toEqual({ km: 0, hours: 0, dates: 0, confirmed: 0, feeCents: 0, costCents: 0 })
  })

  it('never throws on ids missing from the lookups', () => {
    const orphan = makeDate({ id: 'x', date: '2026-04-01', cityId: 'nope', venueId: 'nope', producerId: 'nope' })
    const book2 = buildTourbook({ tour, dates: [orphan], lookups: { cities: [], venues: [], producers: [], bands: [] } })
    expect(book2.days[0]).toMatchObject({ city: null, venue: null, contacts: [], mapsUrl: null })
    expect(book2.summary[0]).toMatchObject({ city: 'A definir', state: '', venue: null })
  })
})

describe('formatCurrencyBRL', () => {
  it('formats cents as BRL', () => {
    expect(normalize(formatCurrencyBRL(123456))).toBe('R$ 1.234,56')
    expect(normalize(formatCurrencyBRL(0))).toBe('R$ 0,00')
  })
})

describe('whatsappUrl', () => {
  it('normalizes Brazilian phones to wa.me links', () => {
    expect(whatsappUrl('(47) 99999-0001')).toBe('https://wa.me/5547999990001')
    expect(whatsappUrl('+55 47 99999-0001')).toBe('https://wa.me/5547999990001')
    expect(whatsappUrl('55 47 3333-0001')).toBe('https://wa.me/554733330001')
    // DDD 55 (RS) without country code still gets the 55 prefix.
    expect(whatsappUrl('(55) 99999-0001')).toBe('https://wa.me/5555999990001')
  })
})
