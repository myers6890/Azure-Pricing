import { formatMoney } from '../lib/format'
import type { QuoteLine } from '../types/quote'

interface Props {
  lines: QuoteLine[]
  bump: boolean
  onRemove: (id: string) => void
  onClear: () => void
  onExportCsv: () => void
  onExportJson: () => void
}

export function QuoteCart({
  lines,
  bump,
  onRemove,
  onClear,
  onExportCsv,
  onExportJson,
}: Props) {
  const total = lines.reduce((sum, line) => sum + line.breakdown.totalMonthly, 0)

  return (
    <aside className="panel estimate">
      <h2>Quote cart</h2>
      <p className="estimate-sub">
        Build multi-VM US quotes. Exports include license and commitment detail.
      </p>

      <div className={`estimate-total${bump ? ' bump' : ''}`}>
        <span className="label">Quote monthly total</span>
        <span className="value">{formatMoney(total, 'USD', 2)}</span>
      </div>

      {lines.length === 0 ? (
        <p className="empty" style={{ padding: '1rem 0' }}>
          Add configured VMs to assemble a customer quote.
        </p>
      ) : (
        <div className="estimate-lines">
          {lines.map((line) => (
            <div className="estimate-line" key={line.id}>
              <header>
                <strong>
                  {line.quantity}× {line.armSkuName}
                  <div className="muted-mini">
                    {line.os === 'windows' ? 'Windows' : 'Linux'}
                    {line.windowsAhb ? ' · Win AHB' : ''}
                    {line.sqlEdition !== 'none'
                      ? ` · SQL ${line.sqlEdition}${line.sqlAhb ? ' AHB' : ''}`
                      : ''}
                    {' · '}
                    {line.commitment} · {line.region}
                  </div>
                </strong>
                <button type="button" onClick={() => onRemove(line.id)}>
                  Remove
                </button>
              </header>
              <div className="line-cost">
                {formatMoney(line.breakdown.totalMonthly, 'USD', 2)} / mo
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="actions">
        <button type="button" className="btn btn-secondary" disabled={!lines.length} onClick={onExportCsv}>
          Export CSV
        </button>
        <button type="button" className="btn btn-secondary" disabled={!lines.length} onClick={onExportJson}>
          Export JSON
        </button>
        <button type="button" className="btn btn-ghost" disabled={!lines.length} onClick={onClear}>
          Clear
        </button>
      </div>
    </aside>
  )
}
