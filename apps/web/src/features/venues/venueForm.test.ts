import { describe, expect, it } from 'vitest'
import {
  EMPTY_VENUE_FORM,
  LOCATION_ERROR,
  SHOW_DAY_OPTIONS,
  VENUE_FORM_FIELDS,
  errorCount,
  firstErrorField,
  formatCoordinate,
  formatTimestampPt,
  gearLabel,
  initialsOf,
  mapIssuesToErrors,
  markerFromText,
  normalizeWebsite,
  parseCapacity,
  parseDecimal,
  ptIssueMessage,
  toSubmissionInput,
  toggleInList,
  validateVenueForm,
  type VenueFormState,
} from './venueForm'

const filled: VenueFormState = {
  ...EMPTY_VENUE_FORM,
  name: '  Porão 77 ',
  cityId: 'joinville-sc',
  lat: '-26,30',
  lng: '-48.85',
  address: 'Rua XV, 77',
  capacity: '1.200',
  genres: ['punk', 'hardcore'],
  showDays: [5, 6],
  dealTypes: ['porta', 'misto'],
  hasPa: true,
  contactName: 'Zé',
  contactPhone: '(47) 99999-0000',
  contactEmail: 'porao@example.com',
  instagram: '@porao77',
  website: 'porao77.com.br',
  notes: 'Entrada pelos fundos.',
}

describe('parseDecimal', () => {
  it('accepts comma and dot decimals, with spaces around', () => {
    expect(parseDecimal('-26,30')).toBe(-26.3)
    expect(parseDecimal(' -48.85 ')).toBe(-48.85)
    expect(parseDecimal('10')).toBe(10)
  })
  it('rejects empty and malformed text', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('12.')).toBeNull()
    expect(parseDecimal('1,2,3')).toBeNull()
  })
})

describe('parseCapacity', () => {
  it('returns null when empty and an integer otherwise', () => {
    expect(parseCapacity('')).toBeNull()
    expect(parseCapacity('   ')).toBeNull()
    expect(parseCapacity('300')).toBe(300)
    expect(parseCapacity('1.200')).toBe(1200)
    expect(parseCapacity('1 200')).toBe(1200)
  })
  it('returns NaN for text the schema must flag', () => {
    expect(parseCapacity('muita gente')).toBeNaN()
    expect(parseCapacity('1,5')).toBeNaN()
  })
})

describe('normalizeWebsite', () => {
  it('adds https:// only when the scheme is missing', () => {
    expect(normalizeWebsite('')).toBe('')
    expect(normalizeWebsite('porao77.com.br')).toBe('https://porao77.com.br')
    expect(normalizeWebsite(' http://porao77.com.br ')).toBe('http://porao77.com.br')
    expect(normalizeWebsite('HTTPS://x.com')).toBe('HTTPS://x.com')
  })
})

describe('formatCoordinate / markerFromText', () => {
  it('keeps up to 6 decimals without trailing zeros', () => {
    expect(formatCoordinate(-26.3000004)).toBe('-26.3')
    expect(formatCoordinate(-48.123456789)).toBe('-48.123457')
    expect(formatCoordinate(0)).toBe('0')
  })
  it('builds a marker only from a valid pair in range', () => {
    expect(markerFromText('-26,3', '-48.85')).toEqual({ lat: -26.3, lng: -48.85 })
    expect(markerFromText('', '-48.85')).toBeNull()
    expect(markerFromText('x', '-48.85')).toBeNull()
    expect(markerFromText('95', '-48.85')).toBeNull()
    expect(markerFromText('-26.3', '-181')).toBeNull()
  })
})

describe('toggleInList', () => {
  it('adds when absent and removes when present, without mutating', () => {
    const base = [1, 2]
    expect(toggleInList(base, 3)).toEqual([1, 2, 3])
    expect(toggleInList(base, 1)).toEqual([2])
    expect(base).toEqual([1, 2])
  })
})

describe('toSubmissionInput', () => {
  it('converts text fields to the numbers the schema expects', () => {
    const input = toSubmissionInput(filled)
    expect(input.lat).toBe(-26.3)
    expect(input.lng).toBe(-48.85)
    expect(input.capacity).toBe(1200)
    expect(input.website).toBe('https://porao77.com.br')
    expect(input.genres).toEqual(['punk', 'hardcore'])
  })
  it('uses NaN for missing coordinates so validation fails loudly', () => {
    const input = toSubmissionInput(EMPTY_VENUE_FORM)
    expect(input.lat).toBeNaN()
    expect(input.lng).toBeNaN()
    expect(input.capacity).toBeNull()
  })
})

