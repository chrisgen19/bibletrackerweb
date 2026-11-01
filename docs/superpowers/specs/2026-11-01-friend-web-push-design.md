# Friends: web push for nudges (phase 2c)

Date: 2026-11-01
Status: approved

## Why

Phase 2b (`2026-11-01-friend-nudge-design.md`) lets a reader cheer a friend on, and the
friend sees "Maria is cheering you on" the next time they open Today. If the friend never
opens the app that day, the cheer does nothing.

Christian's moment: "I'm usually at work or out, phone in my pocket. I want it on my lock
screen saying 'Maria is cheering you on', and tapping it opens Today so I can mark as
read."

This phase sends the same cheer to the friend's phone as a notification. It adds a way to
deliver a cheer; it does not change what a cheer is, who can send one, or when.

## Goals

- When a friend cheers you on, your phone shows a lock-screen notification:
  **"Maria is cheering you on"**.
- **Tapping it opens Today** (`/`), where the 2b banner and "Mark as Read" already are.
- **One notification per device, updated in place.** A second cheer before you look
  replaces the first: "Maria and Ben are cheering you on", the same wording as the banner.
- The first time someone cheers you on, the cheering banner on Today **asks whether you
  want these on your lock screen** (design B, below). The browser's own permission prompt
  only appears after you tap "Turn on".
- A **"Cheers from friends" switch in Settings** to turn it on or off later.

## Non-goals (this phase)

- **Desktop browsers.** Phones only for now (decision 7). No prompt, no switch, no push on
  a laptop or desktop.
- **Quiet hours** or any delay. A cheer is pushed when it is sent (decision 6).
- Push for anything other than cheers (friend requests, reminders, streaks).
- Offline support or caching. The service worker only receives pushes and handles taps.
- Telling the sender whether a push was delivered or seen (2b non-goal, still applies).
- Getting iPhone friends to add the app to their Home Screen beyond a short how-to in
  Settings. No install banners or nagging.
- A native app.

## Anti-goals

- **Nagging.** The lock-screen question appears at most three times per device, only
  inside a cheer, and never on its own (decision 4). The browser's permission prompt is
  never shown without the reader tapping "Turn on" first.
- **Guilt or scolding** (2b anti-goal). The notification says who is cheering, nothing
  else: no missed days, no counts, no warning tone.
- **A cheer reaching the wrong person.** A notification only goes to devices currently
  signed in to the receiver's account. Each push subscription is tied to the login session
  that created it, so **whenever that session ends** (sign-out, expiry, revoked from
  elsewhere, or a sign-out that never reached the server), the device stops getting
  pushes (decision 9). A shared or handed-down phone never shows the previous owner's
  cheers.
- **Cheers leaking past the friendship.** No push for a nudge that `sendNudge` refused,
  and the names in a notification come from the receiver's current open nudges, so a
  removed friend is never named in a new push.
- **Email or anything beyond name in the notification.** Display names (first word) only,
  as the banner. *My call:* no photos in the notification; the app icon is enough and it
  avoids pushing image URLs to the push service.
- **A failed push breaking the cheer.** Sending a cheer succeeds or fails exactly as in 2b,
  whatever happens with push. The sender never waits on it or sees a push error.

## Decisions made with Christian

1. **Lock screen, tap opens Today.** Notification text "Maria is cheering you on"; tapping
   it opens `/`.
2. **Ask the first time someone cheers you on**, inside the Today banner, and only then
   trigger the browser's permission prompt.
3. **Design B**: the question is folded into the cheering row as a second line, "Want
   these on your lock screen?", with "Turn on" and "Not now". (Option A, a separate box
   under the banner, and C, a bottom sheet, were rejected.)
4. **The X dismisses only the cheer**; the question has its own "Not now". **After three
   "Not now"s** the question stops appearing and the Settings switch is the only way to
   turn it on.
5. **One notification per device, updated in place**, e.g. "Maria and Ben are cheering
   you on".
6. **No quiet hours**: cheers are pushed whenever they are sent.
7. **Phones only**, no desktop browsers.
8. **A switch in Settings** to turn it off later.
9. **Cheers stop whenever the login session ends**, not only on an explicit sign-out:
   each push subscription is tied to the session that created it.

