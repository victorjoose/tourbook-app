import { AVG_SPEED_KMH, ROAD_FACTOR } from './constants'
import type { Bounds, LatLng } from './types'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Distância em linha reta (km). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Estimativa de estrada: linha reta × ROAD_FACTOR, arredondada para km inteiro. */
export function roadKmEstimate(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * ROAD_FACTOR)
}

/** Horas de viagem estimadas a AVG_SPEED_KMH (uma casa decimal). */
export function driveHoursEstimate(km: number): number {
  return Math.round((km / AVG_SPEED_KMH) * 10) / 10
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('pt-BR')} km`
}

/** 1.5 → "1h30"; 0.3 → "20 min"; 14 → "14h". */
export function formatHours(hours: number): string {
  const totalMin = Math.round(hours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

export function inBounds(p: LatLng, b: Bounds): boolean {
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng
}

/** Caixa aproximada ao redor de um ponto (bom o bastante para filtros de mapa). */
export function boundsAround(center: LatLng, radiusKm: number): Bounds {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.max(0.1, Math.cos(toRad(center.lat))))
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  }
}

export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  return { minLat, maxLat, minLng, maxLng }
}

/** Soma dos trechos consecutivos (km e horas estimadas). */
export function routeTotals(points: LatLng[]): { km: number; hours: number } {
  let km = 0
  for (let i = 1; i < points.length; i++) km += roadKmEstimate(points[i - 1]!, points[i]!)
  return { km, hours: driveHoursEstimate(km) }
}

/** Link do Google Maps para um ponto (abre no app no celular). */
export function mapsUrl(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
}
