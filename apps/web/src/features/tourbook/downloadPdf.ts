// Renders the tourbook to a Blob and triggers the browser download.
// Kept in its own module so the public page can lazy-load @react-pdf/renderer only on click.
import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { TourbookDocument, type TourbookDocumentProps } from './TourbookDocument'
import { tourbookFileName } from './tourbookHelpers'

const REVOKE_DELAY_MS = 1_000

/** Saves a Blob through a temporary object URL (revoked right after the click is dispatched). */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

export async function renderTourbookBlob(props: TourbookDocumentProps): Promise<Blob> {
  const instance = pdf()
  instance.updateContainer(createElement(TourbookDocument, props))
  return instance.toBlob()
}

/** '<slug do título>-tourbook.pdf' */
export async function downloadTourbookPdf(props: TourbookDocumentProps): Promise<void> {
  const blob = await renderTourbookBlob(props)
  triggerDownload(blob, tourbookFileName(props.tourbook.title))
}
