import { z } from 'zod'
import { DEAL_TYPES, GENRES, MAX_KM_PER_DAY, MIN_KM_PER_DAY, TOUR_DATE_STATUSES } from './constants'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')

const optionalText = z
  .string()
  .trim()
  .max(500, 'Máximo de 500 caracteres')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : null))

const phone = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]{8,20}$/, 'Telefone inválido')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : null))

const email = z
  .string()
  .trim()
  .email('E-mail inválido')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : null))

const url = z
  .string()
  .trim()
  .url('Link inválido')
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : null))

const genresField = z.array(z.enum(GENRES)).default([])

export const tourFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Dê um nome à turnê').max(80),
    bandName: z.string().trim().min(1, 'Informe a banda').max(80),
    bandId: z.string().min(1).nullable().default(null),
    genres: genresField,
    startCityId: z.string().min(1, 'Escolha a cidade de partida'),
    endCityId: z.string().min(1).nullable().default(null),
    maxKmPerDay: z
      .number()
      .int()
      .min(MIN_KM_PER_DAY, `Mínimo ${MIN_KM_PER_DAY} km`)
      .max(MAX_KM_PER_DAY, `Máximo ${MAX_KM_PER_DAY} km`)
      .default(400),
    allowOffDays: z.boolean().default(true),
    capacityMin: z.number().int().min(0).nullable().default(null),
    capacityMax: z.number().int().min(0).nullable().default(null),
    notes: optionalText,
  })
  .refine((v) => v.capacityMin == null || v.capacityMax == null || v.capacityMin <= v.capacityMax, {
    message: 'Capacidade mínima maior que a máxima',
    path: ['capacityMax'],
  })

export type TourFormInput = z.input<typeof tourFormSchema>
export type TourFormValues = z.output<typeof tourFormSchema>

export const tourDateFormSchema = z.object({
  date: isoDate,
  cityId: z.string().min(1).nullable().default(null),
  venueId: z.string().min(1).nullable().default(null),
  producerId: z.string().min(1).nullable().default(null),
  status: z.enum(TOUR_DATE_STATUSES as [string, ...string[]]).default('ideia'),
  isFixed: z.boolean().default(false),
  loadInTime: z.string().nullable().default(null),
  soundcheckTime: z.string().nullable().default(null),
  doorsTime: z.string().nullable().default(null),
  setTime: z.string().nullable().default(null),
  dealType: z.enum(DEAL_TYPES as [string, ...string[]]).nullable().default(null),
  feeCents: z.number().int().min(0).nullable().default(null),
  costCents: z.number().int().min(0).nullable().default(null),
  lodging: optionalText,
  notes: optionalText,
})

export type TourDateFormValues = z.output<typeof tourDateFormSchema>

export const venueSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da casa').max(120),
  cityId: z.string().min(1, 'Escolha a cidade'),
  address: optionalText,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capacity: z.number().int().min(1).max(100000).nullable().default(null),
  genres: genresField,
  showDays: z.array(z.number().int().min(0).max(6)).default([]),
  dealTypes: z.array(z.enum(DEAL_TYPES as [string, ...string[]])).default([]),
  hasPa: z.boolean().default(false),
  hasBackline: z.boolean().default(false),
  acceptsTouringBands: z.boolean().default(true),
  contactName: optionalText,
  contactPhone: phone,
  contactEmail: email,
  instagram: optionalText,
  website: url,
  notes: optionalText,
})

export type VenueSubmissionValues = z.output<typeof venueSubmissionSchema>

export const bandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cityId: z.string().min(1).nullable().default(null),
  genres: genresField,
  links: z
    .object({
      spotify: url,
      instagram: url,
      youtube: url,
      bandcamp: url,
    })
    .partial()
    .default({}),
  contactName: optionalText,
  contactPhone: phone,
  contactEmail: email,
  opensForTouring: z.boolean().default(true),
  notes: optionalText,
})

export type BandValues = z.output<typeof bandSchema>

export const producerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cityId: z.string().min(1).nullable().default(null),
  cityIds: z.array(z.string().min(1)).default([]),
  genres: genresField,
  contactName: optionalText,
  contactPhone: phone,
  contactEmail: email,
  instagram: optionalText,
  website: url,
  notes: optionalText,
})

export type ProducerValues = z.output<typeof producerSchema>
