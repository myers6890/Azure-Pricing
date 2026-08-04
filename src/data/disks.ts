export interface OsDiskOption {
  id: string
  label: string
  productName: string
  meterContains: string
  skuName: string
  sizeGb: number
}

/** Common OS disk choices matching Azure Pricing Calculator managed disks (LRS). */
export const OS_DISK_OPTIONS: OsDiskOption[] = [
  {
    id: 'none',
    label: 'No OS disk (compute only)',
    productName: '',
    meterContains: '',
    skuName: '',
    sizeGb: 0,
  },
  {
    id: 'premium-p6',
    label: 'Premium SSD P6 · 64 GB',
    productName: 'Premium SSD Managed Disks',
    meterContains: 'P6 LRS Disk',
    skuName: 'P6 LRS',
    sizeGb: 64,
  },
  {
    id: 'premium-p10',
    label: 'Premium SSD P10 · 128 GB',
    productName: 'Premium SSD Managed Disks',
    meterContains: 'P10 LRS Disk',
    skuName: 'P10 LRS',
    sizeGb: 128,
  },
  {
    id: 'premium-p15',
    label: 'Premium SSD P15 · 256 GB',
    productName: 'Premium SSD Managed Disks',
    meterContains: 'P15 LRS Disk',
    skuName: 'P15 LRS',
    sizeGb: 256,
  },
  {
    id: 'premium-p20',
    label: 'Premium SSD P20 · 512 GB',
    productName: 'Premium SSD Managed Disks',
    meterContains: 'P20 LRS Disk',
    skuName: 'P20 LRS',
    sizeGb: 512,
  },
  {
    id: 'premium-p30',
    label: 'Premium SSD P30 · 1 TB',
    productName: 'Premium SSD Managed Disks',
    meterContains: 'P30 LRS Disk',
    skuName: 'P30 LRS',
    sizeGb: 1024,
  },
  {
    id: 'standardssd-e10',
    label: 'Standard SSD E10 · 128 GB',
    productName: 'Standard SSD Managed Disks',
    meterContains: 'E10 LRS Disk',
    skuName: 'E10 LRS',
    sizeGb: 128,
  },
  {
    id: 'standardssd-e15',
    label: 'Standard SSD E15 · 256 GB',
    productName: 'Standard SSD Managed Disks',
    meterContains: 'E15 LRS Disk',
    skuName: 'E15 LRS',
    sizeGb: 256,
  },
  {
    id: 'standardhdd-s10',
    label: 'Standard HDD S10 · 128 GB',
    productName: 'Standard HDD Managed Disks',
    meterContains: 'S10 LRS Disk',
    skuName: 'S10 LRS',
    sizeGb: 128,
  },
]

export const DEFAULT_OS_DISK = 'premium-p10'
