import { useMutation, useQueryClient } from '@tanstack/react-query'
import { disableShareLink, enableShareLink, type Tour } from '@tour/core'
import { Check, Copy, Link2, Link2Off } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { queryKeys } from '../../../app/queryClient'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Spinner } from '../../../components/ui/Spinner'
import { client } from '../../../lib/firebase'
import { errorMessage } from '../../../lib/errorMessage'
import { shareUrl } from './helpers'
export type ShareDialogProps = {
  tour: Pick<Tour, 'id' | 'shareToken'>
  canEdit: boolean
  open: boolean
  onClose: () => void
}

/** Public tourbook link (/t/:token): generate, copy and disable. */
export function ShareDialog({ tour, canEdit, open, onClose }: ShareDialogProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const url = tour.shareToken ? shareUrl(window.location.origin, tour.shareToken) : null

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const enable = useMutation({
    mutationFn: () => enableShareLink(client, tour.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tour(tour.id) }),
  })

  const disable = useMutation({
    mutationFn: () => disableShareLink(client, tour.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tour(tour.id) }),
  })

  const pending = enable.isPending || disable.isPending

  async function copy() {
    if (!url) return
    setCopyFailed(false)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        return
      }
    } catch {
      // Clipboard API blocked: fall back to selecting the text below.
    }
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
    try {
      // Deprecated, but still the only fallback when the Clipboard API is unavailable.
      if (document.execCommand('copy')) {
        setCopied(true)
        return
      }
    } catch {
      // Ignore: the text stays selected for a manual copy.
    }
    setCopyFailed(true)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Compartilhar tourbook">
      {url ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Quem tiver este link vê o tourbook da turnê (datas, casas, contatos e horários) sem precisar de login e{' '}
            <span className="text-ink">sem os valores de cachê e custos</span>.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              readOnly
              value={url}
              aria-label="Link público"
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-xl border border-surface-3 bg-surface px-3 text-sm text-ink focus:border-brand-500 focus:outline-none"
            />
            <Button variant="secondary" onClick={() => void copy()} aria-live="polite">
              {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          {copyFailed && (
            <p role="alert" className="text-xs text-amber-300">
              Não deu para copiar automaticamente. O link está selecionado: use Ctrl+C (ou Cmd+C).
            </p>
          )}
          <p className="text-xs text-ink-muted">O tourbook público é atualizado a cada mudança na turnê.</p>
          {disable.isError && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage(disable.error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-ink hover:bg-surface-2"
            >
              <Link2 className="h-4 w-4" aria-hidden />
              Abrir
            </a>
            {canEdit && (
              <Button variant="danger" onClick={() => disable.mutate()} disabled={pending}>
                {disable.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Link2Off className="h-4 w-4" aria-hidden />}
                Desativar link
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Gere um link público para a equipe, as casas e as bandas convidadas acompanharem o tourbook sem login.
            Quem abrir o link vê datas, cidades, casas, contatos e horários — <span className="text-ink">nunca os valores</span> de
            cachê e custos.
          </p>
          <p className="text-xs text-ink-muted">Você pode desativar o link a qualquer momento; ele para de funcionar na hora.</p>
          {enable.isError && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage(enable.error)}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Fechar
            </Button>
            {canEdit ? (
              <Button onClick={() => enable.mutate()} disabled={pending}>
                {enable.isPending ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Link2 className="h-4 w-4" aria-hidden />}
                Gerar link
              </Button>
            ) : (
              <p className="self-center text-xs text-ink-muted">Só quem edita a turnê pode gerar o link.</p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
