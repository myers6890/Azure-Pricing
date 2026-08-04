import type { CostBreakdown } from '../lib/vmQuote'
import { formatMoney } from '../lib/format'

interface Props {
  sku: string | null
  regionLabel: string
  vcpus: number
  breakdown: CostBreakdown | null
  loading: boolean
  error: string | null
  onAdd: () => void
}

export function QuoteBreakdown({
  sku,
  regionLabel,
  vcpus,
  breakdown,
  loading,
  error,
  onAdd,
}: Props) {
  return (
    <section className="panel breakdown">
      <div className="results-head">
        <h2>Quote breakdown</h2>
        <div className="results-meta">
          {sku ? `${sku}${vcpus ? ` · ${vcpus} vCPU` : ''} · ${regionLabel}` : 'Select a VM size'}
        </div>
      </div>

      {loading && <div className="loading-bar" />}
      {error && <div className="error">{error}</div>}

      {!breakdown && !loading && !error && (
        <div className="empty">Search and select a VM size to build a US retail quote.</div>
      )}

      {breakdown && (
        <div className="breakdown-body">
          <div className="estimate-total bump-safe">
            <span className="label">Estimated monthly</span>
            <span className="value">{formatMoney(breakdown.totalMonthly, 'USD', 2)}</span>
            <span className="muted">
              {formatMoney(breakdown.totalHourly, 'USD')}/hr compute+licenses ·{' '}
              {formatMoney(breakdown.totalAnnual, 'USD', 2)}/yr
            </span>
          </div>

          <table className="breakdown-table">
            <tbody>
              <tr>
                <td>Compute</td>
                <td className="price">{formatMoney(breakdown.computeHourly, 'USD')}/hr</td>
                <td className="price">{formatMoney(breakdown.computeMonthly, 'USD', 2)}/mo</td>
              </tr>
              <tr>
                <td>Windows license</td>
                <td className="price">{formatMoney(breakdown.windowsLicenseHourly, 'USD')}/hr</td>
                <td className="price">{formatMoney(breakdown.windowsMonthly, 'USD', 2)}/mo</td>
              </tr>
              <tr>
                <td>SQL Server license</td>
                <td className="price">{formatMoney(breakdown.sqlLicenseHourly, 'USD')}/hr</td>
                <td className="price">{formatMoney(breakdown.sqlMonthly, 'USD', 2)}/mo</td>
              </tr>
              <tr>
                <td>OS disk</td>
                <td className="price">—</td>
                <td className="price">
                  {formatMoney(breakdown.diskMonthly, 'USD', 2)}/mo each
                </td>
              </tr>
              {breakdown.reservationUpfront != null && (
                <tr>
                  <td>Reservation upfront ({breakdown.reservationTerm})</td>
                  <td className="price" colSpan={2}>
                    {formatMoney(breakdown.reservationUpfront, 'USD', 2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <ul className="notes">
            {breakdown.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onAdd}>
              Add to quote
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
