import { mockDeliveryDrivers } from './deliveryDrivers'
import type { DeliveryDriver } from '../types/deliveryDriver'

export const deliveryDriverStorageKey = 'ts-management-delivery-drivers-v1'

function savedDeliveryDrivers(): DeliveryDriver[] {
  try {
    const value = localStorage.getItem(deliveryDriverStorageKey)
    return value ? JSON.parse(value) as DeliveryDriver[] : []
  }
  catch {
    return []
  }
}

function persist(drivers: DeliveryDriver[]) {
  try { localStorage.setItem(deliveryDriverStorageKey, JSON.stringify(drivers)) }
  catch { /* A demonstração continua utilizável sem persistência. */ }
}

export function getDeliveryDrivers(): DeliveryDriver[] {
  const saved = savedDeliveryDrivers()
  const savedIds = new Set(saved.map(driver => driver.id))
  return structuredClone([...saved, ...mockDeliveryDrivers.filter(driver => !savedIds.has(driver.id))])
}

export function getDeliveryDriver(driverId?: string) {
  return driverId ? getDeliveryDrivers().find(driver => driver.id === driverId) : undefined
}

export function saveDeliveryDriver(driver: DeliveryDriver) {
  const saved = savedDeliveryDrivers().filter(current => current.id !== driver.id)
  persist([structuredClone(driver), ...saved])
}

export function nextDeliveryDriverId() {
  const numbers = getDeliveryDrivers().map(driver => Number(driver.id.replace(/\D/g, ''))).filter(Number.isFinite)
  return `ent-${Math.max(1000, ...numbers) + 1}`
}
