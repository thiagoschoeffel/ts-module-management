import { mockCatalogAddons, mockComponentTypes, mockOffers } from './catalog'
import type { CatalogAddon, ComponentType, Offer } from '../types/catalog'

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

export function getOffers() { return merged(keys.offers, mockOffers, isOffer) }
export function getOffer(id?: string) { return id ? getOffers().find(item => item.id === id) : undefined }
export function saveOffer(offer: Offer) { save(keys.offers, offer, isOffer) }
export function nextOfferId() { return nextId('oferta', getOffers()) }

export function getComponentTypes() { return merged(keys.componentTypes, mockComponentTypes, isComponentType) }
export function getComponentType(id?: string) { return id ? getComponentTypes().find(item => item.id === id) : undefined }
export function saveComponentType(item: ComponentType) { save(keys.componentTypes, item, isComponentType) }
export function nextComponentTypeId() { return nextId('tipo', getComponentTypes()) }

export function getCatalogAddons() { return merged(keys.addons, mockCatalogAddons, isCatalogAddon) }
export function getCatalogAddon(id?: string) { return id ? getCatalogAddons().find(item => item.id === id) : undefined }
export function saveCatalogAddon(item: CatalogAddon) { save(keys.addons, item, isCatalogAddon) }
export function nextCatalogAddonId() { return nextId('adic', getCatalogAddons()) }

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
