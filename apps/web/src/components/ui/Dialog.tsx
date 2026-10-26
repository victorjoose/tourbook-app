import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Modal simples em cima de <dialog> nativo (fecha com Esc e clique fora). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[min(92vw,32rem)] rounded-2xl border border-surface-2 bg-surface-1 p-0 text-ink backdrop:bg-black/70',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-2 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 hover:bg-surface-2">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  )
}
