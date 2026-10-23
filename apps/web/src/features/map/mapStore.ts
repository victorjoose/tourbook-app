import { EMPTY_FILTERS, type Bounds, type MapFilters } from '@tour/core'
import { create } from 'zustand'

export type ExploreTab = 'casas' | 'produtoras' | 'bandas'

/** Mobile bottom sheet: collapsed = search bar + handle; half; full. */
export type SheetState = 'collapsed' | 'half' | 'full'

export type MapStoreState = {
  /** Current map viewport (from MapView onBoundsChange); null until the map loads. */
  bounds: Bounds | null
  filters: MapFilters
  selectedCityId: string | null
  tab: ExploreTab
  sheet: SheetState
  setBounds: (bounds: Bounds) => void
  setFilters: (patch: Partial<MapFilters>) => void
  toggleGenre: (genre: string) => void
  resetFilters: () => void
  setSelectedCityId: (cityId: string | null) => void
  setTab: (tab: ExploreTab) => void
  setSheet: (sheet: SheetState) => void
}

export const useMapStore = create<MapStoreState>()((set) => ({
  bounds: null,
  filters: EMPTY_FILTERS,
  selectedCityId: null,
  tab: 'casas',
  sheet: 'collapsed',
  setBounds: (bounds) => set({ bounds }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  toggleGenre: (genre) =>
    set((s) => ({
      filters: {
        ...s.filters,
        genres: s.filters.genres.includes(genre)
          ? s.filters.genres.filter((g) => g !== genre)
          : [...s.filters.genres, genre],
      },
    })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  setSelectedCityId: (selectedCityId) => set({ selectedCityId }),
  setTab: (tab) => set({ tab }),
  setSheet: (sheet) => set({ sheet }),
}))
