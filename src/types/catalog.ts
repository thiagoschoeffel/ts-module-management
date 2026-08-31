import type { MeasurementUnit } from './producible'

export type CatalogSection = 'ofertas' | 'tipos-componentes' | 'adicionais'

export interface ComponentType {
  id: string
  name: string
  description?: string
  active: boolean
}

export interface CatalogAddon {
  id: string
  name: string
  price: number
  producibleItemId?: string
  operationalQuantity?: number
  operationalUnit?: MeasurementUnit
  active: boolean
}

export interface OfferComponent {
  id: string
  componentTypeId: string
  quantity: number
}

export interface OfferChoiceOption {
  id: string
  componentTypeId: string
  surcharge: number
}

export interface OfferChoiceGroup {
  id: string
  name: string
  minSelections: number
  maxSelections: number
  options: OfferChoiceOption[]
}

export interface Offer {
  id: string
  name: string
  description?: string
  basePrice: number
  active: boolean
  requiresMenuChoice: boolean
  components: OfferComponent[]
  choiceGroups: OfferChoiceGroup[]
  allowedAddonIds: string[]
}
