/** Only http(s) URLs may become hrefs (never javascript:, data: or anything else). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
}
