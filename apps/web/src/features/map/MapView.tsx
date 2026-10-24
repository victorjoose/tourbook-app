import type { Bounds, LatLng, Venue } from '@tour/core'
import { GeolocateControl, Map as MLMap, Marker, NavigationControl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { env } from '../../lib/env'
import { cn } from '../../lib/cn'

import { PILOT_CENTER, PILOT_ZOOM } from './mapDefaults'

export type MapStop = {
  id: string
  lat: number
  lng: number
  /** Texto curto dentro do marcador (ex.: "1", "2"). */
  label: string
  /** Texto do tooltip. */
  title?: string
  /** Cor do marcador (CSS). */
  color?: string
}

export type MapViewHandle = {
  flyTo: (center: LatLng, zoom?: number) => void
  fitBounds: (bounds: Bounds, padding?: number) => void
  getBounds: () => Bounds | null
}

export type MapViewProps = {
  ref?: Ref<MapViewHandle>
  /** Casas desenhadas como pins agrupados (cluster). */
  venues?: Venue[]
  selectedVenueId?: string | null
  onVenueClick?: (venue: Venue) => void
  /** Marcadores numerados (paradas da turnê). */
  stops?: MapStop[]
  /** Linha da rota (na ordem). */
  route?: LatLng[]
  /** Chamado ao terminar de mover/zoom (já com debounce). */
  onBoundsChange?: (bounds: Bounds) => void
  /** Clique em ponto vazio do mapa (ex.: escolher localização). */
  onMapClick?: (point: LatLng) => void
  /** Quando muda, enquadra esses limites. */
  fitTo?: Bounds | null
  center?: LatLng
  zoom?: number
  className?: string
}

const VENUES_SOURCE = 'venues'
const ROUTE_SOURCE = 'route'

function toBounds(map: MLMap): Bounds {
  const b = map.getBounds()
  return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() }
}

function venuesToGeoJson(venues: Venue[], selectedId: string | null | undefined): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature',
      id: v.id,
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: { id: v.id, name: v.name, selected: v.id === selectedId ? 1 : 0 },
    })),
  }
}

function routeToGeoJson(route: LatLng[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features:
      route.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route.map((p) => [p.lng, p.lat]) },
            },
          ]
        : [],
  }
}

function addLayers(map: MLMap) {
  map.addSource(VENUES_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 48,
  })
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: VENUES_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#be123c',
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 26],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff1f2',
    },
  })
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: VENUES_SOURCE,
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'venue-points',
    type: 'circle',
    source: VENUES_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['case', ['==', ['get', 'selected'], 1], '#fb7185', '#e11d48'],
      'circle-radius': ['case', ['==', ['get', 'selected'], 1], 10, 7],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff1f2',
    },
  })
  map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#fb7185', 'line-width': 3, 'line-dasharray': [1, 1.5] },
  })
}

/**
 * Mapa MapLibre reutilizável. Mantém uma única instância por montagem e
 * sincroniza casas/rota/paradas via effects.
 */
export function MapView({
  ref,
  venues = [],
  selectedVenueId,
  onVenueClick,
  stops = [],
  route = [],
  onBoundsChange,
  onMapClick,
  fitTo,
  center = PILOT_CENTER,
  zoom = PILOT_ZOOM,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const loadedRef = useRef(false)
  const markersRef = useRef<Marker[]>([])
  const venuesRef = useRef<Venue[]>(venues)
  const routeRef = useRef<LatLng[]>(route)
  const handlersRef = useRef({ onVenueClick, onBoundsChange, onMapClick })
  venuesRef.current = venues
  routeRef.current = route
  handlersRef.current = { onVenueClick, onBoundsChange, onMapClick }

  useImperativeHandle(ref, () => ({
    flyTo: (c, z) => mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: z ?? Math.max(mapRef.current.getZoom(), 11) }),
    fitBounds: (b, padding = 48) =>
      mapRef.current?.fitBounds(
        [
          [b.minLng, b.minLat],
          [b.maxLng, b.maxLat],
        ],
        { padding, maxZoom: 13, duration: 600 },
      ),
    getBounds: () => (mapRef.current ? toBounds(mapRef.current) : null),
  }))

  // Instância única do mapa.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new MLMap({
      container: containerRef.current,
      style: env.mapStyleUrl,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: false } }), 'top-right')

    let boundsTimer: ReturnType<typeof setTimeout> | undefined
    const emitBounds = () => {
      clearTimeout(boundsTimer)
      boundsTimer = setTimeout(() => handlersRef.current.onBoundsChange?.(toBounds(map)), 200)
    }

    map.on('load', () => {
      addLayers(map)
      loadedRef.current = true
      const src = map.getSource(VENUES_SOURCE) as GeoJSONSource | undefined
      src?.setData(venuesToGeoJson(venuesRef.current, selectedVenueId))
      // A rota costuma chegar antes do estilo carregar (TourPage, revisão do wizard).
      const routeSrc = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined
      routeSrc?.setData(routeToGeoJson(routeRef.current))
      emitBounds()
    })
    map.on('moveend', emitBounds)

    map.on('click', 'clusters', async (e: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
      if (!feature) return
      const clusterId = feature.properties?.cluster_id as number | undefined
      if (clusterId === undefined) return
      const src = map.getSource(VENUES_SOURCE) as GeoJSONSource
      const z = await src.getClusterExpansionZoom(clusterId)
      const [lng, lat] = (feature.geometry as Point).coordinates
      map.easeTo({ center: [lng!, lat!], zoom: z })
    })
    map.on('click', 'venue-points', (e: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(e.point, { layers: ['venue-points'] })[0]
      const id = feature?.properties?.id as string | undefined
      const venue = id ? venuesRef.current.find((v) => v.id === id) : undefined
      if (venue) handlersRef.current.onVenueClick?.(venue)
    })
    map.on('click', (e: MapMouseEvent) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'venue-points'] })
      if (hits.length === 0) handlersRef.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })
    for (const layer of ['clusters', 'venue-points']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
    }

    return () => {
      clearTimeout(boundsTimer)
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // Só na montagem: centro/zoom iniciais não devem recriar o mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Casas.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const src = map.getSource(VENUES_SOURCE) as GeoJSONSource | undefined
    src?.setData(venuesToGeoJson(venues, selectedVenueId))
  }, [venues, selectedVenueId])

  // Rota.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const src = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined
    src?.setData(routeToGeoJson(route))
  }, [route])

  // Paradas numeradas (DOM markers).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = stops.map((s) => {
      const el = document.createElement('div')
      el.className =
        'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md'
      el.style.background = s.color ?? '#e11d48'
      el.textContent = s.label
      if (s.title) el.title = s.title
      return new Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map)
    })
  }, [stops])

  // Enquadrar.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitTo) return
    map.fitBounds(
      [
        [fitTo.minLng, fitTo.minLat],
        [fitTo.maxLng, fitTo.maxLat],
      ],
      { padding: 48, maxZoom: 13, duration: 600 },
    )
  }, [fitTo])

  return <div ref={containerRef} className={cn('h-full w-full bg-surface-1', className)} aria-label="Mapa" />
}
