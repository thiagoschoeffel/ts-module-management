import type { ManagementUser } from '../types/user'
import { mockUsers } from './users'

export const userStorageKey = 'ts-management-users-v1'

function savedUsers(): ManagementUser[] {
  try {
    const value = localStorage.getItem(userStorageKey)
    return value ? JSON.parse(value) as ManagementUser[] : []
  }
  catch {
    return []
  }
}

function persist(users: ManagementUser[]) {
  try { localStorage.setItem(userStorageKey, JSON.stringify(users)) }
  catch { /* A demonstração continua utilizável sem persistência. */ }
}

export function getUsers(): ManagementUser[] {
  const saved = savedUsers()
  const savedIds = new Set(saved.map(user => user.id))
  return structuredClone([...saved, ...mockUsers.filter(user => !savedIds.has(user.id))])
}

export function getUser(userId?: string) {
  return userId ? getUsers().find(user => user.id === userId) : undefined
}

export function saveUser(user: ManagementUser) {
  const saved = savedUsers().filter(current => current.id !== user.id)
  persist([structuredClone(user), ...saved])
}

export function nextUserId() {
  const numbers = getUsers().map(user => Number(user.id.replace(/\D/g, ''))).filter(Number.isFinite)
  return `usr-${Math.max(1000, ...numbers) + 1}`
}

export function accessIdAlreadyExists(accessId: string, exceptUserId?: string) {
  const normalized = accessId.trim().toLocaleLowerCase('pt-BR')
  return getUsers().some(user => user.id !== exceptUserId && user.accessId.toLocaleLowerCase('pt-BR') === normalized)
}
