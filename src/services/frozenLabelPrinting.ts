import type { FrozenProductLabelSnapshot } from '../types/frozenStock'

export type LabelPrintState = 'idle' | 'preparing' | 'printing' | 'success' | 'error'

export interface FrozenLabelPrintRequest {
  label: FrozenProductLabelSnapshot
  copies: number
}

export interface FrozenLabelPrintAdapter {
  print(request: FrozenLabelPrintRequest): Promise<void>
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function labelMarkup(label: FrozenProductLabelSnapshot) {
  return `<article class="label">
    <header><strong>Sabor Santè</strong><span>Congelado</span></header>
    <main>
      <h1>${escapeHtml(label.producibleName)}</h1>
      <p class="presentation">${escapeHtml(label.presentation)}</p>
      <dl>
        <div><dt>Fabricação</dt><dd>${formatDate(label.manufacturedOn)}</dd></div>
        <div><dt>Validade</dt><dd>${formatDate(label.expiresOn)}</dd></div>
        <div><dt>Lote</dt><dd>${escapeHtml(label.lotId)}</dd></div>
      </dl>
    </main>
  </article>`
}

export const browserFrozenLabelPrintAdapter: FrozenLabelPrintAdapter = {
  async print({ label, copies }) {
    const printWindow = window.open('', '_blank', 'popup,width=900,height=650')
    if (!printWindow) throw new Error('O navegador bloqueou a janela de impressão.')

    const labels = Array.from({ length: copies }, () => labelMarkup(label)).join('')
    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Etiquetas · ${escapeHtml(label.lotId)}</title>
          <style>
            @page { size: 100mm 50mm; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #0f172a; font-family: Arial, sans-serif; }
            .label { width: 100mm; height: 50mm; padding: 5mm 6mm; page-break-after: always; overflow: hidden; }
            .label:last-child { page-break-after: auto; }
            header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: .4mm solid #0f172a; padding-bottom: 2mm; }
            header strong { font-size: 15pt; }
            header span { font-size: 8pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
            main { padding-top: 2.5mm; }
            h1 { margin: 0; font-size: 15pt; line-height: 1.1; text-transform: uppercase; }
            .presentation { margin: 1mm 0 2.5mm; font-size: 10pt; font-weight: 700; }
            dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 5mm; margin: 0; font-size: 8.5pt; }
            dl div:last-child { grid-column: 1 / -1; }
            dt { color: #475569; }
            dd { margin: .5mm 0 0; font-weight: 700; }
          </style>
        </head>
        <body>${labels}</body>
      </html>`)
    printWindow.document.close()
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true })
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    printWindow.focus()
    printWindow.print()
  }
}

export async function printFrozenProductLabels(
  request: FrozenLabelPrintRequest,
  adapter: FrozenLabelPrintAdapter = browserFrozenLabelPrintAdapter
) {
  if (!Number.isInteger(request.copies) || request.copies < 1)
    throw new Error('Informe uma quantidade válida de etiquetas.')
  await adapter.print(request)
}
