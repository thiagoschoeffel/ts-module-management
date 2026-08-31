import { FactoryIcon } from '@thiagoschoeffel/ts-components'
import type { ManagementPageConfig, ManagementSection } from '../types/management'

export const managementPages: Record<ManagementSection, ManagementPageConfig> = {
  produziveis: {
    title: 'Produzíveis',
    subtitle: 'Cadastre e mantenha os itens usados na produção.',
    icon: FactoryIcon
  },
  catalogo: { title: 'Catálogo', subtitle: 'Experiência ainda não disponível.', icon: FactoryIcon },
  entregadores: { title: 'Entregadores', subtitle: 'Experiência ainda não disponível.', icon: FactoryIcon },
  usuarios: { title: 'Usuários', subtitle: 'Experiência ainda não disponível.', icon: FactoryIcon }
}
