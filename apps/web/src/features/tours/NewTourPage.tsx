import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTour, type RegionData } from '@tour/core'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { queryKeys } from '../../app/queryClient'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorState } from '../../components/ui/EmptyState'
import { FullScreenSpinner, Spinner } from '../../components/ui/Spinner'
import { useRegionData } from '../../hooks/useRegionData'
import { supabase } from '../../lib/supabase'
import { useTourWizardStore } from './tourWizardStore'
import { StepBand } from './wizard/StepBand'
import { StepConstraints } from './wizard/StepConstraints'
import { StepDates } from './wizard/StepDates'
import { StepFill } from './wizard/StepFill'
import { StepReview } from './wizard/StepReview'
import { StepStart } from './wizard/StepStart'
import { WizardHeader } from './wizard/WizardHeader'
import { slotsToTourDates } from './wizard/slots'
import { LAST_STEP, clampStep, stepIdAt } from './wizard/steps'
import { parseTourForm, stepIssues } from './wizard/validation'

const FILL_STEP = 4

export default function NewTourPage() {
  const region = useRegionData()

  if (region.isPending) return <FullScreenSpinner label="Carregando a região…" />
  if (region.isError) {
    return (
      <ErrorState
        message={region.error instanceof Error ? region.error.message : 'Não deu para carregar cidades e casas.'}
        onRetry={() => void region.refetch()}
      />
    )
  }
  return <Wizard data={region.data} />
}

function Wizard({ data }: { data: RegionData }) {
  const state = useTourWizardStore()
  const { setStep, applyStartCityDefault, reset } = state
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showErrors, setShowErrors] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const step = clampStep(state.step)
  const stepId = stepIdAt(step)
  const issues = stepIssues(state, stepId)
  const canContinue = issues.length === 0

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Você precisa estar logado para salvar a turnê.')
      const tour = parseTourForm(state)
      if (!tour) throw new Error('Revise os campos da turnê antes de salvar.')
      return createTour(supabase, user.id, { tour, dates: slotsToTourDates(state.slots) })
    },
    onSuccess: async (tour) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tours })
      reset()
      void navigate(`/turnes/${tour.id}`)
    },
  })

  function goTo(next: number) {
    setShowErrors(false)
    if (next === FILL_STEP) applyStartCityDefault()
    setStep(next)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  function onContinue() {
    if (!canContinue) {
      setShowErrors(true)
      return
    }
    if (step === LAST_STEP) {
      save.mutate()
      return
    }
    goTo(step + 1)
  }

  function onReset() {
    reset()
    setShowErrors(false)
    setConfirmReset(false)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const saveError = save.error instanceof Error ? save.error.message : save.isError ? 'Erro ao salvar a turnê.' : null

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
        <WizardHeader step={step} onReset={() => setConfirmReset(true)} />

        <div className="flex-1 py-6">
          {stepId === 'band' && <StepBand data={data} showErrors={showErrors} />}
          {stepId === 'dates' && <StepDates data={data} showErrors={showErrors} />}
          {stepId === 'start' && <StepStart data={data} showErrors={showErrors} />}
          {stepId === 'constraints' && <StepConstraints showErrors={showErrors} />}
          {stepId === 'fill' && <StepFill data={data} showErrors={showErrors} onGoToStep={goTo} />}
          {stepId === 'review' && <StepReview data={data} />}
        </div>

        <footer className="sticky bottom-0 -mx-4 border-t border-surface-2 bg-surface/95 px-4 py-3 backdrop-blur">
          {showErrors && !canContinue && (
            <p className="mb-2 text-xs text-red-400" role="alert">
              {issues[0]}
            </p>
          )}
          {saveError && (
            <p className="mb-2 text-xs text-red-400" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0 || save.isPending}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Voltar
            </Button>
            <Button onClick={onContinue} disabled={save.isPending} aria-disabled={!canContinue}>
              {step === LAST_STEP ? (
                <>
                  {save.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" aria-hidden />}
                  {save.isPending ? 'Salvando…' : 'Salvar turnê'}
                </>
              ) : (
                <>
                  Continuar
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Começar de novo?">
        <p className="text-sm text-ink-muted">Tudo que você preencheu nesta turnê será apagado. Isso não dá para desfazer.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onReset}>
            Apagar e começar de novo
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
