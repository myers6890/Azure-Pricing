import type { PriceType, RetailPriceItem, RetailPricesResponse } from '../types/pricing'

export interface FetchPricesParams {
  region: string
  currency: string
  serviceName?: string
  serviceFamily?: string
  query?: string
  priceType?: PriceType | 'All'
  maxPages?: number
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''")
}

function buildFilter(params: FetchPricesParams): string {
  const parts = [`armRegionName eq '${escapeOData(params.region)}'`]

  if (params.priceType && params.priceType !== 'All') {
    parts.push(`priceType eq '${params.priceType}'`)
  } else {
    parts.push(`priceType eq 'Consumption'`)
  }

  if (params.serviceName) {
    parts.push(`serviceName eq '${escapeOData(params.serviceName)}'`)
  }

  if (params.serviceFamily) {
    parts.push(`serviceFamily eq '${escapeOData(params.serviceFamily)}'`)
  }

  const q = params.query?.trim()
  if (q) {
    const escaped = escapeOData(q)
    // Prefer ARM SKU contains for VM-like queries; also match product/meter names.
    if (/^standard_/i.test(q) || /_v\d/i.test(q) || /[A-Z]\d/i.test(q)) {
      parts.push(
        `(contains(armSkuName, '${escaped}') or contains(skuName, '${escaped}') or contains(meterName, '${escaped}') or contains(productName, '${escaped}'))`,
      )
    } else {
      parts.push(
        `(contains(productName, '${escaped}') or contains(skuName, '${escaped}') or contains(meterName, '${escaped}') or contains(armSkuName, '${escaped}'))`,
      )
    }
  }

  return parts.join(' and ')
}

export async function fetchRetailPrices(
  params: FetchPricesParams,
  signal?: AbortSignal,
): Promise<RetailPriceItem[]> {
  const filter = buildFilter(params)
  const maxPages = params.maxPages ?? 3
  const items: RetailPriceItem[] = []

  let url: string | null =
    `/api/retail/prices?currencyCode=${encodeURIComponent(params.currency)}` +
    `&$filter=${encodeURIComponent(filter)}`

  for (let page = 0; page < maxPages && url; page += 1) {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || `Azure Retail Prices API error (${response.status})`)
    }

    const data = (await response.json()) as RetailPricesResponse
    items.push(...(data.Items ?? []))

    if (data.NextPageLink) {
      // Rewrite absolute Microsoft NextPageLink through our proxy.
      const next = new URL(data.NextPageLink)
      url = `/api/retail/prices?${next.searchParams.toString()}`
    } else {
      url = null
    }
  }

  return items
}

export async function compareSkuAcrossRegions(options: {
  armSkuName: string
  productName: string
  regions: string[]
  currency: string
  signal?: AbortSignal
}): Promise<RetailPriceItem[]> {
  const results = await Promise.all(
    options.regions.map(async (region) => {
      const filter = [
        `armRegionName eq '${escapeOData(region)}'`,
        `priceType eq 'Consumption'`,
        `armSkuName eq '${escapeOData(options.armSkuName)}'`,
        `productName eq '${escapeOData(options.productName)}'`,
      ].join(' and ')

      const url =
        `/api/retail/prices?currencyCode=${encodeURIComponent(options.currency)}` +
        `&$filter=${encodeURIComponent(filter)}`

      const response = await fetch(url, { signal: options.signal })
      if (!response.ok) return [] as RetailPriceItem[]
      const data = (await response.json()) as RetailPricesResponse
      return data.Items ?? []
    }),
  )

  return results.flat()
}
