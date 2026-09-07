import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import type { AuthenticatedApiRequest } from '../types/frozenStock'
import type { DeliveryDriver } from '../types/deliveryDriver'

export interface DeliveryDriverRepository {
  readonly drivers: DeepReadonly<Ref<DeliveryDriver[]>>
  load(): Promise<void>
  get(id?: string): DeliveryDriver | undefined
  save(driver: DeliveryDriver): Promise<DeliveryDriver>
}

interface LogisticsResponse { drivers: DeliveryDriver[] }

export function createDeliveryDriverRepository(request: AuthenticatedApiRequest): DeliveryDriverRepository {
  const drivers = ref<DeliveryDriver[]>([])

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await request(path, init)
    if (!response.ok) {
      try {
        const problem = await response.json() as { detail?: string, title?: string }
        throw new Error(problem.detail ?? problem.title ?? 'Não foi possível concluir a operação.')
      }
      catch (error) {
        if (error instanceof Error) throw error
        throw new Error('Não foi possível concluir a operação.')
      }
    }
    return response.json() as Promise<T>
  }

  async function load() {
    const data = await json<LogisticsResponse>('/api/logistics')
    drivers.value = data.drivers
  }

  return {
    drivers: readonly(drivers),
    load,
    get: id => id ? drivers.value.find(item => item.id === id) : undefined,
    async save(driver) {
      const existing = drivers.value.find(item => item.id === driver.id)
      const saved = await json<DeliveryDriver>(existing ? `/api/delivery-drivers/${driver.id}` : '/api/delivery-drivers', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identification: driver.identification,
          name: driver.name,
          phone: driver.phone,
          isActive: driver.isActive,
          isAvailable: driver.isAvailable,
          expectedVersion: existing?.version
        })
      })
      await load()
      return saved
    }
  }
}
