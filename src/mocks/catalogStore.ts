import { mockCatalogAddons, mockComponentTypes, mockOffers } from './catalog'
import type { CatalogAddon, ComponentType, Offer } from '../types/catalog'

const keys = {
  offers: 'ts-management-catalog-offers-v1',
  componentTypes: 'ts-management-catalog-component-types-v1',
  addons: 'ts-management-catalog-addons-v1'
}

function read<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed as T[] : []
  }
  catch { return [] }
}

function merged<T extends { id: string }>(key: string, baseline: T[]) {
  const saved = read<T>(key)
  const savedIds = new Set(saved.map(item => item.id))
  return structuredClone([...saved, ...baseline.filter(item => !savedIds.has(item.id))])
}

function save<T extends { id: string }>(key: string, value: T) {
  const saved = read<T>(key).filter(item => item.id !== value.id)
  try { localStorage.setItem(key, JSON.stringify([structuredClone(value), ...saved])) }
  catch { /* A demonstração continua utilizável sem persistência. */ }
}

function nextId(prefix: string, records: { id: string }[]) {
  const numbers = records.map(item => Number(item.id.replace(/\D/g, ''))).filter(Number.isFinite)
  return `${prefix}-${Math.max(1000, ...numbers) + 1}`
}

export function getOffers() { return merged(keys.offers, mockOffers) }
export function getOffer(id?: string) { return id ? getOffers().find(item => item.id === id) : undefined }
export function saveOffer(offer: Offer) { save(keys.offers, offer) }
export function nextOfferId() { return nextId('oferta', getOffers()) }

export function getComponentTypes() { return merged(keys.componentTypes, mockComponentTypes) }
export function getComponentType(id?: string) { return id ? getComponentTypes().find(item => item.id === id) : undefined }
export function saveComponentType(item: ComponentType) { save(keys.componentTypes, item) }
export function nextComponentTypeId() { return nextId('tipo', getComponentTypes()) }

export function getCatalogAddons() { return merged(keys.addons, mockCatalogAddons) }
export function getCatalogAddon(id?: string) { return id ? getCatalogAddons().find(item => item.id === id) : undefined }
export function saveCatalogAddon(item: CatalogAddon) { save(keys.addons, item) }
export function nextCatalogAddonId() { return nextId('adic', getCatalogAddons()) }

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
