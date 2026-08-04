import type { RetailPriceItem, RetailPricesResponse } from '../types/pricing'

const cache = new Map<string, { expires: number; data: RetailPricesResponse }>()
const CACHE_TTL_MS = 10 * 60 * 1000

function escapeOData(value: string): string {
  return value.replace(/'/g, "''")
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
      'Microsoft’s Retail Prices API is rate limiting right now. Wait a moment and try again — cached results return instantly.',
    )
  }
  return new Error(detail || `Azure Retail Prices API error (${status})`)
}

export async function fetchJson(
  url: string,
  signal?: AbortSignal,
  retries = 3,
): Promise<RetailPricesResponse> {
  const cached = cache.get(url)
  if (cached && cached.expires > Date.now()) return cached.data

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
    if (response.status !== 429 || attempt === retries) throw lastError
    await sleep(700 * 2 ** attempt, signal)
  }
  throw lastError ?? new Error('Failed to reach Azure Retail Prices API')
}

export async function fetchFiltered(
  filter: string,
  currency = 'USD',
  signal?: AbortSignal,
  maxPages = 3,
): Promise<RetailPriceItem[]> {
  const items: RetailPriceItem[] = []
  let url: string | null =
    `/api/retail/prices?currencyCode=${encodeURIComponent(currency)}` +
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

export { escapeOData }
