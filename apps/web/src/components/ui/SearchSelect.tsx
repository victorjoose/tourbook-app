import { ChevronDown, Search, X } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { normalizeText } from '../../lib/text'
import { Field } from './Input'

export type SearchOption = { id: string; label: string; sublabel?: string }

export type SearchSelectProps = {
  options: readonly SearchOption[]
  value: string | null
  onChange: (id: string | null) => void
  label?: string
  hint?: string
  error?: string | null
  placeholder?: string
  /** Max options shown at once. */
  limit?: number
  disabled?: boolean
  className?: string
  emptyText?: string
}

/** Searchable select (combobox) over a small in-memory list; accent-insensitive. */
export function SearchSelect({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = 'Buscar…',
  limit = 8,
  disabled = false,
  className,
  emptyText = 'Nada encontrado',
}: SearchSelectProps) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const list = q
      ? options.filter((o) => normalizeText(o.label).includes(q) || (o.sublabel ? normalizeText(o.sublabel).includes(q) : false))
      : options
    return list.slice(0, limit)
  }, [options, query, limit])

  const safeActive = filtered.length === 0 ? 0 : Math.min(active, filtered.length - 1)
  const inputValue = open ? query : (selected?.label ?? '')

  function openList() {
    if (disabled) return
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  function choose(option: SearchOption) {
    onChange(option.id)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      openList()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(filtered.length - 1, safeActive + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(0, safeActive - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = filtered[safeActive]
      if (option) choose(option)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const control = (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border bg-surface-1 px-3 focus-within:border-brand-500',
          error ? 'border-red-500' : 'border-surface-3',
          disabled && 'opacity-60',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={!!error}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            if (!open) setOpen(true)
          }}
          onFocus={openList}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          autoComplete="off"
        />
        {selected && !open && !disabled ? (
          <button
            type="button"
            aria-label="Limpar"
            onClick={() => onChange(null)}
            className="rounded-md p-0.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-surface-3 bg-surface-1 py-1 shadow-xl shadow-black/40"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">{emptyText}</li>}
          {filtered.map((option, i) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={cn(
                'flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-sm',
                i === safeActive ? 'bg-surface-2 text-ink' : 'text-ink',
                option.id === value && 'font-medium',
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.sublabel && <span className="shrink-0 text-xs text-ink-muted">{option.sublabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (!label) return control
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      {control}
    </Field>
  )
}
