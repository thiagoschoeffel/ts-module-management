import type { FrozenProductLabelSnapshot } from '../types/frozenStock'

export type LabelPrintState = 'idle' | 'preparing' | 'printing' | 'success' | 'error'

export interface FrozenLabelPrintRequest {
  label: FrozenProductLabelSnapshot
  copies: number
}

export interface FrozenLabelPrintAdapter {
  print(request: FrozenLabelPrintRequest): Promise<void>
}

export type ZebraPrinterDpi = 203 | 300

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

function zplText(value: string) {
  return [...new TextEncoder().encode(value)]
    .map(byte => byte >= 32 && byte <= 126 && byte !== 94 && byte !== 95 && byte !== 126
      ? String.fromCharCode(byte)
      : `_${byte.toString(16).padStart(2, '0').toUpperCase()}`)
    .join('')
}

function labelMetrics(dpi: ZebraPrinterDpi) {
  const dots = (millimeters: number) => Math.round((millimeters / 25.4) * dpi)
  const scale = (value: number) => Math.round((value / 203) * dpi)
  return { width: dots(100), height: dots(50), scale }
}

function zplField(x: number, y: number, fontSize: number, value: string, width?: number, lines = 1) {
  const block = width ? `^FB${width},${lines},0,L,0` : ''
  return `^FO${x},${y}^A0N,${fontSize},${fontSize}${block}^FH_^FD${zplText(value)}^FS`
}

export function buildFrozenProductLabelZpl(request: FrozenLabelPrintRequest, dpi: ZebraPrinterDpi = 203) {
  const { label, copies } = request
  const { width, height, scale } = labelMetrics(dpi)
  const margin = scale(40)
  const contentWidth = width - (margin * 2)
  const productFont = scale(label.producibleName.length > 30 ? 27 : label.producibleName.length > 20 ? 31 : 36)
  return `^XA^CI28^PW${width}^LL${height}^LH0,0
${zplField(margin, scale(25), scale(34), 'Sabor Santè')}
^FO${margin},${scale(26)}^A0N,${scale(19)},${scale(19)}^FB${contentWidth},1,0,R,0^FH_^FD${zplText('CONGELADO')}^FS
^FO${margin},${scale(68)}^GB${contentWidth},${scale(3)},${scale(3)}^FS
${zplField(margin, scale(88), productFont, label.producibleName.toUpperCase(), contentWidth, 2)}
${zplField(margin, scale(165), scale(22), label.presentation, contentWidth)}
${zplField(margin, scale(220), scale(17), `Fabricação  ${formatDate(label.manufacturedOn)}`, contentWidth)}
${zplField(margin, scale(250), scale(17), `Validade     ${formatDate(label.expiresOn)}`, contentWidth)}
${zplField(margin, scale(292), scale(17), `Lote  ${label.lotId}`, contentWidth, 2)}
^PQ${copies}^XZ`
}

function toError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : fallback)
}

export function createZebraFrozenLabelPrintAdapter(
  browserPrint: ZebraBrowserPrintApi,
  dpi: ZebraPrinterDpi = 203
): FrozenLabelPrintAdapter {
  return {
    async print(request) {
      const printer = await new Promise<ZebraBrowserPrintDevice>((resolve, reject) => {
        browserPrint.getDefaultDevice('printer', device => {
          if (device) resolve(device)
          else reject(new Error('Nenhuma impressora Zebra padrão foi encontrada via USB.'))
        }, reason => reject(toError(reason, 'Não foi possível localizar a impressora Zebra.')))
      })
      await new Promise<void>((resolve, reject) => {
        printer.send(
          buildFrozenProductLabelZpl(request, dpi),
          resolve,
          reason => reject(toError(reason, 'A impressora Zebra não aceitou as etiquetas.'))
        )
      })
    }
  }
}

async function defaultFrozenLabelPrintAdapter() {
  const mode = window.tsLabelPrinter?.mode ?? 'auto'
  if (mode === 'browser') return browserFrozenLabelPrintAdapter

  if (!window.BrowserPrint && window.tsLabelPrinter) {
    try {
      await window.tsLabelPrinter.loadBrowserPrint()
    }
    catch (error) {
      if (mode === 'zebra') throw error
    }
  }

  if (window.BrowserPrint)
    return createZebraFrozenLabelPrintAdapter(window.BrowserPrint, window.tsLabelPrinter?.dpi ?? 203)
  if (mode === 'zebra')
    throw new Error('Zebra Browser Print não está disponível nesta estação. Instale o aplicativo e configure a biblioteca oficial.')
  return browserFrozenLabelPrintAdapter
}

export async function printFrozenProductLabels(
  request: FrozenLabelPrintRequest,
  adapter?: FrozenLabelPrintAdapter
) {
  if (!Number.isInteger(request.copies) || request.copies < 1)
    throw new Error('Informe uma quantidade válida de etiquetas.')
  const activeAdapter = adapter ?? await defaultFrozenLabelPrintAdapter()
  await activeAdapter.print(request)
}
