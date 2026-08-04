import type { Commitment, OsType, SqlEdition } from '../api/vmPricing'
import { OS_DISK_OPTIONS } from '../data/disks'

interface Props {
  os: OsType
  windowsAhb: boolean
  sqlEdition: SqlEdition
  sqlAhb: boolean
  commitment: Commitment
  quantity: number
  hoursPerMonth: number
  osDiskId: string
  disabled?: boolean
  onChange: (patch: Partial<{
    os: OsType
    windowsAhb: boolean
    sqlEdition: SqlEdition
    sqlAhb: boolean
    commitment: Commitment
    quantity: number
    hoursPerMonth: number
    osDiskId: string
  }>) => void
}

export function QuoteConfigurator(props: Props) {
  const {
    os,
    windowsAhb,
    sqlEdition,
    sqlAhb,
    commitment,
    quantity,
    hoursPerMonth,
    osDiskId,
    disabled,
    onChange,
  } = props

  return (
    <div className={`config-grid${disabled ? ' disabled' : ''}`}>
      <div className="field">
        <label htmlFor="os">Operating system</label>
        <select
          id="os"
          value={os}
          disabled={disabled}
          onChange={(e) => onChange({ os: e.target.value as OsType })}
        >
          <option value="linux">Linux (no Windows license)</option>
          <option value="windows">Windows Server</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="windows-ahb">Windows licensing</label>
        <select
          id="windows-ahb"
          value={os === 'linux' ? 'na' : windowsAhb ? 'ahb' : 'included'}
          disabled={disabled || os === 'linux'}
          onChange={(e) => onChange({ windowsAhb: e.target.value === 'ahb' })}
        >
          {os === 'linux' ? (
            <option value="na">Not applicable</option>
          ) : (
            <>
              <option value="included">License included (pay-as-you-go)</option>
              <option value="ahb">Azure Hybrid Benefit (bring your own)</option>
            </>
          )}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sql">SQL Server on VM</label>
        <select
          id="sql"
          value={sqlEdition}
          disabled={disabled}
          onChange={(e) => onChange({ sqlEdition: e.target.value as SqlEdition })}
        >
          <option value="none">No SQL Server</option>
          <option value="web">SQL Server Web</option>
          <option value="standard">SQL Server Standard</option>
          <option value="enterprise">SQL Server Enterprise</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="sql-ahb">SQL licensing</label>
        <select
          id="sql-ahb"
          value={sqlEdition === 'none' ? 'na' : sqlAhb ? 'ahb' : 'included'}
          disabled={disabled || sqlEdition === 'none'}
          onChange={(e) => onChange({ sqlAhb: e.target.value === 'ahb' })}
        >
          {sqlEdition === 'none' ? (
            <option value="na">Not applicable</option>
          ) : (
            <>
              <option value="included">License included (pay-as-you-go)</option>
              <option value="ahb">Azure Hybrid Benefit (bring your own)</option>
            </>
          )}
        </select>
      </div>

      <div className="field">
        <label htmlFor="commitment">Compute commitment</label>
        <select
          id="commitment"
          value={commitment}
          disabled={disabled}
          onChange={(e) => onChange({ commitment: e.target.value as Commitment })}
        >
          <option value="payg">Pay as you go</option>
          <option value="sp-1y">Savings plan · 1 year</option>
          <option value="sp-3y">Savings plan · 3 years</option>
          <option value="ri-1y">Reserved instance · 1 year</option>
          <option value="ri-3y">Reserved instance · 3 years</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="disk">OS disk</label>
        <select
          id="disk"
          value={osDiskId}
          disabled={disabled}
          onChange={(e) => onChange({ osDiskId: e.target.value })}
        >
          {OS_DISK_OPTIONS.map((disk) => (
            <option key={disk.id} value={disk.id}>
              {disk.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="qty">Quantity</label>
        <input
          id="qty"
          type="number"
          min={1}
          value={quantity}
          disabled={disabled}
          onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>

      <div className="field">
        <label htmlFor="hours">Hours / month</label>
        <input
          id="hours"
          type="number"
          min={1}
          max={744}
          value={hoursPerMonth}
          disabled={disabled}
          onChange={(e) =>
            onChange({ hoursPerMonth: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </div>
    </div>
  )
}
