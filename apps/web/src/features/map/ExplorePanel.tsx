import type { Band, Producer, Venue } from '@tour/core'
import { Guitar, Mic, Plus, Store, ZoomOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs, type TabItem } from '../../components/ui/Tabs'
import { BandCard } from './BandCard'
import { ProducerCard } from './ProducerCard'
import { VenueCard } from './VenueCard'
import type { CityIndex } from './filtering'
import type { ExploreTab } from './mapStore'

export type ExplorePanelProps = {
  tab: ExploreTab
  onTabChange: (tab: ExploreTab) => void
  /** Already restricted to the map bounds and sorted by name. */
  venues: Venue[]
  producers: Producer[]
  bands: Band[]
  cities: CityIndex
  selectedVenueId?: string | null
  filtersActive: boolean
  onClearFilters: () => void
  onShowRegion: () => void
}

function SuggestVenueLink({ className }: { className?: string }) {
  return (
    <Link
      to="/casas/sugerir"
      className={
        className ??
        'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-brand-300 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'
      }
    >
      <Plus className="h-4 w-4" aria-hidden />
      Sugerir uma casa
    </Link>
  )
}

/** Tabs Casas / Produtoras / Bandas with the cards of what is inside the map. */
export function ExplorePanel({
  tab,
  onTabChange,
  venues,
  producers,
  bands,
  cities,
  selectedVenueId,
  filtersActive,
  onClearFilters,
  onShowRegion,
}: ExplorePanelProps) {
  const items: TabItem<ExploreTab>[] = [
    { value: 'casas', label: 'Casas', count: venues.length },
    { value: 'produtoras', label: 'Produtoras', count: producers.length },
    { value: 'bandas', label: 'Bandas', count: bands.length },
  ]

  const regionButton = (
    <Button variant="secondary" size="sm" onClick={onShowRegion}>
      <ZoomOut className="h-4 w-4" aria-hidden />
      Ver toda a região
    </Button>
  )

  let content: ReactNode
  if (tab === 'casas') {
    content =
      venues.length === 0 ? (
        <EmptyState
          icon={<Store className="h-8 w-8" aria-hidden />}
          title="Nenhuma casa nessa área"
          description={
            filtersActive
              ? 'Afaste o mapa ou limpe os filtros para ver mais casas.'
              : 'Afaste o mapa para ver mais casas, ou sugira uma casa que você conhece.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {filtersActive && (
                <Button variant="secondary" size="sm" onClick={onClearFilters}>
                  Limpar filtros
                </Button>
              )}
              {regionButton}
              <SuggestVenueLink className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-brand-300 hover:bg-surface-2" />
            </div>
          }
        />
      ) : (
        <>
          <ul className="space-y-2" aria-label="Casas de show">
            {venues.map((v) => (
              <li key={v.id}>
                <VenueCard venue={v} city={cities.get(v.cityId)} selected={v.id === selectedVenueId} />
              </li>
            ))}
          </ul>
          <div className="flex justify-center pt-3">
            <SuggestVenueLink />
          </div>
        </>
      )
  } else if (tab === 'produtoras') {
    content =
      producers.length === 0 ? (
        <EmptyState
          icon={<Mic className="h-8 w-8" aria-hidden />}
          title="Nenhuma produtora nessa área"
          description="Afaste o mapa para ver produtoras de outras cidades."
          action={regionButton}
        />
      ) : (
        <ul className="space-y-2" aria-label="Produtoras">
          {producers.map((p) => (
            <li key={p.id}>
              <ProducerCard producer={p} cities={cities} />
            </li>
          ))}
        </ul>
      )
  } else {
    content =
      bands.length === 0 ? (
        <EmptyState
          icon={<Guitar className="h-8 w-8" aria-hidden />}
          title="Nenhuma banda nessa área"
          description="Afaste o mapa para ver bandas de outras cidades."
          action={regionButton}
        />
      ) : (
        <ul className="space-y-2" aria-label="Bandas locais">
          {bands.map((b) => (
            <li key={b.id}>
              <BandCard band={b} city={b.cityId ? cities.get(b.cityId) : undefined} />
            </li>
          ))}
        </ul>
      )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pb-2">
        <Tabs items={items} value={tab} onChange={onTabChange} />
      </div>
      <div role="tabpanel" aria-label={items.find((i) => i.value === tab)?.label} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {content}
      </div>
    </div>
  )
}
