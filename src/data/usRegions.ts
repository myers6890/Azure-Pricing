export interface UsRegion {
  value: string
  label: string
  group: 'US East' | 'US Central' | 'US West' | 'US Gov'
}

/** Commercial United States Azure regions used for quoting. */
export const US_REGIONS: UsRegion[] = [
  { value: 'eastus', label: 'East US', group: 'US East' },
  { value: 'eastus2', label: 'East US 2', group: 'US East' },
  { value: 'westus', label: 'West US', group: 'US West' },
  { value: 'westus2', label: 'West US 2', group: 'US West' },
  { value: 'westus3', label: 'West US 3', group: 'US West' },
  { value: 'centralus', label: 'Central US', group: 'US Central' },
  { value: 'southcentralus', label: 'South Central US', group: 'US Central' },
  { value: 'northcentralus', label: 'North Central US', group: 'US Central' },
  { value: 'westcentralus', label: 'West Central US', group: 'US Central' },
]

export const DEFAULT_US_REGION = 'eastus'
