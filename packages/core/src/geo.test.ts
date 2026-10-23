import { describe, expect, it } from 'vitest'
import { ROAD_FACTOR } from './constants'
import {
  boundsAround,
  boundsOf,
  driveHoursEstimate,
  formatHours,
  formatKm,
  haversineKm,
  inBounds,
  roadKmEstimate,
  routeTotals,
} from './geo'

const joinville = { lat: -26.3045, lng: -48.8487 }
const curitiba = { lat: -25.4284, lng: -49.2733 }
const saoPaulo = { lat: -23.5505, lng: -46.6333 }

describe('geo', () => {
  it('haversineKm Joinville–Curitiba is about 100–110 km in a straight line', () => {
    const km = haversineKm(joinville, curitiba)
    expect(km).toBeGreaterThan(100)
    expect(km).toBeLessThan(110)
    expect(haversineKm(curitiba, joinville)).toBeCloseTo(km, 6)
    expect(haversineKm(joinville, joinville)).toBe(0)
  })

  it('roadKmEstimate applies the road factor and rounds to whole km', () => {
    const straight = haversineKm(joinville, curitiba)
    const road = roadKmEstimate(joinville, curitiba)
    expect(road).toBe(Math.round(straight * ROAD_FACTOR))
    expect(Number.isInteger(road)).toBe(true)
    expect(road).toBeGreaterThan(straight)
  })

  it('driveHoursEstimate uses the average speed with one decimal', () => {
    expect(driveHoursEstimate(70)).toBe(1)
    expect(driveHoursEstimate(105)).toBe(1.5)
    expect(driveHoursEstimate(0)).toBe(0)
  })

  it('formats km and hours in pt-BR', () => {
    expect(formatKm(130)).toBe('130 km')
    expect(formatKm(129.6)).toBe('130 km')
    expect(formatKm(1250)).toBe('1.250 km')
    expect(formatHours(1.5)).toBe('1h30')
    expect(formatHours(0.3)).toBe('18 min')
    expect(formatHours(14)).toBe('14h')
    expect(formatHours(1.83)).toBe('1h50')
  })

  it('bounds helpers', () => {
    const b = boundsAround(joinville, 50)
    expect(inBounds(joinville, b)).toBe(true)
    expect(inBounds(saoPaulo, b)).toBe(false)
    expect(b.minLat).toBeLessThan(joinville.lat)
    expect(b.maxLat).toBeGreaterThan(joinville.lat)

    expect(boundsOf([])).toBeNull()
    const all = boundsOf([joinville, curitiba, saoPaulo])
    expect(all).toEqual({
      minLat: joinville.lat,
      maxLat: saoPaulo.lat,
      minLng: curitiba.lng,
      maxLng: saoPaulo.lng,
    })
  })

  it('routeTotals sums consecutive legs', () => {
    const legs = roadKmEstimate(joinville, curitiba) + roadKmEstimate(curitiba, saoPaulo)
    const totals = routeTotals([joinville, curitiba, saoPaulo])
    expect(totals.km).toBe(legs)
    expect(totals.hours).toBe(driveHoursEstimate(legs))
    expect(routeTotals([joinville])).toEqual({ km: 0, hours: 0 })
    expect(routeTotals([])).toEqual({ km: 0, hours: 0 })
  })
})
