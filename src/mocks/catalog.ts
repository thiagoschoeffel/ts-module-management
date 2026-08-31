import type { CatalogAddon, ComponentType, Offer } from '../types/catalog'

export const mockComponentTypes: ComponentType[] = [
  { id: 'tipo-1001', name: 'Prato do dia', description: 'Papel principal resolvido pelo cardápio do dia.', active: true },
  { id: 'tipo-1002', name: 'Salada P', description: 'Porção pequena de salada.', active: true },
  { id: 'tipo-1003', name: 'Salada G', description: 'Porção grande de salada.', active: true },
  { id: 'tipo-1004', name: 'Fruta', active: true },
  { id: 'tipo-1005', name: 'Proteína', active: true },
  { id: 'tipo-1006', name: 'Sopa', description: 'Tipo preservado para ofertas antigas.', active: false }
]

export const mockCatalogAddons: CatalogAddon[] = [
  { id: 'adic-1001', name: 'Proteína extra', price: 8, producibleItemId: 'prod-1003', operationalQuantity: 120, operationalUnit: 'g', active: true },
  { id: 'adic-1002', name: 'Feijão extra', price: 4, operationalQuantity: 100, operationalUnit: 'g', active: true },
  { id: 'adic-1003', name: 'Molho extra', price: 2.5, producibleItemId: 'prod-1001', operationalQuantity: 50, operationalUnit: 'ml', active: true },
  { id: 'adic-1004', name: 'Croutons', price: 3, operationalQuantity: 30, operationalUnit: 'g', active: false }
]

export const mockOffers: Offer[] = [
  { id: 'oferta-1001', name: 'Prato do dia', description: 'Refeição principal do cardápio.', basePrice: 28, active: true, requiresMenuChoice: true, components: [{ id: 'oc-1001', componentTypeId: 'tipo-1001', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1001', 'adic-1002', 'adic-1003'] },
  { id: 'oferta-1002', name: 'Prato + Salada P', basePrice: 34, active: true, requiresMenuChoice: true, components: [{ id: 'oc-1002-a', componentTypeId: 'tipo-1001', quantity: 1 }, { id: 'oc-1002-b', componentTypeId: 'tipo-1002', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1001', 'adic-1003'] },
  { id: 'oferta-1003', name: 'Prato + Fruta', basePrice: 32, active: true, requiresMenuChoice: true, components: [{ id: 'oc-1003-a', componentTypeId: 'tipo-1001', quantity: 1 }, { id: 'oc-1003-b', componentTypeId: 'tipo-1004', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1001'] },
  { id: 'oferta-1004', name: 'Prato + Salada P + Fruta', basePrice: 38, active: true, requiresMenuChoice: true, components: [{ id: 'oc-1004-a', componentTypeId: 'tipo-1001', quantity: 1 }, { id: 'oc-1004-b', componentTypeId: 'tipo-1002', quantity: 1 }, { id: 'oc-1004-c', componentTypeId: 'tipo-1004', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1001', 'adic-1002', 'adic-1003'] },
  { id: 'oferta-1005', name: 'Prato + Salada ou Fruta', basePrice: 34, active: true, requiresMenuChoice: true, components: [{ id: 'oc-1005', componentTypeId: 'tipo-1001', quantity: 1 }], choiceGroups: [{ id: 'grupo-1005', name: 'Acompanhamento', minSelections: 1, maxSelections: 1, options: [{ id: 'op-1005-a', componentTypeId: 'tipo-1002', surcharge: 0 }, { id: 'op-1005-b', componentTypeId: 'tipo-1004', surcharge: 0 }, { id: 'op-1005-c', componentTypeId: 'tipo-1003', surcharge: 4 }] }], allowedAddonIds: ['adic-1001', 'adic-1003'] },
  { id: 'oferta-1006', name: 'Salada G', basePrice: 24, active: true, requiresMenuChoice: false, components: [{ id: 'oc-1006', componentTypeId: 'tipo-1003', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1001', 'adic-1003'] },
  { id: 'oferta-1007', name: 'Salada P + Proteína', basePrice: 29, active: false, requiresMenuChoice: false, components: [{ id: 'oc-1007-a', componentTypeId: 'tipo-1002', quantity: 1 }, { id: 'oc-1007-b', componentTypeId: 'tipo-1005', quantity: 1 }], choiceGroups: [], allowedAddonIds: ['adic-1003'] }
]
