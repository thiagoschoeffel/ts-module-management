import { mockProducibles } from './producibles'
import type { CompositionComponent, ProducibleItemDetail, ProducibleItemSummary } from '../types/producible'

const storageKey = 'ts-management-producibles-v1'

function savedProducibles(): ProducibleItemDetail[] {
  try {
    const value = localStorage.getItem(storageKey)
    return value ? JSON.parse(value) as ProducibleItemDetail[] : []
  }
  catch {
    return []
  }
}

function persist(items: ProducibleItemDetail[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(items)) }
  catch { /* A demonstração continua utilizável sem persistência. */ }
}

export function getProducibles(): ProducibleItemDetail[] {
  const saved = savedProducibles()
  const savedIds = new Set(saved.map(item => item.id))
  return structuredClone([...saved, ...mockProducibles.filter(item => !savedIds.has(item.id))])
}

export function getProducible(producibleId?: string) {
  return producibleId ? getProducibles().find(item => item.id === producibleId) : undefined
}

export function getCurrentComposition(item?: ProducibleItemDetail) {
  return item?.compositions.find(composition => composition.isCurrent)
    ?? [...(item?.compositions ?? [])].sort((a, b) => b.version - a.version)[0]
}

export function getProducibleSummaries(): ProducibleItemSummary[] {
  return getProducibles().map(item => {
    const current = getCurrentComposition(item)
    return {
      id: item.id,
      name: item.name,
      currentCompositionVersion: current?.version,
      componentCount: current?.components.length
    }
  })
}

export function saveProducible(item: ProducibleItemDetail) {
  const saved = savedProducibles().filter(current => current.id !== item.id)
  persist([structuredClone(item), ...saved])
}

export function createProducible(name: string, components: CompositionComponent[]) {
  const item: ProducibleItemDetail = {
    id: nextProducibleId(),
    name,
    compositions: components.length ? [{
      version: 1,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      components: structuredClone(components)
    }] : []
  }
  saveProducible(item)
  return item
}

export function updateProducibleName(id: string, name: string) {
  const item = getProducible(id)
  if (!item) return undefined
  item.name = name
  saveProducible(item)
  return item
}

export function addCompositionVersion(id: string, components: CompositionComponent[]) {
  const item = getProducible(id)
  if (!item) return undefined
  const nextVersion = Math.max(0, ...item.compositions.map(composition => composition.version)) + 1
  item.compositions = [
    ...item.compositions.map(composition => ({ ...composition, isCurrent: false })),
    {
      version: nextVersion,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      components: structuredClone(components)
    }
  ]
  saveProducible(item)
  return item
}

export function nextProducibleId() {
  const numbers = getProducibles().map(item => Number(item.id.replace(/\D/g, ''))).filter(Number.isFinite)
  return `prod-${Math.max(1000, ...numbers) + 1}`
}
