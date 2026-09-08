export type UserRole = 'owner' | 'administrator' | 'operator' | 'delivery-driver'

export interface ManagementUser {
  id: string
  name: string
  accessId: string
  role: UserRole
  active: boolean
  version: number
}

export const userRoleLabels: Record<UserRole, string> = {
  owner: 'Proprietário',
  administrator: 'Administrador',
  operator: 'Operador',
  'delivery-driver': 'Entregador'
}

export const userRoleBadgeVariants = {
  owner: 'success',
  administrator: 'warning',
  operator: 'info',
  'delivery-driver': 'neutral'
} as const
