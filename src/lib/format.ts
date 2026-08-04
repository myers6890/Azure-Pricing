const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency = 'USD', digits = 4): string {
  const key = `${currency}:${digits}`
  let formatter = currencyFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: Math.min(2, digits),
      maximumFractionDigits: digits,
    })
    currencyFormatters.set(key, formatter)
  }
  return formatter.format(amount)
}

export function formatCompactMoney(amount: number, currency = 'USD'): string {
  if (amount >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return formatMoney(amount, currency, amount < 1 ? 4 : 2)
}

export function regionLabel(armRegionName: string): string {
  return armRegionName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d)/g, ' $1')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}
