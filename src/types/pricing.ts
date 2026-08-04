export type PriceType = 'Consumption' | 'Reservation' | 'DevTestConsumption'

export interface SavingsPlanRate {
  unitPrice: number
  retailPrice: number
  term: string
}

export interface RetailPriceItem {
  currencyCode: string
  tierMinimumUnits: number
  retailPrice: number
  unitPrice: number
  armRegionName: string
  location: string
  effectiveStartDate: string
  meterId: string
  meterName: string
  productId: string
  skuId: string
  productName: string
  skuName: string
  serviceName: string
  serviceId: string
  serviceFamily: string
  unitOfMeasure: string
  type: PriceType
  isPrimaryMeterRegion: boolean
  armSkuName: string
  reservationTerm?: string
  savingsPlan?: SavingsPlanRate[]
}

export interface RetailPricesResponse {
  BillingCurrency: string
  CustomerEntityId: string
  CustomerEntityType: string
  Items: RetailPriceItem[]
  NextPageLink: string | null
  Count: number
}

export interface EstimateLine {
  id: string
  item: RetailPriceItem
  quantity: number
  hoursPerMonth: number
  pricingMode: 'payg' | 'savings-1y' | 'savings-3y'
}

export interface SearchFilters {
  query: string
  serviceFamily: string
  serviceName: string
  region: string
  currency: string
  priceType: PriceType | 'All'
  linuxOnly: boolean
  excludeSpot: boolean
}
