import { formatDatePt, routeAlerts, type RouteAlert } from '@tour/core'
import { CircleAlert, OctagonAlert, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { capitalize } from '../../../lib/text'
import { alertInputs, type ResolvedTourDate } from './helpers'
const LEVEL_CLASSES: Record<RouteAlert['level'], string> = {
  warn: 'border-amber-900/60 bg-amber-950/40 text-amber-100',
  error: 'border-red-900/60 bg-red-950/40 text-red-100',
}

/** Route problems (too long legs, gaps, same-day dates, missing cities) from `routeAlerts`. */
export function RouteAlerts({
  resolved,
  maxKmPerDay,
  className,
}: {
  resolved: readonly ResolvedTourDate[]
  maxKmPerDay: number
  className?: string
}) {
  const alerts = useMemo(() => routeAlerts(alertInputs(resolved), maxKmPerDay), [resolved, maxKmPerDay])
  const errors = alerts.filter((a) => a.level === 'error').length

  return (
    <Card className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Alertas da rota</SectionTitle>
        <ShieldAlert className="h-4 w-4 text-ink-muted" aria-hidden />
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {resolved.length === 0 ? 'Adicione datas para checar a rota.' : 'Nenhum problema na rota. Boa viagem!'}
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-muted">
            {alerts.length === 1 ? '1 alerta' : `${alerts.length} alertas`}
            {errors > 0 && ` · ${errors === 1 ? '1 trecho acima do limite' : `${errors} trechos acima do limite`}`}
          </p>
          <ul className="space-y-2">
            {alerts.map((alert, i) => {
              const Icon = alert.level === 'error' ? OctagonAlert : CircleAlert
              return (
                <li
                  key={`${alert.date}-${i}`}
                  className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', LEVEL_CLASSES[alert.level])}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs opacity-80">{capitalize(formatDatePt(alert.date, 'short'))}</span>
                    <span className="block">{alert.message}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
