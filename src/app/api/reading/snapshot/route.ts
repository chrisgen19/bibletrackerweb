import { getReadingSnapshot } from "@/lib/dal";
import { getCurrentUser } from "@/lib/session";

/**
 * The signed-in reader's snapshot, for the client to refetch when the window regains
 * focus (another device may have logged a reading). Server Actions are for writes;
 * this read is a plain GET. The proxy skips /api, so the session is checked here.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (user === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await getReadingSnapshot(user.id), {
    headers: { "cache-control": "no-store" },
  });
}
