import { BikeIcon, BoxesIcon, FactoryIcon, SnowflakeIcon, UserRoundCogIcon } from '@thiagoschoeffel/ts-components'
import type { ManagementPageConfig, ManagementSection } from '../types/management'

export const managementPages: Record<ManagementSection, ManagementPageConfig> = {
  produziveis: {
    title: 'Produzíveis',
    subtitle: 'Cadastre e mantenha os itens usados na produção.',
    icon: FactoryIcon
  },
  catalogo: { title: 'Catálogo', subtitle: 'Gerencie ofertas, tipos de componente e adicionais.', icon: BoxesIcon },
  congelados: {
    title: 'Congelados',
    subtitle: 'Acompanhe produtos habilitados, estoque por lote e vencimentos.',
    icon: SnowflakeIcon
  },
  entregadores: { title: 'Entregadores', subtitle: 'Cadastre a equipe disponível para preferências e rotas de entrega.', icon: BikeIcon },
  usuarios: { title: 'Usuários', subtitle: 'Gerencie acessos e perfis da equipe.', icon: UserRoundCogIcon }
}
