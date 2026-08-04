import { HOURS_PER_MONTH, monthlyCost, savingsPercent } from '../lib/cost'
import { formatMoney } from '../lib/format'
import type { RetailPriceItem } from '../types/pricing'

interface Props {
  items: RetailPriceItem[]
  currency: string
  loading: boolean
  error: string | null
  onAdd: (item: RetailPriceItem) => void
  onCompare: (item: RetailPriceItem) => void
}

export function ResultsTable({ items, currency, loading, error, onAdd, onCompare }: Props) {
  return (
    <section className="panel results">
      <div className="results-head">
        <h2>Live retail meters</h2>
        <div className="results-meta">
          {loading ? 'Querying Microsoft…' : `${items.length} result${items.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {loading && <div className="loading-bar" />}

      {error && <div className="error">{error}</div>}

      {!error && !loading && items.length === 0 && (
        <div className="empty">
          Search a SKU, product, or meter — or pick a service preset above.
        </div>
      )}

      {!error && items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU / Product</th>
                <th>Pay as you go</th>
                <th>Monthly</th>
                <th>Savings plans</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const monthly = monthlyCost(item, 1, HOURS_PER_MONTH, 'payg')
                const sp1 = item.savingsPlan?.find((p) => p.term === '1 Year')
                const sp3 = item.savingsPlan?.find((p) => p.term === '3 Years')
                const save1 = sp1 ? savingsPercent(item.retailPrice, sp1.retailPrice) : null
                const save3 = sp3 ? savingsPercent(item.retailPrice, sp3.retailPrice) : null

                return (
                  <tr key={`${item.meterId}-${item.skuId}-${index}`} style={{ animationDelay: `${Math.min(index, 12) * 0.03}s` }}>
                    <td>
                      <div className="sku-title">
                        <strong>{item.armSkuName || item.skuName}</strong>
                        <span>
                          {item.productName} · {item.meterName}
                        </span>
                        <span>
                          <span className="badge">{item.serviceName}</span>{' '}
                          <span className="badge">{item.unitOfMeasure}</span>{' '}
                          {/spot/i.test(item.meterName) && <span className="badge badge-amber">Spot</span>}
                        </span>
                      </div>
                    </td>
                    <td className="price">{formatMoney(item.retailPrice, currency)}</td>
                    <td className="price">{formatMoney(monthly, currency, 2)}</td>
                    <td>
                      {sp1 || sp3 ? (
                        <div className="savings">
                          {sp1 && (
                            <span>
                              1y {formatMoney(sp1.retailPrice, currency)}
                              {save1 != null ? ` (−${save1.toFixed(0)}%)` : ''}
                            </span>
                          )}
                          {sp3 && (
                            <span>
                              3y {formatMoney(sp3.retailPrice, currency)}
                              {save3 != null ? ` (−${save3.toFixed(0)}%)` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button type="button" className="btn btn-primary" onClick={() => onAdd(item)}>
                          Add
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => onCompare(item)}>
                          Regions
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
