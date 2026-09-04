export interface FrozenBalances {
  physicalQuantity: number
  availableQuantity: number
}

export function applyFrozenAdjustment(
  balances: FrozenBalances,
  quantity: number,
  isEligibleForSale: boolean
): FrozenBalances {
  if (!Number.isInteger(quantity) || quantity === 0)
    throw new Error('Informe uma quantidade inteira diferente de zero.')

  const physicalQuantity = balances.physicalQuantity + quantity
  const availableQuantity = isEligibleForSale
    ? balances.availableQuantity + quantity
    : balances.availableQuantity

  if (physicalQuantity < 0 || availableQuantity < 0)
    throw new Error('O ajuste não pode deixar o saldo negativo.')

  return { physicalQuantity, availableQuantity }
}

export function applyFrozenDiscard(balances: FrozenBalances, quantity: number): FrozenBalances {
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new Error('Informe uma quantidade inteira maior que zero.')
  if (quantity > balances.physicalQuantity)
    throw new Error('O descarte não pode superar a quantidade física do lote.')

  return {
    physicalQuantity: balances.physicalQuantity - quantity,
    availableQuantity: Math.max(0, balances.availableQuantity - quantity)
  }
}
