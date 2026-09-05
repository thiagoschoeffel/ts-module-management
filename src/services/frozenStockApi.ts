import type {
  AuthenticatedApiRequest,
  FrozenConfiguration,
  FrozenExpirationSummary,
  FrozenLot,
  FrozenLotDetail,
  FrozenLotStatus,
  FrozenMovementType,
  FrozenStockManagementSnapshot,
  FrozenStockMovement,
  FrozenStockSummary
} from '../types/frozenStock'

type ApiMeasurementUnit = 'Gram' | 'Milliliter' | 'Unit'
type ApiStatus = 'available' | 'near-expiration' | 'expired' | 'depleted' | 'configuration-inactive'
type ApiMovementType = 'ProductionEntry' | 'OrderExit' | 'OrderReversal' | 'ManualAdjustment' | 'ExpirationDisposal'

interface ApiConfiguration {
  id: string
  offerId: string
  producibleItemId: string
  producibleName: string
  presentation: string
  quantityPerUnit: number
  measurementUnit: ApiMeasurementUnit
  unitPrice: number
  isActive: boolean
}

interface ApiLot {
  id: string
  frozenConfigurationId: string
  manufacturedOn: string
  expiresOn: string
  producedQuantity: number
  physicalQuantity: number
  availableQuantity: number
  labelSnapshot: {
    lotId: string
    producibleName: string
    presentation: string
    manufacturedOn: string
    expiresOn: string
  }
}

interface ApiMovement {
  id: string
  lotId: string
  type: ApiMovementType
  quantity: number
  responsibleName: string
  occurredAt: string
  reason?: string
  physicalQuantityAfter: number
  availableQuantityAfter: number
}

interface ApiManagementSnapshot {
  frozenOfferId?: string
  producibles: Array<{ id: string, name: string, isActive: boolean }>
  configurations: ApiConfiguration[]
  stock: Array<{
    configuration: ApiConfiguration
    producibleName: string
    availableQuantity: number
    physicalQuantity: number
    lotCount: number
    nextExpiration?: string
    nextLotId?: string
    status: ApiStatus
  }>
  expirations: Array<{
    lot: ApiLot
    configuration: ApiConfiguration
    producibleName: string
    status: ApiStatus
  }>
}

interface ApiLotDetail {
  lot: ApiLot
  configuration: ApiConfiguration
  producibleName: string
  status: ApiStatus
  movements: ApiMovement[]
}

function mapUnit(unit: ApiMeasurementUnit): FrozenConfiguration['unit'] {
  return ({ Gram: 'g', Milliliter: 'ml', Unit: 'un' } as const)[unit]
}

function toApiUnit(unit: FrozenConfiguration['unit']): ApiMeasurementUnit {
  const mapped = ({ g: 'Gram', ml: 'Milliliter', un: 'Unit' } as const)[unit as 'g' | 'ml' | 'un']
  if (!mapped) throw new Error('A unidade de medida selecionada não é aceita pela API.')
  return mapped
}

function mapStatus(status: ApiStatus): FrozenLotStatus {
  return ({
    available: 'disponivel',
    'near-expiration': 'proximo-vencimento',
    expired: 'vencido',
    depleted: 'esgotado',
    'configuration-inactive': 'configuracao-inativa'
  } as const)[status]
}

function mapMovementType(type: ApiMovementType): FrozenMovementType {
  return ({
    ProductionEntry: 'entrada-producao',
    OrderExit: 'saida-pedido',
    OrderReversal: 'estorno-pedido',
    ManualAdjustment: 'ajuste-manual',
    ExpirationDisposal: 'descarte-vencimento'
  } as const)[type]
}

function mapConfiguration(item: ApiConfiguration): FrozenConfiguration {
  return {
    id: item.id,
    offerId: item.offerId,
    producibleItemId: item.producibleItemId,
    producibleName: item.producibleName,
    presentation: item.presentation,
    quantityPerUnit: item.quantityPerUnit,
    unit: mapUnit(item.measurementUnit),
    unitPrice: item.unitPrice,
    active: item.isActive
  }
}

function mapLot(item: ApiLot): FrozenLot {
  return { ...item, labelSnapshot: item.labelSnapshot }
}

function mapMovement(item: ApiMovement): FrozenStockMovement {
  return { ...item, type: mapMovementType(item.type) }
}

