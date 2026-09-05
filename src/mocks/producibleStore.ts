import { mockProducibles } from './producibles'
import type { CompositionComponent, ProducibleItemDetail, ProducibleItemSummary } from '../types/producible'
import type { AuthenticatedApiRequest } from '../types/frozenStock'

let apiRequest: AuthenticatedApiRequest | undefined
let authoritative: ProducibleItemDetail[] | undefined
interface ApiProducible { id: string; name: string; compositions: Array<{ version: number; publishedAt: string; components: Array<{ id?: string; name: string; quantity: number; measurementUnit: string; referencedProducibleItemId?: string; kind: string }> }> }
async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiRequest) throw new Error('A API de Produzíveis não foi configurada.')
  const response = await apiRequest(path, init)
  if (!response.ok) { const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string }; throw new Error(problem.detail ?? problem.title ?? 'Não foi possível concluir a operação.') }
  return response.json() as Promise<T>
}
export async function configureProducibleApi(request?: AuthenticatedApiRequest) {
  apiRequest = request
  if (!request) { authoritative = undefined; return }
  const result = await apiJson<ApiProducible[]>('/api/production/items')
  authoritative = result.map(item => ({ id: item.id, name: item.name, compositions: item.compositions.map((composition, index) => ({
    version: composition.version, createdAt: composition.publishedAt, isCurrent: index === 0,
    components: composition.components.map((component, componentIndex) => ({ id: component.id ?? `${item.id}-${composition.version}-${componentIndex}`,
      kind: component.kind === 'ProducibleItem' ? 'producible-item' : 'ingredient', referenceId: component.referencedProducibleItemId,
      name: component.name, quantity: component.quantity, unit: component.measurementUnit as CompositionComponent['unit'] })) })) }))
  window.dispatchEvent(new CustomEvent('producibles-updated'))
}

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
  if (authoritative) return structuredClone(authoritative)
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

export async function createProducible(name: string, components: CompositionComponent[]) {
  if (apiRequest) {
    const created = await apiJson<{ id: string }>('/api/production/items/configured', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category: 'Preparação', measurementUnit: 'un', isActive: true }) })
    if (components.length) await publishComposition(created.id, components)
    await configureProducibleApi(apiRequest)
    return getProducible(created.id)!
  }
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

export async function updateProducibleName(id: string, name: string) {
  if (apiRequest) {
    await apiJson(`/api/production/items/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category: 'Preparação', measurementUnit: 'un', isActive: true }) })
    await configureProducibleApi(apiRequest); return getProducible(id)
  }
  const item = getProducible(id)
  if (!item) return undefined
  item.name = name
  saveProducible(item)
  return item
}

async function publishComposition(id: string, components: CompositionComponent[]) {
  return apiJson(`/api/production/items/${id}/compositions`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ components: components.map(component => ({ name: component.name, quantity: component.quantity,
      measurementUnit: component.unit, dietaryMarkers: [], referencedProducibleItemId: component.kind === 'producible-item' ? component.referenceId : undefined,
      kind: component.kind === 'producible-item' ? 'ProducibleItem' : 'Ingredient' })) }) })
}
export async function addCompositionVersion(id: string, components: CompositionComponent[]) {
  if (apiRequest) { await publishComposition(id, components); await configureProducibleApi(apiRequest); return getProducible(id) }
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
