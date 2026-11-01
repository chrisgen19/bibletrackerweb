import { getOpenNudges } from "@/lib/friends-dal";
import { getCurrentUser } from "@/lib/session";

/**
 * The signed-in reader's open nudges, for the Today screen to refetch when the window
 * regains focus. The proxy skips /api, so the session is checked here.
 */
export async function GET(_request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (user === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const nudges = await getOpenNudges(user.id);
  return Response.json(nudges, { headers: { "cache-control": "no-store" } });
}