describe('validateVenueForm', () => {
  it('returns trimmed, normalized values for a filled form', () => {
    const result = validateVenueForm(filled)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.name).toBe('Porão 77')
    expect(result.values.cityId).toBe('joinville-sc')
    expect(result.values.lat).toBe(-26.3)
    expect(result.values.lng).toBe(-48.85)
    expect(result.values.capacity).toBe(1200)
    expect(result.values.showDays).toEqual([5, 6])
    expect(result.values.dealTypes).toEqual(['porta', 'misto'])
    expect(result.values.hasPa).toBe(true)
    expect(result.values.hasBackline).toBe(false)
    expect(result.values.acceptsTouringBands).toBe(true)
    expect(result.values.website).toBe('https://porao77.com.br')
    expect(result.values.instagram).toBe('@porao77')
    expect(result.values.contactEmail).toBe('porao@example.com')
  })

  it('turns empty optional text into null', () => {
    const result = validateVenueForm({ ...filled, address: '', contactName: '', contactPhone: '', contactEmail: '', instagram: '', website: '', notes: '', capacity: '' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.address).toBeNull()
    expect(result.values.contactName).toBeNull()
    expect(result.values.contactPhone).toBeNull()
    expect(result.values.contactEmail).toBeNull()
    expect(result.values.instagram).toBeNull()
    expect(result.values.website).toBeNull()
    expect(result.values.notes).toBeNull()
    expect(result.values.capacity).toBeNull()
  })

  it('reports the required fields in pt-BR for an empty form', () => {
    const result = validateVenueForm(EMPTY_VENUE_FORM)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.name).toBe('Informe o nome da casa')
    expect(result.errors.cityId).toBe('Escolha a cidade')
    expect(result.errors.lat).toBe(LOCATION_ERROR)
    expect(result.errors.lng).toBe(LOCATION_ERROR)
    expect(result.errors.contactEmail).toBeUndefined()
    expect(firstErrorField(result.errors)).toBe('name')
    expect(errorCount(result.errors)).toBe(4)
  })

  it('keeps the schema messages for contacts and links', () => {
    const result = validateVenueForm({ ...filled, contactPhone: '12', contactEmail: 'nope', website: 'https://' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.contactPhone).toBe('Telefone inválido')
    expect(result.errors.contactEmail).toBe('E-mail inválido')
    expect(result.errors.website).toBe('Link inválido')
  })

  it('translates capacity and coordinate limits', () => {
    const tooSmall = validateVenueForm({ ...filled, capacity: '0' })
    const tooBig = validateVenueForm({ ...filled, capacity: '500000' })
    const text = validateVenueForm({ ...filled, capacity: 'lotado' })
    const outOfRange = validateVenueForm({ ...filled, lat: '95' })
    expect(!tooSmall.ok && tooSmall.errors.capacity).toBe('Capacidade mínima: 1 pessoa')
    expect(!tooBig.ok && tooBig.errors.capacity).toBe('Capacidade máxima: 100.000 pessoas')
    expect(!text.ok && text.errors.capacity).toBe('Capacidade inválida: use um número inteiro')
    expect(!outOfRange.ok && outOfRange.errors.lat).toBe(LOCATION_ERROR)
    expect(!outOfRange.ok && firstErrorField(outOfRange.errors)).toBe('lat')
  })

  it('translates zod default messages (max length) to pt-BR', () => {
    const result = validateVenueForm({ ...filled, name: 'a'.repeat(121), address: 'b'.repeat(501) })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.name).toBe('Nome: máximo de 120 caracteres')
    expect(result.errors.address).toBe('Máximo de 500 caracteres')
  })

  it('points a longitude-only error to the location block', () => {
    const result = validateVenueForm({ ...filled, lng: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.lat).toBeUndefined()
    expect(result.errors.lng).toBe(LOCATION_ERROR)
    expect(firstErrorField(result.errors)).toBe('lat')
  })
})

describe('ptIssueMessage / mapIssuesToErrors', () => {
  it('falls back to a generic label for unknown codes and fields', () => {
    expect(ptIssueMessage({ code: 'custom', path: ['notes'] })).toBe('Observações: valor inválido')
    expect(ptIssueMessage({ code: 'invalid_format', path: ['instagram'] })).toBe('Instagram: formato inválido')
    expect(ptIssueMessage({ code: 'too_small', path: ['address'], origin: 'string' })).toBe('Endereço: preencha este campo')
    expect(ptIssueMessage({ code: 'too_big', path: ['showDays'], origin: 'array', maximum: 7 })).toBe('Dias de show: valor acima do permitido')
    expect(ptIssueMessage({ code: 'custom', path: [] })).toBe('Campo: valor inválido')
    expect(ptIssueMessage({})).toBe('Campo: valor inválido')
  })
  it('keeps the first message per field and sends unknown paths to form', () => {
    const errors = mapIssuesToErrors([
      { path: ['name'], message: 'primeiro' },
      { path: ['name'], message: 'segundo' },
      { path: ['genres', 0], message: 'gênero' },
      { path: [], message: 'geral' },
      { path: ['naoExiste'], message: 'estranho' },
    ])
    expect(errors).toEqual({ name: 'primeiro', genres: 'gênero', form: 'geral' })
  })
})

describe('display helpers', () => {
  it('lists every form field once, in form order', () => {
    expect(VENUE_FORM_FIELDS[0]).toBe('name')
    expect(new Set(VENUE_FORM_FIELDS).size).toBe(VENUE_FORM_FIELDS.length)
    expect(VENUE_FORM_FIELDS).toEqual(Object.keys(EMPTY_VENUE_FORM))
  })
  it('offers the seven weekdays from Dom to Sáb', () => {
    expect(SHOW_DAY_OPTIONS.map((o) => o.value)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(SHOW_DAY_OPTIONS[0]?.label).toBe('Dom')
    expect(SHOW_DAY_OPTIONS[6]?.label).toBe('Sáb')
  })
  it('formats timestamps and gear', () => {
    expect(formatTimestampPt('2026-10-23T15:04:05.000Z')).toMatch(/^\d{2}\/\d{2}\/2026$/)
    expect(formatTimestampPt('nope')).toBe('')
    expect(gearLabel({ hasPa: true, hasBackline: true })).toBe('PA + Backline')
    expect(gearLabel({ hasPa: false, hasBackline: true })).toBe('Backline')
    expect(gearLabel({ hasPa: false, hasBackline: false })).toBe('Não informado')
  })
  it('builds initials', () => {
    expect(initialsOf('José Victor Oliveira')).toBe('JO')
    expect(initialsOf('zé')).toBe('Z')
    expect(initialsOf('   ')).toBe('?')
    expect(initialsOf(null, 'TA')).toBe('TA')
  })
})
