import { addDays, differenceInCalendarDays, format, getDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { WEEKDAYS_PT, WEEKDAY_SHORT_PT } from './constants'

/** YYYY-MM-DD → Date local (sem problema de fuso). */
export function parseIsoDate(iso: string): Date {
  return parseISO(iso)
}

export function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(iso: string): number {
  return getDay(parseIsoDate(iso))
}

export function weekdayLabel(iso: string, style: 'short' | 'long' = 'long'): string {
  const d = weekdayOf(iso)
  return style === 'short' ? WEEKDAY_SHORT_PT[d]! : WEEKDAYS_PT[d]!
}

/**
 * short → "sex, 06/03"; long → "sexta-feira, 6 de março de 2026"; numeric → "06/03/2026".
 */
export function formatDatePt(iso: string, style: 'short' | 'long' | 'numeric' = 'short'): string {
  const d = parseIsoDate(iso)
  if (style === 'long') return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  if (style === 'numeric') return format(d, 'dd/MM/yyyy')
  return format(d, 'EEE, dd/MM', { locale: ptBR }).replace('.', '')
}

export function formatPeriodPt(startIso: string, endIso: string): string {
  const s = parseIsoDate(startIso)
  const e = parseIsoDate(endIso)
  if (startIso === endIso) return format(s, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  if (format(s, 'yyyy-MM') === format(e, 'yyyy-MM')) {
    return `${format(s, 'd')} a ${format(e, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
  }
  return `${format(s, "d 'de' MMM", { locale: ptBR })} a ${format(e, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
}

export function addDaysIso(iso: string, n: number): string {
  return toIsoDate(addDays(parseIsoDate(iso), n))
}

/** b − a em dias de calendário. */
export function diffDays(a: string, b: string): number {
  return differenceInCalendarDays(parseIsoDate(b), parseIsoDate(a))
}

export function sortIso(dates: string[]): string[] {
  return [...dates].sort()
}

export type GenerateSlotsOptions = {
  /** Primeira data possível (inclusive), YYYY-MM-DD. */
  startDate: string
  /** Dias da semana desejados, 0 = domingo … 6 = sábado. */
  weekdays: number[]
  /** Quantas semanas a partir da semana de startDate. */
  weeks: number
}

/**
 * Gera as datas nos dias da semana escolhidos ao longo de N semanas.
 * Ex.: startDate 2026-03-06 (sexta), weekdays [5,6,0], weeks 4 → 12 datas.
 * A semana conta a partir de startDate: a primeira semana cobre startDate…startDate+6.
 */
export function generateSlots(opts: GenerateSlotsOptions): string[] {
  const wanted = new Set(opts.weekdays)
  if (wanted.size === 0 || opts.weeks <= 0) return []
  const out: string[] = []
  const totalDays = opts.weeks * 7
  for (let i = 0; i < totalDays; i++) {
    const iso = addDaysIso(opts.startDate, i)
    if (wanted.has(weekdayOf(iso))) out.push(iso)
  }
  return out
}

/** Mesma ideia, mas para um número exato de datas (ex.: "quero 10 datas"). */
export function generateSlotsByCount(opts: { startDate: string; weekdays: number[]; count: number }): string[] {
  const wanted = new Set(opts.weekdays)
  if (wanted.size === 0 || opts.count <= 0) return []
  const out: string[] = []
  // Limite de segurança: 2 anos.
  for (let i = 0; i < 730 && out.length < opts.count; i++) {
    const iso = addDaysIso(opts.startDate, i)
    if (wanted.has(weekdayOf(iso))) out.push(iso)
  }
  return out
}

/** "HH:MM:SS" ou "HH:MM" → "HH:MM"; null → "". */
export function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}
