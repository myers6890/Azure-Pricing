import type { EstimateLine, RetailPriceItem } from '../types/pricing'

const HOURS_PER_MONTH = 730

export function isHourly(unitOfMeasure: string): boolean {
  return /hour/i.test(unitOfMeasure)
}

export function unitPriceForMode(
  item: RetailPriceItem,
  mode: EstimateLine['pricingMode'],
): number {
  if (mode === 'payg') return item.retailPrice

  const term = mode === 'savings-1y' ? '1 Year' : '3 Years'
  const plan = item.savingsPlan?.find((p) => p.term === term)
  return plan?.retailPrice ?? item.retailPrice
}

export function monthlyCost(
  item: RetailPriceItem,
  quantity: number,
  hoursPerMonth: number,
  mode: EstimateLine['pricingMode'] = 'payg',
): number {
  const unit = unitPriceForMode(item, mode)
  if (isHourly(item.unitOfMeasure)) {
    return unit * quantity * hoursPerMonth
  }
  return unit * quantity
}

export function estimateLineMonthly(line: EstimateLine): number {
  return monthlyCost(line.item, line.quantity, line.hoursPerMonth, line.pricingMode)
}

export function savingsPercent(payg: number, discounted: number): number | null {
  if (payg <= 0 || discounted >= payg) return null
  return ((payg - discounted) / payg) * 100
}

export { HOURS_PER_MONTH }
