/**
 * Best-effort vCPU count from ARM SKU names.
 * Handles constrained SKUs like Standard_E16-4ds_v5 (4 visible cores).
 */
export function parseVcpus(armSkuName: string): number | null {
  const name = armSkuName.trim()
  const constrained = name.match(/^Standard_[A-Za-z]+(\d+)-(\d+)/i)
  if (constrained) return Number(constrained[2])

  const standard = name.match(/^Standard_[A-Za-z]*?(\d+)/i)
  if (standard) return Number(standard[1])

  return null
}

/** SQL Server VM licensing uses a 4-core minimum for smaller sizes. */
export function sqlBillableCores(vcpus: number): number {
  return Math.max(4, vcpus)
}