async function apiError(response: Response) {
  let message = 'Não foi possível concluir a operação.'
  try {
    const problem = await response.json() as {
      detail?: string
      title?: string
      errors?: Record<string, string[]>
    }
    message = problem.detail ?? Object.values(problem.errors ?? {})[0]?.[0] ?? problem.title ?? message
  }
  catch { /* resposta sem Problem Details */ }
  return new Error(message)
}

async function json<T>(request: AuthenticatedApiRequest, path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)
  if (!response.ok) throw await apiError(response)
  return response.json() as Promise<T>
}

const jsonHeaders = { 'Content-Type': 'application/json' }

export async function loadFrozenStock(
  request: AuthenticatedApiRequest
): Promise<FrozenStockManagementSnapshot> {
  const result = await json<ApiManagementSnapshot>(request, '/api/frozen-stock')
  return {
    frozenOfferId: result.frozenOfferId,
    producibles: result.producibles.map(item => ({ id: item.id, name: item.name, active: item.isActive })),
    configurations: result.configurations.map(mapConfiguration),
    stock: result.stock.map<FrozenStockSummary>(item => ({
      ...item,
      configuration: mapConfiguration(item.configuration),
      status: mapStatus(item.status)
    })),
    expirations: result.expirations.map<FrozenExpirationSummary>(item => ({
      ...item,
      lot: mapLot(item.lot),
      configuration: mapConfiguration(item.configuration),
      status: mapStatus(item.status)
    }))
  }
}

export async function loadFrozenLot(
  request: AuthenticatedApiRequest,
  lotId: string
): Promise<FrozenLotDetail> {
  const result = await json<ApiLotDetail>(request, `/api/frozen-stock/lots/${encodeURIComponent(lotId)}`)
  return {
    ...result,
    lot: mapLot(result.lot),
    configuration: mapConfiguration(result.configuration),
    status: mapStatus(result.status),
    movements: result.movements.map(mapMovement),
    printHistory: []
  }
}

export async function previewFrozenExpiration(
  request: AuthenticatedApiRequest,
  manufacturedOn: string
) {
  const result = await json<{ manufacturedOn: string, expiresOn: string }>(
    request,
    `/api/frozen-stock/expiration?manufacturedOn=${encodeURIComponent(manufacturedOn)}`
  )
  return result.expiresOn
}

export async function createFrozenConfiguration(
  request: AuthenticatedApiRequest,
  input: Omit<FrozenConfiguration, 'id' | 'producibleName'>
) {
  const response = await request('/api/frozen-stock/configurations', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      offerId: input.offerId,
      producibleItemId: input.producibleItemId,
      presentation: input.presentation,
      quantityPerUnit: input.quantityPerUnit,
      measurementUnit: toApiUnit(input.unit),
      unitPrice: input.unitPrice
    })
  })
  if (!response.ok) throw await apiError(response)
}

export async function updateFrozenConfiguration(
  request: AuthenticatedApiRequest,
  configurationId: string,
  input: { unitPrice: number, active: boolean }
) {
  const response = await request(`/api/frozen-stock/configurations/${encodeURIComponent(configurationId)}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ unitPrice: input.unitPrice, isActive: input.active })
  })
  if (!response.ok) throw await apiError(response)
}

export async function registerFrozenProduction(
  request: AuthenticatedApiRequest,
  input: { frozenConfigurationId: string, manufacturedOn: string, producedQuantity: number, idempotencyKey?: string }
) {
  const result = await json<{ frozenLotId: string }>(request, '/api/frozen-stock/production-entries', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': input.idempotencyKey ?? crypto.randomUUID() },
    body: JSON.stringify({
      frozenConfigurationId: input.frozenConfigurationId,
      manufacturedOn: input.manufacturedOn,
      producedQuantity: input.producedQuantity
    })
  })
  return loadFrozenLot(request, result.frozenLotId)
}

export async function registerFrozenMovement(
  request: AuthenticatedApiRequest,
  lotId: string,
  input: { type: 'adjust' | 'discard', quantity: number, reason: string, idempotencyKey?: string }
) {
  const response = await request(`/api/frozen-stock/lots/${encodeURIComponent(lotId)}/movements`, {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': input.idempotencyKey ?? crypto.randomUUID() },
    body: JSON.stringify({
      type: input.type === 'adjust' ? 'ManualAdjustment' : 'ExpirationDisposal',
      quantity: input.quantity,
      reason: input.reason
    })
  })
  if (!response.ok) throw await apiError(response)
}
