export type CompositionComponentKind = 'ingredient' | 'producible-item'
export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'un'

export interface CompositionComponent {
  id: string
  kind: CompositionComponentKind
  referenceId?: string
  name: string
  quantity: number
  unit: MeasurementUnit
}

export interface CompositionVersion {
  version: number
  createdAt: string
  isCurrent: boolean
  components: CompositionComponent[]
}

export interface ProducibleItemDetail {
  id: string
  name: string
  compositions: CompositionVersion[]
}

export interface ProducibleItemSummary {
  id: string
  name: string
  currentCompositionVersion?: number
  componentCount?: number
}
