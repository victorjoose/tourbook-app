import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SectionTitle } from '../../components/ui/Card'
import { cn } from '../../lib/cn'

export type DetailShellProps = {
  /** Small label above the title ("Casa de show", "Produtora", "Banda"). */
  kind: string
  title: string
  subtitle?: ReactNode
  icon: LucideIcon
  /** Tailwind classes for the icon tile (background + text color). */
  accent: string
  badges?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

/** Scrollable detail column with a back button to the list, header and sections. */
export function DetailShell({ kind, title, subtitle, icon: Icon, accent, badges, actions, children }: DetailShellProps) {
  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-label={`${kind}: ${title}`}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-surface px-3 py-2">
          <Link
            to="/"
            aria-label="Voltar para a lista"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{kind}</span>
        </div>

        <header className="flex gap-3 pt-1">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', accent)}>
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-lg leading-tight font-semibold text-ink">{title}</h1>
            {subtitle && <div className="text-sm text-ink-muted">{subtitle}</div>}
            {badges && <div className="flex flex-wrap gap-1 pt-1">{badges}</div>}
          </div>
        </header>

        {actions && <div className="flex flex-wrap gap-2 pt-4">{actions}</div>}

        <div className="space-y-6 pt-6">{children}</div>
      </div>
    </article>
  )
}

export function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-2', className)} aria-label={title}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  )
}

/** Label/value pair with an icon, used in the info grid of a detail. */
export function InfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-surface-2 bg-surface-1 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    </div>
  )
}
