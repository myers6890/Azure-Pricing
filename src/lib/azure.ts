import {
  DesktopVirtualizationAPIClient,
  type HostPool,
  type UserSession,
} from "@azure/arm-desktopvirtualization";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import {
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";
import { parseHostPoolId, toAvdSession } from "./arm";
import {
  demoDisconnect,
  demoHostPools,
  demoListSessions,
  demoLogoff,
  demoSubscriptions,
  isDemoMode,
} from "./demo";
import type {
  AuthStatus,
  AvdSession,
  HostPoolSummary,
  LogoffResult,
  LogoffTarget,
  SubscriptionSummary,
} from "./types";

let credential: TokenCredential | null = null;

function getCredential(): TokenCredential {
  if (!credential) {
    credential = new DefaultAzureCredential();
  }
  return credential;
}

function getDesktopClient(subscriptionId: string): DesktopVirtualizationAPIClient {
  return new DesktopVirtualizationAPIClient(getCredential(), subscriptionId);
}

async function collectAsyncIterable<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

export function getAuthStatus(): AuthStatus {
  if (isDemoMode()) {
    return {
      mode: "demo",
      authenticated: true,
      message:
        "Running in demo mode with sample AVD sessions. Set AVD_DEMO_MODE=false and sign in with Azure CLI or a service principal to manage a real environment.",
    };
  }

  const hasServicePrincipal = Boolean(
    process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_SECRET,
  );

  return {
    mode: "azure",
    authenticated: true,
    message: hasServicePrincipal
      ? "Using service principal credentials from environment variables."
      : "Using DefaultAzureCredential (Windows: Azure CLI `az login`, Visual Studio, or environment).",
    tenantHint: process.env.AZURE_TENANT_ID,
  };
}

export async function listSubscriptions(): Promise<SubscriptionSummary[]> {
  if (isDemoMode()) return demoSubscriptions();

  const client = new SubscriptionClient(getCredential());
  const subscriptions = await collectAsyncIterable(client.subscriptions.list());

  return subscriptions
    .filter((s) => Boolean(s.subscriptionId))
    .map((s) => ({
      id: s.id ?? `/subscriptions/${s.subscriptionId}`,
      subscriptionId: s.subscriptionId!,
      displayName: s.displayName ?? s.subscriptionId!,
      state: typeof s.state === "string" ? s.state : undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function mapHostPool(pool: HostPool): HostPoolSummary | null {
  if (!pool.id || !pool.name) return null;
  const parsed = parseHostPoolId(pool.id);
  if (!parsed) return null;

  return {
    id: pool.id,
    name: pool.name,
    resourceGroup: parsed.resourceGroup,
    location: pool.location,
    friendlyName: pool.friendlyName,
    hostPoolType: pool.hostPoolType,
  };
}

export async function listHostPools(
  subscriptionId: string,
): Promise<HostPoolSummary[]> {
  if (isDemoMode()) return demoHostPools();

  const client = getDesktopClient(subscriptionId);
  const pools = await collectAsyncIterable(client.hostPools.list());
  return pools
    .map(mapHostPool)
    .filter((p): p is HostPoolSummary => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mapSession(session: UserSession): AvdSession | null {
  return toAvdSession({
    id: session.id,
    name: session.name,
    userPrincipalName: session.userPrincipalName,
    activeDirectoryUserName: session.activeDirectoryUserName,
    sessionState: session.sessionState,
    applicationType: session.applicationType,
    createTime: session.createTime,
  });
}

export async function listSessions(options: {
  subscriptionId: string;
  resourceGroup?: string;
  hostPoolName?: string;
  filter?: string;
}): Promise<AvdSession[]> {
  if (isDemoMode()) {
    return demoListSessions({
      hostPoolName: options.hostPoolName,
      filter: options.filter,
    });
  }

  const client = getDesktopClient(options.subscriptionId);
  const pools = options.hostPoolName
    ? (
        await listHostPools(options.subscriptionId)
      ).filter((p) => p.name === options.hostPoolName)
    : await listHostPools(options.subscriptionId);

  const filteredPools = options.resourceGroup
    ? pools.filter(
        (p) =>
          p.resourceGroup.toLowerCase() === options.resourceGroup!.toLowerCase(),
      )
    : pools;

  const sessions: AvdSession[] = [];

  for (const pool of filteredPools) {
    const items = await collectAsyncIterable(
      client.userSessions.listByHostPool(pool.resourceGroup, pool.name, {
        filter: options.filter,
      }),
    );

    for (const item of items) {
      const mapped = mapSession(item);
      if (mapped) sessions.push(mapped);
    }
  }

  return sessions.sort((a, b) => {
    const aUser = a.userPrincipalName ?? "";
    const bUser = b.userPrincipalName ?? "";
    return aUser.localeCompare(bUser);
  });
}

export async function logoffSessions(
  targets: LogoffTarget[],
  force = true,
): Promise<LogoffResult[]> {
  if (isDemoMode()) return demoLogoff(targets, force);

  const results: LogoffResult[] = [];

  for (const target of targets) {
    try {
      const client = getDesktopClient(target.subscriptionId);
      await client.userSessions.delete(
        target.resourceGroup,
        target.hostPoolName,
        target.sessionHostName,
        target.userSessionId,
        { force },
      );
      results.push({ target, ok: true });
    } catch (error) {
      results.push({
        target,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

export async function disconnectSessions(
  targets: LogoffTarget[],
): Promise<LogoffResult[]> {
  if (isDemoMode()) return demoDisconnect(targets);

  const results: LogoffResult[] = [];

  for (const target of targets) {
    try {
      const client = getDesktopClient(target.subscriptionId);
      await client.userSessions.disconnect(
        target.resourceGroup,
        target.hostPoolName,
        target.sessionHostName,
        target.userSessionId,
      );
      results.push({ target, ok: true });
    } catch (error) {
      results.push({
        target,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
