import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { SheetState } from './mapStore'

export type BottomSheetProps = {
  state: SheetState
  onStateChange: (state: SheetState) => void
  /** Always visible, even when collapsed (the city search). */
  header: ReactNode
  /** Visible in half/full states. */
  children: ReactNode
  label?: string
}

const SWIPE_PX = 30

function expand(s: SheetState): SheetState {
  return s === 'collapsed' ? 'half' : 'full'
}

function collapse(s: SheetState): SheetState {
  return s === 'full' ? 'half' : 'collapsed'
}

function cycle(s: SheetState): SheetState {
  if (s === 'collapsed') return 'half'
  if (s === 'half') return 'full'
  return 'collapsed'
}

const HEIGHT: Record<SheetState, string> = {
  collapsed: 'h-auto',
  half: 'h-[58%]',
  full: 'h-[calc(100%-0.5rem)]',
}

const HANDLE_LABEL: Record<SheetState, string> = {
  collapsed: 'Abrir painel',
  half: 'Expandir painel',
  full: 'Recolher painel',
}

/**
 * Mobile bottom sheet over the map with three snap states. The handle is a
 * button: tap cycles the states, a vertical swipe moves one step, keyboard
 * activation cycles too.
 */
export function BottomSheet({ state, onStateChange, header, children, label = 'Explorar' }: BottomSheetProps) {
  const startY = useRef<number | null>(null)

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    startY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerUp(e: PointerEvent<HTMLButtonElement>) {
    const start = startY.current
    startY.current = null
    if (start === null) return
    const dy = e.clientY - start
    if (dy <= -SWIPE_PX) onStateChange(expand(state))
    else if (dy >= SWIPE_PX) onStateChange(collapse(state))
    else onStateChange(cycle(state))
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Pointer interactions are handled on pointerup; detail === 0 means keyboard.
    if (e.detail === 0) onStateChange(cycle(state))
  }

  return (
    <section
      aria-label={label}
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex max-h-full flex-col rounded-t-2xl border-t border-surface-2 bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.55)] transition-[height] duration-300 ease-out',
        HEIGHT[state],
      )}
    >
      <button
        type="button"
        aria-label={HANDLE_LABEL[state]}
        aria-expanded={state !== 'collapsed'}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => (startY.current = null)}
        onClick={handleClick}
        className="flex h-7 w-full shrink-0 touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400"
      >
        <span className="h-1.5 w-10 rounded-full bg-surface-3" aria-hidden />
      </button>
      <div className="shrink-0 px-4 pb-3">{header}</div>
      <div className={cn('flex min-h-0 flex-1 flex-col', state === 'collapsed' && 'hidden')}>{children}</div>
    </section>
  )
}
