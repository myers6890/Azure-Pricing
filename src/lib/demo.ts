import type {
  AvdSession,
  HostPoolSummary,
  LogoffResult,
  LogoffTarget,
  SubscriptionSummary,
} from "./types";

const DEMO_SUB: SubscriptionSummary = {
  id: "/subscriptions/11111111-2222-3333-4444-555555555555",
  subscriptionId: "11111111-2222-3333-4444-555555555555",
  displayName: "Contoso Production (Demo)",
  state: "Enabled",
};

const DEMO_HOST_POOLS: HostPoolSummary[] = [
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-win11-pooled`,
    name: "hp-win11-pooled",
    resourceGroup: "rg-avd-prod",
    location: "eastus",
    friendlyName: "Windows 11 Pooled",
    hostPoolType: "Pooled",
  },
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-finance-personal`,
    name: "hp-finance-personal",
    resourceGroup: "rg-avd-prod",
    location: "eastus",
    friendlyName: "Finance Personal Desktops",
    hostPoolType: "Personal",
  },
];

let demoSessions: AvdSession[] = [
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-win11-pooled/sessionHosts/avd-sh-01.contoso.local/userSessions/1`,
    name: "1",
    subscriptionId: DEMO_SUB.subscriptionId,
    resourceGroup: "rg-avd-prod",
    hostPoolName: "hp-win11-pooled",
    sessionHostName: "avd-sh-01.contoso.local",
    userSessionId: "1",
    userPrincipalName: "alex.rivera@contoso.com",
    activeDirectoryUserName: "CONTOSO\\alex.rivera",
    sessionState: "Active",
    applicationType: "Desktop",
    createTime: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-win11-pooled/sessionHosts/avd-sh-01.contoso.local/userSessions/2`,
    name: "2",
    subscriptionId: DEMO_SUB.subscriptionId,
    resourceGroup: "rg-avd-prod",
    hostPoolName: "hp-win11-pooled",
    sessionHostName: "avd-sh-01.contoso.local",
    userSessionId: "2",
    userPrincipalName: "jamie.chen@contoso.com",
    activeDirectoryUserName: "CONTOSO\\jamie.chen",
    sessionState: "Disconnected",
    applicationType: "Desktop",
    createTime: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-win11-pooled/sessionHosts/avd-sh-02.contoso.local/userSessions/3`,
    name: "3",
    subscriptionId: DEMO_SUB.subscriptionId,
    resourceGroup: "rg-avd-prod",
    hostPoolName: "hp-win11-pooled",
    sessionHostName: "avd-sh-02.contoso.local",
    userSessionId: "3",
    userPrincipalName: "morgan.lee@contoso.com",
    activeDirectoryUserName: "CONTOSO\\morgan.lee",
    sessionState: "Active",
    applicationType: "RemoteApp",
    createTime: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: `/subscriptions/${DEMO_SUB.subscriptionId}/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-finance-personal/sessionHosts/fin-pc-04.contoso.local/userSessions/1`,
    name: "1",
    subscriptionId: DEMO_SUB.subscriptionId,
    resourceGroup: "rg-avd-prod",
    hostPoolName: "hp-finance-personal",
    sessionHostName: "fin-pc-04.contoso.local",
    userSessionId: "1",
    userPrincipalName: "priya.nair@contoso.com",
    activeDirectoryUserName: "CONTOSO\\priya.nair",
    sessionState: "Disconnected",
    applicationType: "Desktop",
    createTime: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

export function isDemoMode(): boolean {
  return (
    process.env.AVD_DEMO_MODE === "true" ||
    process.env.AVD_DEMO_MODE === "1" ||
    process.env.NEXT_PUBLIC_AVD_DEMO_MODE === "true"
  );
}

export function demoSubscriptions(): SubscriptionSummary[] {
  return [DEMO_SUB];
}

export function demoHostPools(): HostPoolSummary[] {
  return DEMO_HOST_POOLS;
}

export function demoListSessions(options?: {
  hostPoolName?: string;
  filter?: string;
}): AvdSession[] {
  let sessions = [...demoSessions];

  if (options?.hostPoolName) {
    sessions = sessions.filter((s) => s.hostPoolName === options.hostPoolName);
  }

  if (options?.filter) {
    const filter = options.filter.toLowerCase();
    const upnMatch = filter.match(/userprincipalname\s+eq\s+'([^']+)'/i);
    const stateMatch = filter.match(/sessionstate\s+eq\s+'([^']+)'/i);

    if (upnMatch) {
      sessions = sessions.filter(
        (s) => s.userPrincipalName?.toLowerCase() === upnMatch[1].toLowerCase(),
      );
    }
    if (stateMatch) {
      sessions = sessions.filter(
        (s) => s.sessionState?.toLowerCase() === stateMatch[1].toLowerCase(),
      );
    }
  }

  return sessions;
}

export function demoLogoff(
  targets: LogoffTarget[],
  _force: boolean,
): LogoffResult[] {
  return targets.map((target) => {
    const before = demoSessions.length;
    demoSessions = demoSessions.filter(
      (s) =>
        !(
          s.subscriptionId === target.subscriptionId &&
          s.resourceGroup.toLowerCase() === target.resourceGroup.toLowerCase() &&
          s.hostPoolName === target.hostPoolName &&
          s.sessionHostName === target.sessionHostName &&
          s.userSessionId === target.userSessionId
        ),
    );

    if (demoSessions.length < before) {
      return { target, ok: true };
    }

    return {
      target,
      ok: false,
      error: "Session not found in demo data (it may already be logged off).",
    };
  });
}

export function demoDisconnect(targets: LogoffTarget[]): LogoffResult[] {
  return targets.map((target) => {
    const session = demoSessions.find(
      (s) =>
        s.subscriptionId === target.subscriptionId &&
        s.resourceGroup.toLowerCase() === target.resourceGroup.toLowerCase() &&
        s.hostPoolName === target.hostPoolName &&
        s.sessionHostName === target.sessionHostName &&
        s.userSessionId === target.userSessionId,
    );

    if (!session) {
      return {
        target,
        ok: false,
        error: "Session not found in demo data.",
      };
    }

    session.sessionState = "Disconnected";
    return { target, ok: true };
  });
}

export function resetDemoSessions(): void {
  // Recreate by re-importing would require module reload; keep as no-op for API use.
}
