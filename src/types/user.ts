export type UserRole = 'administrator' | 'operator' | 'delivery-driver'

export interface ManagementUser {
  id: string
  name: string
  accessId: string
  role: UserRole
  active: boolean
}

export const userRoleLabels: Record<UserRole, string> = {
  administrator: 'Administrador',
  operator: 'Operador',
  'delivery-driver': 'Entregador'
}

export const userRoleBadgeVariants = {
  administrator: 'warning',
  operator: 'info',
  'delivery-driver': 'neutral'
} as const
