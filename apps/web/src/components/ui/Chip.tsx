import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Chip({
  active = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-brand-500 bg-brand-600/20 text-brand-100'
          : 'border-surface-3 bg-surface-1 text-ink-muted hover:border-surface-3 hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Selo estático (status, gênero). */
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  )
}
