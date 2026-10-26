import { Check, RotateCcw } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'
import { STEPS } from './steps'

export function WizardHeader({ step, onReset }: { step: number; onReset: () => void }) {
  const current = STEPS[step]
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-surface-2 bg-surface/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Nova turnê · Passo {step + 1} de {STEPS.length}
          </p>
          <h1 className="text-lg font-semibold">{current?.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Começar de novo
        </Button>
      </div>

      {/* Mobile: segmented progress bar. */}
      <div className="mt-3 flex gap-1 md:hidden" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s.id} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-brand-500' : 'bg-surface-2')} />
        ))}
      </div>

      {/* Desktop: numbered steps. */}
      <ol className="mt-3 hidden items-center gap-2 md:flex" aria-label="Etapas">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-brand-600/30 text-brand-200',
                  active && 'bg-brand-600 text-white',
                  !done && !active && 'bg-surface-2 text-ink-muted',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('text-xs', active ? 'font-medium text-ink' : 'text-ink-muted')}>{s.title}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-surface-3" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </header>
  )
}
