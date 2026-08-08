import type { AvdSession, LogoffTarget } from "./types";

const SESSION_ID_PATTERN =
  /^\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.DesktopVirtualization\/hostPools\/([^/]+)\/sessionHosts\/([^/]+)\/userSessions\/([^/]+)$/i;

const HOST_POOL_ID_PATTERN =
  /^\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.DesktopVirtualization\/hostPools\/([^/]+)$/i;

export function parseUserSessionId(id: string): LogoffTarget | null {
  const match = id.match(SESSION_ID_PATTERN);
  if (!match) return null;

  return {
    subscriptionId: match[1],
    resourceGroup: match[2],
    hostPoolName: match[3],
    sessionHostName: decodeURIComponent(match[4]),
    userSessionId: match[5],
  };
}

export function parseHostPoolId(id: string): {
  subscriptionId: string;
  resourceGroup: string;
  hostPoolName: string;
} | null {
  const match = id.match(HOST_POOL_ID_PATTERN);
  if (!match) return null;

  return {
    subscriptionId: match[1],
    resourceGroup: match[2],
    hostPoolName: match[3],
  };
}

export function toAvdSession(input: {
  id?: string;
  name?: string;
  userPrincipalName?: string;
  activeDirectoryUserName?: string;
  sessionState?: string;
  applicationType?: string;
  createTime?: Date | string;
}): AvdSession | null {
  if (!input.id) return null;
  const parsed = parseUserSessionId(input.id);
  if (!parsed) return null;

  return {
    id: input.id,
    name: input.name ?? parsed.userSessionId,
    subscriptionId: parsed.subscriptionId,
    resourceGroup: parsed.resourceGroup,
    hostPoolName: parsed.hostPoolName,
    sessionHostName: parsed.sessionHostName,
    userSessionId: parsed.userSessionId,
    userPrincipalName: input.userPrincipalName,
    activeDirectoryUserName: input.activeDirectoryUserName,
    sessionState: input.sessionState,
    applicationType: input.applicationType,
    createTime:
      typeof input.createTime === "string"
        ? input.createTime
        : input.createTime?.toISOString(),
  };
}

export function sessionKey(session: Pick<
  AvdSession,
  "hostPoolName" | "sessionHostName" | "userSessionId"
>): string {
  return `${session.hostPoolName}/${session.sessionHostName}/${session.userSessionId}`;
}
