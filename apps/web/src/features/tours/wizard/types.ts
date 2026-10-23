export type DateMode = 'weeks' | 'count' | 'calendar'

/** A tour date inside the wizard, with the user's picks for it. */
export type WizardSlot = {
  /** ISO YYYY-MM-DD */
  date: string
  cityId: string | null
  venueId: string | null
  bandIds: string[]
  /** Entered by the user as a closed date (city known beforehand). */
  fixed: boolean
  /** The user chose to leave this date without a city. */
  skipped: boolean
}

/** A closed date entered in "Já tenho datas fechadas". */
export type FixedDateInput = { date: string; cityId: string; venueId: string | null }

export type DateInputs = {
  dateMode: DateMode
  startDate: string
  /** 0 = domingo … 6 = sábado */
  weekdays: number[]
  weeks: number
  count: number
  calendarDates: string[]
  fixedDates: FixedDateInput[]
  /** Generated dates the user removed by hand; they stay out when slots are rebuilt. */
  removedDates: string[]
}

export type TourFields = {
  name: string
  bandName: string
  bandId: string | null
  genres: string[]
  startCityId: string | null
  endCityId: string | null
  /** End city = start city. */
  returnHome: boolean
  maxKmPerDay: number
  capacityMin: number | null
  capacityMax: number | null
  allowOffDays: boolean
  states: string[]
}

export type WizardFields = TourFields & DateInputs

export type WizardState = WizardFields & {
  /** 0-based index into STEPS. */
  step: number
  slots: WizardSlot[]
}
