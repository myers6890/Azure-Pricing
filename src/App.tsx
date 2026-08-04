import { useEffect, useMemo, useRef, useState } from 'react'
import {
  loadVmRateCard,
  searchVmSkus,
  type Commitment,
  type OsType,
  type SqlEdition,
  type VmRateCard,
  type VmSkuOption,
} from './api/vmPricing'
import { BrandMark } from './components/BrandMark'
import { CommitmentCompare } from './components/CommitmentCompare'
import { QuoteBreakdown } from './components/QuoteBreakdown'
import { QuoteCart } from './components/QuoteCart'
import { QuoteConfigurator } from './components/QuoteConfigurator'
import { VmSearcher } from './components/VmSearcher'
import { DEFAULT_OS_DISK } from './data/disks'
import { DEFAULT_US_REGION, US_REGIONS } from './data/usRegions'
import {
  calculateBreakdown,
  compareCommitments,
  HOURS_PER_MONTH,
} from './lib/vmQuote'
import type { QuoteLine } from './types/quote'

const STORAGE_KEY = 'aether-us-vm-quote-v1'

function loadCart(): QuoteLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QuoteLine[]) : []
  } catch {
    return []
  }
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
  const [region, setRegion] = useState(DEFAULT_US_REGION)
  const [query, setQuery] = useState('D4s_v5')
  const [results, setResults] = useState<VmSkuOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selected, setSelected] = useState<VmSkuOption | null>(null)
  const [rateCard, setRateCard] = useState<VmRateCard | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [os, setOs] = useState<OsType>('windows')
  const [windowsAhb, setWindowsAhb] = useState(false)
  const [sqlEdition, setSqlEdition] = useState<SqlEdition>('none')
  const [sqlAhb, setSqlAhb] = useState(false)
  const [commitment, setCommitment] = useState<Commitment>('payg')
  const [quantity, setQuantity] = useState(1)
  const [hoursPerMonth, setHoursPerMonth] = useState(HOURS_PER_MONTH)
  const [osDiskId, setOsDiskId] = useState(DEFAULT_OS_DISK)

  const [lines, setLines] = useState<QuoteLine[]>(loadCart)
  const [bump, setBump] = useState(false)

  const searchAbort = useRef<AbortController | null>(null)
  const rateAbort = useRef<AbortController | null>(null)

  const regionLabel =
    US_REGIONS.find((r) => r.value === region)?.label ?? region

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 280)
    return () => window.clearTimeout(t)
  }, [lines])

  // Debounced SKU search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }

    const handle = window.setTimeout(async () => {
      searchAbort.current?.abort()
      const controller = new AbortController()
      searchAbort.current = controller
      setSearchLoading(true)
      setError(null)
      try {
        const skus = await searchVmSkus({ region, query: q, signal: controller.signal })
        setResults(skus)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setResults([])
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }, 280)

    return () => window.clearTimeout(handle)
  }, [query, region])

  // Load full rate card when SKU / region / SQL / disk changes
  useEffect(() => {
    if (!selected) {
      setRateCard(null)
      return
    }

    rateAbort.current?.abort()
    const controller = new AbortController()
    rateAbort.current = controller
    setRateLoading(true)
    setError(null)

    void loadVmRateCard({
      armSkuName: selected.armSkuName,
      region,
      sqlEdition,
      osDiskId,
      signal: controller.signal,
    })
      .then((card) => {
        if (!controller.signal.aborted) setRateCard(card)
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setRateCard(null)
        setError(err.message || 'Failed to load rate card')
      })
      .finally(() => {
        if (!controller.signal.aborted) setRateLoading(false)
      })
  }, [selected, region, sqlEdition, osDiskId])

  const inputs = useMemo(
    () => ({
      os,
      windowsAhb,
      sqlAhb,
      sqlEdition,
      commitment,
      quantity,
      hoursPerMonth,
    }),
    [os, windowsAhb, sqlAhb, sqlEdition, commitment, quantity, hoursPerMonth],
  )

  const breakdown = useMemo(
    () => (rateCard ? calculateBreakdown(rateCard, inputs) : null),
    [rateCard, inputs],
  )

  const compareRows = useMemo(() => {
    if (!rateCard) return []
    return compareCommitments(rateCard, {
      os,
      windowsAhb,
      sqlAhb,
      sqlEdition,
      quantity,
      hoursPerMonth,
    })
  }, [rateCard, os, windowsAhb, sqlAhb, sqlEdition, quantity, hoursPerMonth])

  function selectSku(sku: VmSkuOption) {
    setSelected(sku)
  }

  function addToQuote() {
    if (!selected || !rateCard || !breakdown) return
    const id = [
      selected.armSkuName,
      region,
      os,
      windowsAhb ? 'wahb' : 'wlic',
      sqlEdition,
      sqlAhb ? 'sahb' : 'slic',
      commitment,
      osDiskId,
      quantity,
      hoursPerMonth,
      Date.now(),
    ].join(':')

    setLines((prev) => [
      ...prev,
      {
        id,
        armSkuName: selected.armSkuName,
        region,
        location: rateCard.location,
        vcpus: rateCard.vcpus,
        os,
        windowsAhb,
        sqlEdition,
        sqlAhb,
        commitment,
        quantity,
        hoursPerMonth,
        osDiskId,
        osDiskLabel: rateCard.osDiskLabel,
        breakdown,
        seriesLabel: selected.seriesLabel,
      },
    ])
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      currency: 'USD',
      market: 'United States',
      source: 'Microsoft Azure Retail Prices API',
      sourceUrl: 'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview',
      hoursAssumptionDefault: HOURS_PER_MONTH,
      lines,
      totalMonthly: lines.reduce((s, l) => s + l.breakdown.totalMonthly, 0),
      totalAnnual: lines.reduce((s, l) => s + l.breakdown.totalAnnual, 0),
    }
    download('aether-us-vm-quote.json', JSON.stringify(payload, null, 2), 'application/json')
  }

  function exportCsv() {
    const header = [
      'quantity',
      'armSkuName',
      'vcpus',
      'region',
      'os',
      'windowsLicensing',
      'sqlEdition',
      'sqlLicensing',
      'commitment',
      'hoursPerMonth',
      'osDisk',
      'computeHourly',
      'windowsLicenseHourly',
      'sqlLicenseHourly',
      'diskMonthlyEach',
      'totalMonthly',
      'totalAnnual',
      'reservationUpfront',
      'currency',
    ]
    const rows = lines.map((line) => [
      String(line.quantity),
      line.armSkuName,
      String(line.vcpus),
      line.region,
      line.os,
      line.os === 'linux' ? 'n/a' : line.windowsAhb ? 'Azure Hybrid Benefit' : 'License included',
      line.sqlEdition,
      line.sqlEdition === 'none'
        ? 'n/a'
        : line.sqlAhb
          ? 'Azure Hybrid Benefit'
          : 'License included',
      line.commitment,
      String(line.hoursPerMonth),
      line.osDiskLabel,
      line.breakdown.computeHourly.toFixed(6),
      line.breakdown.windowsLicenseHourly.toFixed(6),
      line.breakdown.sqlLicenseHourly.toFixed(6),
      line.breakdown.diskMonthly.toFixed(4),
      line.breakdown.totalMonthly.toFixed(4),
      line.breakdown.totalAnnual.toFixed(4),
      line.breakdown.reservationUpfront != null
        ? line.breakdown.reservationUpfront.toFixed(4)
        : '',
      'USD',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    download('aether-us-vm-quote.csv', csv, 'text/csv')
  }

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <BrandMark />
        <div className="api-pill" title="Microsoft Azure Retail Prices API">
          <span className="dot" />
          US retail rates · Microsoft API
        </div>
      </header>

      <section className="hero">
        <h1>Quote US Azure VMs without wrestling the pricing calculator.</h1>
        <p>
          Live Microsoft retail meters for compute, Windows licensing, SQL Server licensing,
          Hybrid Benefit, savings plans, reserved instances, and OS disks — built for people who
          quote VMs all day.
        </p>
      </section>

      <div className="layout">
        <div>
          <section className="panel controls">
            <div className="control-grid region-row">
              <div className="field">
                <label htmlFor="region">United States region</label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value)
                    setSelected(null)
                    setRateCard(null)
                  }}
                >
                  {(['US East', 'US Central', 'US West'] as const).map((group) => (
                    <optgroup key={group} label={group}>
                      {US_REGIONS.filter((r) => r.group === group).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field tips">
                <label>Quote tip</label>
                <div className="tip-box">
                  Reserved / savings plan discounts apply to <strong>compute only</strong>.
                  Windows and SQL stay license-included unless you enable Hybrid Benefit.
                </div>
              </div>
            </div>

            <VmSearcher
              query={query}
              onQueryChange={setQuery}
              loading={searchLoading}
              results={results}
              selectedSku={selected?.armSkuName ?? null}
              onSelect={selectSku}
            />

            <QuoteConfigurator
              os={os}
              windowsAhb={windowsAhb}
              sqlEdition={sqlEdition}
              sqlAhb={sqlAhb}
              commitment={commitment}
              quantity={quantity}
              hoursPerMonth={hoursPerMonth}
              osDiskId={osDiskId}
              disabled={!selected}
              onChange={(patch) => {
                if (patch.os !== undefined) setOs(patch.os)
                if (patch.windowsAhb !== undefined) setWindowsAhb(patch.windowsAhb)
                if (patch.sqlEdition !== undefined) setSqlEdition(patch.sqlEdition)
                if (patch.sqlAhb !== undefined) setSqlAhb(patch.sqlAhb)
                if (patch.commitment !== undefined) setCommitment(patch.commitment)
                if (patch.quantity !== undefined) setQuantity(patch.quantity)
                if (patch.hoursPerMonth !== undefined) setHoursPerMonth(patch.hoursPerMonth)
                if (patch.osDiskId !== undefined) setOsDiskId(patch.osDiskId)
              }}
            />
          </section>

          <QuoteBreakdown
            sku={selected?.armSkuName ?? null}
            regionLabel={regionLabel}
            vcpus={rateCard?.vcpus ?? selected?.vcpus ?? 0}
            breakdown={breakdown}
            loading={rateLoading}
            error={error}
            onAdd={addToQuote}
          />

          <CommitmentCompare
            rows={compareRows}
            active={commitment}
            onSelect={setCommitment}
          />

          <p className="footer-note">
            Prices from the{' '}
            <a
              href="https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices"
              target="_blank"
              rel="noreferrer"
            >
              Microsoft Azure Retail Prices API
            </a>{' '}
            (USD retail list). Matches Pricing Calculator building blocks for US VMs: Linux/Windows
            compute, Windows & SQL license meters, Azure Hybrid Benefit, savings plans, reserved
            instances, and managed OS disks. Enterprise Agreement / CSP discounts are not applied.
            Default month = {HOURS_PER_MONTH} hours.
          </p>
        </div>

        <QuoteCart
          lines={lines}
          bump={bump}
          onRemove={(id) => setLines((prev) => prev.filter((l) => l.id !== id))}
          onClear={() => setLines([])}
          onExportCsv={exportCsv}
          onExportJson={exportJson}
        />
      </div>
    </div>
  )
}
