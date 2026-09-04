import type { MeasurementUnit } from './producible'

export type FrozenStockTab = 'estoque' | 'produtos' | 'vencimentos'
export type FrozenLotStatus = 'disponivel' | 'proximo-vencimento' | 'vencido' | 'esgotado' | 'configuracao-inativa'
export type FrozenMovementType = 'entrada-producao' | 'saida-pedido' | 'estorno-pedido' | 'ajuste-manual' | 'descarte-vencimento'
export type FrozenLabelPrintStatus = 'success' | 'error'

export interface FrozenConfiguration {
  id: string
  producibleItemId: string
  presentation: string
  quantityPerUnit: number
  unit: MeasurementUnit
  unitPrice: number
  active: boolean
}

export interface FrozenLot {
  id: string
  frozenConfigurationId: string
  manufacturedOn: string
  expiresOn: string
  producedQuantity: number
  physicalQuantity: number
  availableQuantity: number
  labelSnapshot: FrozenProductLabelSnapshot
}

export interface FrozenStockMovement {
  id: string
  lotId: string
  type: FrozenMovementType
  quantity: number
  responsibleName: string
  occurredAt: string
  reason?: string
  physicalQuantityAfter: number
  availableQuantityAfter: number
}

export interface FrozenProductLabelSnapshot {
  lotId: string
  producibleName: string
  presentation: string
  manufacturedOn: string
  expiresOn: string
}

export interface FrozenLabelPrintRecord {
  id: string
  lotId: string
  copies: number
  occurredAt: string
  responsibleName: string
  status: FrozenLabelPrintStatus
  errorMessage?: string
}

export interface FrozenLotDetail {
  lot: FrozenLot
  configuration: FrozenConfiguration
  producibleName: string
  status: FrozenLotStatus
  movements: FrozenStockMovement[]
  printHistory: FrozenLabelPrintRecord[]
}

export interface FrozenStockSummary {
  configuration: FrozenConfiguration
  producibleName: string
  availableQuantity: number
  physicalQuantity: number
  lotCount: number
  nextExpiration?: string
  nextLotId?: string
  status: FrozenLotStatus
}

export interface FrozenExpirationSummary {
  lot: FrozenLot
  configuration: FrozenConfiguration
  producibleName: string
  status: FrozenLotStatus
}
