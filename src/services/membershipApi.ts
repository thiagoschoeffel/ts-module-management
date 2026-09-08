import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import type { AuthenticatedApiRequest } from '../types/frozenStock'
import type { ManagementUser, UserRole } from '../types/user'

export interface MembershipRepository {
  readonly users: DeepReadonly<Ref<ManagementUser[]>>
  load(): Promise<void>
  get(id?: string): ManagementUser | undefined
  save(user: ManagementUser): Promise<void>
  hasAccessId(accessId: string, exceptId?: string): boolean
}

interface ApiMembership { userId: string, displayName: string, email: string | null, role: 'Owner' | 'Administrator' | 'Operator' | 'DeliveryDriver', isActive: boolean, version: number }
const toRole = (role: ApiMembership['role']): UserRole => role === 'Owner' ? 'owner' : role === 'DeliveryDriver' ? 'delivery-driver' : role === 'Operator' ? 'operator' : 'administrator'
const toApiRole = (role: UserRole) => role === 'owner' ? 'Owner' : role === 'delivery-driver' ? 'DeliveryDriver' : role === 'operator' ? 'Operator' : 'Administrator'
const map = (item: ApiMembership): ManagementUser => ({ id: item.userId, name: item.displayName, accessId: item.email ?? 'E-mail não vinculado', role: toRole(item.role), active: item.isActive, version: item.version })

export function createMembershipRepository(request: AuthenticatedApiRequest): MembershipRepository {
  const users = ref<ManagementUser[]>([])
  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await request(path, init)
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string, title?: string }
      throw new Error(problem.detail ?? problem.title ?? 'Não foi possível concluir a operação.')
    }
    return response.json() as Promise<T>
  }
  async function load() { users.value = (await json<ApiMembership[]>('/api/memberships')).map(map) }
  return {
    users: readonly(users),
    load,
    get: id => id ? users.value.find(user => user.id === id) : undefined,
    hasAccessId: (value, exceptId) => users.value.some(user => user.id !== exceptId && user.accessId.toLocaleLowerCase('pt-BR') === value.trim().toLocaleLowerCase('pt-BR')),
    async save(user) {
      const existing = users.value.some(item => item.id === user.id)
      await json<ApiMembership | { id: string }>(existing ? `/api/memberships/${encodeURIComponent(user.id)}` : '/api/membership-invitations', {
        method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { role: toApiRole(user.role), isActive: user.active, expectedVersion: user.version }
          : { email: user.accessId, role: toApiRole(user.role) })
      })
      await load()
    }
  }
}
