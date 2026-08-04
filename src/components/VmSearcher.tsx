import type { VmSkuOption } from '../api/vmPricing'
import { formatMoney } from '../lib/format'

interface Props {
  query: string
  onQueryChange: (value: string) => void
  loading: boolean
  results: VmSkuOption[]
  selectedSku: string | null
  onSelect: (sku: VmSkuOption) => void
}

export function VmSearcher({
  query,
  onQueryChange,
  loading,
  results,
  selectedSku,
  onSelect,
}: Props) {
  return (
    <div className="vm-search">
      <div className="field">
        <label htmlFor="sku-search">Find a VM size</label>
        <input
          id="sku-search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="D4s_v5, E16ds_v5, B2s, F8s_v2…"
          autoComplete="off"
        />
      </div>

      {loading && <div className="loading-bar" />}

      <div className="sku-list" role="listbox" aria-label="Matching VM sizes">
        {!loading && query.trim() && results.length === 0 && (
          <div className="empty-inline">No VM sizes matched in this US region.</div>
        )}
        {results.map((sku) => (
          <button
            key={sku.armSkuName}
            type="button"
            role="option"
            aria-selected={selectedSku === sku.armSkuName}
            className={`sku-row${selectedSku === sku.armSkuName ? ' selected' : ''}`}
            onClick={() => onSelect(sku)}
          >
            <div>
              <strong>{sku.armSkuName}</strong>
              <div className="muted">
                {sku.seriesLabel}
                {sku.vcpus != null ? ` · ${sku.vcpus} vCPU` : ''}
              </div>
            </div>
            <div className="sku-prices">
              {sku.linuxPayg != null && (
                <span>Linux {formatMoney(sku.linuxPayg)}/hr</span>
              )}
              {sku.windowsPayg != null && (
                <span>Win {formatMoney(sku.windowsPayg)}/hr</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
