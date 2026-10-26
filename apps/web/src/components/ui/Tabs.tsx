import { cn } from '../../lib/cn'

export type TabItem<T extends string> = { value: T; label: string; count?: number }

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 rounded-xl bg-surface-1 p-1', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px]', active ? 'bg-surface-1' : 'bg-surface-2')}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
