import type { ManagementUser } from '../types/user'

export const mockUsers: ManagementUser[] = [
  { id: 'usr-1001', name: 'Ana Sante', accessId: 'ana.sante', role: 'administrator', active: true },
  { id: 'usr-1002', name: 'Luciana Ferreira', accessId: 'luciana.ferreira', role: 'operator', active: true },
  { id: 'usr-1003', name: 'Carlos Souza', accessId: 'carlos.souza', role: 'delivery-driver', active: true },
  { id: 'usr-1004', name: 'Mariana Lima', accessId: 'mariana.lima', role: 'delivery-driver', active: true },
  { id: 'usr-1005', name: 'Paulo Mendes', accessId: 'paulo.mendes', role: 'operator', active: false }
]
