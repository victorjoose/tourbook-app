import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-brand-500', className)}
    />
  )
}

export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-ink-muted">
      <Spinner className="h-8 w-8" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
