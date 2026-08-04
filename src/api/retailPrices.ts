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

const cache = new Map<string, { expires: number; data: RetailPricesResponse }>()
const CACHE_TTL_MS = 5 * 60 * 1000

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
    parts.push(
      `(contains(armSkuName, '${escaped}') or contains(skuName, '${escaped}') or contains(meterName, '${escaped}') or contains(productName, '${escaped}'))`,
    )
  }

  return parts.join(' and ')
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function friendlyError(status: number, detail: string): Error {
  if (status === 429) {
    return new Error(
      'Microsoft’s Retail Prices API is rate limiting right now. Wait a moment and try again — cached results will return instantly.',
    )
  }
  return new Error(detail || `Azure Retail Prices API error (${status})`)
}

async function fetchJson(
  url: string,
  signal?: AbortSignal,
  retries = 3,
): Promise<RetailPricesResponse> {
  const cached = cache.get(url)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, { signal })
    if (response.ok) {
      const data = (await response.json()) as RetailPricesResponse
      cache.set(url, { expires: Date.now() + CACHE_TTL_MS, data })
      return data
    }

    const detail = await response.text()
    lastError = friendlyError(response.status, detail)

    if (response.status !== 429 || attempt === retries) {
      throw lastError
    }

    await sleep(700 * 2 ** attempt, signal)
  }

  throw lastError ?? new Error('Failed to reach Azure Retail Prices API')
}

export async function fetchRetailPrices(
  params: FetchPricesParams,
  signal?: AbortSignal,
): Promise<RetailPriceItem[]> {
  const filter = buildFilter(params)
  const maxPages = params.maxPages ?? 2
  const items: RetailPriceItem[] = []

  let url: string | null =
    `/api/retail/prices?currencyCode=${encodeURIComponent(params.currency)}` +
    `&$filter=${encodeURIComponent(filter)}`

  for (let page = 0; page < maxPages && url; page += 1) {
    const data = await fetchJson(url, signal)
    items.push(...(data.Items ?? []))

    if (data.NextPageLink) {
      const next = new URL(data.NextPageLink)
      url = `/api/retail/prices?${next.searchParams.toString()}`
    } else {
      url = null
    }
  }

  return items
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function run() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

export async function compareSkuAcrossRegions(options: {
  armSkuName: string
  productName: string
  regions: string[]
  currency: string
  signal?: AbortSignal
}): Promise<RetailPriceItem[]> {
  const results = await mapPool(options.regions, 2, async (region) => {
    const filter = [
      `armRegionName eq '${escapeOData(region)}'`,
      `priceType eq 'Consumption'`,
      `armSkuName eq '${escapeOData(options.armSkuName)}'`,
      `productName eq '${escapeOData(options.productName)}'`,
    ].join(' and ')

    const url =
      `/api/retail/prices?currencyCode=${encodeURIComponent(options.currency)}` +
      `&$filter=${encodeURIComponent(filter)}`

    try {
      const data = await fetchJson(url, options.signal)
      return data.Items ?? []
    } catch {
      return [] as RetailPriceItem[]
    }
  })

  return results.flat()
}
