import assert from 'node:assert/strict'
import test from 'node:test'
import { loadFrozenStock, registerFrozenMovement } from './frozenStockApi.ts'

test('maps the authoritative API contract to the management view model', async () => {
  const request = async () => new Response(JSON.stringify({
    frozenOfferId: 'offer-1',
    producibles: [{ id: 'product-1', name: 'Sopa', isActive: true }],
    configurations: [{
      id: 'configuration-1', offerId: 'offer-1', producibleItemId: 'product-1',
      producibleName: 'Sopa', presentation: '400 ml', quantityPerUnit: 400,
      measurementUnit: 'Milliliter', unitPrice: 28, isActive: true
    }],
    stock: [],
    expirations: []
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const result = await loadFrozenStock(request)

  assert.equal(result.configurations[0].unit, 'ml')
  assert.equal(result.configurations[0].producibleName, 'Sopa')
  assert.equal(result.frozenOfferId, 'offer-1')
})

test('sends stock mutations with an idempotency key', async () => {
  let captured
  const request = async (path, init) => {
    captured = { path, init }
    return new Response(JSON.stringify({ movementId: 'movement-1' }), { status: 200 })
  }

  await registerFrozenMovement(request, 'lot-1', {
    type: 'discard', quantity: 2, reason: '<p>Vencido</p>'
  })

  assert.equal(captured.path, '/api/frozen-stock/lots/lot-1/movements')
  assert.ok(new Headers(captured.init.headers).get('Idempotency-Key'))
  assert.deepEqual(JSON.parse(captured.init.body), {
    type: 'ExpirationDisposal', quantity: 2, reason: '<p>Vencido</p>'
  })
})

test('surfaces Problem Details returned by the API', async () => {
  const request = async () => new Response(JSON.stringify({ detail: 'Saldo insuficiente.' }), {
    status: 409, headers: { 'Content-Type': 'application/problem+json' }
  })

  await assert.rejects(() => loadFrozenStock(request), /Saldo insuficiente/)
})
