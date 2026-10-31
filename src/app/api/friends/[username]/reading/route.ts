import { getFriendReading } from "@/lib/friends-dal";
import { getCurrentUser } from "@/lib/session";

/**
 * An accepted friend's reading, for their profile to refetch when the window regains
 * focus. The proxy skips /api, so the session is checked here. A stranger, a pending
 * request, a removed friend and the viewer's own username all answer the same 404, so
 * the route cannot be used to tell them apart.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/friends/[username]/reading">,
): Promise<Response> {
  const user = await getCurrentUser();
  if (user === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { username } = await ctx.params;
  const result = await getFriendReading(user.id, username);
  if (result.kind !== "friend") {
    return Response.json({ error: "not-found" }, { status: 404 });
  }
  return Response.json(result.reading, {
    headers: { "cache-control": "no-store" },
  });
}
