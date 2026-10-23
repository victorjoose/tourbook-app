import type { DealType, TourDateStatus } from './firestore'

export const GENRES = [
  'rock',
  'punk',
  'hardcore',
  'metal',
  'indie',
  'emo',
  'post-punk',
  'ska',
  'stoner',
  'grunge',
  'alternativo',
  'crossover',
  'metalcore',
  'garage',
  'psicodelico',
] as const

export type Genre = (typeof GENRES)[number]

export const GENRE_LABELS: Record<Genre, string> = {
  rock: 'Rock',
  punk: 'Punk',
  hardcore: 'Hardcore',
  metal: 'Metal',
  indie: 'Indie',
  emo: 'Emo',
  'post-punk': 'Post-punk',
  ska: 'Ska',
  stoner: 'Stoner',
  grunge: 'Grunge',
  alternativo: 'Alternativo',
  crossover: 'Crossover',
  metalcore: 'Metalcore',
  garage: 'Garage',
  psicodelico: 'Psicodélico',
}

export function genreLabel(genre: string): string {
  return (GENRE_LABELS as Record<string, string>)[genre] ?? genre
}

export const TOUR_DATE_STATUSES: readonly TourDateStatus[] = [
  'ideia',
  'contato_feito',
  'negociando',
  'confirmado',
  'realizado',
  'cancelado',
]

export const TOUR_DATE_STATUS_LABELS: Record<TourDateStatus, string> = {
  ideia: 'Ideia',
  contato_feito: 'Contato feito',
  negociando: 'Em negociação',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

/** Classes Tailwind para o selo de status (fundo + texto). */
export const TOUR_DATE_STATUS_COLORS: Record<TourDateStatus, string> = {
  ideia: 'bg-zinc-700 text-zinc-100',
  contato_feito: 'bg-sky-900 text-sky-100',
  negociando: 'bg-amber-900 text-amber-100',
  confirmado: 'bg-emerald-900 text-emerald-100',
  realizado: 'bg-emerald-700 text-emerald-50',
  cancelado: 'bg-red-900 text-red-100',
}

export const DEAL_TYPES: readonly DealType[] = ['cache_fixo', 'bilheteria', 'porta', 'misto']

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  cache_fixo: 'Cachê fixo',
  bilheteria: 'Bilheteria',
  porta: 'Porta',
  misto: 'Misto',
}

/** 0 = domingo … 6 = sábado (mesma convenção de Date#getDay e de venues.show_days). */
export const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const
export const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export const PILOT_STATES = ['SC', 'PR', 'SP'] as const

export const STATE_NAMES: Record<string, string> = {
  SC: 'Santa Catarina',
  PR: 'Paraná',
  SP: 'São Paulo',
}

export const DEFAULT_MAX_KM_PER_DAY = 400
/** Estimativa: estrada ≈ linha reta × 1,3. */
export const ROAD_FACTOR = 1.3
export const AVG_SPEED_KMH = 70

export const DEFAULT_CHECKLIST: readonly string[] = [
  'Contrato ou acordo fechado',
  'Rider técnico enviado',
  'Divulgação combinada',
  'Hospedagem resolvida',
]
