// Wizard state for /turnes/nova. Persisted to sessionStorage so a refresh keeps the draft.
import { DEFAULT_MAX_KM_PER_DAY, PILOT_STATES } from '@tour/core'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { applyStartCity, buildSlots, generatedDates, isIsoDate, uniqueSortedDates } from './wizard/slots'
import { clampStep } from './wizard/steps'
import type { DateInputs, FixedDateInput, TourFields, WizardSlot, WizardState } from './wizard/types'

export const MIN_WEEKS = 1
export const MAX_WEEKS = 12
export const MIN_COUNT = 1
export const MAX_COUNT = 60

export const initialWizardState: WizardState = {
  step: 0,
  name: '',
  bandName: '',
  bandId: null,
  genres: [],
  dateMode: 'weeks',
  startDate: '',
  weekdays: [5, 6],
  weeks: 4,
  count: 8,
  calendarDates: [],
  fixedDates: [],
  removedDates: [],
  startCityId: null,
  endCityId: null,
  returnHome: true,
  maxKmPerDay: DEFAULT_MAX_KM_PER_DAY,
  capacityMin: null,
  capacityMax: null,
  allowOffDays: true,
  states: [...PILOT_STATES],
  slots: [],
}

export type SlotPick = { venueId?: string | null; bandIds?: string[] }

export type WizardActions = {
  setStep: (step: number) => void
  setFields: (patch: Partial<TourFields>) => void
  setDateInputs: (patch: Partial<DateInputs>) => void
  toggleWeekday: (weekday: number) => void
  addCalendarDate: (date: string) => void
  removeCalendarDate: (date: string) => void
  upsertFixedDate: (input: FixedDateInput) => void
  removeFixedDate: (date: string) => void
  pickCity: (date: string, cityId: string, pick?: SlotPick) => void
  setSlotVenue: (date: string, venueId: string | null) => void
  toggleSlotBand: (date: string, bandId: string) => void
  skipSlot: (date: string) => void
  /** Clears the pick so the slot shows suggestions again ("Trocar" / "Preencher"). */
  unlockSlot: (date: string) => void
  removeSlot: (date: string) => void
  /** Pre-fills the first empty slot with the start city ("Partida"). */
  applyStartCityDefault: () => void
  reset: () => void
}

export type WizardStore = WizardState & WizardActions

function rebuildSlots(state: WizardState): WizardSlot[] {
  return buildSlots({
    generated: generatedDates(state),
    fixed: state.fixedDates,
    removed: state.removedDates,
    previous: state.slots,
  })
}

function updateSlot(slots: WizardSlot[], date: string, update: (slot: WizardSlot) => WizardSlot): WizardSlot[] {
  return slots.map((slot) => (slot.date === date ? update(slot) : slot))
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export const useTourWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      ...initialWizardState,

      setStep: (step) => set({ step: clampStep(step) }),

      setFields: (patch) => set(patch),

      setDateInputs: (patch) =>
        set((state) => {
          const sanitized: Partial<DateInputs> = { ...patch }
          if (sanitized.weeks !== undefined) sanitized.weeks = clamp(sanitized.weeks, MIN_WEEKS, MAX_WEEKS)
          if (sanitized.count !== undefined) sanitized.count = clamp(sanitized.count, MIN_COUNT, MAX_COUNT)
          const next: WizardState = { ...state, ...sanitized }
          return { ...sanitized, slots: rebuildSlots(next) }
        }),

      toggleWeekday: (weekday) =>
        set((state) => {
          const weekdays = state.weekdays.includes(weekday)
            ? state.weekdays.filter((d) => d !== weekday)
            : [...state.weekdays, weekday].sort((a, b) => a - b)
          return { weekdays, slots: rebuildSlots({ ...state, weekdays }) }
        }),

      addCalendarDate: (date) =>
        set((state) => {
          if (!isIsoDate(date)) return {}
          const calendarDates = uniqueSortedDates([...state.calendarDates, date])
          const removedDates = state.removedDates.filter((d) => d !== date)
          return { calendarDates, removedDates, slots: rebuildSlots({ ...state, calendarDates, removedDates }) }
        }),

      removeCalendarDate: (date) =>
        set((state) => {
          const calendarDates = state.calendarDates.filter((d) => d !== date)
          return { calendarDates, slots: rebuildSlots({ ...state, calendarDates }) }
        }),

      upsertFixedDate: (input) =>
        set((state) => {
          if (!isIsoDate(input.date)) return {}
          const fixedDates = [...state.fixedDates.filter((f) => f.date !== input.date), input].sort((a, b) =>
            a.date.localeCompare(b.date),
          )
          const removedDates = state.removedDates.filter((d) => d !== input.date)
          return { fixedDates, removedDates, slots: rebuildSlots({ ...state, fixedDates, removedDates }) }
        }),

      removeFixedDate: (date) =>
        set((state) => {
          const fixedDates = state.fixedDates.filter((f) => f.date !== date)
          return { fixedDates, slots: rebuildSlots({ ...state, fixedDates }) }
        }),

      pickCity: (date, cityId, pick) =>
        set((state) => ({
          slots: updateSlot(state.slots, date, (slot) => ({
            ...slot,
            cityId,
            venueId: pick?.venueId ?? null,
            bandIds: pick?.bandIds ? [...pick.bandIds] : [],
            skipped: false,
          })),
        })),

      setSlotVenue: (date, venueId) =>
        set((state) => ({ slots: updateSlot(state.slots, date, (slot) => ({ ...slot, venueId })) })),

      toggleSlotBand: (date, bandId) =>
        set((state) => ({
          slots: updateSlot(state.slots, date, (slot) => ({
            ...slot,
            bandIds: slot.bandIds.includes(bandId) ? slot.bandIds.filter((id) => id !== bandId) : [...slot.bandIds, bandId],
          })),
        })),

      skipSlot: (date) =>
        set((state) => ({
          slots: updateSlot(state.slots, date, (slot) =>
            slot.fixed ? slot : { ...slot, cityId: null, venueId: null, bandIds: [], skipped: true },
          ),
        })),

      unlockSlot: (date) =>
        set((state) => ({
          slots: updateSlot(state.slots, date, (slot) =>
            slot.fixed ? slot : { ...slot, cityId: null, venueId: null, bandIds: [], skipped: false },
          ),
        })),

      removeSlot: (date) =>
        set((state) => {
          const calendarDates = state.calendarDates.filter((d) => d !== date)
          const fixedDates = state.fixedDates.filter((f) => f.date !== date)
          const removedDates = state.removedDates.includes(date) ? state.removedDates : [...state.removedDates, date]
          return {
            calendarDates,
            fixedDates,
            removedDates,
            slots: rebuildSlots({ ...state, calendarDates, fixedDates, removedDates }),
          }
        }),

      applyStartCityDefault: () => set((state) => ({ slots: applyStartCity(state.slots, state.startCityId) })),

      reset: () => set({ ...initialWizardState, states: [...PILOT_STATES] }),
    }),
    {
      name: 'tour-wizard',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
