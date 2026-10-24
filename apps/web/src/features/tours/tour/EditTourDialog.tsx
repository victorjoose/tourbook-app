import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTour, type Tour } from '@tour/core'
import { Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { Spinner } from '../../../components/ui/Spinner'
import { client } from '../../../lib/firebase'
import { errorMessage } from '../../../lib/errorMessage'
import {
  MAX_KM_PER_DAY,
  MIN_KM_PER_DAY,
  tourEditorPatchOf,
  tourEditorValuesOf,
  type TourEditorErrors,
} from './helpers'
import { invalidateTour } from './useTourDateMutations'

export type EditTourDialogProps = {
  tour: Pick<Tour, 'id' | 'name' | 'bandName' | 'maxKmPerDay'>
  open: boolean
  onClose: () => void
}

/** Edits name, band and the daily km limit (`updateTour`). Mount only while open to reset the form. */
export function EditTourDialog({ tour, open, onClose }: EditTourDialogProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(() => tourEditorValuesOf(tour))
  const [errors, setErrors] = useState<TourEditorErrors>({})

  const save = useMutation({
    mutationFn: (patch: { name: string; bandName: string; maxKmPerDay: number }) => updateTour(client, tour.id, patch),
    onSuccess: async () => {
      await invalidateTour(queryClient, tour.id)
      onClose()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const result = tourEditorPatchOf(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    save.mutate(result.patch)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Editar turnê">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Nome da turnê"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          error={errors.name}
          maxLength={80}
          required
        />
        <Input
          label="Banda"
          value={values.bandName}
          onChange={(e) => setValues((v) => ({ ...v, bandName: e.target.value }))}
          error={errors.bandName}
          maxLength={80}
          required
        />
        <Input
          label="Máximo de km por dia"
          type="number"
          inputMode="numeric"
          min={MIN_KM_PER_DAY}
          max={MAX_KM_PER_DAY}
          step={10}
          value={values.maxKmPerDay}
          onChange={(e) => setValues((v) => ({ ...v, maxKmPerDay: e.target.value }))}
          error={errors.maxKmPerDay}
          hint={`Entre ${MIN_KM_PER_DAY} e ${MAX_KM_PER_DAY} km. Usado nas sugestões e nos alertas da rota.`}
          required
        />
        {save.isError && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Save className="h-4 w-4" aria-hidden />}
            Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
