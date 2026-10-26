import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  TOUR_DATE_STATUSES,
  TOUR_DATE_STATUS_LABELS,
  deleteTourDate,
  formatDatePt,
  genreLabel,
  type Band,
  type RegionData,
  type TourDate,
  type TourWithDates,
} from '@tour/core'
import { Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { queryKeys } from '../../../app/queryClient'
import { Button } from '../../../components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '../../../components/ui/Input'
import { Dialog } from '../../../components/ui/Dialog'
import { Spinner } from '../../../components/ui/Spinner'
import { client } from '../../../lib/firebase'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { capitalize } from '../../../lib/text'
import { errorMessage } from '../../../lib/errorMessage'
import {
  addChecklistItem,
  asDealType,
  asTourDateStatus,
  bandsOfCity,
  cityLabel,
  editorPatchOf,
  editorValuesOf,
  producersOfCity,
  removeChecklistItem,
  removeDate,
  searchByName,
  toggleChecklistItem,
  venuesOfCity,
  withCity,
  withVenue,
  type DateEditorErrors,
  type DateEditorValues,
  type RegionIndex,
} from './helpers'
import { useUpdateTourDate } from './useTourDateMutations'

export type DateEditorDialogProps = {
  tourId: string
  date: TourDate
  data: RegionData
  index: RegionIndex
  open: boolean
  onClose: () => void
}

const NONE = ''

/**
 * Full editor of one date. Everything is saved in ONE `updateTourDate` call
 * (fields + checklist + bands). Mount only while open so the form resets per date.
 */
export function DateEditorDialog({ tourId, date, data, index, open, onClose }: DateEditorDialogProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<DateEditorValues>(() => editorValuesOf(date))
  const [errors, setErrors] = useState<DateEditorErrors>({})
  const [newItem, setNewItem] = useState('')
  const [bandQuery, setBandQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cityOptions = useMemo(() => data.cities.map((c) => ({ id: c.id, label: c.name, sublabel: c.state })), [data.cities])
  const venues = useMemo(() => venuesOfCity(data.venues, values.cityId), [data.venues, values.cityId])
  const producers = useMemo(() => producersOfCity(data.producers, values.cityId), [data.producers, values.cityId])
  const localBands = useMemo(() => bandsOfCity(data.bands, values.cityId), [data.bands, values.cityId])
  const localBandIds = useMemo(() => new Set(localBands.map((b) => b.id)), [localBands])
  const selectedBands = useMemo(
    () => values.bandIds.map((id) => index.bands.get(id)).filter((b): b is Band => b !== undefined),
    [values.bandIds, index.bands],
  )
  const otherSelected = selectedBands.filter((b) => !localBandIds.has(b.id))
  const bandResults = useMemo(
    () => searchByName(data.bands, bandQuery, 6).filter((b) => !values.bandIds.includes(b.id)),
    [data.bands, bandQuery, values.bandIds],
  )

  const update = useUpdateTourDate(tourId)
  const remove = useMutation({
    mutationFn: () => deleteTourDate(client, tourId, date.id),
    onSuccess: async () => {
      queryClient.setQueryData<TourWithDates | null>(queryKeys.tour(tourId), (old) => (old ? removeDate(old, date.id) : old))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tour(tourId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tours }),
      ])
      onClose()
    },
  })
  const pending = update.isPending || remove.isPending

  function set<K extends keyof DateEditorValues>(key: K, value: DateEditorValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function toggleBand(id: string) {
    setValues((v) => ({ ...v, bandIds: v.bandIds.includes(id) ? v.bandIds.filter((b) => b !== id) : [...v.bandIds, id] }))
  }

  function addItem() {
    if (newItem.trim() === '') return
    setValues((v) => ({ ...v, checklist: addChecklistItem(v.checklist, newItem) }))
    setNewItem('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const result = editorPatchOf(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    update.mutate({ dateId: date.id, patch: result.patch }, { onSuccess: onClose })
  }

  const title = `Editar ${capitalize(formatDatePt(date.date, 'short'))}`

  return (
    <Dialog open={open} onClose={onClose} title={title} className="w-[min(92vw,40rem)]">
      {confirmDelete ? (
        <div className="space-y-4">
          <p className="text-sm">
            Remover a data <span className="font-medium">{capitalize(formatDatePt(date.date, 'short'))}</span> da turnê? Isso não pode ser
            desfeito.
          </p>
          {remove.isError && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage(remove.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>
              Voltar
            </Button>
            <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Trash2 className="h-4 w-4" aria-hidden />}
              Remover data
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {/* Quando e onde */}
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="Dia"
                value={values.date}
                onChange={(e) => set('date', e.target.value)}
                error={errors.date}
                required
              />
              <Select
                label="Status"
                value={values.status}
                onChange={(e) => {
                  const next = asTourDateStatus(e.target.value)
                  if (next) set('status', next)
                }}
              >
                {TOUR_DATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TOUR_DATE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>

            <SearchSelect
              label="Cidade"
              options={cityOptions}
              value={values.cityId}
              onChange={(cityId) => setValues((v) => withCity(v, cityId, index))}
              placeholder="Buscar cidade…"
              emptyText="Nenhuma cidade encontrada em SC, PR ou SP."
              hint={values.cityId ? undefined : 'Sem cidade, a data aparece em "Preencher buracos".'}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Casa"
                value={values.venueId ?? NONE}
                disabled={!values.cityId}
                onChange={(e) => setValues((v) => withVenue(v, e.target.value === NONE ? null : (index.venues.get(e.target.value) ?? null)))}
                hint={!values.cityId ? 'Escolha a cidade primeiro' : venues.length === 0 ? 'Nenhuma casa cadastrada nessa cidade' : undefined}
              >
                <option value={NONE}>Nenhuma</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.capacity !== null ? ` · ${v.capacity} pessoas` : ''}
                  </option>
                ))}
              </Select>
              <Select
                label="Produtora"
                value={values.producerId ?? NONE}
                disabled={!values.cityId}
                onChange={(e) => set('producerId', e.target.value === NONE ? null : e.target.value)}
                hint={!values.cityId ? 'Escolha a cidade primeiro' : producers.length === 0 ? 'Nenhuma produtora atende essa cidade' : undefined}
              >
                <option value={NONE}>Nenhuma</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <Checkbox
              checked={values.isFixed}
              onChange={(e) => set('isFixed', e.target.checked)}
              label={
                <span>
                  Data fixa <span className="text-ink-muted">· o preenchimento automático não mexe nela</span>
                </span>
              }
            />
          </section>

          {/* Horários */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Horários</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input type="time" label="Load-in" value={values.loadInTime} onChange={(e) => set('loadInTime', e.target.value)} />
              <Input type="time" label="Passagem" value={values.soundcheckTime} onChange={(e) => set('soundcheckTime', e.target.value)} />
              <Input type="time" label="Portas" value={values.doorsTime} onChange={(e) => set('doorsTime', e.target.value)} />
              <Input type="time" label="Show" value={values.setTime} onChange={(e) => set('setTime', e.target.value)} />
            </div>
          </section>

          {/* Acordo */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Acordo e hospedagem</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Tipo de acordo"
                value={values.dealType}
                onChange={(e) => set('dealType', e.target.value === NONE ? NONE : (asDealType(e.target.value) ?? NONE))}
              >
                <option value={NONE}>Não definido</option>
                {DEAL_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {DEAL_TYPE_LABELS[d]}
                  </option>
                ))}
              </Select>
              <Input
                label="Cachê (R$)"
                inputMode="decimal"
                placeholder="1.500,00"
                value={values.fee}
                onChange={(e) => set('fee', e.target.value)}
                error={errors.fee}
              />
              <Input
                label="Custos (R$)"
                inputMode="decimal"
                placeholder="350,00"
                value={values.cost}
                onChange={(e) => set('cost', e.target.value)}
                error={errors.cost}
                hint={!errors.cost ? 'Gasolina, pedágio, alimentação…' : undefined}
              />
            </div>
            <Input
              label="Hospedagem"
              placeholder="Ex.: casa do produtor, hostel X…"
              value={values.lodging}
              onChange={(e) => set('lodging', e.target.value)}
              maxLength={500}
            />
            <Textarea
              label="Notas"
              placeholder="Combinados, backline, quem leva o quê…"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              maxLength={500}
            />
          </section>

          {/* Checklist */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Checklist</h3>
            {values.checklist.length === 0 && <p className="text-sm text-ink-muted">Nenhum item. Adicione o que precisa resolver para essa data.</p>}
            <ul className="space-y-1.5">
              {values.checklist.map((item, i) => (
                <li key={`${i}-${item.label}`} className="flex items-center gap-2">
                  <Checkbox
                    className="min-w-0 flex-1"
                    checked={item.done}
                    onChange={() => set('checklist', toggleChecklistItem(values.checklist, i))}
                    label={<span className={item.done ? 'text-ink-muted line-through' : undefined}>{item.label}</span>}
                  />
                  <button
                    type="button"
                    aria-label={`Remover item ${item.label}`}
                    onClick={() => set('checklist', removeChecklistItem(values.checklist, i))}
                    className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                aria-label="Novo item do checklist"
                placeholder="Novo item…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
                maxLength={120}
              />
              <Button type="button" variant="secondary" onClick={addItem} disabled={newItem.trim() === ''}>
                <Plus className="h-4 w-4" aria-hidden />
                Adicionar
              </Button>
            </div>
          </section>

          {/* Bandas da noite */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Bandas da noite</h3>
            {values.cityId && localBands.length > 0 ? (
              <fieldset className="space-y-1.5">
                <legend className="text-xs text-ink-muted">
                  Bandas de {index.cities.get(values.cityId)?.name ?? 'cidade escolhida'}
                </legend>
                {localBands.map((b) => (
                  <Checkbox
                    key={b.id}
                    checked={values.bandIds.includes(b.id)}
                    onChange={() => toggleBand(b.id)}
                    label={
                      <span>
                        {b.name}
                        {b.genres.length > 0 && <span className="text-xs text-ink-muted"> · {b.genres.map(genreLabel).join(', ')}</span>}
                        {!b.opensForTouring && <span className="text-xs text-amber-300"> · não costuma abrir</span>}
                      </span>
                    }
                  />
                ))}
              </fieldset>
            ) : (
              <p className="text-sm text-ink-muted">
                {values.cityId ? 'Nenhuma banda cadastrada nessa cidade.' : 'Escolha a cidade para ver as bandas locais.'}
              </p>
            )}

            {otherSelected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {otherSelected.map((b) => {
                  const home = b.cityId ? index.cities.get(b.cityId) : undefined
                  return (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-600/20 py-0.5 pr-1 pl-2.5 text-xs text-brand-100"
                    >
                      {b.name}
                      {home && <span className="text-brand-200/70">· {cityLabel(home)}</span>}
                      <button
                        type="button"
                        aria-label={`Remover ${b.name}`}
                        onClick={() => toggleBand(b.id)}
                        className="rounded-full p-0.5 hover:bg-brand-600/40"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            <Field label="Buscar outra banda" hint="Qualquer banda cadastrada em SC, PR e SP.">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <Input
                  aria-label="Buscar banda"
                  placeholder="Nome da banda…"
                  value={bandQuery}
                  onChange={(e) => setBandQuery(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
            </Field>
            {bandQuery.trim() !== '' && (
              <ul className="divide-y divide-surface-2 overflow-hidden rounded-xl border border-surface-2">
                {bandResults.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">Nenhuma banda encontrada.</li>}
                {bandResults.map((b) => {
                  const home = b.cityId ? index.cities.get(b.cityId) : undefined
                  return (
                    <li key={b.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{b.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {home ? cityLabel(home) : 'Cidade não informada'}
                          {b.genres.length > 0 && ` · ${b.genres.map(genreLabel).join(', ')}`}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          toggleBand(b.id)
                          setBandQuery('')
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Adicionar
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {update.isError && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage(update.error)}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-2 pt-4">
            <Button type="button" variant="ghost" className="text-red-300 hover:bg-red-950/40" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Remover data
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {update.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Save className="h-4 w-4" aria-hidden />}
                Salvar
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  )
}
