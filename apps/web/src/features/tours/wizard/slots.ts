// Pure helpers for the wizard's slot list (dates + picks). No React, no IO.
import {
  driveHoursEstimate,
  generateSlots,
  generateSlotsByCount,
  roadKmEstimate,
  type Band,
  type City,
  type CreateTourInput,
  type GapSlot,
  type RegionData,
  type Venue,
} from '@tour/core'
import type { DateInputs, FixedDateInput, WizardSlot } from './types'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value)
}

/** Valid ISO dates, deduplicated and sorted ascending. */
export function uniqueSortedDates(dates: readonly string[]): string[] {
  return [...new Set(dates.filter(isIsoDate))].sort()
}

/** "2026-03-06" → "06/03" */
export function dayMonth(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export type GenerateInputs = Pick<DateInputs, 'dateMode' | 'startDate' | 'weekdays' | 'weeks' | 'count' | 'calendarDates'>

/** Dates produced by the chosen mode (without fixed dates). */
export function generatedDates(input: GenerateInputs): string[] {
  if (input.dateMode === 'calendar') return uniqueSortedDates(input.calendarDates)
  if (!isIsoDate(input.startDate)) return []
  if (input.dateMode === 'weeks') {
    return generateSlots({ startDate: input.startDate, weekdays: input.weekdays, weeks: input.weeks })
  }
  return generateSlotsByCount({ startDate: input.startDate, weekdays: input.weekdays, count: input.count })
}

export function emptySlot(date: string): WizardSlot {
  return { date, cityId: null, venueId: null, bandIds: [], fixed: false, skipped: false }
}

export type BuildSlotsInput = {
  generated: readonly string[]
  fixed: readonly FixedDateInput[]
  /** Dates removed by hand (only applies to generated dates). */
  removed?: readonly string[]
  /** Previous slot list; picks are carried over for dates that still exist. */
  previous?: readonly WizardSlot[]
}

/**
 * Merges generated dates with fixed dates into one sorted slot list.
 * Dedupes by date (fixed wins) and keeps earlier picks for dates that remain.
 */
export function buildSlots(input: BuildSlotsInput): WizardSlot[] {
  const previous = new Map((input.previous ?? []).map((s) => [s.date, s]))
  const removed = new Set(input.removed ?? [])
  const byDate = new Map<string, WizardSlot>()

  for (const date of input.generated) {
    if (!isIsoDate(date) || removed.has(date) || byDate.has(date)) continue
    const prev = previous.get(date)
    byDate.set(date, prev ? { ...prev, bandIds: [...prev.bandIds], fixed: false } : emptySlot(date))
  }

  for (const fixed of input.fixed) {
    if (!isIsoDate(fixed.date)) continue
    const prev = previous.get(fixed.date)
    byDate.set(fixed.date, {
      date: fixed.date,
      cityId: fixed.cityId,
      venueId: fixed.venueId,
      bandIds: prev && prev.cityId === fixed.cityId ? [...prev.bandIds] : [],
      fixed: true,
      skipped: false,
    })
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** The first slot without a city (and not skipped) gets the start city. */
export function applyStartCity(slots: readonly WizardSlot[], startCityId: string | null): WizardSlot[] {
  const first = slots[0]
  if (!first || !startCityId || first.cityId || first.skipped) return [...slots]
  return [{ ...first, cityId: startCityId, venueId: null }, ...slots.slice(1)]
}

/** "12 datas, de 06/03 a 29/03" */
export function describeDates(dates: readonly string[]): string {
  const sorted = uniqueSortedDates(dates)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) return 'Nenhuma data'
  if (sorted.length === 1) return `1 data, em ${dayMonth(first)}`
  return `${sorted.length} datas, de ${dayMonth(first)} a ${dayMonth(last)}`
}

export function filledCount(slots: readonly WizardSlot[]): number {
  return slots.filter((s) => s.cityId !== null).length
}

export function toGapSlots(slots: readonly WizardSlot[]): GapSlot[] {
  return slots.map((s) => ({ date: s.date, cityId: s.cityId, fixed: s.fixed }))
}

/** Payload for createTour: every slot becomes a tour date (empty ones included). */
export function slotsToTourDates(slots: readonly WizardSlot[]): CreateTourInput['dates'] {
  return [...slots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      cityId: s.cityId,
      venueId: s.cityId ? s.venueId : null,
      producerId: null,
      isFixed: s.fixed,
      status: 'ideia' as const,
      bandIds: s.cityId ? [...s.bandIds] : [],
    }))
}

export type RouteStop = { date: string; city: City; venueId: string | null; fixed: boolean }

/** Slots with a known city, in date order. */
export function routeStops(slots: readonly WizardSlot[], cities: ReadonlyMap<string, City>): RouteStop[] {
  const out: RouteStop[] = []
  for (const slot of [...slots].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!slot.cityId) continue
    const city = cities.get(slot.cityId)
    if (!city) continue
    out.push({ date: slot.date, city, venueId: slot.venueId, fixed: slot.fixed })
  }
  return out
}

export type RouteLeg = { from: City; to: City; km: number; hours: number; toDate: string | null }

/** Legs between consecutive points with different cities. */
export function buildLegs(points: ReadonlyArray<{ city: City; date: string | null }>): RouteLeg[] {
  const legs: RouteLeg[] = []
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]
    const to = points[i]
    if (!from || !to || from.city.id === to.city.id) continue
    const km = roadKmEstimate(from.city, to.city)
    legs.push({ from: from.city, to: to.city, km, hours: driveHoursEstimate(km), toDate: to.date })
  }
  return legs
}

/** Venues of a city: those that accept touring bands first, then by name. */
export function venuesOfCity(data: Pick<RegionData, 'venues'>, cityId: string): Venue[] {
  return data.venues
    .filter((v) => v.cityId === cityId)
    .sort((a, b) => {
      if (a.acceptsTouringBands !== b.acceptsTouringBands) return a.acceptsTouringBands ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
}

/** Local bands of a city: those that open for touring bands first, then by name. */
export function bandsOfCity(data: Pick<RegionData, 'bands'>, cityId: string): Band[] {
  return data.bands
    .filter((b) => b.cityId === cityId)
    .sort((a, b) => {
      if (a.opensForTouring !== b.opensForTouring) return a.opensForTouring ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
}
