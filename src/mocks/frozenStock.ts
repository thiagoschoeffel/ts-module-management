import { getProducible } from './producibleStore'
import { calculateFrozenExpiration } from '../domain/frozenDates'
import { applyFrozenAdjustment, applyFrozenDiscard } from '../domain/frozenStockMovements'
import type {
  FrozenConfiguration,
  FrozenExpirationSummary,
  FrozenLabelPrintRecord,
  FrozenLot,
  FrozenLotDetail,
  FrozenLotStatus,
  FrozenProductLabelSnapshot,
  FrozenStockMovement,
  FrozenStockSummary
} from '../types/frozenStock'

const reviewDate = '2026-09-04'
const nearExpirationLimit = '2026-09-18'

export const mockFrozenConfigurations: FrozenConfiguration[] = [
  {
    id: 'cong-1001',
    producibleItemId: 'prod-1004',
    presentation: '300 g',
    quantityPerUnit: 300,
    unit: 'g',
    unitPrice: 29,
    active: true
  },
  {
    id: 'cong-1002',
    producibleItemId: 'prod-1004',
    presentation: '450 g',
    quantityPerUnit: 450,
    unit: 'g',
    unitPrice: 39,
    active: false
  }
]

export const mockFrozenLots: FrozenLot[] = [
  {
    id: 'lote-2026-0814-a',
    frozenConfigurationId: 'cong-1001',
    manufacturedOn: '2026-06-14',
    expiresOn: '2026-09-12',
    producedQuantity: 18,
    physicalQuantity: 6,
    availableQuantity: 6,
    labelSnapshot: {
      lotId: 'lote-2026-0814-a', producibleName: 'Estrogonofe de frango', presentation: '300 g',
      manufacturedOn: '2026-06-14', expiresOn: '2026-09-12'
    }
  },
  {
    id: 'lote-2026-0818-a',
    frozenConfigurationId: 'cong-1001',
    manufacturedOn: '2026-08-17',
    expiresOn: '2026-11-15',
    producedQuantity: 24,
    physicalQuantity: 14,
    availableQuantity: 14,
    labelSnapshot: {
      lotId: 'lote-2026-0818-a', producibleName: 'Estrogonofe de frango', presentation: '300 g',
      manufacturedOn: '2026-08-17', expiresOn: '2026-11-15'
    }
  },
  {
    id: 'lote-2026-0603-a',
    frozenConfigurationId: 'cong-1001',
    manufacturedOn: '2026-06-03',
    expiresOn: '2026-09-01',
    producedQuantity: 12,
    physicalQuantity: 3,
    availableQuantity: 0,
    labelSnapshot: {
      lotId: 'lote-2026-0603-a', producibleName: 'Estrogonofe de frango', presentation: '300 g',
      manufacturedOn: '2026-06-03', expiresOn: '2026-09-01'
    }
  }
]

export const mockFrozenMovements: FrozenStockMovement[] = [
  { id: 'mov-entrada-1', lotId: 'lote-2026-0814-a', type: 'entrada-producao', quantity: 18, responsibleName: 'Marina Lopes', occurredAt: '2026-06-14T15:00:00.000Z', physicalQuantityAfter: 18, availableQuantityAfter: 18 },
  { id: 'mov-saida-1', lotId: 'lote-2026-0814-a', type: 'saida-pedido', quantity: -12, responsibleName: 'Marina Lopes', occurredAt: '2026-08-28T17:20:00.000Z', reason: '<p>Saída vinculada aos <strong>pedidos confirmados</strong>.</p>', physicalQuantityAfter: 6, availableQuantityAfter: 6 },
  { id: 'mov-entrada-2', lotId: 'lote-2026-0818-a', type: 'entrada-producao', quantity: 24, responsibleName: 'Carlos Mendes', occurredAt: '2026-08-17T15:00:00.000Z', physicalQuantityAfter: 24, availableQuantityAfter: 24 },
  { id: 'mov-saida-2', lotId: 'lote-2026-0818-a', type: 'saida-pedido', quantity: -10, responsibleName: 'Carlos Mendes', occurredAt: '2026-09-02T16:10:00.000Z', reason: 'Pedidos confirmados', physicalQuantityAfter: 14, availableQuantityAfter: 14 },
  { id: 'mov-entrada-3', lotId: 'lote-2026-0603-a', type: 'entrada-producao', quantity: 12, responsibleName: 'Marina Lopes', occurredAt: '2026-06-03T15:00:00.000Z', physicalQuantityAfter: 12, availableQuantityAfter: 12 },
  { id: 'mov-descarte-1', lotId: 'lote-2026-0603-a', type: 'descarte-vencimento', quantity: -9, responsibleName: 'Marina Lopes', occurredAt: '2026-09-04T13:30:00.000Z', reason: '<p><strong>Unidades vencidas</strong> identificadas na conferência.</p>', physicalQuantityAfter: 3, availableQuantityAfter: 0 }
]

