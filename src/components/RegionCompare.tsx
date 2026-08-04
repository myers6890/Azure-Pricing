import { HOURS_PER_MONTH, monthlyCost } from '../lib/cost'
import { formatMoney } from '../lib/format'
import type { RetailPriceItem } from '../types/pricing'

interface Props {
  items: RetailPriceItem[]
  currency: string
  loading: boolean
  skuLabel: string | null
}

export function RegionCompare({ items, currency, loading, skuLabel }: Props) {
  if (!skuLabel && !loading) return null

  const ranked = [...items]
    .map((item) => ({
      item,
      monthly: monthlyCost(item, 1, HOURS_PER_MONTH, 'payg'),
    }))
    .sort((a, b) => a.monthly - b.monthly)

  const best = ranked[0]?.monthly

  return (
    <section className="panel compare">
      <h2>Region radar</h2>
      <p>
        {skuLabel
          ? `Pay-as-you-go monthly estimate for ${skuLabel} across major regions.`
          : 'Pick a SKU and compare regions instantly.'}
      </p>

      {loading && <div className="loading-bar" />}

      {!loading && ranked.length === 0 && (
        <p className="empty" style={{ padding: '1rem 0' }}>
          No matching meters found in comparison regions.
        </p>
      )}

      <div className="compare-grid">
        {ranked.map(({ item, monthly }) => (
          <div
            className={`compare-card${monthly === best ? ' best' : ''}`}
            key={`${item.armRegionName}-${item.meterId}`}
          >
            <div className="region">{item.location || item.armRegionName}</div>
            <div className="amount">{formatMoney(monthly, currency, 2)}</div>
            <div style={{ marginTop: '0.25rem', color: 'var(--ink-faint)', fontSize: '0.72rem' }}>
              {formatMoney(item.retailPrice, currency)} / {item.unitOfMeasure}
              {monthly === best ? ' · lowest' : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
