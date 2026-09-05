export interface DeliveryDriver {
  id: string
  identification: string
  name: string
  phone?: string
  isActive: boolean
  isAvailable: boolean
  version: number
}
