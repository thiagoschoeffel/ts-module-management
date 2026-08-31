import type { ProducibleItemDetail } from '../types/producible'

export const mockProducibles: ProducibleItemDetail[] = [
  {
    id: 'prod-1001',
    name: 'Molho da casa',
    compositions: [
      {
        version: 1, createdAt: '2026-07-20T12:00:00.000Z', isCurrent: false,
        components: [
          { id: 'cmp-1001-1-1', kind: 'ingredient', name: 'Creme de leite', quantity: 100, unit: 'ml' },
          { id: 'cmp-1001-1-2', kind: 'ingredient', name: 'Base de tomate', quantity: 50, unit: 'ml' }
        ]
      },
      {
        version: 2, createdAt: '2026-08-12T12:00:00.000Z', isCurrent: true,
        components: [
          { id: 'cmp-1001-2-1', kind: 'ingredient', name: 'Creme de leite', quantity: 90, unit: 'ml' },
          { id: 'cmp-1001-2-2', kind: 'ingredient', name: 'Base de tomate', quantity: 60, unit: 'ml' },
          { id: 'cmp-1001-2-3', kind: 'ingredient', name: 'Sal', quantity: 2.5, unit: 'g' }
        ]
      }
    ]
  },
  {
    id: 'prod-1002', name: 'Arroz branco',
    compositions: [{
      version: 1, createdAt: '2026-08-03T12:00:00.000Z', isCurrent: true,
      components: [
        { id: 'cmp-1002-1-1', kind: 'ingredient', name: 'Arroz cru', quantity: 100, unit: 'g' },
        { id: 'cmp-1002-1-2', kind: 'ingredient', name: 'Água', quantity: 200, unit: 'ml' },
        { id: 'cmp-1002-1-3', kind: 'ingredient', name: 'Alho', quantity: 3.5, unit: 'g' }
      ]
    }]
  },
  {
    id: 'prod-1003', name: 'Frango grelhado',
    compositions: [{
      version: 1, createdAt: '2026-08-05T12:00:00.000Z', isCurrent: true,
      components: [
        { id: 'cmp-1003-1-1', kind: 'ingredient', name: 'Peito de frango', quantity: 180, unit: 'g' },
        { id: 'cmp-1003-1-2', kind: 'ingredient', name: 'Azeite', quantity: 7.5, unit: 'ml' },
        { id: 'cmp-1003-1-3', kind: 'ingredient', name: 'Sal', quantity: 2, unit: 'g' }
      ]
    }]
  },
  {
    id: 'prod-1004', name: 'Estrogonofe de frango',
    compositions: [{
      version: 1, createdAt: '2026-08-18T12:00:00.000Z', isCurrent: true,
      components: [
        { id: 'cmp-1004-1-1', kind: 'ingredient', name: 'Peito de frango', quantity: 180, unit: 'g' },
        { id: 'cmp-1004-1-2', kind: 'producible-item', referenceId: 'prod-1001', name: 'Molho da casa', quantity: 80, unit: 'ml' },
        { id: 'cmp-1004-1-3', kind: 'producible-item', referenceId: 'prod-1002', name: 'Arroz branco', quantity: 100, unit: 'g' },
        { id: 'cmp-1004-1-4', kind: 'ingredient', name: 'Champignon', quantity: 35, unit: 'g' },
        { id: 'cmp-1004-1-5', kind: 'ingredient', name: 'Cebola', quantity: 20, unit: 'g' }
      ]
    }]
  },
  {
    id: 'prod-1005', name: 'Salada de folhas',
    compositions: [{
      version: 1, createdAt: '2026-08-22T12:00:00.000Z', isCurrent: true,
      components: [
        { id: 'cmp-1005-1-1', kind: 'ingredient', name: 'Alface', quantity: 60, unit: 'g' },
        { id: 'cmp-1005-1-2', kind: 'ingredient', name: 'Rúcula', quantity: 25, unit: 'g' },
        { id: 'cmp-1005-1-3', kind: 'ingredient', name: 'Tomate-cereja', quantity: 6, unit: 'un' }
      ]
    }]
  },
  { id: 'prod-1006', name: 'Legumes assados', compositions: [] }
]