The playback Christian confirmed also settled these (proposed by Claude, agreed):

- Dismissing the cheer with the X takes the question with it (it lives in the same row).
  That counts as neither "Turn on" nor "Not now", and the question returns with the next
  cheer.
- If the reader blocks the browser's permission prompt, the question goes away for good
  on that device, and Settings explains how to unblock.
- The "Not now" count and the on/off state are **per device**, matching how push
  subscriptions work.
- On an iPhone where the app is not on the Home Screen, the question never shows; Settings
  explains how to add it.

## Who can get push

| Device | Gets push? |
|---|---|
| Android phone, Chrome or other Chromium browser, installed or not | Yes |
| Android phone, Firefox | Yes, if the browser supports Push API (*my call:* feature-detect, do not list browsers) |
| iPhone, app added to Home Screen and opened from there (iOS 16.4+) | Yes |
| iPhone, in Safari (not on Home Screen) | No. No question on Today; Settings shows the how-to |
| Laptop or desktop, any browser | No (decision 7). No question, no Settings section |

**Phone detection** (*my call*, builder may refine): a device counts as a phone when
`navigator.userAgentData?.mobile` is true, or, where that is missing (Safari, Firefox),
the user agent matches iPhone or Android Mobile. iPad is treated as not a phone (it is
not in scope and iPadOS reports a desktop user agent anyway). Push support is then
`"serviceWorker" in navigator && "PushManager" in window`. An iPhone in Safari has no
`PushManager`, which is how "not on the Home Screen" is detected; *my call:* check
`navigator.standalone` / `display-mode: standalone` only to choose the Settings copy.

## The question on Today (design B)

Extends `CheeringRow` (`src/features/friends/components/cheering-row.tsx`), the tinted row
at the top of `TodayReadingCard`.

```
+--------------------------------------------------+
| (M)  Maria is cheering you on                 X  |
|      Want these on your lock screen?             |
|      [Turn on]  Not now                          |
+--------------------------------------------------+
| TODAY'S READING                                  |
| Luke 7                                           |
| [            Mark as Read            ]           |
```

- **When it shows**: the row is showing (2b rules unchanged), and on this device all of:
  it is a phone, push is supported, permission is `"default"` (never asked), there is no
  active subscription, and "Not now" has been tapped fewer than three times.
- Second line inside the row, under the names, indented to line up with the text (not the
  avatars). Copy: "Want these on your lock screen?". "Turn on" is a small primary pill;
  "Not now" is a muted text button. Both are at least 44px tall for touch, as the X is.
  *My call* on exact sizes, matching the mockup.
- **"Turn on"**:
  1. Register the service worker (if not yet), then call
     `Notification.requestPermission()` from the tap (iOS requires a user gesture). The
     VAPID public key comes from a prop (see Configuration), not `process.env`.
  2. **Allowed**: subscribe with the VAPID public key and save the subscription on the
     server. The second line is replaced for a moment by "You'll get cheers on your lock
     screen" (*my call*, about 3 seconds, then the line disappears) and never returns on
     this device.
  3. **Blocked**: the second line disappears and never returns on this device (the browser
     will not ask again). No error shown.
  4. **Dismissed without answering** (permission stays `"default"`): treat as "Not now".
  5. **Subscribing or saving fails**: show the existing inline error pattern
     (`friendsErrorMessage`) under the line, e.g. "Couldn't turn on notifications. Try
     again." The question stays.
- **"Not now"**: hides the second line; the cheer stays. Increments this device's count.
  At three, the question never shows again on this device.
- **X**: dismisses the cheer as in 2b, and the question goes with it. The count does not
  change; the question can return with the next cheer.
- The "Not now" count lives in this device's `localStorage` (*my call*: it is per device,
  and losing it after clearing site data only means the question can come back up to three
  more times). Wrapped in try/catch: if storage is unavailable, treat the count as zero.
- The row must not jump around: the second line is decided on the client after mount
  (permission and storage are browser-only), so *my call:* it fades in rather than
  pushing content down mid-read. The builder may hold the row's height if that reads
  better.
- Screen readers: "Turn on" and "Not now" are real buttons; the line is text.

