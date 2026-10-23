import { GENRES, tourFormSchema, type Genre, type TourFormInput, type TourFormValues } from '@tour/core'
import { isIsoDate } from './slots'
import type { StepId } from './steps'
import type { TourFields, WizardState } from './types'

export function isGenre(value: string): value is Genre {
  return (GENRES as readonly string[]).includes(value)
}

export function effectiveEndCityId(fields: Pick<TourFields, 'startCityId' | 'endCityId' | 'returnHome'>): string | null {
  return fields.returnHome ? fields.startCityId : fields.endCityId
}

export function toTourFormInput(fields: TourFields): TourFormInput {
  return {
    name: fields.name,
    bandName: fields.bandName,
    bandId: fields.bandId,
    genres: fields.genres.filter(isGenre),
    startCityId: fields.startCityId ?? '',
    endCityId: effectiveEndCityId(fields),
    maxKmPerDay: fields.maxKmPerDay,
    allowOffDays: fields.allowOffDays,
    capacityMin: fields.capacityMin,
    capacityMax: fields.capacityMax,
  }
}

const TOUR_FIELD_KEYS = [
  'name',
  'bandName',
  'bandId',
  'genres',
  'startCityId',
  'endCityId',
  'maxKmPerDay',
  'allowOffDays',
  'capacityMin',
  'capacityMax',
  'notes',
] as const satisfies ReadonlyArray<keyof TourFormInput>

function isTourField(key: string): key is keyof TourFormInput {
  return (TOUR_FIELD_KEYS as readonly string[]).includes(key)
}

export type FieldErrors = Partial<Record<keyof TourFormInput, string>>

/** First zod message per field (pt-BR), keyed by the tour field name. */
export function tourFormErrors(fields: TourFields): FieldErrors {
  const result = tourFormSchema.safeParse(toTourFormInput(fields))
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !isTourField(key)) continue
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

export function parseTourForm(fields: TourFields): TourFormValues | null {
  const result = tourFormSchema.safeParse(toTourFormInput(fields))
  return result.success ? result.data : null
}

const STEP_FIELDS: Record<StepId, ReadonlyArray<keyof TourFormInput>> = {
  band: ['name', 'bandName', 'bandId', 'genres'],
  dates: [],
  start: ['startCityId', 'endCityId'],
  constraints: ['maxKmPerDay', 'capacityMin', 'capacityMax', 'allowOffDays'],
  fill: [],
  review: [],
}

/** Messages that block "Continuar" on a step (schema errors + rules outside the schema). */
export function stepIssues(state: WizardState, step: StepId): string[] {
  const fieldErrors = tourFormErrors(state)
  const issues: string[] = []
  for (const key of STEP_FIELDS[step]) {
    const message = fieldErrors[key]
    if (message) issues.push(message)
  }
  if (step === 'dates' && state.slots.length === 0) {
    if (state.dateMode !== 'calendar' && !isIsoDate(state.startDate)) issues.push('Escolha a data de início')
    else if (state.dateMode !== 'calendar' && state.weekdays.length === 0) issues.push('Escolha pelo menos um dia da semana')
    else issues.push('Adicione pelo menos uma data')
  }
  if (step === 'fill' && !state.slots.some((s) => s.cityId !== null)) {
    issues.push('Escolha a cidade de pelo menos uma data')
  }
  return issues
}
