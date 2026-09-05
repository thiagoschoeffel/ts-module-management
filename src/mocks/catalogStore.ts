import { mockCatalogAddons, mockComponentTypes, mockOffers } from './catalog'
import type { CatalogAddon, ComponentType, Offer } from '../types/catalog'
import type { AuthenticatedApiRequest } from '../types/frozenStock'

let apiRequest: AuthenticatedApiRequest | undefined
let authoritative: { offers: Offer[]; componentTypes: ComponentType[]; addons: CatalogAddon[] } | undefined

interface ApiCatalog {
  offers: Array<{ id: string; name: string; description?: string; basePrice: number; requiresMenuChoice: boolean; isActive: boolean; configuration: {
    components: Array<{ componentTypeId: string; quantity: number }>
    choiceGroups: Array<{ name: string; minimumSelections: number; maximumSelections: number; options: Array<{ componentTypeId: string; surcharge: number }> }>
    allowedAddonIds: string[]
  }}>
  componentTypes: Array<{ id: string; name: string; description?: string; isActive: boolean }>
  addons: Array<{ id: string; name: string; price: number; producibleItemId?: string; operationalQuantity?: number; measurementUnit?: string; isActive: boolean }>
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiRequest) throw new Error('A API de Catálogo não foi configurada.')
  const response = await apiRequest(path, init)
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string; errors?: Record<string, string[]> }
    throw new Error(problem.detail ?? Object.values(problem.errors ?? {})[0]?.[0] ?? problem.title ?? 'Não foi possível concluir a operação.')
  }
  return response.json() as Promise<T>
}

function mapApi(value: ApiCatalog) {
  authoritative = {
    offers: value.offers.map(offer => ({ id: offer.id, name: offer.name, description: offer.description, basePrice: offer.basePrice,
      active: offer.isActive, requiresMenuChoice: offer.requiresMenuChoice,
      components: offer.configuration.components.map((item, index) => ({ id: `${offer.id}-component-${index}`, ...item })),
      choiceGroups: offer.configuration.choiceGroups.map((group, groupIndex) => ({ id: `${offer.id}-group-${groupIndex}`, name: group.name,
        minSelections: group.minimumSelections, maxSelections: group.maximumSelections,
        options: group.options.map((item, optionIndex) => ({ id: `${offer.id}-group-${groupIndex}-option-${optionIndex}`, ...item })) })),
      allowedAddonIds: offer.configuration.allowedAddonIds })),
    componentTypes: value.componentTypes.map(item => ({ id: item.id, name: item.name, description: item.description, active: item.isActive })),
    addons: value.addons.map(item => ({ id: item.id, name: item.name, price: item.price, producibleItemId: item.producibleItemId,
      operationalQuantity: item.operationalQuantity, operationalUnit: item.measurementUnit as CatalogAddon['operationalUnit'], active: item.isActive }))
  }
  window.dispatchEvent(new CustomEvent('catalog-updated'))
}

export async function configureCatalogApi(request?: AuthenticatedApiRequest) {
  apiRequest = request
  if (!request) { authoritative = undefined; return }
  mapApi(await apiJson<ApiCatalog>('/api/catalog'))
}

const keys = {
  offers: 'ts-management-catalog-offers-v1',
  componentTypes: 'ts-management-catalog-component-types-v1',
  addons: 'ts-management-catalog-addons-v1'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isComponentType(value: unknown): value is ComponentType {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.description === undefined || typeof value.description === 'string')
    && typeof value.active === 'boolean'
}

function isCatalogAddon(value: unknown): value is CatalogAddon {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.price === 'number'
    && Number.isFinite(value.price)
    && (value.producibleItemId === undefined || typeof value.producibleItemId === 'string')
    && (value.operationalQuantity === undefined || (typeof value.operationalQuantity === 'number' && Number.isFinite(value.operationalQuantity)))
    && (value.operationalUnit === undefined || ['g', 'kg', 'ml', 'l', 'un'].includes(String(value.operationalUnit)))
    && typeof value.active === 'boolean'
}

function isOfferComponent(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.componentTypeId === 'string'
    && typeof value.quantity === 'number'
    && Number.isFinite(value.quantity)
}

function isChoiceOption(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.componentTypeId === 'string'
    && typeof value.surcharge === 'number'
    && Number.isFinite(value.surcharge)
}

function isChoiceGroup(value: unknown) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.minSelections === 'number'
    && Number.isFinite(value.minSelections)
    && typeof value.maxSelections === 'number'
    && Number.isFinite(value.maxSelections)
    && Array.isArray(value.options)
    && value.options.every(isChoiceOption)
}

