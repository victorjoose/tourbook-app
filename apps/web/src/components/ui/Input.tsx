import type { ComponentProps, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

const base =
  'w-full rounded-xl border border-surface-3 bg-surface-1 px-3 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none disabled:opacity-60'

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
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

export type InputProps = ComponentProps<'input'> & { label?: string; hint?: string; error?: string | null }

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const el = (
    <input
      id={inputId}
      className={cn(base, 'h-10', error && 'border-red-500', className)}
      aria-invalid={!!error}
      {...props}
    />
  )
  if (!label) return el
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {el}
    </Field>
  )
}

export type TextareaProps = ComponentProps<'textarea'> & {
  label?: string
  hint?: string
  error?: string | null
}

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const el = (
    <textarea
      id={inputId}
      className={cn(base, 'min-h-24 py-2', error && 'border-red-500', className)}
      aria-invalid={!!error}
      {...props}
    />
  )
  if (!label) return el
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {el}
    </Field>
  )
}

export type SelectProps = ComponentProps<'select'> & {
  label?: string
  hint?: string
  error?: string | null
}

export function Select({ label, hint, error, className, id, children, ...props }: SelectProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const el = (
    <select id={inputId} className={cn(base, 'h-10', error && 'border-red-500', className)} aria-invalid={!!error} {...props}>
      {children}
    </select>
  )
  if (!label) return el
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {el}
    </Field>
  )
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-surface-3 bg-surface-1 accent-brand-500" {...props} />
      {label}
    </label>
  )
}
