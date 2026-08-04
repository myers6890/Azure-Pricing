import { estimateLineMonthly } from '../lib/cost'
import { formatMoney } from '../lib/format'
import type { EstimateLine } from '../types/pricing'

interface Props {
  lines: EstimateLine[]
  currency: string
  bump: boolean
  onUpdate: (id: string, patch: Partial<EstimateLine>) => void
  onRemove: (id: string) => void
  onClear: () => void
  onExportJson: () => void
  onExportCsv: () => void
}

export function EstimatePanel({
  lines,
  currency,
  bump,
  onUpdate,
  onRemove,
  onClear,
  onExportJson,
  onExportCsv,
}: Props) {
  const total = lines.reduce((sum, line) => sum + estimateLineMonthly(line), 0)

  return (
    <aside className="panel estimate">
      <h2>Live estimate</h2>
      <p className="estimate-sub">Persists in this browser. Adjust hours and commitment instantly.</p>

      <div className={`estimate-total${bump ? ' bump' : ''}`}>
        <span className="label">Estimated monthly</span>
        <span className="value">{formatMoney(total, currency, 2)}</span>
      </div>

      {lines.length === 0 ? (
        <p className="empty" style={{ padding: '1rem 0' }}>
          Add SKUs from search results to build a cost model.
        </p>
      ) : (
        <div className="estimate-lines">
          {lines.map((line) => (
            <div className="estimate-line" key={line.id}>
              <header>
                <strong>
                  {line.item.armSkuName || line.item.skuName}
                  <div style={{ color: 'var(--ink-faint)', fontWeight: 500, fontSize: '0.75rem' }}>
                    {line.item.serviceName} · {line.item.armRegionName}
                  </div>
                </strong>
                <button type="button" onClick={() => onRemove(line.id)} aria-label="Remove">
                  Remove
                </button>
              </header>
              <div className="line-controls">
                <label>
                  Qty
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      onUpdate(line.id, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
                <label>
                  Hours / mo
                  <input
                    type="number"
                    min={1}
                    max={744}
                    value={line.hoursPerMonth}
                    onChange={(e) =>
                      onUpdate(line.id, {
                        hoursPerMonth: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Pricing
                  <select
                    value={line.pricingMode}
                    onChange={(e) =>
                      onUpdate(line.id, {
                        pricingMode: e.target.value as EstimateLine['pricingMode'],
                      })
                    }
                  >
                    <option value="payg">Pay as you go</option>
                    <option value="savings-1y" disabled={!line.item.savingsPlan?.some((p) => p.term === '1 Year')}>
                      Savings plan · 1 year
                    </option>
                    <option value="savings-3y" disabled={!line.item.savingsPlan?.some((p) => p.term === '3 Years')}>
                      Savings plan · 3 years
                    </option>
                  </select>
                </label>
              </div>
              <div className="line-cost">{formatMoney(estimateLineMonthly(line), currency, 2)} / mo</div>
            </div>
          ))}
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-secondary" onClick={onExportCsv} disabled={!lines.length}>
          Export CSV
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExportJson} disabled={!lines.length}>
          Export JSON
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear} disabled={!lines.length}>
          Clear
        </button>
      </div>
    </aside>
  )
}
