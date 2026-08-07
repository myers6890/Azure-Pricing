import { getAuthStatus } from "@/lib/azure";
import { jsonOk } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk(getAuthStatus());
}
