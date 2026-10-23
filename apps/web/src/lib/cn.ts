/** Junta classes ignorando falsy (sem dependência extra). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
