import { getErrorMessage, jsonError, jsonOk } from "@/lib/api";
import { listSessions } from "@/lib/azure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("subscriptionId");
  const resourceGroup = searchParams.get("resourceGroup") ?? undefined;
  const hostPoolName = searchParams.get("hostPoolName") ?? undefined;
  const userPrincipalName = searchParams.get("userPrincipalName") ?? undefined;
  const sessionState = searchParams.get("sessionState") ?? undefined;

  if (!subscriptionId) {
    return jsonError("Query parameter subscriptionId is required.");
  }

  const filters: string[] = [];
  if (userPrincipalName) {
    filters.push(`userPrincipalName eq '${userPrincipalName.replace(/'/g, "''")}'`);
  }
  if (sessionState) {
    filters.push(`sessionState eq '${sessionState.replace(/'/g, "''")}'`);
  }

  try {
    const sessions = await listSessions({
      subscriptionId,
      resourceGroup,
      hostPoolName: hostPoolName || undefined,
      filter: filters.length ? filters.join(" and ") : undefined,
    });
    return jsonOk({ sessions, count: sessions.length });
  } catch (error) {
    return jsonError(
      "Failed to list AVD user sessions.",
      500,
      getErrorMessage(error),
    );
  }
}
