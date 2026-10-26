import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-surface-2 bg-surface-1 p-4', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-xs font-semibold uppercase tracking-wide text-ink-muted', className)}>{children}</h2>
}
