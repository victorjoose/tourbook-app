import type { City, LatLng } from '@tour/core'
import { Crosshair, MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MapView, type MapStop, type MapViewHandle } from '../map/MapView'
import { PILOT_CENTER, PILOT_ZOOM } from '../map/mapDefaults'
import { formatCoordinate, markerFromText } from './venueForm'

export type LocationPickerProps = {
  /** Selected city: when it changes the map flies there. */
  city: City | null
  lat: string
  lng: string
  onChange: (coords: { lat: string; lng: string }) => void
  error?: string | null
  disabled?: boolean
  /** Ids for the manual inputs (used to focus the block after validation). */
  latInputId?: string
  lngInputId?: string
}

const CITY_ZOOM = 13
const POINT_ZOOM = 15

/**
 * Map + manual coordinates. A click on the map sets lat/lng and shows a single
 * marker; typing valid coordinates moves the marker too.
 */
export function LocationPicker({ city, lat, lng, onChange, error, disabled = false, latInputId, lngInputId }: LocationPickerProps) {
  const mapRef = useRef<MapViewHandle>(null)
  const marker = useMemo(() => markerFromText(lat, lng), [lat, lng])
  const stops = useMemo<MapStop[]>(
    () => (marker ? [{ id: 'venue', lat: marker.lat, lng: marker.lng, label: '', title: 'Local da casa' }] : []),
    [marker],
  )

  // Initial camera, computed once (MapView only reads center/zoom on mount).
  const [initialCamera] = useState<{ center: LatLng; zoom: number }>(() =>
    marker
      ? { center: marker, zoom: POINT_ZOOM }
      : city
        ? { center: { lat: city.lat, lng: city.lng }, zoom: CITY_ZOOM }
        : { center: PILOT_CENTER, zoom: PILOT_ZOOM },
  )

  const cityId = city?.id ?? null
  const cityLat = city?.lat ?? null
  const cityLng = city?.lng ?? null
  useEffect(() => {
    if (cityId === null || cityLat === null || cityLng === null) return
    mapRef.current?.flyTo({ lat: cityLat, lng: cityLng }, CITY_ZOOM)
  }, [cityId, cityLat, cityLng])

  function handleMapClick(point: LatLng) {
    if (disabled) return
    onChange({ lat: formatCoordinate(point.lat), lng: formatCoordinate(point.lng) })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        {city
          ? `Toque no mapa para marcar onde fica a casa em ${city.name}. Dá para ajustar as coordenadas à mão.`
          : 'Escolha a cidade para aproximar o mapa, depois toque no ponto onde fica a casa.'}
      </p>
      <div
        className={`relative h-64 overflow-hidden rounded-xl border md:h-80 ${error ? 'border-red-500' : 'border-surface-2'}`}
      >
        <MapView
          ref={mapRef}
          center={initialCamera.center}
          zoom={initialCamera.zoom}
          stops={stops}
          onMapClick={handleMapClick}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-surface/80 px-2 py-1 text-xs text-ink-muted backdrop-blur">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {marker ? 'Ponto marcado' : 'Nenhum ponto marcado'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Input
          id={latInputId}
          label="Latitude"
          inputMode="decimal"
          placeholder="-26.3045"
          value={lat}
          disabled={disabled}
          onChange={(e) => onChange({ lat: e.target.value, lng })}
          aria-invalid={!!error}
        />
        <Input
          id={lngInputId}
          label="Longitude"
          inputMode="decimal"
          placeholder="-48.8487"
          value={lng}
          disabled={disabled}
          onChange={(e) => onChange({ lat, lng: e.target.value })}
          aria-invalid={!!error}
        />
        <Button
          variant="secondary"
          className="col-span-2 md:col-span-1"
          disabled={!marker}
          onClick={() => {
            if (marker) mapRef.current?.flyTo(marker, POINT_ZOOM)
          }}
        >
          <Crosshair className="h-4 w-4" aria-hidden />
          Ver ponto
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">Use ponto ou vírgula nos decimais. Ex.: -26,3045 e -48,8487.</p>
      )}
    </div>
  )
}
