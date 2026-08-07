import { getErrorMessage, jsonError, jsonOk } from "@/lib/api";
import { disconnectSessions } from "@/lib/azure";
import type { LogoffTarget } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLogoffTarget(value: unknown): value is LogoffTarget {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.subscriptionId === "string" &&
    typeof t.resourceGroup === "string" &&
    typeof t.hostPoolName === "string" &&
    typeof t.sessionHostName === "string" &&
    typeof t.userSessionId === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const payload = body as { sessions?: unknown };

  if (!Array.isArray(payload.sessions) || payload.sessions.length === 0) {
    return jsonError("Body must include a non-empty sessions array.");
  }

  if (!payload.sessions.every(isLogoffTarget)) {
    return jsonError(
      "Each session must include subscriptionId, resourceGroup, hostPoolName, sessionHostName, and userSessionId.",
    );
  }

  try {
    const results = await disconnectSessions(payload.sessions);
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;
    return jsonOk({ results, succeeded, failed });
  } catch (error) {
    return jsonError(
      "Failed to disconnect sessions.",
      500,
      getErrorMessage(error),
    );
  }
}
