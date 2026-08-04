import type { Commitment } from '../api/vmPricing'
import { formatMoney } from '../lib/format'

interface Row {
  commitment: Commitment
  label: string
  monthly: number
  annual: number
  upfront: number | null
}

interface Props {
  rows: Row[]
  active: Commitment
  onSelect: (commitment: Commitment) => void
}

export function CommitmentCompare({ rows, active, onSelect }: Props) {
  if (!rows.length) return null
  const best = Math.min(...rows.map((r) => r.monthly))

  return (
    <section className="panel compare">
      <h2>Commitment compare</h2>
      <p>
        Same licenses and disk — only compute commitment changes. Savings plans and reserved
        instances discount compute only; Windows/SQL licenses stay pay-as-you-go unless Hybrid
        Benefit is on.
      </p>
      <div className="compare-grid">
        {rows.map((row) => (
          <button
            key={row.commitment}
            type="button"
            className={`compare-card buttonish${row.monthly === best ? ' best' : ''}${
              row.commitment === active ? ' active' : ''
            }`}
            onClick={() => onSelect(row.commitment)}
          >
            <div className="region">{row.label}</div>
            <div className="amount">{formatMoney(row.monthly, 'USD', 2)}/mo</div>
            <div className="muted-mini">
              {formatMoney(row.annual, 'USD', 2)}/yr
              {row.upfront != null ? ` · upfront ${formatMoney(row.upfront, 'USD', 2)}` : ''}
              {row.monthly === best ? ' · lowest' : ''}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
