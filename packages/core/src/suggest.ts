// Motor de sugestões (regras + pontuação). Implementação em andamento — ver SPEC.md.
import type { Band, City, Producer, RegionData, Venue } from './types'

export type SuggestConstraints = {
  maxKmPerDay: number
  genres: string[]
  capacityMin?: number | null
  capacityMax?: number | null
  states?: string[]
  excludeCityIds?: string[]
}

export type CitySuggestion = {
  city: City
  score: number
  kmFromPrev: number
  hoursFromPrev: number
  kmToNext?: number
  venues: Venue[]
  producers: Producer[]
  bands: Band[]
  reasons: string[]
}

export type SuggestNextCitiesInput = {
  prevCity: City | null
  nextFixed?: { city: City; date: string } | null
  date: string
  constraints: SuggestConstraints
  data: RegionData
  limit?: number
}

export function suggestNextCities(_input: SuggestNextCitiesInput): CitySuggestion[] {
  throw new Error('not implemented')
}

export type GapSlot = { date: string; cityId?: string | null; fixed: boolean }

export type FillGapsInput = {
  slots: GapSlot[]
  constraints: SuggestConstraints
  data: RegionData
  startCity: City
  endCity?: City | null
}

export function fillGaps(_input: FillGapsInput): Map<string, CitySuggestion[]> {
  throw new Error('not implemented')
}

export type RouteAlert = { date: string; message: string; level: 'warn' | 'error' }

export function routeAlerts(_dates: Array<{ date: string; city: City | null }>, _maxKmPerDay: number): RouteAlert[] {
  throw new Error('not implemented')
}
