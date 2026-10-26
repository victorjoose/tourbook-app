import { formatCurrencyBRL, type TourDate } from '@tour/core'
import { Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { plural } from '../../../lib/text'
import { financeTotals } from './helpers'
/** Fees, costs and balance of the tour (values in cents, shown in BRL). */
export function FinanceSummary({ dates, className }: { dates: readonly TourDate[]; className?: string }) {
  const totals = useMemo(() => financeTotals(dates), [dates])
  const hasMoney = totals.datesWithFee > 0 || totals.datesWithCost > 0

  return (
    <Card className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Financeiro</SectionTitle>
        <Wallet className="h-4 w-4 text-ink-muted" aria-hidden />
      </div>

      {!hasMoney ? (
        <p className="text-sm text-ink-muted">Nenhum cachê ou custo lançado ainda. Edite uma data para informar os valores.</p>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Cachês</dt>
            <dd className="font-medium tabular-nums">{formatCurrencyBRL(totals.feeCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Custos</dt>
            <dd className="font-medium tabular-nums">{formatCurrencyBRL(totals.costCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-surface-2 pt-2">
            <dt className="font-medium">Saldo</dt>
            <dd
              className={cn(
                'font-semibold tabular-nums',
                totals.balanceCents > 0 && 'text-emerald-300',
                totals.balanceCents < 0 && 'text-red-300',
              )}
            >
              {formatCurrencyBRL(totals.balanceCents)}
            </dd>
          </div>
        </dl>
      )}

      <p className="text-xs text-ink-muted">
        {plural(totals.datesWithFee, 'data com cachê', 'datas com cachê')} de {plural(dates.length, 'data', 'datas')}
      </p>
    </Card>
  )
}
