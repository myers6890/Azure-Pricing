import type { Commitment, OsType, VmRateCard } from '../api/vmPricing'

export const HOURS_PER_MONTH = 730

export interface QuoteInputs {
  os: OsType
  windowsAhb: boolean
  sqlAhb: boolean
  sqlEdition: 'none' | 'web' | 'standard' | 'enterprise'
  commitment: Commitment
  quantity: number
  hoursPerMonth: number
}

export interface CostBreakdown {
  computeHourly: number
  windowsLicenseHourly: number
  sqlLicenseHourly: number
  diskMonthly: number
  computeMonthly: number
  windowsMonthly: number
  sqlMonthly: number
  totalHourly: number
  totalMonthly: number
  totalAnnual: number
  reservationUpfront: number | null
  reservationTerm: string | null
  notes: string[]
}

function savingsPlanHourly(card: VmRateCard, term: '1 Year' | '3 Years'): number | null {
  const plan = card.linux?.savingsPlan?.find((p) => p.term === term)
  return plan?.retailPrice ?? null
}

function reservationUpfront(card: VmRateCard, term: '1 Year' | '3 Years'): number | null {
  const item = card.reservations.find((r) => r.reservationTerm === term)
  return item?.retailPrice ?? null
}

/**
 * Azure Pricing Calculator rules for VMs:
 * - Compute can be PAYG, Savings Plan, or Reserved Instance
 * - Windows license is PAYG unless Azure Hybrid Benefit (then $0)
 * - SQL license is PAYG unless SQL Azure Hybrid Benefit (then $0)
 * - RI/SP discounts apply to compute only, not Windows/SQL license meters
 * - OS disk is monthly (not hourly)
 */
export function calculateBreakdown(card: VmRateCard, inputs: QuoteInputs): CostBreakdown {
  const notes: string[] = []
  const hours = inputs.hoursPerMonth
  const qty = inputs.quantity

  let computeHourly = card.linux?.retailPrice ?? 0
  let reservationUpfrontTotal: number | null = null
  let reservationTerm: string | null = null

  if (!card.linux) {
    notes.push('Linux/compute meter not found for this SKU in the selected region.')
  }

  if (inputs.commitment === 'sp-1y') {
    const sp = savingsPlanHourly(card, '1 Year')
    if (sp != null) {
      computeHourly = sp
      notes.push('1-year savings plan rate applied to compute only.')
    } else {
      notes.push('No 1-year savings plan rate returned; using pay-as-you-go compute.')
    }
  } else if (inputs.commitment === 'sp-3y') {
    const sp = savingsPlanHourly(card, '3 Years')
    if (sp != null) {
      computeHourly = sp
      notes.push('3-year savings plan rate applied to compute only.')
    } else {
      notes.push('No 3-year savings plan rate returned; using pay-as-you-go compute.')
    }
  } else if (inputs.commitment === 'ri-1y' || inputs.commitment === 'ri-3y') {
    const term = inputs.commitment === 'ri-1y' ? '1 Year' : '3 Years'
    const upfront = reservationUpfront(card, term)
    if (upfront != null) {
      reservationUpfrontTotal = upfront * qty
      reservationTerm = term
      // Effective hourly from reservation for comparison months
      const months = term === '1 Year' ? 12 : 36
      computeHourly = upfront / months / HOURS_PER_MONTH
      notes.push(
        `${term} reserved instance applied to compute (upfront retail ÷ ${months} ÷ ${HOURS_PER_MONTH} hrs).`,
      )
    } else {
      notes.push(`No ${term} reserved instance meter found; using pay-as-you-go compute.`)
    }
  }

  let windowsLicenseHourly = 0
  if (inputs.os === 'windows') {
    if (inputs.windowsAhb) {
      windowsLicenseHourly = 0
      notes.push('Windows Azure Hybrid Benefit enabled — Windows license $0.')
    } else {
      windowsLicenseHourly = card.windowsLicenseHourly
      if (!windowsLicenseHourly && card.windows && card.linux) {
        windowsLicenseHourly = Math.max(0, card.windows.retailPrice - card.linux.retailPrice)
      }
      notes.push('Windows Server license included (pay-as-you-go).')
    }
  }

  let sqlLicenseHourly = 0
  if (inputs.sqlEdition !== 'none') {
    if (inputs.sqlAhb) {
      sqlLicenseHourly = 0
      notes.push('SQL Server Azure Hybrid Benefit enabled — SQL license $0.')
    } else {
      sqlLicenseHourly = card.sqlLicenseHourly
      notes.push(
        `SQL Server ${inputs.sqlEdition} license included (${card.vcpus || '?'} vCPU, 4-core minimum).`,
      )
    }
  }

  const computeMonthly = computeHourly * hours * qty
  const windowsMonthly = windowsLicenseHourly * hours * qty
  const sqlMonthly = sqlLicenseHourly * hours * qty
  const diskMonthly = card.osDiskMonthly * qty
  const totalHourly = (computeHourly + windowsLicenseHourly + sqlLicenseHourly) * qty
  // Disk is monthly; add equivalent hourly only for display totalHourly compute+licenses
  const totalMonthly = computeMonthly + windowsMonthly + sqlMonthly + diskMonthly

  if (card.osDiskMonthly > 0) {
    notes.push(`OS disk: ${card.osDiskLabel}.`)
  }

  return {
    computeHourly,
    windowsLicenseHourly,
    sqlLicenseHourly,
    diskMonthly: card.osDiskMonthly,
    computeMonthly,
    windowsMonthly,
    sqlMonthly,
    totalHourly,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    reservationUpfront: reservationUpfrontTotal,
    reservationTerm,
    notes,
  }
}

export function compareCommitments(
  card: VmRateCard,
  base: Omit<QuoteInputs, 'commitment'>,
): { commitment: Commitment; label: string; monthly: number; annual: number; upfront: number | null }[] {
  const modes: { commitment: Commitment; label: string }[] = [
    { commitment: 'payg', label: 'Pay as you go' },
    { commitment: 'sp-1y', label: 'Savings plan 1 year' },
    { commitment: 'sp-3y', label: 'Savings plan 3 years' },
    { commitment: 'ri-1y', label: 'Reserved 1 year' },
    { commitment: 'ri-3y', label: 'Reserved 3 years' },
  ]

  return modes.map(({ commitment, label }) => {
    const b = calculateBreakdown(card, { ...base, commitment })
    return {
      commitment,
      label,
      monthly: b.totalMonthly,
      annual: b.totalAnnual,
      upfront: b.reservationUpfront,
    }
  })
}
