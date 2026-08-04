export interface RegionOption {
  value: string
  label: string
  group: string
}

export const REGIONS: RegionOption[] = [
  { value: 'eastus', label: 'East US', group: 'Americas' },
  { value: 'eastus2', label: 'East US 2', group: 'Americas' },
  { value: 'westus', label: 'West US', group: 'Americas' },
  { value: 'westus2', label: 'West US 2', group: 'Americas' },
  { value: 'westus3', label: 'West US 3', group: 'Americas' },
  { value: 'centralus', label: 'Central US', group: 'Americas' },
  { value: 'southcentralus', label: 'South Central US', group: 'Americas' },
  { value: 'northcentralus', label: 'North Central US', group: 'Americas' },
  { value: 'canadacentral', label: 'Canada Central', group: 'Americas' },
  { value: 'brazilsouth', label: 'Brazil South', group: 'Americas' },
  { value: 'westeurope', label: 'West Europe', group: 'Europe' },
  { value: 'northeurope', label: 'North Europe', group: 'Europe' },
  { value: 'uksouth', label: 'UK South', group: 'Europe' },
  { value: 'ukwest', label: 'UK West', group: 'Europe' },
  { value: 'francecentral', label: 'France Central', group: 'Europe' },
  { value: 'germanywestcentral', label: 'Germany West Central', group: 'Europe' },
  { value: 'swedencentral', label: 'Sweden Central', group: 'Europe' },
  { value: 'switzerlandnorth', label: 'Switzerland North', group: 'Europe' },
  { value: 'norwayeast', label: 'Norway East', group: 'Europe' },
  { value: 'eastasia', label: 'East Asia', group: 'Asia Pacific' },
  { value: 'southeastasia', label: 'Southeast Asia', group: 'Asia Pacific' },
  { value: 'japaneast', label: 'Japan East', group: 'Asia Pacific' },
  { value: 'japanwest', label: 'Japan West', group: 'Asia Pacific' },
  { value: 'australiaeast', label: 'Australia East', group: 'Asia Pacific' },
  { value: 'australiasoutheast', label: 'Australia Southeast', group: 'Asia Pacific' },
  { value: 'centralindia', label: 'Central India', group: 'Asia Pacific' },
  { value: 'southindia', label: 'South India', group: 'Asia Pacific' },
  { value: 'koreacentral', label: 'Korea Central', group: 'Asia Pacific' },
  { value: 'uaenorth', label: 'UAE North', group: 'Middle East & Africa' },
  { value: 'southafricanorth', label: 'South Africa North', group: 'Middle East & Africa' },
]

export const COMPARE_REGIONS = [
  'eastus',
  'westus2',
  'westeurope',
  'northeurope',
  'southeastasia',
  'australiaeast',
]
