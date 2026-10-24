import { GENRES, genreLabel, type RegionData } from '@tour/core'
import { Link2 } from 'lucide-react'
import { useId } from 'react'
import { Chip } from '../../../components/ui/Chip'
import { Field, Input } from '../../../components/ui/Input'
import { useTourWizardStore } from '../tourWizardStore'
import { normalizeText } from '../../../lib/text'
import { tourFormErrors } from './validation'

export function StepBand({ data, showErrors }: { data: RegionData; showErrors: boolean }) {
  const state = useTourWizardStore()
  const setFields = useTourWizardStore((s) => s.setFields)
  const listId = useId()
  const errors = showErrors ? tourFormErrors(state) : {}
  const linkedBand = state.bandId ? data.bands.find((b) => b.id === state.bandId) : undefined

  function onBandNameChange(value: string) {
    const needle = normalizeText(value)
    const match = needle ? data.bands.find((b) => normalizeText(b.name) === needle) : undefined
    setFields({ bandName: value, bandId: match?.id ?? null })
  }

  function toggleGenre(genre: string) {
    setFields({
      genres: state.genres.includes(genre) ? state.genres.filter((g) => g !== genre) : [...state.genres, genre],
    })
  }

  return (
    <div className="space-y-6">
      <Input
        label="Nome da turnê"
        placeholder="Ex.: Turnê Sul 2026"
        value={state.name}
        maxLength={80}
        onChange={(e) => setFields({ name: e.target.value })}
        error={errors.name}
      />

      <div className="space-y-1.5">
        <Input
          label="Banda"
          placeholder="Nome da banda"
          list={listId}
          value={state.bandName}
          maxLength={80}
          onChange={(e) => onBandNameChange(e.target.value)}
          error={errors.bandName}
          hint={
            linkedBand
              ? undefined
              : 'Se a banda já está no mapa, escolha o nome na lista para vincular o cadastro.'
          }
          autoComplete="off"
        />
        <datalist id={listId}>
          {data.bands.map((band) => (
            <option key={band.id} value={band.name} />
          ))}
        </datalist>
        {linkedBand && (
          <p className="flex items-center gap-1.5 text-xs text-brand-300">
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Vinculada ao cadastro de {linkedBand.name}
          </p>
        )}
      </div>

      <Field label="Gêneros" hint="Usados para sugerir casas e bandas locais com a mesma pegada." error={errors.genres}>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <Chip key={genre} active={state.genres.includes(genre)} onClick={() => toggleGenre(genre)}>
              {genreLabel(genre)}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  )
}
