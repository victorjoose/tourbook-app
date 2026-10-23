import type { City } from '@tour/core'
import { describe, expect, it } from 'vitest'
import {
  applyStartCity,
  buildLegs,
  buildSlots,
  describeDates,
  emptySlot,
  filledCount,
  generatedDates,
  routeStops,
  slotsToTourDates,
  uniqueSortedDates,
} from './slots'
import { capitalize, cityLabel, normalizeText } from './text'
import { effectiveEndCityId, stepIssues, toTourFormInput, tourFormErrors } from './validation'
import type { TourFields, WizardSlot, WizardState } from './types'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'
const UUID_C = '33333333-3333-4333-8333-333333333333'

const joinville: City = { id: UUID_A, name: 'Joinville', state: 'SC', slug: 'joinville', lat: -26.3, lng: -48.85, population: null }
const curitiba: City = { id: UUID_B, name: 'Curitiba', state: 'PR', slug: 'curitiba', lat: -25.43, lng: -49.27, population: null }
const londrina: City = { id: UUID_C, name: 'Londrina', state: 'PR', slug: 'londrina', lat: -23.31, lng: -51.16, population: null }

const baseFields: TourFields = {
  name: 'Turnê Sul',
  bandName: 'Os Ruídos',
  bandId: null,
  genres: ['punk', 'hardcore'],
  startCityId: UUID_A,
  endCityId: null,
  returnHome: true,
  maxKmPerDay: 400,
  capacityMin: null,
  capacityMax: null,
  allowOffDays: true,
  states: ['SC', 'PR', 'SP'],
}

function stateWith(partial: Partial<WizardState> = {}): WizardState {
  return {
    ...baseFields,
    step: 0,
    dateMode: 'weeks',
    startDate: '2026-03-06',
    weekdays: [5, 6],
    weeks: 2,
    count: 4,
    calendarDates: [],
    fixedDates: [],
    removedDates: [],
    slots: [],
    ...partial,
  }
}

describe('generatedDates', () => {
  it('generates weekday dates over N weeks', () => {
    // 2026-03-06 is a Friday.
    const dates = generatedDates({ dateMode: 'weeks', startDate: '2026-03-06', weekdays: [5, 6], weeks: 2, count: 0, calendarDates: [] })
    expect(dates).toEqual(['2026-03-06', '2026-03-07', '2026-03-13', '2026-03-14'])
  })

  it('generates an exact count of dates', () => {
    const dates = generatedDates({ dateMode: 'count', startDate: '2026-03-06', weekdays: [5], weeks: 0, count: 3, calendarDates: [] })
    expect(dates).toEqual(['2026-03-06', '2026-03-13', '2026-03-20'])
  })

  it('uses the calendar list, deduplicated and sorted', () => {
    const dates = generatedDates({
      dateMode: 'calendar',
      startDate: '',
      weekdays: [],
      weeks: 0,
      count: 0,
      calendarDates: ['2026-04-02', '2026-03-20', '2026-04-02', 'nope'],
    })
    expect(dates).toEqual(['2026-03-20', '2026-04-02'])
  })

  it('returns nothing without a valid start date', () => {
    expect(generatedDates({ dateMode: 'weeks', startDate: '', weekdays: [5], weeks: 2, count: 0, calendarDates: [] })).toEqual([])
  })
})

