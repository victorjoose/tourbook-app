import { formatHours, formatKm } from '@tour/core'
import { Route } from 'lucide-react'
import { useMemo } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { plural } from '../../../lib/text'
import { routeSummary, type ResolvedTourDate } from './helpers'
/** Estimated road km / hours of the whole route (haversine × 1,3) plus counts. */
export function RouteTotals({ resolved, className }: { resolved: readonly ResolvedTourDate[]; className?: string }) {
  const summary = useMemo(() => routeSummary(resolved), [resolved])

  return (
    <Card className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Rota</SectionTitle>
        <Route className="h-4 w-4 text-ink-muted" aria-hidden />
      </div>
      {summary.cities < 2 ? (
        <p className="text-sm text-ink-muted">
          {summary.dates === 0
            ? 'Adicione datas para ver a rota.'
            : 'Defina a cidade de pelo menos duas datas para estimar a estrada.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{formatKm(summary.km)}</p>
            <p className="text-xs text-ink-muted">de estrada (estimativa)</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{formatHours(summary.hours)}</p>
            <p className="text-xs text-ink-muted">ao volante</p>
          </div>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        {plural(summary.cities, 'cidade', 'cidades')} · {plural(summary.dates, 'data', 'datas')}
        {summary.withoutCity > 0 && ` · ${plural(summary.withoutCity, 'data sem cidade', 'datas sem cidade')}`}
      </p>
    </Card>
  )
}
