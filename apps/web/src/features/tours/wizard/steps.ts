export type StepId = 'band' | 'dates' | 'start' | 'constraints' | 'fill' | 'review'

export type WizardStep = { id: StepId; title: string }

export const STEPS: readonly WizardStep[] = [
  { id: 'band', title: 'Banda e nome' },
  { id: 'dates', title: 'Datas' },
  { id: 'start', title: 'Ponto de partida' },
  { id: 'constraints', title: 'Restrições' },
  { id: 'fill', title: 'Preencher as datas' },
  { id: 'review', title: 'Revisão' },
]

export const LAST_STEP = STEPS.length - 1

export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0
  return Math.min(LAST_STEP, Math.max(0, Math.trunc(step)))
}

export function stepIdAt(step: number): StepId {
  return STEPS[clampStep(step)]?.id ?? 'band'
}
