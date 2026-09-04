import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFrozenProductLabelZpl,
  createZebraFrozenLabelPrintAdapter,
  printFrozenProductLabels
} from './frozenLabelPrinting.ts'

const label = {
  lotId: 'lote-20260904-01',
  producibleName: 'Estrogonofe de frango',
  presentation: '300 g',
  manufacturedOn: '2026-09-04',
  expiresOn: '2026-12-03'
}

test('encaminha snapshot e quantidade ao adapter', async () => {
  let received
  await printFrozenProductLabels({ label, copies: 12 }, {
    async print(request) { received = request }
  })
  assert.deepEqual(received, { label, copies: 12 })
})

test('rejeita quantidade de etiquetas inválida antes de chamar o adapter', async () => {
  let called = false
  await assert.rejects(
    printFrozenProductLabels({ label, copies: 0 }, { async print() { called = true } }),
    /quantidade válida/
  )
  assert.equal(called, false)
})

test('gera ZPL de 100 × 50 mm com a quantidade solicitada em 203 e 300 dpi', () => {
  const zpl203 = buildFrozenProductLabelZpl({ label, copies: 12 }, 203)
  const zpl300 = buildFrozenProductLabelZpl({ label, copies: 12 }, 300)

  assert.match(zpl203, /\^PW799\^LL400/)
  assert.match(zpl300, /\^PW1181\^LL591/)
  assert.match(zpl203, /Sabor Sant_C3_A8/)
  assert.match(zpl203, /\^PQ12\^XZ/)
})

test('adaptador Zebra envia o ZPL para a impressora USB padrão', async () => {
  let requestedType
  let sentZpl
  const adapter = createZebraFrozenLabelPrintAdapter({
    getDefaultDevice(type, success) {
      requestedType = type
      success({ send(data, done) { sentZpl = data; done() } })
    }
  })

  await adapter.print({ label, copies: 3 })

  assert.equal(requestedType, 'printer')
  assert.match(sentZpl, /\^PQ3\^XZ/)
})
