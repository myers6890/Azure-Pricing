import { useEffect, useState } from 'react'
import { HOURS_PER_MONTH } from '../lib/cost'
import type { EstimateLine, RetailPriceItem } from '../types/pricing'

const STORAGE_KEY = 'aether-estimate-v1'

function loadInitial(): EstimateLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as EstimateLine[]
  } catch {
    return []
  }
}

function lineId(item: RetailPriceItem): string {
  return `${item.meterId}:${item.skuId}:${item.armRegionName}`
}

export function useEstimate() {
  const [lines, setLines] = useState<EstimateLine[]>(loadInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  function addItem(item: RetailPriceItem) {
    setLines((prev) => {
      const id = lineId(item)
      const existing = prev.find((l) => l.id === id)
      if (existing) {
        return prev.map((l) =>
          l.id === id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [
        ...prev,
        {
          id,
          item,
          quantity: 1,
          hoursPerMonth: HOURS_PER_MONTH,
          pricingMode: item.savingsPlan?.length ? 'payg' : 'payg',
        },
      ]
    })
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function updateLine(id: string, patch: Partial<EstimateLine>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    )
  }

  function clear() {
    setLines([])
  }

  return { lines, addItem, removeLine, updateLine, clear }
}
