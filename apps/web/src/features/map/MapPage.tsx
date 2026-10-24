import { boundsOf, type Band, type City, type LatLng, type Producer, type Venue } from '@tour/core'
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { EmptyState, ErrorState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { useRegionData, useRegionIndex } from '../../hooks/useRegionData'
import { BandDetail } from './BandDetail'
import { BottomSheet } from './BottomSheet'
import { CitySearch } from './CitySearch'
import { ExplorePanel } from './ExplorePanel'
import { FiltersBar } from './FiltersBar'
import { MapView, type MapStop, type MapViewHandle } from './MapView'
import { ProducerDetail } from './ProducerDetail'
import { VenueDetail } from './VenueDetail'
import {
  bandsInView,
  citySummary,
  hasActiveFilters,
  matchesFilters,
  producersInView,
  sortByName,
  venuesInView,
  type CityIndex,
} from './filtering'
import { useMapStore } from './mapStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'

type DetailKind = 'venue' | 'producer' | 'band'
type Detail = { kind: DetailKind; id: string }

const NO_VENUES: Venue[] = []
const NO_PRODUCERS: Producer[] = []
const NO_BANDS: Band[] = []
const NO_CITIES: City[] = []
const NO_STOPS: MapStop[] = []
const NO_ROUTE: LatLng[] = []

/** Zoom used when the map flies to a city / a venue opened from a list / "Ver no mapa". */
const CITY_ZOOM = 11
const VENUE_ZOOM = 13
const VENUE_FOCUS_ZOOM = 14

function detailFromPath(pathname: string, id: string | undefined): Detail | null {
  if (!id) return null
  if (pathname.startsWith('/casas/')) return { kind: 'venue', id }
  if (pathname.startsWith('/produtoras/')) return { kind: 'producer', id }
  if (pathname.startsWith('/bandas/')) return { kind: 'band', id }
  return null
}

/** Navigation state set when a pin was tapped: the venue is already on screen. */
function isFromMap(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { fromMap?: unknown }).fromMap === true
}

function PanelLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-ink-muted" aria-busy>
      <Spinner className="h-8 w-8" />
      <p className="text-sm">Carregando casas, produtoras e bandas…</p>
    </div>
  )
}

function NotFound({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <EmptyState
        title={title}
        description="Pode ter sido removida ou ainda não foi aprovada."
        action={
          <Link to="/" className="text-sm text-brand-300 underline">
            Voltar ao mapa
          </Link>
        }
      />
    </div>
  )
}

