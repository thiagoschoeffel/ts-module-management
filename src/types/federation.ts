import type { AuthenticatedApiRequest } from './frozenStock'
import type { CatalogPage, DeliveryDriverPage, FrozenPage, ManagementSection, ProduciblePage, UserPage } from './management'

export interface ManagementPageProps {
  section?: ManagementSection
  produciblePage?: ProduciblePage
  producibleId?: string
  catalogPage?: CatalogPage
  offerId?: string
  frozenPage?: FrozenPage
  frozenLotId?: string
  apiRequest?: AuthenticatedApiRequest
  deliveryDriverPage?: DeliveryDriverPage
  deliveryDriverId?: string
  userPage?: UserPage
  userId?: string
}
