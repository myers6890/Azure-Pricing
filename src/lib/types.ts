export type SessionState =
  | "Unknown"
  | "Active"
  | "Disconnected"
  | "Pending"
  | "LogOff"
  | "UserProfileDiskMounted"
  | string;

export interface SubscriptionSummary {
  id: string;
  subscriptionId: string;
  displayName: string;
  state?: string;
}

export interface HostPoolSummary {
  id: string;
  name: string;
  resourceGroup: string;
  location?: string;
  friendlyName?: string;
  hostPoolType?: string;
  sessionHostCount?: number;
}

export interface AvdSession {
  id: string;
  name: string;
  subscriptionId: string;
  resourceGroup: string;
  hostPoolName: string;
  sessionHostName: string;
  userSessionId: string;
  userPrincipalName?: string;
  activeDirectoryUserName?: string;
  sessionState?: SessionState;
  applicationType?: string;
  createTime?: string;
}

export interface LogoffTarget {
  subscriptionId: string;
  resourceGroup: string;
  hostPoolName: string;
  sessionHostName: string;
  userSessionId: string;
}

export interface LogoffResult {
  target: LogoffTarget;
  ok: boolean;
  error?: string;
}

export interface AuthStatus {
  mode: "demo" | "azure";
  authenticated: boolean;
  message: string;
  tenantHint?: string;
}
