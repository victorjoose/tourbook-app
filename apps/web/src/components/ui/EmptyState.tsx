import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-ink-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center" role="alert">
      <p className="font-medium text-red-300">Algo deu errado</p>
      <p className="max-w-xs text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm text-brand-300 underline">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
