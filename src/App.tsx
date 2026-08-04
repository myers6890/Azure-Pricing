import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { compareSkuAcrossRegions, fetchRetailPrices } from './api/retailPrices'
import { BrandMark } from './components/BrandMark'
import { EstimatePanel } from './components/EstimatePanel'
import { RegionCompare } from './components/RegionCompare'
import { ResultsTable } from './components/ResultsTable'
import { CURRENCIES } from './data/currencies'
import { COMPARE_REGIONS, REGIONS } from './data/regions'
import { SERVICE_PRESETS } from './data/services'
import { useEstimate } from './hooks/useEstimate'
import { estimateLineMonthly, HOURS_PER_MONTH } from './lib/cost'
import type { RetailPriceItem, SearchFilters } from './types/pricing'

const DEFAULT_FILTERS: SearchFilters = {
  query: 'D4s_v5',
  serviceFamily: 'Compute',
  serviceName: 'Virtual Machines',
  region: 'eastus',
  currency: 'USD',
  priceType: 'Consumption',
  linuxOnly: true,
  excludeSpot: true,
}

function refineItems(items: RetailPriceItem[], filters: SearchFilters): RetailPriceItem[] {
  return items
    .filter((item) => item.isPrimaryMeterRegion !== false)
    .filter((item) => {
      if (!filters.excludeSpot) return true
      return !/spot|low priority/i.test(`${item.meterName} ${item.skuName}`)
    })
    .filter((item) => {
      if (!filters.linuxOnly || filters.serviceName !== 'Virtual Machines') return true
      return !/windows/i.test(item.productName)
    })
    .sort((a, b) => a.retailPrice - b.retailPrice)
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [items, setItems] = useState<RetailPriceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareItems, setCompareItems] = useState<RetailPriceItem[]>([])
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareSku, setCompareSku] = useState<string | null>(null)
  const [bump, setBump] = useState(false)
  const { lines, addItem, removeLine, updateLine, clear } = useEstimate()
  const abortRef = useRef<AbortController | null>(null)
  const compareAbortRef = useRef<AbortController | null>(null)
  const booted = useRef(false)

  const currency = filters.currency

  async function runSearch(next = filters) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setCompareItems([])
    setCompareSku(null)

    try {
      const raw = await fetchRetailPrices(
        {
          region: next.region,
          currency: next.currency,
          serviceName: next.serviceName || undefined,
          serviceFamily: next.serviceFamily || undefined,
          query: next.query || undefined,
          priceType: next.priceType,
          maxPages: 2,
        },
        controller.signal,
      )
      setItems(refineItems(raw, next))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setItems([])
      setError(err instanceof Error ? err.message : 'Failed to load prices')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    void runSearch(DEFAULT_FILTERS)
  }, [])

  useEffect(() => {
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 280)
    return () => window.clearTimeout(t)
  }, [lines])

  const regionsByGroup = useMemo(() => {
    const map = new Map<string, typeof REGIONS>()
    for (const region of REGIONS) {
      const list = map.get(region.group) ?? []
      list.push(region)
      map.set(region.group, list)
    }
    return [...map.entries()]
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void runSearch(filters)
  }

  function applyPreset(serviceName: string, serviceFamily?: string, queryHint?: string) {
    const next: SearchFilters = {
      ...filters,
      serviceName,
      serviceFamily: serviceFamily ?? '',
      query: queryHint ?? '',
      linuxOnly: serviceName === 'Virtual Machines' ? filters.linuxOnly : false,
    }
    setFilters(next)
    void runSearch(next)
  }

  async function handleCompare(item: RetailPriceItem) {
    if (!item.armSkuName) return
    compareAbortRef.current?.abort()
    const controller = new AbortController()
    compareAbortRef.current = controller
    setCompareLoading(true)
    setCompareSku(item.armSkuName)
    setCompareItems([])

    try {
      const results = await compareSkuAcrossRegions({
        armSkuName: item.armSkuName,
        productName: item.productName,
        regions: COMPARE_REGIONS,
        currency: filters.currency,
        signal: controller.signal,
      })
      setCompareItems(
        results.filter((r) => !/spot|low priority/i.test(`${r.meterName} ${r.skuName}`)),
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setCompareItems([])
      }
    } finally {
      if (!controller.signal.aborted) setCompareLoading(false)
    }
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      currency,
      source: 'Microsoft Azure Retail Prices API',
      sourceUrl: 'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview',
      hoursAssumption: HOURS_PER_MONTH,
      lines: lines.map((line) => ({
        ...line,
        monthlyEstimate: estimateLineMonthly(line),
      })),
      totalMonthly: lines.reduce((sum, line) => sum + estimateLineMonthly(line), 0),
    }
    download('aether-estimate.json', JSON.stringify(payload, null, 2), 'application/json')
  }

  function exportCsv() {
    const header = [
      'serviceName',
      'productName',
      'sku',
      'region',
      'unitPrice',
      'unitOfMeasure',
      'quantity',
      'hoursPerMonth',
      'pricingMode',
      'monthlyEstimate',
      'currency',
    ]
    const rows = lines.map((line) => [
      line.item.serviceName,
      line.item.productName,
      line.item.armSkuName || line.item.skuName,
      line.item.armRegionName,
      String(line.item.retailPrice),
      line.item.unitOfMeasure,
      String(line.quantity),
      String(line.hoursPerMonth),
      line.pricingMode,
      estimateLineMonthly(line).toFixed(4),
      currency,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    download('aether-estimate.csv', csv, 'text/csv')
  }

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <BrandMark />
        <div className="api-pill" title="Microsoft Azure Retail Prices API">
          <span className="dot" />
          Live Microsoft Retail Prices API
        </div>
      </header>

      <section className="hero">
        <h1>Price Azure like an engineer, not a spreadsheet.</h1>
        <p>
          Search real retail meters, compare regions, and model savings plans — powered directly by
          Microsoft&apos;s Azure Retail Prices API.
        </p>
      </section>

      <div className="layout">
        <div>
          <form className="panel controls" onSubmit={onSubmit}>
            <div className="control-grid">
              <div className="field">
                <label htmlFor="query">Search SKU, product, or meter</label>
                <input
                  id="query"
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder="e.g. Standard_D4s_v5, Hot LRS, Premium v3"
                />
              </div>
              <div className="field">
                <label htmlFor="region">Region</label>
                <select
                  id="region"
                  value={filters.region}
                  onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                >
                  {regionsByGroup.map(([group, regions]) => (
                    <optgroup key={group} label={group}>
                      {regions.map((region) => (
                        <option key={region.value} value={region.value}>
                          {region.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={filters.currency}
                  onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="control-grid" style={{ marginTop: '0.85rem' }}>
              <div className="field">
                <label htmlFor="serviceName">Service name</label>
                <input
                  id="serviceName"
                  value={filters.serviceName}
                  onChange={(e) => setFilters((f) => ({ ...f, serviceName: e.target.value }))}
                  placeholder="Virtual Machines"
                  list="service-presets"
                />
                <datalist id="service-presets">
                  {SERVICE_PRESETS.map((preset) => (
                    <option key={preset.serviceName} value={preset.serviceName} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label htmlFor="serviceFamily">Service family</label>
                <select
                  id="serviceFamily"
                  value={filters.serviceFamily}
                  onChange={(e) => setFilters((f) => ({ ...f, serviceFamily: e.target.value }))}
                >
                  <option value="">Any family</option>
                  {[
                    'Compute',
                    'Storage',
                    'Networking',
                    'Databases',
                    'Analytics',
                    'Containers',
                    'Web',
                    'Integration',
                    'Security',
                    'Management and Governance',
                    'Internet of Things',
                    'Developer Tools',
                  ].map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="priceType">Price type</label>
                <select
                  id="priceType"
                  value={filters.priceType}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      priceType: e.target.value as SearchFilters['priceType'],
                    }))
                  }
                >
                  <option value="Consumption">Consumption</option>
                  <option value="Reservation">Reservation</option>
                  <option value="DevTestConsumption">Dev/Test</option>
                </select>
              </div>
            </div>

            <div className="presets" aria-label="Popular services">
              {SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset.serviceName}
                  type="button"
                  className={`chip${filters.serviceName === preset.serviceName ? ' active' : ''}`}
                  title={preset.hint}
                  onClick={() => applyPreset(preset.serviceName, preset.serviceFamily, preset.queryHint)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={filters.linuxOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, linuxOnly: e.target.checked }))}
                />
                Linux / non-Windows VMs
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={filters.excludeSpot}
                  onChange={(e) => setFilters((f) => ({ ...f, excludeSpot: e.target.checked }))}
                />
                Hide Spot & Low Priority
              </label>
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Fetching prices…' : 'Search retail prices'}
              </button>
              <button
                type="button"
                className="btn btn-amber"
                onClick={() => {
                  const next = { ...DEFAULT_FILTERS, currency: filters.currency, region: filters.region }
                  setFilters(next)
                  void runSearch(next)
                }}
              >
                Reset demo query
              </button>
            </div>
          </form>

          <ResultsTable
            items={items}
            currency={currency}
            loading={loading}
            error={error}
            onAdd={addItem}
            onCompare={handleCompare}
          />

          <RegionCompare
            items={compareItems}
            currency={currency}
            loading={compareLoading}
            skuLabel={compareSku}
          />

          <p className="footer-note">
            Prices come from the{' '}
            <a
              href="https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices"
              target="_blank"
              rel="noreferrer"
            >
              Microsoft Azure Retail Prices API
            </a>
            . USD figures are Microsoft retail list prices; other currencies are reference estimates.
            Actual bills may differ with enterprise agreements, credits, and negotiated rates. Monthly
            figures assume {HOURS_PER_MONTH} hours unless you change them.
          </p>
        </div>

        <EstimatePanel
          lines={lines}
          currency={currency}
          bump={bump}
          onUpdate={updateLine}
          onRemove={removeLine}
          onClear={clear}
          onExportJson={exportJson}
          onExportCsv={exportCsv}
        />
      </div>
    </div>
  )
}