## The Settings switch

A new **Notifications** section in `SettingsScreen`
(`src/features/settings/components/settings-screen.tsx`), between Appearance and Account,
**on phones only**. On desktop the section is not rendered.

One row, "Cheers from friends", with a switch, and a footnote below it. States:

| State on this device | Switch | Footnote |
|---|---|---|
| Subscribed | On | "Get a notification on this phone when a friend cheers you on." |
| Not subscribed, permission `"default"` or `"granted"` | Off | same footnote |
| Permission `"denied"` | Off, disabled | "Notifications are blocked for Bible Daily. Allow them in your phone's settings, then come back." |
| iPhone, not on Home Screen (no `PushManager`) | Off, disabled | "On iPhone, add Bible Daily to your Home Screen first: tap Share, then Add to Home Screen, and open it from there." |
| Push not supported for another reason | Off, disabled | "This browser can't show notifications." |

- **Turning on** runs the same steps as "Turn on" on Today (permission if needed,
  subscribe, save). It works even after three "Not now"s.
- **Turning off** unsubscribes this device (`subscription.unsubscribe()`) and deletes its
  row on the server. It does not touch other devices, and does not change the in-app
  banner, which always shows.
- The switch is a client component; its state is read from the browser on mount
  (permission, `pushManager.getSubscription()`), after the same app-load check (see
  Subscriptions on the server), so a subscription left over from an ended session shows
  as off rather than on.
- *My call:* the switch is an accessible `role="switch"` button with `aria-checked`, built
  with existing primitives. No new UI package.

## The notification

- **Title**: the banner wording, using `cheeringNames`
  (`src/features/friends/domain/nudge.ts`) so the two never drift:
  - "Maria is cheering you on"
  - "Maria and Ben are cheering you on"
  - "Maria, Ben and others are cheering you on" (no number)
- **Body**: *my call*, none, or a short "Tap to open today's reading" if a body is
  required for the platform to show it well. No missed days, no streaks.
- **Icon / badge**: the app icons in `public/icons`.
- **One per device, updated in place**: every cheer notification uses the same `tag`
  (e.g. `"cheers"`), so a new one replaces the old on that device. `renotify: true` so the
  replacement still buzzes.
- **Names come from the server at send time**: after a nudge is stored, the server reads
  the receiver's open nudges (`getOpenNudges`, `friends-dal.ts:612`) and builds the title
  from those senders, so the notification always matches what the banner would show. It
  does not try to merge with whatever the phone currently displays.
- **Tap**: the service worker focuses an open app window and navigates it to `/`, or opens
  `/` if none is open, then closes the notification.
- **Clearing** (*my call*): when the reader opens Today with the app, or marks today as
  read, close any shown `"cheers"` notification on that device
  (`registration.getNotifications({ tag: "cheers" })`). A stale lock-screen cheer after
  reading would be noise.

## Sending

- `sendNudge` (`src/lib/friends-dal.ts:565`) is unchanged. Push hooks in at its single
  caller, `nudgeFriendFor` (`src/features/friends/commands/commands.ts:176`), **only when
  the outcome is `"sent"`**.
