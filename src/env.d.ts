/// <reference types="vite/client" />

interface ZebraBrowserPrintDevice {
  send(data: string, success: () => void, error: (reason: unknown) => void): void
}

interface ZebraBrowserPrintApi {
  getDefaultDevice(type: 'printer', success: (device?: ZebraBrowserPrintDevice) => void, error: (reason: unknown) => void): void
}

interface Window {
  BrowserPrint?: ZebraBrowserPrintApi
  tsLabelPrinter?: {
    mode: 'auto' | 'browser' | 'zebra'
    dpi: 203 | 300
    loadBrowserPrint(): Promise<void>
  }
}
