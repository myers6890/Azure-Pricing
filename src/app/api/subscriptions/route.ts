import { getErrorMessage, jsonError, jsonOk } from "@/lib/api";
import { listSubscriptions } from "@/lib/azure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscriptions = await listSubscriptions();
    return jsonOk({ subscriptions });
  } catch (error) {
    return jsonError(
      "Failed to list subscriptions. Sign in with Azure CLI (`az login`) or set AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_CLIENT_SECRET, or enable AVD_DEMO_MODE=true.",
      500,
      getErrorMessage(error),
    );
  }
}