- The push runs **after the response**, using Next.js `after()`
  (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`), so the
  sender's action returns as fast as in 2b and a slow or failing push service cannot
  affect it.
- Read the receiver's subscriptions **whose session is still live**: joined to `session`
  with `expires_at` in the future. Subscriptions whose session has expired but whose
  session row has not been cleaned up yet are skipped, and deleted in the same pass
  (*my call*), so an expired login never receives a cheer.
- For each remaining subscription, send the payload with `web-push`.
  - **404 or 410** from the push service: the subscription is gone; delete its row.
  - Any other failure: move on to the next device. No retries in this phase (*my call*).
    The app has no server logging today (no `console.error` or logger in `src`); *my
    call:* one `console.error` with the status code and no subscription details is
    acceptable here, since push failures are otherwise invisible. No `console.log`.
- Sending to many devices is fine sequentially or with a small `Promise.allSettled`;
  a reader has a handful of devices at most.
- Nothing is pushed when the receiver has no subscriptions, which is the normal case for
  most readers. That path must cost one indexed query.

## Subscriptions on the server

- **Tied to the session** (decision 9). Every subscription row records the id of the
  login session that saved it, with a foreign key to `session` that **cascades on
  delete**. When Better Auth deletes the session (sign-out, revoking sessions, account
  deletion), the subscription row goes with it. Expired sessions whose rows linger are
  covered by the live-session check when sending (see Sending).
- **Save** (Server Action, session checked, Zod-validated): stores the subscription's
  `endpoint`, `keys.p256dh`, `keys.auth` for the signed-in user **and the current
  session's id**. `requireUser()` (`src/lib/session.ts`) returns only the user, so the
  builder needs the session id from the same `auth.api.getSession` result (a small helper
  alongside `getCurrentUser`, cached per request the same way). If the endpoint already
  exists (same device, re-subscribed, or another account signed in on it), it is
  **reassigned to the current user and session** and its keys updated, so one device
  belongs to one login at a time.
- **App-load check** (see Service worker): if the browser has a subscription, the client
  asks the server whether a row exists for that endpoint **under the current session**.
  - Yes: re-save its keys (they can change), nothing else.
  - No (the session that saved it has ended, or another account saved it): the client
    calls `subscription.unsubscribe()`. **A new session never inherits a subscription.**
- *My call, and the consequence of decision 9:* after any session ends, even signing
  back in as the same person, the device is off until the reader turns it on again in
  Settings. The Today question does not reappear, because permission is already
  `"granted"`. This keeps one simple rule (a subscription lives exactly as long as its
  session) instead of tracking who owned a device before.
- **Delete** (Server Action): removes the row for an endpoint, only if it belongs to the
  signed-in user.
- **Sign-out**: the cascade does the server side. The client also calls
  `subscription.unsubscribe()` before signing out (*my call*, tidy but not required); if
  that fails (offline), sign-out still proceeds, the server row still goes with the
  session, and the next app-load check unsubscribes the browser side.
- **Account deletion** cascades the rows.
- Removing a friend needs nothing here: subscriptions belong to the receiver, not the
  friendship.

## Data

A new table (*my call on the shape*, builder may adjust names):

- `push_subscription`: `id` (uuid), `user_id` (FK to `user`, cascade), `session_id` (FK
  to `session`, **cascade**, decision 9), `endpoint` (text, **unique**), `p256dh` (text),
  `auth` (text), `user_agent` (text, nullable, for debugging only, never shown),
  `created_at`, `updated_at` (`timestamptz(3)`).
- Index on `user_id` (sending) and on `session_id` (the cascade).
- `session.id` is a text id generated by Better Auth (`prisma/schema.prisma`, `Session`),
  so `session_id` is text, not uuid. The `Session` model gains the back-relation only;
  Better Auth's own columns are untouched.
- snake_case columns and `@@map`, as in `prisma/schema.prisma`. A new migration under
  `prisma/migrations/`. Production runs `prisma migrate deploy` on boot (`Dockerfile`).

The "Not now" count is **not** stored on the server (per device, see above).

## Service worker

- A static `public/sw.js`, registered with scope `/`. It handles only `push` (show the
  notification from the JSON payload) and `notificationclick` (focus or open `/`). No
  `fetch` handler, no caching.
- Update the comment in `src/app/manifest.ts:5` ("there is no service worker") to say the
  service worker exists only for push, not offline.
- **The proxy must let it through**: `src/proxy.ts` sends any path without a session
  cookie to `/sign-in`, and its matcher does not exclude `.js`. Exclude `/sw.js` so the
  browser can always fetch it.
- Serve it with `Cache-Control: no-cache` and `Content-Type: application/javascript` via
  `headers()` in `next.config.ts`, as the bundled PWA guide shows
  (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`).
- Registration happens only when needed: on "Turn on", on the Settings switch, and on app
  load for a device that **already has a subscription**, to run the app-load check (see
  Subscriptions on the server). Not on every visit for everyone.
- **App load never creates a subscription**, even when permission is `"granted"`
  (*my call*, from the builder check). Otherwise turning the switch off, or a session
  ending, would quietly turn push back on at the next visit. Consequence, accepted: once a
  device has granted permission and later unsubscribed, the Today question does not return
  there (it needs permission `"default"`); the Settings switch is the way back on.

