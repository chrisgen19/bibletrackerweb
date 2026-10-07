/**
 * Container health check for Coolify. Deliberately touches nothing but the web server: a
 * database blip should show in the database's own monitoring, not restart a healthy app
 * container (and lose in-flight requests with it).
 */
export function GET() {
  return Response.json({ status: "ok" });
}
