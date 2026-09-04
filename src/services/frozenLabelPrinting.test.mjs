import assert from 'node:assert/strict'
import test from 'node:test'
import { printFrozenProductLabels } from './frozenLabelPrinting.ts'

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