## Configuration

- New variables in `src/lib/env.ts` (the only place feature code reads `process.env`):
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` or `https:`
  contact URL, required by the push services).
- **Runtime only, not `NEXT_PUBLIC_`** (*my call*, from the builder check). The
  `Dockerfile` runs `next build` with hard-coded stand-ins and no build args, so a
  `NEXT_PUBLIC_` key would be baked in empty; and client components cannot import
  `env.ts`, which validates the whole server environment on load. Instead, the server
  pages (`src/app/(app)/page.tsx`, the settings page and its `@sheet` twin) read the
  public key from `env` and pass it down as a prop, together with "push is configured".
  Every page already renders per request, so no Dockerfile change and no rebuild after
  setting the keys.
- **Optional as a set**, like the Google keys: all three or none. With none set, push is
  off: no question on Today, no Settings section, no sending. A fresh clone, the tests and
  the Docker build run without them.
- Add them empty to `.env.example`; generate real keys with `npx web-push
  generate-vapid-keys` and set them in Coolify for production (runtime variables).
- Rotating the VAPID keys invalidates every subscription; not planned.

## Constraints

- Next.js 16.3 App Router with breaking changes: read the relevant guide in
  `node_modules/next/dist/docs/` before writing routes, actions, `after()` or config
  (`AGENTS.md`).
- **New package: [`web-push`](https://www.npmjs.com/package/web-push)** (3.6.7, MPL-2.0)
  and `@types/web-push` as a dev dependency. Needs Christian's approval; approving this
  design approves these two and nothing else new.
- DAL for data access, Server Actions for writes, as in 2a and 2b.
- 2b behaviour and tests stay as they are: the banner, sending, dismissing and the daily
  limit are unchanged. Push is added on top.
- Mobile first. Check the banner at 320px wide with the second line, in light and dark.
- Test layout as before: `*.test.ts` for domain, `*.db.test.ts` for DAL, actions and
  routes, `*.dom.test.tsx` for components.

## Testing expectations

- **Payload**: title for one, two and three-plus open senders matches `cheeringNames`;
  never includes email or counts; tag is constant.
- **Send hook**: push attempted only on `"sent"`; not on `not-found`, `already-read`,
  `already-nudged`; a push failure does not change the action's result; 404/410 deletes
  the subscription; no subscriptions means no `web-push` call (mock `web-push`).
- **Subscriptions DAL**: save creates under the current session; saving an existing
  endpoint under another user or session reassigns it; delete only removes the caller's
  own row; deleting the session deletes its subscriptions; account deletion cascades.
- **Live sessions only**: a subscription whose session has expired (row still present) is
  not pushed to and is deleted when sending; the app-load check answers "no" for an
  endpoint saved under another session, so the client unsubscribes.
- **Env**: all three VAPID variables or none; partial set fails at boot with a clear
  message.
- **CheeringRow**: second line shows only when all conditions hold (mock the browser
  checks); "Not now" hides it and counts; third "Not now" stops it for good; X does not
  count; "Turn on" with granted, denied and dismissed permission; storage unavailable.
- **Settings**: each row of the states table; section absent on desktop or when push is
  not configured; turning off unsubscribes and deletes.
- **By hand** (cannot be automated here): Christian's iPhone from the Home Screen and an
  Android phone in Chrome. Lock-screen notification appears, second cheer replaces the
  first, tap opens Today, reading clears it, turning off in Settings stops pushes,
  signing out stops pushes, and ending the session from another device (or deleting its
  `session` row on staging) stops pushes to that phone.

## Left to the builder

- Exact phone-detection code within the rule above.
- Where the browser-only push helpers live (a hook such as `use-push-status`, a small
  module), and how `CheeringRow` gets them while staying testable.
- Whether the Today question and Settings share one hook for subscribe/unsubscribe.
- The notification body, if any, and exact small copy within the tone above.
- Table and column names.

## Follow-ups (not this phase)

- Desktop browser push, if wanted later.
- Quiet hours, if cheers at night turn out to bother people.
- Update the phase 1 spec's visibility table if push ever shows anything beyond names.
