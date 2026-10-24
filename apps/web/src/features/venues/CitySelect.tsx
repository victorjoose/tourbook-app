import type { City } from '@tour/core'
import { ChevronDown, MapPin, X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Field } from '../../components/ui/Input'
import { cn } from '../../lib/cn'
import { cityLabel, searchCities } from '../map/filtering'

export type CitySelectProps = {
  cities: readonly City[]
  /** Selected city id ('' or null when none). */
  value: string | null
  onChange: (city: City | null) => void
  label?: string
  hint?: string
  error?: string | null
  disabled?: boolean
  id?: string
  className?: string
}

const LIMIT = 8

function biggestFirst(cities: readonly City[]): City[] {
  return [...cities]
    .sort((a, b) => (b.population ?? -1) - (a.population ?? -1) || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, LIMIT)
}

/**
 * Searchable select over the region cities (accent-insensitive prefix search,
 * biggest cities first, arrow-key navigation). Shows the selected city while
 * closed and turns into a search box when opened.
 */
export function CitySelect({
  cities,
  value,
  onChange,
  label = 'Cidade',
  hint,
  error,
  disabled = false,
  id,
  className,
}: CitySelectProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const selected = useMemo(() => (value ? (cities.find((c) => c.id === value) ?? null) : null), [cities, value])
  const results = useMemo(() => (query.trim() ? searchCities(cities, query, LIMIT) : biggestFirst(cities)), [cities, query])
  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1)
  const activeOption = results[safeIndex]
  const inputValue = open ? query : selected ? cityLabel(selected) : ''

  function openList() {
    if (disabled) return
    setQuery('')
    setActiveIndex(0)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setQuery('')
  }

  function select(city: City) {
    onChange(city)
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openList()
      else if (results.length > 0) setActiveIndex((safeIndex + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open && results.length > 0) setActiveIndex((safeIndex - 1 + results.length) % results.length)
      return
    }
    if (e.key === 'Enter') {
      if (open && activeOption) {
        e.preventDefault()
        select(activeOption)
      }
      return
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
    }
  }

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      <div ref={rootRef} className={cn('relative', className)}>
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-activedescendant={open && activeOption ? `${listId}-${activeOption.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar cidade em SC, PR ou SP…"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
            if (!open) setOpen(true)
          }}
          onFocus={openList}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close()
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-10 w-full rounded-xl border bg-surface-1 pr-9 pl-9 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none disabled:opacity-60',
            error ? 'border-red-500' : 'border-surface-3',
          )}
        />
        {selected && !open ? (
          <button
            type="button"
            aria-label={`Limpar cidade ${selected.name}`}
            disabled={disabled}
            onClick={() => {
              onChange(null)
              inputRef.current?.focus()
            }}
            className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        )}

        {open && (
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
                    aria-selected={city.id === selected?.id}
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
      </div>
    </Field>
  )
}