function isOffer(value: unknown): value is Offer {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.description === undefined || typeof value.description === 'string')
    && typeof value.basePrice === 'number'
    && Number.isFinite(value.basePrice)
    && typeof value.active === 'boolean'
    && typeof value.requiresMenuChoice === 'boolean'
    && Array.isArray(value.components)
    && value.components.every(isOfferComponent)
    && Array.isArray(value.choiceGroups)
    && value.choiceGroups.every(isChoiceGroup)
    && Array.isArray(value.allowedAddonIds)
    && value.allowedAddonIds.every(id => typeof id === 'string')
}

function read<T>(key: string, validate: (value: unknown) => value is T): T[] {
  try {
    const value = localStorage.getItem(key)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter(validate) : []
  }
  catch { return [] }
}

function merged<T extends { id: string }>(key: string, baseline: T[], validate: (value: unknown) => value is T) {
  const saved = read(key, validate)
  const savedIds = new Set(saved.map(item => item.id))
  return structuredClone([...saved, ...baseline.filter(item => !savedIds.has(item.id))])
}

function save<T extends { id: string }>(key: string, value: T, validate: (value: unknown) => value is T) {
  const saved = read(key, validate).filter(item => item.id !== value.id)
  try { localStorage.setItem(key, JSON.stringify([structuredClone(value), ...saved])) }
  catch { /* A demonstração continua utilizável sem persistência. */ }
}

function nextId(prefix: string, records: { id: string }[]) {
  const numbers = records.map(item => Number(item.id.replace(/\D/g, ''))).filter(Number.isFinite)
  return `${prefix}-${Math.max(1000, ...numbers) + 1}`
}

export function getOffers() { return authoritative ? structuredClone(authoritative.offers) : merged(keys.offers, mockOffers, isOffer) }
export function getOffer(id?: string) { return id ? getOffers().find(item => item.id === id) : undefined }
export async function saveOffer(offer: Offer) {
  if (!apiRequest) { save(keys.offers, offer, isOffer); return offer }
  const exists = authoritative?.offers.some(item => item.id === offer.id)
  const result = await apiJson<ApiCatalog['offers'][number]>(exists ? `/api/catalog/offers/${offer.id}` : '/api/catalog/offers/configured', {
    method: exists ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: offer.name,
      description: offer.description, basePrice: offer.basePrice, fulfillmentMode: 'DailyProduction', requiresMenuChoice: offer.requiresMenuChoice,
      isActive: offer.active, components: offer.components.map(({ componentTypeId, quantity }) => ({ componentTypeId, quantity })),
      choiceGroups: offer.choiceGroups.map(group => ({ name: group.name, minimumSelections: group.minSelections, maximumSelections: group.maxSelections,
        options: group.options.map(({ componentTypeId, surcharge }) => ({ componentTypeId, surcharge })) })), allowedAddonIds: offer.allowedAddonIds })
  })
  await configureCatalogApi(apiRequest); return getOffer(result.id)!
}
export function nextOfferId() { return nextId('oferta', getOffers()) }

export function getComponentTypes() { return authoritative ? structuredClone(authoritative.componentTypes) : merged(keys.componentTypes, mockComponentTypes, isComponentType) }
export function getComponentType(id?: string) { return id ? getComponentTypes().find(item => item.id === id) : undefined }
export async function saveComponentType(item: ComponentType) {
  if (!apiRequest) { save(keys.componentTypes, item, isComponentType); return }
  const exists = authoritative?.componentTypes.some(value => value.id === item.id)
  await apiJson(exists ? `/api/catalog/component-types/${item.id}` : '/api/catalog/component-types', {
    method: exists ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, description: item.description, isActive: item.active }) })
  await configureCatalogApi(apiRequest)
}
export function nextComponentTypeId() { return nextId('tipo', getComponentTypes()) }

export function getCatalogAddons() { return authoritative ? structuredClone(authoritative.addons) : merged(keys.addons, mockCatalogAddons, isCatalogAddon) }
export function getCatalogAddon(id?: string) { return id ? getCatalogAddons().find(item => item.id === id) : undefined }
export async function saveCatalogAddon(item: CatalogAddon) {
  if (!apiRequest) { save(keys.addons, item, isCatalogAddon); return }
  const exists = authoritative?.addons.some(value => value.id === item.id)
  await apiJson(exists ? `/api/catalog/addons/${item.id}` : '/api/catalog/addons', { method: exists ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, price: item.price,
      producibleItemId: item.producibleItemId, operationalQuantity: item.operationalQuantity, measurementUnit: item.operationalUnit, isActive: item.active }) })
  await configureCatalogApi(apiRequest)
}
export function nextCatalogAddonId() { return nextId('adic', getCatalogAddons()) }

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
