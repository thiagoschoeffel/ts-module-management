export const FROZEN_SHELF_LIFE_DAYS = 90

function parseCivilDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Data civil inválida.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    throw new Error('Data civil inválida.')
  return date
}

export function calculateFrozenExpiration(manufacturedOn: string) {
  const date = parseCivilDate(manufacturedOn)
  date.setUTCDate(date.getUTCDate() + FROZEN_SHELF_LIFE_DAYS)
  return date.toISOString().slice(0, 10)
}
