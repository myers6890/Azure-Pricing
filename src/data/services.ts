export const SERVICE_FAMILIES = [
  'Compute',
  'Storage',
  'Networking',
  'Databases',
  'Analytics',
  'AI + Machine Learning',
  'Containers',
  'Web',
  'Integration',
  'Security',
  'Management and Governance',
  'Internet of Things',
  'Developer Tools',
] as const

export interface ServicePreset {
  label: string
  serviceName: string
  serviceFamily?: string
  hint: string
  queryHint?: string
}

export const SERVICE_PRESETS: ServicePreset[] = [
  {
    label: 'Virtual Machines',
    serviceName: 'Virtual Machines',
    serviceFamily: 'Compute',
    hint: 'D-series, E-series, B-series and more',
    queryHint: 'D4s_v5',
  },
  {
    label: 'Blob Storage',
    serviceName: 'Storage',
    serviceFamily: 'Storage',
    hint: 'Hot, cool, and archive tiers',
    queryHint: 'Hot LRS',
  },
  {
    label: 'SQL Database',
    serviceName: 'SQL Database',
    serviceFamily: 'Databases',
    hint: 'Single database & elastic pool',
    queryHint: 'vCore',
  },
  {
    label: 'App Service',
    serviceName: 'Azure App Service',
    serviceFamily: 'Web',
    hint: 'Plans and compute hours',
    queryHint: 'Premium',
  },
  {
    label: 'AKS',
    serviceName: 'Azure Kubernetes Service',
    serviceFamily: 'Containers',
    hint: 'Cluster management & compute',
  },
  {
    label: 'Cosmos DB',
    serviceName: 'Azure Cosmos DB',
    serviceFamily: 'Databases',
    hint: 'RU/s and storage meters',
    queryHint: '100 RU',
  },
  {
    label: 'Bandwidth',
    serviceName: 'Bandwidth',
    serviceFamily: 'Networking',
    hint: 'Egress and inter-region transfer',
  },
  {
    label: 'Functions',
    serviceName: 'Functions',
    serviceFamily: 'Compute',
    hint: 'Execution and resource consumption',
  },
  {
    label: 'Redis Cache',
    serviceName: 'Redis Cache',
    serviceFamily: 'Databases',
    hint: 'Standard and Premium caches',
  },
  {
    label: 'Load Balancer',
    serviceName: 'Load Balancer',
    serviceFamily: 'Networking',
    hint: 'Rules and data processed',
  },
]
