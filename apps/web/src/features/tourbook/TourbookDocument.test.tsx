// @vitest-environment node
// Smoke test: the document renders to a real PDF with the built-in fonts (no network, no custom images).
// Runs in Node (not jsdom): pdfkit's Buffer checks fail across jsdom's realm when decoding data-URL images.
import type { Band, City, RegionData, TourDate, TourWithDates, Venue } from '@tour/core'
import { describe, expect, it } from 'vitest'
import { renderTourbookBlob } from './downloadPdf'
import { buildTourbookFromTour } from './tourbookHelpers'

// 1x1 white PNG, stands in for a QR code.
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='

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

const region: RegionData = {
  cities: [
    city({ id: 'jve', name: 'Joinville', state: 'SC', lat: -26.3, lng: -48.85 }),
    city({ id: 'cwb', name: 'Curitiba', state: 'PR', lat: -25.43, lng: -49.27 }),
  ],
  venues: [
    venue({
      id: 'v1',
      cityId: 'cwb',
      name: 'Bar X',
      address: 'Rua das Flores, 10 — Centro',
      lat: -25.44,
      lng: -49.28,
      capacity: 200,
      contactName: 'Zé',
      contactPhone: '(41) 99999-0000',
      contactEmail: 'ze@barx.com',
      instagram: 'https://www.instagram.com/barx/',
    }),
  ],
  producers: [],
  bands: [band({ id: 'b1', name: 'Banda Local', cityId: 'cwb', contactPhone: '41 98888-0000' })],
}

const tour: TourWithDates = {
  id: 't1',
  ownerId: 'u1',
  bandId: null,
  bandName: 'Storm',
  name: 'Turnê Sul 2026',
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
    tourDate({ id: 'd1', date: '2026-03-06', cityId: 'jve', status: 'negociando', notes: 'Levar cabo extra.' }),
    tourDate({
      id: 'd2',
      date: '2026-03-07',
      cityId: 'cwb',
      venueId: 'v1',
      status: 'confirmado',
      loadInTime: '16:00',
      soundcheckTime: '18:00',
      doorsTime: '20:00',
      setTime: '22:00',
      dealType: 'cache_fixo',
      feeCents: 150000,
      lodging: 'Casa do Zé',
      bands: [{ bandId: 'b1', role: 'abertura' }],
    }),
    tourDate({ id: 'd3', date: '2026-03-08' }),
  ],
}

async function pdfHeader(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return String.fromCharCode(...bytes.slice(0, 5))
}

describe('TourbookDocument', () => {
  it('renders the full version to a PDF', async () => {
    const tourbook = buildTourbookFromTour(tour, region, false)
    const blob = await renderTourbookBlob({ tourbook, qrByDayId: { d1: PNG_1X1, d2: PNG_1X1 }, hideMoney: false })
    expect(blob.size).toBeGreaterThan(1_000)
    expect(await pdfHeader(blob)).toBe('%PDF-')
  }, 30_000)

  it('renders the team version without QR codes', async () => {
    const tourbook = buildTourbookFromTour(tour, region, true)
    const blob = await renderTourbookBlob({ tourbook, qrByDayId: {}, hideMoney: true })
    expect(blob.size).toBeGreaterThan(1_000)
    expect(await pdfHeader(blob)).toBe('%PDF-')
  }, 30_000)
})
