import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFrozenAdjustment, applyFrozenDiscard } from './frozenStockMovements.ts'

test('adjusts physical and available balances for an eligible lot', () => {
  assert.deepEqual(
    applyFrozenAdjustment({ physicalQuantity: 10, availableQuantity: 8 }, -3, true),
    { physicalQuantity: 7, availableQuantity: 5 }
  )
})

test('does not make expired stock sellable when adjusting its physical balance', () => {
  assert.deepEqual(
    applyFrozenAdjustment({ physicalQuantity: 3, availableQuantity: 0 }, 2, false),
    { physicalQuantity: 5, availableQuantity: 0 }
  )
})

test('rejects adjustments and discards that would make balances negative', () => {
  assert.throws(
    () => applyFrozenAdjustment({ physicalQuantity: 2, availableQuantity: 2 }, -3, true),
    /saldo negativo/
  )
  assert.throws(
    () => applyFrozenDiscard({ physicalQuantity: 2, availableQuantity: 0 }, 3),
    /quantidade física/
  )
})

test('discard removes physical stock and only the still available portion', () => {
  assert.deepEqual(
    applyFrozenDiscard({ physicalQuantity: 10, availableQuantity: 4 }, 6),
    { physicalQuantity: 4, availableQuantity: 0 }
  )
})