describe('buildSlots', () => {
  it('merges fixed dates, dedupes by date and sorts (fixed wins)', () => {
    const slots = buildSlots({
      generated: ['2026-03-13', '2026-03-06', '2026-03-07'],
      fixed: [{ date: '2026-03-07', cityId: UUID_B, venueId: null }, { date: '2026-03-20', cityId: UUID_C, venueId: 'v1' }],
    })
    expect(slots.map((s) => s.date)).toEqual(['2026-03-06', '2026-03-07', '2026-03-13', '2026-03-20'])
    const fixed = slots.find((s) => s.date === '2026-03-07')
    expect(fixed).toMatchObject({ cityId: UUID_B, fixed: true, skipped: false })
    expect(slots.find((s) => s.date === '2026-03-20')).toMatchObject({ cityId: UUID_C, venueId: 'v1', fixed: true })
    expect(slots.find((s) => s.date === '2026-03-06')).toEqual(emptySlot('2026-03-06'))
  })

  it('keeps previous picks for dates that still exist and drops the others', () => {
    const previous: WizardSlot[] = [
      { ...emptySlot('2026-03-06'), cityId: UUID_B, venueId: 'v1', bandIds: ['b1'] },
      { ...emptySlot('2026-03-07'), skipped: true },
      { ...emptySlot('2026-03-13'), cityId: UUID_C },
    ]
    const slots = buildSlots({ generated: ['2026-03-06', '2026-03-07'], fixed: [], previous })
    expect(slots).toHaveLength(2)
    expect(slots[0]).toMatchObject({ cityId: UUID_B, venueId: 'v1', bandIds: ['b1'], fixed: false })
    expect(slots[1]).toMatchObject({ skipped: true, cityId: null })
  })

  it('leaves removed generated dates out but still accepts them as fixed', () => {
    const slots = buildSlots({
      generated: ['2026-03-06', '2026-03-07'],
      fixed: [{ date: '2026-03-07', cityId: UUID_B, venueId: null }],
      removed: ['2026-03-06', '2026-03-07'],
    })
    expect(slots.map((s) => s.date)).toEqual(['2026-03-07'])
  })

  it('turns a formerly fixed slot into a regular one when it is no longer fixed', () => {
    const previous: WizardSlot[] = [{ ...emptySlot('2026-03-07'), cityId: UUID_B, fixed: true }]
    const slots = buildSlots({ generated: ['2026-03-07'], fixed: [], previous })
    expect(slots[0]).toMatchObject({ cityId: UUID_B, fixed: false })
  })

  it('ignores invalid dates', () => {
    const slots = buildSlots({ generated: ['06/03/2026', '2026-03-06'], fixed: [{ date: '', cityId: UUID_B, venueId: null }] })
    expect(slots.map((s) => s.date)).toEqual(['2026-03-06'])
  })
})

describe('applyStartCity', () => {
  it('defaults the first empty slot to the start city', () => {
    const slots = [emptySlot('2026-03-06'), emptySlot('2026-03-07')]
    const out = applyStartCity(slots, UUID_A)
    expect(out[0]).toMatchObject({ cityId: UUID_A })
    expect(out[1]).toMatchObject({ cityId: null })
    expect(slots[0]?.cityId).toBeNull()
  })

  it('does not override a first slot that already has a city or was skipped', () => {
    const fixedFirst = [{ ...emptySlot('2026-03-06'), cityId: UUID_B, fixed: true }, emptySlot('2026-03-07')]
    expect(applyStartCity(fixedFirst, UUID_A)[0]?.cityId).toBe(UUID_B)
    const skippedFirst = [{ ...emptySlot('2026-03-06'), skipped: true }]
    expect(applyStartCity(skippedFirst, UUID_A)[0]?.cityId).toBeNull()
  })

  it('is a no-op without a start city or without slots', () => {
    expect(applyStartCity([emptySlot('2026-03-06')], null)[0]?.cityId).toBeNull()
    expect(applyStartCity([], UUID_A)).toEqual([])
  })
})

describe('describeDates / uniqueSortedDates', () => {
  it('describes a range', () => {
    expect(describeDates(['2026-03-29', '2026-03-06', '2026-03-13'])).toBe('3 datas, de 06/03 a 29/03')
    expect(describeDates(['2026-03-06'])).toBe('1 data, em 06/03')
    expect(describeDates([])).toBe('Nenhuma data')
  })

  it('dedupes and sorts', () => {
    expect(uniqueSortedDates(['2026-03-07', '2026-03-06', '2026-03-07'])).toEqual(['2026-03-06', '2026-03-07'])
  })
})