export const mockFrozenLabelPrintHistory: FrozenLabelPrintRecord[] = [
  { id: 'imp-1001', lotId: 'lote-2026-0814-a', copies: 18, occurredAt: '2026-06-14T15:05:00.000Z', responsibleName: 'Marina Lopes', status: 'success' },
  { id: 'imp-1002', lotId: 'lote-2026-0818-a', copies: 24, occurredAt: '2026-08-17T15:04:00.000Z', responsibleName: 'Carlos Mendes', status: 'success' }
]

let sessionConfigurations = structuredClone(mockFrozenConfigurations)
let sessionLots = structuredClone(mockFrozenLots)
let sessionMovements = structuredClone(mockFrozenMovements)
let sessionPrintHistory = structuredClone(mockFrozenLabelPrintHistory)

export function getFrozenConfigurations() { return structuredClone(sessionConfigurations) }
export function getFrozenLots() { return structuredClone(sessionLots) }
export function getFrozenMovements() { return structuredClone(sessionMovements) }
export function getFrozenLabelPrintHistory() { return structuredClone(sessionPrintHistory) }

export function saveFrozenConfiguration(configuration: FrozenConfiguration) {
  if (!getProducible(configuration.producibleItemId))
    throw new Error('O item produzível selecionado não está disponível.')
  if (!(configuration.quantityPerUnit > 0) || !(configuration.unitPrice > 0))
    throw new Error('A apresentação e o preço devem ser maiores que zero.')
  const duplicated = sessionConfigurations.some(item =>
    item.id !== configuration.id
    && item.producibleItemId === configuration.producibleItemId
    && item.quantityPerUnit === configuration.quantityPerUnit
    && item.unit === configuration.unit)
  if (duplicated) throw new Error('Este item já possui uma configuração com a mesma apresentação.')
  sessionConfigurations = [structuredClone(configuration), ...sessionConfigurations.filter(item => item.id !== configuration.id)]
}

export function createFrozenProductionEntry(input: {
  frozenConfigurationId: string
  manufacturedOn: string
  producedQuantity: number
  responsibleName: string
}) {
  const configuration = sessionConfigurations.find(item => item.id === input.frozenConfigurationId && item.active)
  if (!configuration) throw new Error('Configuração de congelado indisponível.')
  if (!(Number(input.producedQuantity) > 0)) throw new Error('Quantidade produzida inválida.')
  const sameDayCount = sessionLots.filter(lot => lot.manufacturedOn === input.manufacturedOn).length
  const lotId = `lote-${input.manufacturedOn.replaceAll('-', '')}-${String(sameDayCount + 1).padStart(2, '0')}`
  const expiresOn = calculateFrozenExpiration(input.manufacturedOn)
  const producibleName = getProducible(configuration.producibleItemId)?.name ?? 'Produzível não encontrado'
  const labelSnapshot: FrozenProductLabelSnapshot = {
    lotId,
    producibleName,
    presentation: configuration.presentation,
    manufacturedOn: input.manufacturedOn,
    expiresOn
  }
  const lot: FrozenLot = {
    id: lotId,
    frozenConfigurationId: configuration.id,
    manufacturedOn: input.manufacturedOn,
    expiresOn,
    producedQuantity: Number(input.producedQuantity),
    physicalQuantity: Number(input.producedQuantity),
    availableQuantity: Number(input.producedQuantity),
    labelSnapshot
  }
  const movement: FrozenStockMovement = {
    id: `mov-${lot.id}-entrada`,
    lotId: lot.id,
    type: 'entrada-producao',
    quantity: lot.producedQuantity,
    responsibleName: input.responsibleName,
    occurredAt: new Date().toISOString(),
    physicalQuantityAfter: lot.physicalQuantity,
    availableQuantityAfter: lot.availableQuantity
  }
  sessionLots = [lot, ...sessionLots]
  sessionMovements = [movement, ...sessionMovements]
  return { lot: structuredClone(lot), movement: structuredClone(movement) }
}

export function getFrozenLotStatus(lot: FrozenLot): FrozenLotStatus {
  if (lot.expiresOn < reviewDate) return 'vencido'
  if (lot.availableQuantity === 0) return 'esgotado'
  if (lot.expiresOn <= nearExpirationLimit) return 'proximo-vencimento'
  return 'disponivel'
}

