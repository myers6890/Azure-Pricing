import { getErrorMessage, jsonError, jsonOk } from "@/lib/api";
import { listHostPools } from "@/lib/azure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("subscriptionId");

  if (!subscriptionId) {
    return jsonError("Query parameter subscriptionId is required.");
  }

  try {
    const hostPools = await listHostPools(subscriptionId);
    return jsonOk({ hostPools });
  } catch (error) {
    return jsonError(
      "Failed to list host pools.",
      500,
      getErrorMessage(error),
    );
  }
}
