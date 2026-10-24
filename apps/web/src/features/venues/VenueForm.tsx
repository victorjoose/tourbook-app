import type { City, VenueSubmissionValues } from '@tour/core'
import { AlertCircle, Send } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { SectionTitle } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { Checkbox, Input, Textarea } from '../../components/ui/Input'
import { CitySelect } from './CitySelect'
import { LocationPicker } from './LocationPicker'
import {
  DEAL_TYPE_OPTIONS,
  EMPTY_VENUE_FORM,
  GENRE_OPTIONS,
  SHOW_DAY_OPTIONS,
  errorCount,
  firstErrorField,
  toggleInList,
  validateVenueForm,
  type VenueFormErrors,
  type VenueFormField,
  type VenueFormState,
} from './venueForm'

export type VenueFormProps = {
  cities: readonly City[]
  onSubmit: (values: VenueSubmissionValues) => void
  submitting?: boolean
  submitError?: string | null
}

/** Chips under a label, same spacing as <Field>. */
function ChipGroup({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div id={id} tabIndex={-1} role="group" aria-labelledby={`${id}-label`} className="space-y-1.5 outline-none">
      <p id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Controlled venue submission form. Validates with `venueSubmissionSchema` on
 * submit and shows one pt-BR message per field; the parent runs the mutation.
 */
export function VenueForm({ cities, onSubmit, submitting = false, submitError = null }: VenueFormProps) {
  const formId = useId()
  const [state, setState] = useState<VenueFormState>(EMPTY_VENUE_FORM)
  const [errors, setErrors] = useState<VenueFormErrors>({})
  const city = useMemo(() => cities.find((c) => c.id === state.cityId) ?? null, [cities, state.cityId])

  const fieldId = (field: VenueFormField) => `${formId}-${field}`

  function clearErrors(...fields: VenueFormField[]) {
    setErrors((prev) => {
      const touched = fields.filter((f) => prev[f] !== undefined)
      if (touched.length === 0 && prev.form === undefined) return prev
      const next = { ...prev }
      for (const f of touched) delete next[f]
      delete next.form
      return next
    })
  }

  function update<K extends VenueFormField>(field: K, value: VenueFormState[K]) {
    setState((prev) => ({ ...prev, [field]: value }))
    clearErrors(field)
  }

  function setLocation(coords: { lat: string; lng: string }) {
    setState((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
    clearErrors('lat', 'lng')
  }

  function scrollToField(field: VenueFormField) {
    const el = document.getElementById(fieldId(field))
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    const result = validateVenueForm(state)
    if (!result.ok) {
      setErrors(result.errors)
      const first = firstErrorField(result.errors)
      if (first) scrollToField(first)
      return
    }
    setErrors({})
    onSubmit(result.values)
  }

  const pendingErrors = errorCount(errors)

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-8" aria-busy={submitting}>
      <section className="space-y-4">
        <SectionTitle>A casa</SectionTitle>
        <Input
          id={fieldId('name')}
          label="Nome da casa"
          placeholder="Ex.: Porão 77"
          value={state.name}
          maxLength={120}
          autoComplete="organization"
          disabled={submitting}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
        />
        <CitySelect
          id={fieldId('cityId')}
          cities={cities}
          value={state.cityId || null}
          disabled={submitting}
          onChange={(c) => update('cityId', c?.id ?? '')}
          error={errors.cityId}
          hint="Só cidades de SC, PR e SP por enquanto."
        />
        <Input
          id={fieldId('address')}
          label="Endereço"
          placeholder="Rua, número e bairro"
          value={state.address}
          maxLength={500}
          autoComplete="street-address"
          disabled={submitting}
          onChange={(e) => update('address', e.target.value)}
          error={errors.address}
          hint="Opcional, mas ajuda a banda a chegar."
        />
        <Input
          id={fieldId('capacity')}
          label="Capacidade (pessoas)"
          inputMode="numeric"
          placeholder="Ex.: 300"
          value={state.capacity}
          disabled={submitting}
          onChange={(e) => update('capacity', e.target.value)}
          error={errors.capacity}
        />
      </section>

      <section id={fieldId('lat')} tabIndex={-1} className="space-y-3 outline-none">
        <SectionTitle>Localização</SectionTitle>
        <LocationPicker
          city={city}
          lat={state.lat}
          lng={state.lng}
          disabled={submitting}
          onChange={setLocation}
          error={errors.lat ?? errors.lng}
          lngInputId={fieldId('lng')}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Perfil da casa</SectionTitle>
        <ChipGroup id={fieldId('genres')} label="Gêneros que a casa recebe" error={errors.genres} hint="Marque quantos quiser.">
          {GENRE_OPTIONS.map((g) => (
            <Chip
              key={g.value}
              active={state.genres.includes(g.value)}
              disabled={submitting}
              onClick={() => update('genres', toggleInList(state.genres, g.value))}
            >
              {g.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup id={fieldId('showDays')} label="Dias em que costuma ter show" error={errors.showDays}>
          {SHOW_DAY_OPTIONS.map((d) => (
            <Chip
              key={d.value}
              active={state.showDays.includes(d.value)}
              disabled={submitting}
              onClick={() => update('showDays', toggleInList(state.showDays, d.value))}
            >
              {d.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup id={fieldId('dealTypes')} label="Como a casa costuma fechar" error={errors.dealTypes}>
          {DEAL_TYPE_OPTIONS.map((d) => (
            <Chip
              key={d.value}
              active={state.dealTypes.includes(d.value)}
              disabled={submitting}
              onClick={() => update('dealTypes', toggleInList(state.dealTypes, d.value))}
            >
              {d.label}
            </Chip>
          ))}
        </ChipGroup>
      </section>

      <section className="space-y-3">
        <SectionTitle>Estrutura</SectionTitle>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-6">
          <Checkbox
            id={fieldId('hasPa')}
            label="Tem PA (som da casa)"
            checked={state.hasPa}
            disabled={submitting}
            onChange={(e) => update('hasPa', e.target.checked)}
          />
          <Checkbox
            id={fieldId('hasBackline')}
            label="Tem backline (bateria, amplificadores)"
            checked={state.hasBackline}
            disabled={submitting}
            onChange={(e) => update('hasBackline', e.target.checked)}
          />
          <Checkbox
            id={fieldId('acceptsTouringBands')}
            label="Aceita bandas de fora da cidade"
            checked={state.acceptsTouringBands}
            disabled={submitting}
            onChange={(e) => update('acceptsTouringBands', e.target.checked)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Contato</SectionTitle>
        <p className="text-xs text-ink-muted">
          Os contatos ficam visíveis para quem está logado no app, só para marcar shows.
        </p>
        <Input
          id={fieldId('contactName')}
          label="Nome do contato"
          placeholder="Quem fecha os shows"
          value={state.contactName}
          maxLength={500}
          autoComplete="name"
          disabled={submitting}
          onChange={(e) => update('contactName', e.target.value)}
          error={errors.contactName}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id={fieldId('contactPhone')}
            label="Telefone / WhatsApp"
            type="tel"
            inputMode="tel"
            placeholder="(47) 99999-0000"
            value={state.contactPhone}
            autoComplete="tel"
            disabled={submitting}
            onChange={(e) => update('contactPhone', e.target.value)}
            error={errors.contactPhone}
          />
          <Input
            id={fieldId('contactEmail')}
            label="E-mail"
            type="email"
            inputMode="email"
            placeholder="contato@casa.com.br"
            value={state.contactEmail}
            autoComplete="email"
            disabled={submitting}
            onChange={(e) => update('contactEmail', e.target.value)}
            error={errors.contactEmail}
          />
          <Input
            id={fieldId('instagram')}
            label="Instagram"
            placeholder="@casa ou link do perfil"
            value={state.instagram}
            maxLength={500}
            disabled={submitting}
            onChange={(e) => update('instagram', e.target.value)}
            error={errors.instagram}
          />
          <Input
            id={fieldId('website')}
            label="Site"
            inputMode="url"
            placeholder="casa.com.br"
            value={state.website}
            disabled={submitting}
            onChange={(e) => update('website', e.target.value)}
            error={errors.website}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Observações</SectionTitle>
        <Textarea
          id={fieldId('notes')}
          label="Algo mais que a banda precisa saber?"
          placeholder="Horário de carga, estacionamento, se tem camarim, como costuma ser o acordo…"
          value={state.notes}
          maxLength={500}
          disabled={submitting}
          onChange={(e) => update('notes', e.target.value)}
          error={errors.notes}
          hint={`${state.notes.length}/500`}
        />
      </section>

      <div className="space-y-3 border-t border-surface-2 pt-5">
        {(pendingErrors > 0 || submitError) && (
          <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-0.5">
              {pendingErrors > 0 && (
                <p>
                  {pendingErrors === 1 ? 'Corrija o campo destacado.' : `Corrija os ${pendingErrors} campos destacados.`}
                  {errors.form ? ` ${errors.form}` : ''}
                </p>
              )}
              {submitError && <p>{submitError}</p>}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-ink-muted">A sugestão passa por moderação antes de aparecer no mapa.</p>
          <Button type="submit" size="lg" disabled={submitting} className="md:min-w-48">
            <Send className="h-4 w-4" aria-hidden />
            {submitting ? 'Enviando…' : 'Enviar sugestão'}
          </Button>
        </div>
      </div>
    </form>
  )
}
