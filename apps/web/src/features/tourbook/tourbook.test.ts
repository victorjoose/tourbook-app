import type { Band, City, RegionData, TourDate, TourWithDates, Venue } from '@tour/core'
import { describe, expect, it } from 'vitest'
import {
  bandLine,
  buildTourbookFromTour,
  cityLabelOf,
  contactName,
  dayCounter,
  dealLabel,
  generatedAtLabel,
  instagramHandle,
  instagramLabel,
  instagramUrl,
  mailtoUrl,
  nextLegLabel,
  routeLabel,
  safeHttpUrl,
  timeRows,
  totalsItems,
  tourbookFileName,
} from './tourbookHelpers'

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
const barX = venue({
  id: 'v1',
  cityId: 'cwb',
  name: 'Bar X',
  address: 'Rua das Flores, 10',
  lat: -25.44,
  lng: -49.28,
  contactName: 'Zé',
  contactPhone: '(41) 99999-0000',
  contactEmail: 'ze@barx.com',
  instagram: '@barx',
})
const localBand = band({ id: 'b1', name: 'Banda Local', cityId: 'cwb', contactPhone: '41 98888-0000' })

const region: RegionData = { cities: [joinville, curitiba], venues: [barX], producers: [], bands: [localBand] }

const tour: TourWithDates = {
  id: 't1',
  ownerId: 'u1',
  bandId: null,
  bandName: 'Storm',
  name: 'Turnê Sul 2026 — Verão!',
  startCityId: 'jve',
  endCityId: null,
  maxKmPerDay: 400,
  allowOffDays: true,
  genres: ['punk'],
  capacityMin: null,
  capacityMax: null,
  notes: null,
  shareToken: null,
  memberIds: ['u1'],
  memberRoles: { u1: 'editor' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  members: [],
  dates: [
    tourDate({ id: 'd2', date: '2026-03-07', cityId: 'cwb', venueId: 'v1', status: 'confirmado', dealType: 'cache_fixo', feeCents: 150000, costCents: 20000, setTime: '22:00', bands: [{ bandId: 'b1', role: 'abertura' }] }),
    tourDate({ id: 'd1', date: '2026-03-06', cityId: 'jve', status: 'negociando', dealType: 'porta', feeCents: 80000 }),
  ],
}

describe('tourbookFileName', () => {
  it('slugifies the title and appends the suffix', () => {
    expect(tourbookFileName('Turnê Sul 2026 — Verão!')).toBe('turne-sul-2026-verao-tourbook.pdf')
  })

  it('falls back to "turne" when the title has nothing usable', () => {
    expect(tourbookFileName('!!!')).toBe('turne-tourbook.pdf')
    expect(tourbookFileName('')).toBe('turne-tourbook.pdf')
  })
})

describe('safe links', () => {
  it('accepts only http(s) URLs', () => {
    expect(safeHttpUrl('https://wa.me/5541999990000')).toBe('https://wa.me/5541999990000')
    expect(safeHttpUrl('http://example.com/x')).toBe('http://example.com/x')
    // eslint-disable-next-line no-script-url
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,hi')).toBeNull()
    expect(safeHttpUrl('wa.me/55')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
  })

  it('parses Instagram handles from every common shape', () => {
    expect(instagramHandle('@barx')).toBe('barx')
    expect(instagramHandle('barx')).toBe('barx')
    expect(instagramHandle('  @bar.x_1  ')).toBe('bar.x_1')
    expect(instagramHandle('https://www.instagram.com/barx/')).toBe('barx')
    expect(instagramHandle('instagram.com/barx?igsh=abc')).toBe('barx')
    expect(instagramHandle('http://instagram.com/barx/reels')).toBe('barx')
  })

  it('rejects handles that are not handles', () => {
    // eslint-disable-next-line no-script-url
    expect(instagramHandle('javascript:alert(1)')).toBeNull()
    expect(instagramHandle('https://evil.com/barx')).toBeNull()
    expect(instagramHandle('bar x')).toBeNull()
    expect(instagramHandle('')).toBeNull()
    expect(instagramHandle(null)).toBeNull()
  })

  it('always links to https://instagram.com/<handle>', () => {
    expect(instagramUrl('@barx')).toBe('https://instagram.com/barx')
    expect(instagramUrl('https://www.instagram.com/barx/')).toBe('https://instagram.com/barx')
    // eslint-disable-next-line no-script-url
    expect(instagramUrl('javascript:alert(1)')).toBeNull()
    expect(instagramLabel('https://www.instagram.com/barx/')).toBe('@barx')
    expect(instagramLabel('bar x')).toBe('bar x')
  })

  it('builds mailto links only for plausible e-mails', () => {
    expect(mailtoUrl('ze@barx.com')).toBe('mailto:ze@barx.com')
    expect(mailtoUrl(' ze@barx.com ')).toBe('mailto:ze@barx.com')
    expect(mailtoUrl('ze at barx')).toBeNull()
    expect(mailtoUrl(null)).toBeNull()
  })
})

describe('labels', () => {
  it('formats the next leg', () => {
    expect(nextLegLabel({ km: 130, hours: 2, toCity: 'Curitiba/PR' })).toBe('Próximo trecho: 130 km (~2h) até Curitiba/PR')
    expect(nextLegLabel({ km: 85, hours: 1.5, toCity: 'Blumenau/SC' })).toBe('Próximo trecho: 85 km (~1h30) até Blumenau/SC')
  })

  it('lists only the times that were filled in, in the order of the night', () => {
    expect(timeRows({ loadIn: '16:00', soundcheck: null, doors: '20:00', set: '22:00' })).toEqual([
      { label: 'Load-in', value: '16:00' },
      { label: 'Porta', value: '20:00' },
      { label: 'Show', value: '22:00' },
    ])
    expect(timeRows({ loadIn: null, soundcheck: null, doors: null, set: null })).toEqual([])
  })

  it('counts days, labels cities and bands', () => {
    expect(dayCounter(0, 8)).toBe('Dia 1 de 8')
    expect(bandLine({ name: 'Banda Local', role: 'abertura' })).toBe('Banda Local · abertura')
    expect(bandLine({ name: 'Banda Local', role: ' ' })).toBe('Banda Local')
    expect(contactName({ label: 'Casa', name: null, phone: null, whatsappUrl: null, email: null, instagram: null })).toBe('Casa')
    expect(contactName({ label: 'Casa', name: 'Zé', phone: null, whatsappUrl: null, email: null, instagram: null })).toBe('Zé')
  })

  it('formats the public "updated at" date without new Date()', () => {
    // Weekday abbreviation depends on the date-fns locale ('sex'/'sexta'); the day part is what matters.
    expect(generatedAtLabel('2026-03-06T12:34:56.000Z')).toMatch(/^sex[a-z]*, 06\/03$/)
    expect(generatedAtLabel('garbage')).toBeNull()
    expect(generatedAtLabel(undefined)).toBeNull()
  })
})

describe('hideMoney', () => {
  const full = buildTourbookFromTour(tour, region, false)
  const team = buildTourbookFromTour(tour, region, true)

  it('keeps fees in the full version', () => {
    expect(full.totals.feeCents).toBe(230000)
    expect(full.days[1]?.deal).toEqual({ type: 'Cachê fixo', feeLabel: expect.stringContaining('1.500,00') })
    expect(dealLabel(full.days[1]!.deal, false)).toMatch(/^Cachê fixo · R\$\s?1\.500,00$/)
    expect(dealLabel({ type: 'Porta', feeLabel: null }, false)).toBe('Porta')
    expect(dealLabel({ type: null, feeLabel: 'R$ 10,00' }, false)).toBe('R$ 10,00')
    expect(dealLabel({ type: null, feeLabel: null }, false)).toBeNull()
    expect(totalsItems(full, false).map((i) => i.label)).toContain('Cachê previsto')
  })

  it('drops every money trace in the team version', () => {
    expect(team.totals.feeCents).toBe(0)
    expect(team.totals.costCents).toBe(0)
    expect(team.days.every((d) => d.deal.feeLabel === null)).toBe(true)
    expect(team.days.every((d) => dealLabel(d.deal, true) === null)).toBe(true)
    expect(dealLabel({ type: 'Cachê fixo', feeLabel: 'R$ 1.500,00' }, true)).toBeNull()
    expect(totalsItems(team, true).map((i) => i.label)).toEqual(['Datas', 'Confirmadas', 'Estrada', 'Horas de estrada'])
    expect(JSON.stringify(team)).not.toContain('1.500')
  })

  it('still carries the rest of the tourbook', () => {
    expect(team.title).toBe(tour.name)
    expect(team.days.map((d) => d.id)).toEqual(['d1', 'd2'])
    expect(cityLabelOf(team.days[0]!)).toBe('Joinville/SC')
    expect(team.days[0]?.nextLeg?.toCity).toBe('Curitiba/PR')
    expect(routeLabel(team)).toBe('Joinville/SC · Curitiba/PR')
    expect(team.days[1]?.contacts.map((c) => c.label)).toEqual(['Casa', 'Banda: Banda Local'])
    expect(team.contacts).toHaveLength(2)
  })
})
