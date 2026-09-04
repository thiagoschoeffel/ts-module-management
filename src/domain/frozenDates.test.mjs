import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFrozenExpiration } from './frozenDates.ts'

test('soma 90 dias atravessando o fim do mês', () => {
  assert.equal(calculateFrozenExpiration('2026-08-17'), '2026-11-15')
})

test('soma 90 dias atravessando o fim do ano', () => {
  assert.equal(calculateFrozenExpiration('2026-11-15'), '2027-02-13')
})

test('considera fevereiro em ano bissexto', () => {
  assert.equal(calculateFrozenExpiration('2028-01-01'), '2028-03-31')
})

test('rejeita data civil inexistente', () => {
  assert.throws(() => calculateFrozenExpiration('2026-02-30'), /Data civil inválida/)
})
