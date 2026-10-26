import type { City } from '@tour/core'
import { MapPin, Search, X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { citySummaryLabel, searchCities, type CitySummary } from './filtering'

export type CitySearchProps = {
  cities: readonly City[]
  selectedCity: City | null
  summary: CitySummary | null
  onSelect: (city: City) => void
  onClear: () => void
  disabled?: boolean
  className?: string
}

/**
 * City autocomplete (accent-insensitive, starts-with, up to 8 results) with
 * arrow-key navigation, plus the summary card of the selected city.
 */
export function CitySearch({ cities, selectedCity, summary, onSelect, onClear, disabled, className }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const inputId = useId()

  const results = useMemo(() => searchCities(cities, query), [cities, query])
  const showList = open && query.trim().length > 0
  // Clamp during render so the highlighted row stays valid when the list shrinks.
  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1)
  const activeOption = results[safeIndex]

  function select(city: City) {
    onSelect(city)
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showList) setOpen(true)
      if (results.length > 0) setActiveIndex((safeIndex + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length > 0) setActiveIndex((safeIndex - 1 + results.length) % results.length)
      return
    }
    if (e.key === 'Enter') {
      if (showList && activeOption) {
        e.preventDefault()
        select(activeOption)
      }
      return
    }
    if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault()
        setOpen(false)
      } else if (query) {
        setQuery('')
      }
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-label="Buscar cidade"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeOption ? `${listId}-${activeOption.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar cidade…"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            // Keep the list open while focus moves inside the component (option click).
            if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
          }}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-surface-3 bg-surface-1 pr-9 pl-9 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none disabled:opacity-60"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              setQuery('')
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Cidades"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-surface-2 bg-surface-1 py-1 shadow-xl shadow-black/50"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted" role="option" aria-selected={false} aria-disabled>
              Nenhuma cidade encontrada em SC, PR ou SP.
            </li>
          ) : (
            results.map((city, i) => {
              const active = i === safeIndex
              return (
                <li
                  key={city.id}
                  id={`${listId}-${city.id}`}
                  role="option"
                  aria-selected={active}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(city)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                    active ? 'bg-surface-2 text-ink' : 'text-ink hover:bg-surface-2',
                  )}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  <span className="truncate">{city.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-ink-muted">{city.state}</span>
                </li>
              )
            })
          )}
        </ul>
      )}

      {selectedCity && summary && (
        <div
          className="mt-2 flex items-center gap-2 rounded-xl border border-surface-2 bg-surface-1 py-2 pr-1 pl-3 text-sm"
          role="status"
        >
          <MapPin className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
          <span className="min-w-0 flex-1 truncate" title={citySummaryLabel(selectedCity, summary)}>
            {citySummaryLabel(selectedCity, summary)}
          </span>
          <button
            type="button"
            aria-label={`Limpar cidade ${selectedCity.name}`}
            onClick={onClear}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
