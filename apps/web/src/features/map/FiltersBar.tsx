import { GENRES, WEEKDAY_SHORT_PT, genreLabel, type MapFilters } from '@tour/core'
import { X } from 'lucide-react'
import { Chip } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'
import { CAPACITY_PRESETS, SHOW_DAY_OPTIONS, activeCapacityPreset, countActiveFilters } from './filtering'

export type FiltersBarProps = {
  filters: MapFilters
  onChange: (patch: Partial<MapFilters>) => void
  onToggleGenre: (genre: string) => void
  onReset: () => void
  className?: string
}

function Divider() {
  return <span aria-hidden className="my-1 w-px shrink-0 bg-surface-2" />
}

/** Horizontal, scrollable chips: show day, capacity, touring bands and genres. */
export function FiltersBar({ filters, onChange, onToggleGenre, onReset, className }: FiltersBarProps) {
  const active = countActiveFilters(filters)
  const capacity = activeCapacityPreset(filters)

  return (
    <div
      role="group"
      aria-label="Filtros das casas"
      className={cn(
        'flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {active > 0 && (
        <>
          <Chip active onClick={onReset} aria-label={`Limpar ${active} ${active === 1 ? 'filtro' : 'filtros'}`}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar{active > 1 ? ` (${active})` : ''}
          </Chip>
          <Divider />
        </>
      )}

      {SHOW_DAY_OPTIONS.map((day) => (
        <Chip
          key={day}
          active={filters.showDay === day}
          onClick={() => onChange({ showDay: filters.showDay === day ? null : day })}
          aria-label={`Show na ${WEEKDAY_SHORT_PT[day] ?? ''}`}
        >
          {WEEKDAY_SHORT_PT[day]}
        </Chip>
      ))}

      <Divider />

      {CAPACITY_PRESETS.map((preset) => {
        const isActive = capacity?.id === preset.id
        return (
          <Chip
            key={preset.id}
            active={isActive}
            onClick={() =>
              onChange(isActive ? { capacityMin: null, capacityMax: null } : { capacityMin: preset.min, capacityMax: preset.max })
            }
            aria-label={`Capacidade ${preset.label}`}
          >
            {preset.label}
          </Chip>
        )
      })}

      <Divider />

      <Chip active={filters.acceptsTouringOnly} onClick={() => onChange({ acceptsTouringOnly: !filters.acceptsTouringOnly })}>
        Aceita banda de fora
      </Chip>

      <Divider />

      {GENRES.map((genre) => (
        <Chip key={genre} active={filters.genres.includes(genre)} onClick={() => onToggleGenre(genre)}>
          {genreLabel(genre)}
        </Chip>
      ))}
    </div>
  )
}
