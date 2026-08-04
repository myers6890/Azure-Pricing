import { OS_DISK_OPTIONS } from '../data/disks'
import { parseVcpus, sqlBillableCores } from '../lib/vcpu'
import type { RetailPriceItem } from '../types/pricing'
import { escapeOData, fetchFiltered } from './retailPrices'

export type SqlEdition = 'none' | 'web' | 'standard' | 'enterprise'
export type Commitment = 'payg' | 'sp-1y' | 'sp-3y' | 'ri-1y' | 'ri-3y'
export type OsType = 'linux' | 'windows'

export interface VmSkuOption {
  armSkuName: string
  productName: string
  seriesLabel: string
  vcpus: number | null
  linuxPayg: number | null
  windowsPayg: number | null
  unitOfMeasure: string
  location: string
}

export interface VmRateCard {
  armSkuName: string
  region: string
  location: string
  vcpus: number
  productNameLinux: string
  productNameWindows: string | null
  linux: RetailPriceItem | null
  windows: RetailPriceItem | null
  reservations: RetailPriceItem[]
  sqlLicenseHourly: number
  sqlProductName: string | null
  windowsLicenseHourly: number
  osDiskMonthly: number
  osDiskLabel: string
}

function isNormalMeter(item: RetailPriceItem): boolean {
  const blob = `${item.meterName} ${item.skuName}`
  return !/spot|low priority/i.test(blob)
}

function isLinuxProduct(productName: string): boolean {
  return !/windows/i.test(productName)
}

function seriesLabel(productName: string): string {
  return productName.replace(/\s+Windows$/i, '').replace(/^Virtual Machines\s+/i, '')
}

export async function searchVmSkus(options: {
  region: string
  query: string
  signal?: AbortSignal
}): Promise<VmSkuOption[]> {
  const q = options.query.trim()
  if (!q) return []

  const filter = [
    `serviceName eq 'Virtual Machines'`,
    `armRegionName eq '${escapeOData(options.region)}'`,
    `priceType eq 'Consumption'`,
    `(contains(armSkuName, '${escapeOData(q)}') or contains(productName, '${escapeOData(q)}') or contains(skuName, '${escapeOData(q)}'))`,
  ].join(' and ')

  const items = await fetchFiltered(filter, 'USD', options.signal, 2)
  const bySku = new Map<string, RetailPriceItem[]>()

  for (const item of items) {
    if (!item.armSkuName || !isNormalMeter(item)) continue
    const list = bySku.get(item.armSkuName) ?? []
    list.push(item)
    bySku.set(item.armSkuName, list)
  }

  const results: VmSkuOption[] = []
  for (const [armSkuName, meters] of bySku) {
    const linux = meters.find((m) => isLinuxProduct(m.productName))
    const windows = meters.find((m) => /windows/i.test(m.productName))
    const base = linux ?? windows
    if (!base) continue
    results.push({
      armSkuName,
      productName: base.productName,
      seriesLabel: seriesLabel(base.productName),
      vcpus: parseVcpus(armSkuName),
      linuxPayg: linux?.retailPrice ?? null,
      windowsPayg: windows?.retailPrice ?? null,
      unitOfMeasure: base.unitOfMeasure,
      location: base.location,
    })
  }

  return results.sort((a, b) => {
    const av = a.vcpus ?? 9999
    const bv = b.vcpus ?? 9999
    if (av !== bv) return av - bv
    return a.armSkuName.localeCompare(b.armSkuName)
  })
}

function pickSqlProduct(edition: SqlEdition): string | null {
  if (edition === 'web') return 'SQL Server Web'
  if (edition === 'standard') return 'SQL Server Standard'
  if (edition === 'enterprise') return 'SQL Server Enterprise'
  return null
}

function matchSqlLicense(items: RetailPriceItem[], vcpus: number): RetailPriceItem | null {
  const billable = sqlBillableCores(vcpus)
  const exact = items.find(
    (i) =>
      i.meterName === `${billable} vCPU VM License` ||
      i.skuName === `${billable} vCPU VM`,
  )
  if (exact) return exact

  if (billable <= 4) {
    const min4 = items.find(
      (i) => /1-4 vCPU/i.test(i.meterName) || /1-4 vCPU/i.test(i.skuName),
    )
    if (min4) return min4
  }

  const perCore = items.find((i) => /1 vCore License/i.test(i.meterName))
  if (perCore) {
    return {
      ...perCore,
      retailPrice: perCore.retailPrice * billable,
      unitPrice: perCore.unitPrice * billable,
      meterName: `${billable} vCPU (derived from 1 vCore)`,
    }
  }
  return null
}

