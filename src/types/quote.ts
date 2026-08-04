import type { Commitment, OsType, SqlEdition } from '../api/vmPricing'
import type { CostBreakdown } from '../lib/vmQuote'

export interface QuoteLine {
  id: string
  armSkuName: string
  region: string
  location: string
  vcpus: number
  os: OsType
  windowsAhb: boolean
  sqlEdition: SqlEdition
  sqlAhb: boolean
  commitment: Commitment
  quantity: number
  hoursPerMonth: number
  osDiskId: string
  osDiskLabel: string
  breakdown: CostBreakdown
  seriesLabel: string
}
