import type { AuthenticatedApiRequest } from '../types/frozenStock'
import type { DeliveryDriver } from '../types/deliveryDriver'

let request: AuthenticatedApiRequest | undefined
let drivers: DeliveryDriver[] = []

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  if (!request) throw new Error('A sessão autenticada da API não está disponível.')
  const response = await request(path, init)
  if (!response.ok) {
    try { const problem = await response.json() as { detail?: string, title?: string }; throw new Error(problem.detail ?? problem.title ?? 'Não foi possível concluir a operação.') }
    catch (error) { if (error instanceof Error) throw error; throw new Error('Não foi possível concluir a operação.') }
  }
  return response.json() as Promise<T>
}

interface LogisticsResponse { drivers: DeliveryDriver[] }
export async function configureLogisticsApi(apiRequest: AuthenticatedApiRequest) { request = apiRequest; await reloadDeliveryDrivers() }
export async function reloadDeliveryDrivers() { const data = await json<LogisticsResponse>('/api/logistics'); drivers = data.drivers }
export function getDeliveryDrivers() { return structuredClone(drivers) }
export function getDeliveryDriver(id?: string) { return id ? drivers.find(item => item.id === id) : undefined }
export async function saveDeliveryDriver(driver: DeliveryDriver) {
  const existing = drivers.find(item => item.id === driver.id)
  const saved = await json<DeliveryDriver>(existing ? `/api/delivery-drivers/${driver.id}` : '/api/delivery-drivers', {
    method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identification: driver.identification, name: driver.name, phone: driver.phone, isActive: driver.isActive, isAvailable: driver.isAvailable, expectedVersion: existing?.version })
  })
  await reloadDeliveryDrivers(); return saved
}
