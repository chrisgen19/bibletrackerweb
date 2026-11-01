// Push-only service worker: shows cheer notifications and opens the app on click.
// No fetch listener, so it caches nothing and never touches page requests.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  if (!payload || typeof payload.title !== "string") return;

  const { title, tag, renotify, icon, data } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      tag,
      renotify,
      icon,
      badge: icon,
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find((client) =>
        client.url.startsWith(self.location.origin),
      );
      if (existing) {
        try {
          await existing.focus();
          // Rejects (or is missing) for a window this worker does not control.
          await existing.navigate(url);
          return;
        } catch {
          // Fall through and open a window instead.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