function matchWindowsLicense(items: RetailPriceItem[], vcpus: number): number {
  const exact = items.find(
    (i) => i.meterName === `${vcpus} vCPU VM License` || i.skuName === `${vcpus} vCPU VM`,
  )
  if (exact) return exact.retailPrice
  const per = items.find((i) => /1 vCPU/i.test(i.meterName) || /1 Core/i.test(i.meterName))
  if (per) return per.retailPrice * vcpus
  return 0
}

export async function loadVmRateCard(options: {
  armSkuName: string
  region: string
  sqlEdition: SqlEdition
  osDiskId: string
  signal?: AbortSignal
}): Promise<VmRateCard> {
  const sku = escapeOData(options.armSkuName)
  const region = escapeOData(options.region)
  const vcpus = parseVcpus(options.armSkuName) ?? 0

  const consumptionFilter = [
    `serviceName eq 'Virtual Machines'`,
    `armRegionName eq '${region}'`,
    `priceType eq 'Consumption'`,
    `armSkuName eq '${sku}'`,
  ].join(' and ')

  const reservationFilter = [
    `serviceName eq 'Virtual Machines'`,
    `armRegionName eq '${region}'`,
    `priceType eq 'Reservation'`,
    `armSkuName eq '${sku}'`,
  ].join(' and ')

  const windowsLicenseFilter =
    `serviceName eq 'Virtual Machines Licenses' and productName eq 'Windows Server' and priceType eq 'Consumption'`

  const sqlProduct = pickSqlProduct(options.sqlEdition)
  const sqlFilter = sqlProduct
    ? `serviceName eq 'Virtual Machines Licenses' and productName eq '${escapeOData(sqlProduct)}' and priceType eq 'Consumption'`
    : null

  const diskOpt = OS_DISK_OPTIONS.find((d) => d.id === options.osDiskId) ?? OS_DISK_OPTIONS[0]
  const diskFilter =
    diskOpt.id !== 'none'
      ? [
          `serviceName eq 'Storage'`,
          `armRegionName eq '${region}'`,
          `priceType eq 'Consumption'`,
          `productName eq '${escapeOData(diskOpt.productName)}'`,
          `contains(meterName, '${escapeOData(diskOpt.meterContains)}')`,
        ].join(' and ')
      : null

  const [consumption, reservations, windowsLicenses, sqlLicenses, disks] = await Promise.all([
    fetchFiltered(consumptionFilter, 'USD', options.signal, 1),
    fetchFiltered(reservationFilter, 'USD', options.signal, 1),
    fetchFiltered(windowsLicenseFilter, 'USD', options.signal, 2),
    sqlFilter ? fetchFiltered(sqlFilter, 'USD', options.signal, 1) : Promise.resolve([]),
    diskFilter ? fetchFiltered(diskFilter, 'USD', options.signal, 1) : Promise.resolve([]),
  ])

  const normal = consumption.filter(isNormalMeter)
  const linux = normal.find((m) => isLinuxProduct(m.productName)) ?? null
  const windows = normal.find((m) => /windows/i.test(m.productName)) ?? null
  const linuxReservations = reservations.filter(
    (r) => isLinuxProduct(r.productName) && isNormalMeter(r),
  )

  const sqlItem = sqlProduct ? matchSqlLicense(sqlLicenses, vcpus || 4) : null
  const windowsLicenseHourly =
    windows && linux
      ? Math.max(0, windows.retailPrice - linux.retailPrice)
      : matchWindowsLicense(windowsLicenses, vcpus || 1)

  const diskItem =
    disks.find(
      (d) =>
        d.skuName === diskOpt.skuName &&
        /Disk$/i.test(d.meterName) &&
        !/Mount|Operations|Burst/i.test(d.meterName),
    ) ?? disks[0]

  return {
    armSkuName: options.armSkuName,
    region: options.region,
    location: linux?.location ?? windows?.location ?? options.region,
    vcpus: vcpus || 0,
    productNameLinux: linux?.productName ?? '',
    productNameWindows: windows?.productName ?? null,
    linux,
    windows,
    reservations: linuxReservations,
    sqlLicenseHourly: sqlItem?.retailPrice ?? 0,
    sqlProductName: sqlProduct,
    windowsLicenseHourly,
    osDiskMonthly: diskItem?.retailPrice ?? 0,
    osDiskLabel: diskOpt.label,
  }
}
