import type { Tourbook } from '@tour/core'
import QRCode from 'qrcode'
import type { QRCodeToDataURLOptions } from 'qrcode'
import { useEffect, useMemo, useRef, useState } from 'react'

export type TourbookQr = {
  /** PNG data URL of the Google Maps QR code, by day id (days without a place have none). */
  qrByDayId: Record<string, string>
  /** False while some code is still being generated. */
  ready: boolean
}

type Target = { id: string; url: string }

const QR_OPTIONS: QRCodeToDataURLOptions = {
  width: 240,
  margin: 1,
  errorCorrectionLevel: 'M',
  color: { dark: '#18181bff', light: '#ffffffff' },
}

/** QR code could not be generated for this URL; it must not block `ready`. */
const FAILED = ''

/**
 * Generates one QR code (data URL) per day that has a mapsUrl.
 * Generation is async in an effect; results are cached by URL, so rebuilding the tourbook
 * (e.g. toggling hideMoney) does not regenerate anything. State updates stop after unmount.
 */
export function useTourbookPdf(tourbook: Tourbook | null | undefined): TourbookQr {
  const targets = useMemo<Target[]>(
    () => (tourbook?.days ?? []).flatMap((day) => (day.mapsUrl ? [{ id: day.id, url: day.mapsUrl }] : [])),
    [tourbook],
  )
  const [cacheByUrl, setCacheByUrl] = useState<Record<string, string>>({})
  const inFlight = useRef(new Set<string>())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const missing = targets.filter((t) => !Object.hasOwn(cacheByUrl, t.url) && !inFlight.current.has(t.url))
    if (missing.length === 0) return
    for (const t of missing) inFlight.current.add(t.url)

    void Promise.all(
      missing.map(async ({ url }): Promise<[string, string]> => {
        try {
          return [url, await QRCode.toDataURL(url, QR_OPTIONS)]
        } catch {
          return [url, FAILED]
        }
      }),
    ).then((entries) => {
      for (const [url] of entries) inFlight.current.delete(url)
      if (!mounted.current) return
      setCacheByUrl((prev) => {
        const next = { ...prev }
        for (const [url, dataUrl] of entries) next[url] = dataUrl
        return next
      })
    })
  }, [targets, cacheByUrl])

  const qrByDayId = useMemo(() => {
    const out: Record<string, string> = {}
    for (const t of targets) {
      const dataUrl = cacheByUrl[t.url]
      if (dataUrl) out[t.id] = dataUrl
    }
    return out
  }, [targets, cacheByUrl])

  const ready = targets.every((t) => Object.hasOwn(cacheByUrl, t.url))
  return { qrByDayId, ready }
}