export function getFrozenLotDetail(lotId?: string): FrozenLotDetail | undefined {
  const lot = sessionLots.find(item => item.id === lotId)
  if (!lot) return undefined
  const configuration = sessionConfigurations.find(item => item.id === lot.frozenConfigurationId)
  if (!configuration) return undefined
  return structuredClone({
    lot,
    configuration,
    producibleName: lot.labelSnapshot.producibleName,
    status: getFrozenLotStatus(lot),
    movements: sessionMovements
      .filter(item => item.lotId === lot.id)
      .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt)),
    printHistory: sessionPrintHistory
      .filter(item => item.lotId === lot.id)
      .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
  })
}

export function recordFrozenStockAdjustment(input: {
  lotId: string
  quantity: number
  reason: string
  responsibleName: string
  type: 'ajuste-manual' | 'descarte-vencimento'
}) {
  const lotIndex = sessionLots.findIndex(item => item.id === input.lotId)
  const lot = sessionLots[lotIndex]
  if (!lot) throw new Error('Lote não encontrado.')
  if (!input.reason.trim()) throw new Error('Informe o motivo da movimentação.')

  const balances = input.type === 'descarte-vencimento'
    ? applyFrozenDiscard(lot, input.quantity)
    : applyFrozenAdjustment(lot, input.quantity, lot.expiresOn >= reviewDate)
  const signedQuantity = input.type === 'descarte-vencimento' ? -input.quantity : input.quantity
  const updatedLot = { ...lot, ...balances }
  const movement: FrozenStockMovement = {
    id: `mov-${Date.now()}`,
    lotId: lot.id,
    type: input.type,
    quantity: signedQuantity,
    responsibleName: input.responsibleName,
    occurredAt: new Date().toISOString(),
    reason: input.reason.trim(),
    physicalQuantityAfter: balances.physicalQuantity,
    availableQuantityAfter: balances.availableQuantity
  }
  sessionLots.splice(lotIndex, 1, updatedLot)
  sessionMovements = [movement, ...sessionMovements]
  return { lot: structuredClone(updatedLot), movement: structuredClone(movement) }
}

export function recordFrozenLabelPrint(input: Omit<FrozenLabelPrintRecord, 'id' | 'occurredAt'>) {
  const record: FrozenLabelPrintRecord = {
    ...input,
    id: `imp-${Date.now()}`,
    occurredAt: new Date().toISOString()
  }
  sessionPrintHistory = [record, ...sessionPrintHistory]
  return structuredClone(record)
}

export function getFrozenStockSummaries(): FrozenStockSummary[] {
  return sessionConfigurations.map(configuration => {
    const lots = sessionLots.filter(lot => lot.frozenConfigurationId === configuration.id)
    const eligibleLots = configuration.active
      ? lots.filter(lot => lot.expiresOn >= reviewDate && lot.availableQuantity > 0)
      : []
    const availableQuantity = eligibleLots.reduce((total, lot) => total + lot.availableQuantity, 0)
    const nextLot = [...eligibleLots].sort((first, second) => first.expiresOn.localeCompare(second.expiresOn))[0]
    const nextExpiration = nextLot?.expiresOn
    const hasNearExpiration = eligibleLots.some(lot => getFrozenLotStatus(lot) === 'proximo-vencimento')

    return {
      configuration,
      producibleName: getProducible(configuration.producibleItemId)?.name ?? 'Produzível não encontrado',
      availableQuantity,
      physicalQuantity: lots.reduce((total, lot) => total + lot.physicalQuantity, 0),
      lotCount: lots.length,
      nextExpiration,
      nextLotId: nextLot?.id,
      status: !configuration.active
        ? 'configuracao-inativa'
        : availableQuantity === 0 ? 'esgotado' : hasNearExpiration ? 'proximo-vencimento' : 'disponivel'
    }
  })
}

export function getFrozenExpirationSummaries(): FrozenExpirationSummary[] {
  return sessionLots
    .map(lot => {
      const configuration = sessionConfigurations.find(item => item.id === lot.frozenConfigurationId)
      if (!configuration) return undefined
      return {
        lot,
        configuration,
        producibleName: getProducible(configuration.producibleItemId)?.name ?? 'Produzível não encontrado',
        status: getFrozenLotStatus(lot)
      }
    })
    .filter((item): item is FrozenExpirationSummary => Boolean(item))
    .sort((first, second) =>
      first.lot.expiresOn.localeCompare(second.lot.expiresOn)
      || first.lot.manufacturedOn.localeCompare(second.lot.manufacturedOn)
      || first.lot.id.localeCompare(second.lot.id))
}
