import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  diffDays,
  formatDatePt,
  formatPeriodPt,
  formatTime,
  generateSlots,
  generateSlotsByCount,
  sortIso,
  weekdayLabel,
  weekdayOf,
} from './dates'

describe('dates', () => {
  it('weekdayOf uses 0 = Sunday … 6 = Saturday without timezone drift', () => {
    expect(weekdayOf('2026-03-06')).toBe(5)
    expect(weekdayOf('2026-03-07')).toBe(6)
    expect(weekdayOf('2026-03-08')).toBe(0)
    expect(weekdayOf('2026-01-01')).toBe(4)
    expect(weekdayLabel('2026-03-06')).toBe('Sexta')
    expect(weekdayLabel('2026-03-06', 'short')).toBe('Sex')
  })

  it('generateSlots for Fri/Sat/Sun over 4 weeks from 2026-03-06 returns 12 dates', () => {
    const slots = generateSlots({ startDate: '2026-03-06', weekdays: [5, 6, 0], weeks: 4 })
    expect(slots).toHaveLength(12)
    expect(slots[0]).toBe('2026-03-06')
    expect(slots.slice(0, 3)).toEqual(['2026-03-06', '2026-03-07', '2026-03-08'])
    expect(slots.at(-1)).toBe('2026-03-29')
    expect(slots).toEqual(sortIso(slots))
    for (const iso of slots) expect([5, 6, 0]).toContain(weekdayOf(iso))
  })

  it('generateSlots skips days before the first wanted weekday and handles empty input', () => {
    // Starting on a Wednesday, the first Friday is 2026-03-06.
    const slots = generateSlots({ startDate: '2026-03-04', weekdays: [5], weeks: 2 })
    expect(slots).toEqual(['2026-03-06', '2026-03-13'])
    expect(generateSlots({ startDate: '2026-03-04', weekdays: [], weeks: 2 })).toEqual([])
    expect(generateSlots({ startDate: '2026-03-04', weekdays: [5], weeks: 0 })).toEqual([])
  })

  it('generateSlotsByCount returns exactly N dates', () => {
    const slots = generateSlotsByCount({ startDate: '2026-03-06', weekdays: [5, 6], count: 5 })
    expect(slots).toEqual(['2026-03-06', '2026-03-07', '2026-03-13', '2026-03-14', '2026-03-20'])
    expect(generateSlotsByCount({ startDate: '2026-03-06', weekdays: [5], count: 0 })).toEqual([])
  })

  it('addDaysIso and diffDays work across month boundaries', () => {
    expect(addDaysIso('2026-03-06', 1)).toBe('2026-03-07')
    expect(addDaysIso('2026-03-30', 3)).toBe('2026-04-02')
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-03-06', '2026-03-09')).toBe(3)
    expect(diffDays('2026-03-09', '2026-03-06')).toBe(-3)
    expect(diffDays('2026-02-27', '2026-03-02')).toBe(3)
  })

  it('formats dates and periods in pt-BR', () => {
    // date-fns ptBR abbreviates the weekday as "sexta"; SPEC shows "sex". Accept both.
    expect(formatDatePt('2026-03-06')).toMatch(/^sex(ta)?, 06\/03$/)
    expect(formatDatePt('2026-03-06', 'numeric')).toBe('06/03/2026')
    expect(formatDatePt('2026-03-06', 'long')).toBe('sexta-feira, 6 de março de 2026')
    expect(formatPeriodPt('2026-03-06', '2026-03-06')).toBe('6 de março de 2026')
    expect(formatPeriodPt('2026-03-06', '2026-03-29')).toBe('6 a 29 de março de 2026')
    expect(formatPeriodPt('2026-03-27', '2026-04-05')).toBe('27 de mar a 5 de abr de 2026')
  })

  it('formatTime trims seconds', () => {
    expect(formatTime('21:30:00')).toBe('21:30')
    expect(formatTime('21:30')).toBe('21:30')
    expect(formatTime(null)).toBe('')
    expect(formatTime(undefined)).toBe('')
  })
})