/** Map home: city search + filters + explore lists on one side, the map on the other. */
export default function MapPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isDesktop = useIsDesktop()
  const mapRef = useRef<MapViewHandle>(null)

  const region = useRegionData()
  const data = region.data
  const index = useRegionIndex(data)

  const bounds = useMapStore((s) => s.bounds)
  const filters = useMapStore((s) => s.filters)
  const selectedCityId = useMapStore((s) => s.selectedCityId)
  const tab = useMapStore((s) => s.tab)
  const sheet = useMapStore((s) => s.sheet)
  const setBounds = useMapStore((s) => s.setBounds)
  const setFilters = useMapStore((s) => s.setFilters)
  const toggleGenre = useMapStore((s) => s.toggleGenre)
  const resetFilters = useMapStore((s) => s.resetFilters)
  const setSelectedCityId = useMapStore((s) => s.setSelectedCityId)
  const setTab = useMapStore((s) => s.setTab)
  const setSheet = useMapStore((s) => s.setSheet)

  const detail = useMemo(() => detailFromPath(location.pathname, id), [location.pathname, id])

  const venues = data?.venues ?? NO_VENUES
  const producers = data?.producers ?? NO_PRODUCERS
  const bands = data?.bands ?? NO_BANDS
  const cities = data?.cities ?? NO_CITIES
  const cityIndex: CityIndex = index.cities

  // Pins: every venue that passes the filters (the map shows beyond the list).
  const mapVenues = useMemo(() => venues.filter((v) => matchesFilters(v, filters)), [venues, filters])
  // Lists: only what is inside the current viewport.
  const venueList = useMemo(() => sortByName(venuesInView(venues, bounds, filters)), [venues, bounds, filters])
  const producerList = useMemo(
    () => sortByName(producersInView(producers, cityIndex, bounds)),
    [producers, cityIndex, bounds],
  )
  const bandList = useMemo(() => sortByName(bandsInView(bands, cityIndex, bounds)), [bands, cityIndex, bounds])

  const selectedCity = selectedCityId ? (cityIndex.get(selectedCityId) ?? null) : null
  const summary = useMemo(() => (selectedCity && data ? citySummary(selectedCity.id, data) : null), [selectedCity, data])

  const detailVenue = detail?.kind === 'venue' ? index.venues.get(detail.id) : undefined

  // Opening a venue from a list (or by URL) flies to it once per navigation; a pin tap does not.
  const flownKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!detailVenue) return
    if (flownKeyRef.current === location.key) return
    flownKeyRef.current = location.key
    if (isFromMap(location.state)) return
    mapRef.current?.flyTo({ lat: detailVenue.lat, lng: detailVenue.lng }, VENUE_ZOOM)
  }, [detailVenue, location.key, location.state])

  const handleVenueClick = useCallback(
    (venue: Venue) => {
      navigate(`/casas/${venue.id}`, { state: { fromMap: true } })
      setSheet('half')
    },
    [navigate, setSheet],
  )

  function revealMap() {
    if (!isDesktop) setSheet('collapsed')
  }

  function handleCitySelect(city: City) {
    setSelectedCityId(city.id)
    mapRef.current?.flyTo({ lat: city.lat, lng: city.lng }, CITY_ZOOM)
    if (detail) navigate('/')
    if (!isDesktop && sheet === 'full') setSheet('half')
  }

  function handleShowVenueOnMap(venue: Venue) {
    mapRef.current?.flyTo({ lat: venue.lat, lng: venue.lng }, VENUE_FOCUS_ZOOM)
    revealMap()
  }

  function handleShowCity(city: City) {
    mapRef.current?.flyTo({ lat: city.lat, lng: city.lng }, CITY_ZOOM)
    revealMap()
  }

  function handleShowCities(list: City[]) {
    const first = list[0]
    if (!first) return
    if (list.length === 1) {
      mapRef.current?.flyTo({ lat: first.lat, lng: first.lng }, CITY_ZOOM)
    } else {
      const b = boundsOf(list)
      if (b) mapRef.current?.fitBounds(b, 64)
    }
    revealMap()
  }

  function handleShowRegion() {
    const b = boundsOf(cities)
    if (b) mapRef.current?.fitBounds(b, 32)
  }

  function renderDetail(d: Detail): ReactNode {
    if (d.kind === 'venue') {
      const venue = index.venues.get(d.id)
      if (!venue) return <NotFound title="Casa não encontrada" />
      const venueProducers = sortByName(producers.filter((p) => p.venueIds.includes(venue.id)))
      const localBands = sortByName(bands.filter((b) => b.cityId === venue.cityId))
      return (
        <VenueDetail
          venue={venue}
          city={cityIndex.get(venue.cityId)}
          producers={venueProducers}
          localBands={localBands}
          cities={cityIndex}
          onShowOnMap={handleShowVenueOnMap}
        />
      )
    }
    if (d.kind === 'producer') {
      const producer = index.producers.get(d.id)
      if (!producer) return <NotFound title="Produtora não encontrada" />
      const producerVenues = sortByName(
        producer.venueIds.map((vid) => index.venues.get(vid)).filter((v): v is Venue => v !== undefined),
      )
      return <ProducerDetail producer={producer} cities={cityIndex} venues={producerVenues} onShowCities={handleShowCities} />
    }
    const band = index.bands.get(d.id)
    if (!band) return <NotFound title="Banda não encontrada" />
    return <BandDetail band={band} city={band.cityId ? cityIndex.get(band.cityId) : undefined} onShowCity={handleShowCity} />
  }

  const search = (
    <CitySearch
      cities={cities}
      selectedCity={selectedCity}
      summary={summary}
      onSelect={handleCitySelect}
      onClear={() => setSelectedCityId(null)}
      disabled={region.isPending}
    />
  )

  let panelBody: ReactNode
  if (region.isPending) {
    panelBody = <PanelLoading />
  } else if (region.isError) {
    panelBody = (
      <div className="flex flex-1 flex-col">
        <ErrorState
          message={region.error instanceof Error ? region.error.message : 'Não foi possível carregar a região.'}
          onRetry={() => void region.refetch()}
        />
      </div>
    )
  } else if (detail) {
    // Keyed by path so switching between details starts scrolled to the top.
    panelBody = <div key={location.pathname} className="flex min-h-0 flex-1 flex-col">{renderDetail(detail)}</div>
  } else {
    panelBody = (
      <>
        <FiltersBar filters={filters} onChange={setFilters} onToggleGenre={toggleGenre} onReset={resetFilters} className="shrink-0" />
        <ExplorePanel
          tab={tab}
          onTabChange={setTab}
          venues={venueList}
          producers={producerList}
          bands={bandList}
          cities={cityIndex}
          selectedVenueId={null}
          filtersActive={hasActiveFilters(filters)}
          onClearFilters={resetFilters}
          onShowRegion={handleShowRegion}
        />
      </>
    )
  }

  return (
    <div className="relative h-full md:flex">
      {isDesktop && (
        <aside
          aria-label="Explorar"
          className="flex h-full w-[400px] shrink-0 flex-col border-r border-surface-2 bg-surface"
        >
          <div className="shrink-0 px-4 pt-4 pb-2">{search}</div>
          {panelBody}
        </aside>
      )}

      <div className="absolute inset-0 md:static md:h-full md:min-w-0 md:flex-1">
        <MapView
          ref={mapRef}
          venues={mapVenues}
          selectedVenueId={detail?.kind === 'venue' ? detail.id : null}
          onVenueClick={handleVenueClick}
          onBoundsChange={setBounds}
          stops={NO_STOPS}
          route={NO_ROUTE}
          className="h-full w-full"
        />
      </div>

      {!isDesktop && (
        <BottomSheet state={sheet} onStateChange={setSheet} header={search}>
          {panelBody}
        </BottomSheet>
      )}
    </div>
  )
}