describe('slotsToTourDates / routeStops / buildLegs', () => {
  const slots: WizardSlot[] = [
    { ...emptySlot('2026-03-07'), cityId: UUID_B, venueId: 'v1', bandIds: ['b1'], fixed: true },
    { ...emptySlot('2026-03-06'), cityId: UUID_A },
    { ...emptySlot('2026-03-13'), skipped: true, venueId: 'stale', bandIds: ['stale'] },
    { ...emptySlot('2026-03-14'), cityId: 'unknown-city' },
  ]
  const cities = new Map<string, City>([
    [UUID_A, joinville],
    [UUID_B, curitiba],
    [UUID_C, londrina],
  ])

  it('maps slots to createTour dates in order, clearing picks of empty slots', () => {
    const dates = slotsToTourDates(slots)
    expect(dates.map((d) => d.date)).toEqual(['2026-03-06', '2026-03-07', '2026-03-13', '2026-03-14'])
    expect(dates[0]).toEqual({ date: '2026-03-06', cityId: UUID_A, venueId: null, producerId: null, isFixed: false, status: 'ideia', bandIds: [] })
    expect(dates[1]).toMatchObject({ cityId: UUID_B, venueId: 'v1', isFixed: true, bandIds: ['b1'] })
    expect(dates[2]).toMatchObject({ cityId: null, venueId: null, bandIds: [] })
    expect(filledCount(slots)).toBe(3)
  })

  it('builds route stops only for known cities, in date order', () => {
    const stops = routeStops(slots, cities)
    expect(stops.map((s) => s.city.name)).toEqual(['Joinville', 'Curitiba'])
  })

  it('builds legs between different consecutive cities', () => {
    const legs = buildLegs([
      { city: joinville, date: '2026-03-06' },
      { city: joinville, date: '2026-03-07' },
      { city: curitiba, date: '2026-03-08' },
      { city: londrina, date: null },
    ])
    expect(legs).toHaveLength(2)
    expect(legs[0]).toMatchObject({ from: joinville, to: curitiba, toDate: '2026-03-08' })
    expect(legs[0]?.km).toBeGreaterThan(100)
    expect(legs[0]?.km).toBeLessThan(200)
    expect(legs[1]).toMatchObject({ from: curitiba, to: londrina, toDate: null })
  })
})

describe('validation', () => {
  it('builds the tour form input with the effective end city', () => {
    expect(effectiveEndCityId({ startCityId: UUID_A, endCityId: UUID_B, returnHome: true })).toBe(UUID_A)
    expect(effectiveEndCityId({ startCityId: UUID_A, endCityId: UUID_B, returnHome: false })).toBe(UUID_B)
    const input = toTourFormInput({ ...baseFields, genres: ['punk', 'invalid-genre'] })
    expect(input.genres).toEqual(['punk'])
    expect(input.endCityId).toBe(UUID_A)
  })

  it('reports pt-BR errors per field', () => {
    const errors = tourFormErrors({ ...baseFields, name: '', bandName: '', startCityId: null, capacityMin: 500, capacityMax: 100 })
    expect(errors.name).toBe('Dê um nome à turnê')
    expect(errors.bandName).toBe('Informe a banda')
    expect(errors.startCityId).toBe('Escolha a cidade de partida')
    expect(errors.capacityMax).toBe('Capacidade mínima maior que a máxima')
    expect(tourFormErrors(baseFields)).toEqual({})
  })

  it('blocks steps with the right messages', () => {
    expect(stepIssues(stateWith({ name: '' }), 'band')).toEqual(['Dê um nome à turnê'])
    expect(stepIssues(stateWith({ startDate: '', slots: [] }), 'dates')).toEqual(['Escolha a data de início'])
    expect(stepIssues(stateWith({ weekdays: [], slots: [] }), 'dates')).toEqual(['Escolha pelo menos um dia da semana'])
    expect(stepIssues(stateWith({ dateMode: 'calendar', slots: [] }), 'dates')).toEqual(['Adicione pelo menos uma data'])
    expect(stepIssues(stateWith({ slots: [emptySlot('2026-03-06')] }), 'dates')).toEqual([])
    expect(stepIssues(stateWith({ slots: [emptySlot('2026-03-06')] }), 'fill')).toEqual(['Escolha a cidade de pelo menos uma data'])
    expect(stepIssues(stateWith({ slots: [{ ...emptySlot('2026-03-06'), cityId: UUID_A }] }), 'fill')).toEqual([])
    expect(stepIssues(stateWith({ startCityId: null }), 'start')).toEqual(['Escolha a cidade de partida'])
  })
})

describe('text helpers', () => {
  it('normalizes accents and case', () => {
    expect(normalizeText('  São José ')).toBe('sao jose')
    expect(capitalize('sexta-feira')).toBe('Sexta-feira')
    expect(cityLabel(joinville)).toBe('Joinville – SC')
  })
})
