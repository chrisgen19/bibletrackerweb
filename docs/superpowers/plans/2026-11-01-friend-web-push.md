# Friend Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a friend cheers a reader on, push "Maria is cheering you on" to the reader's phone lock screen (one notification per device, updated in place, tap opens Today), asked for from the Today banner and switchable in Settings, with every subscription living exactly as long as the login session that created it.

**Architecture:** A `push_subscription` table with FKs to `user` and `session` (both cascade), and a small push DAL that only ever returns subscriptions whose session is live. After `nudgeFriend` succeeds, the Server Action schedules `pushCheers(receiverId)` with `after()`, which builds the title from `getOpenNudges` + `cheeringNames` and sends it with `web-push`. In the browser, a static `public/sw.js` shows pushes and handles taps; a `usePushDevice` hook owns availability, permission, subscribe, unsubscribe and the app-load session check, and is shared by the Today question, the Settings switch and a layout-level check.

**Tech Stack:** Next.js 16.3 App Router (`after()` from `next/server`), React 19.2, Prisma 7.10 (PostgreSQL), Zod 4, `web-push` 3.6.7 (new), Vitest (unit / dom / db projects), Biome, Tailwind 4, Lucide.

**Spec:** `docs/superpowers/specs/2026-11-01-friend-web-push-design.md`

## Global Constraints

- New packages: `web-push@3.6.7` (dependency) and `@types/web-push@3.6.4` (devDependency). Nothing else new.
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` or `https:`), all three or none, read only through `src/lib/env.ts`. Not `NEXT_PUBLIC_`. With none set: no question, no Settings section, no sending, no service worker registration.
- The public key reaches the client only as a prop from a server page or layout.
- Phones only: no question, no Settings section, no registration on desktop or iPad.
- Notification title is built with `cheeringNames` (`src/features/friends/domain/nudge.ts`): "{A} is cheering you on" / "{A} and {B} are cheering you on" / "{A}, {B} and others are cheering you on". No body, no counts, no email, no photos. `tag: "cheers"`, `renotify: true`, icon `/icons/icon-192.png`, data `{ url: "/" }`.
- Copy, verbatim: question "Want these on your lock screen?", buttons "Turn on" / "Not now"; confirmation "You'll get cheers on your lock screen" (about 3 s); turn-on failure "Couldn't turn on notifications. Try again."; Settings row "Cheers from friends", footnotes exactly as the spec's states table (Task 9 lists them).
- "Not now" limit: 3 per device, `localStorage` key `push-not-now-count`, every access in try/catch (unavailable = 0).
- A subscription row is pushed to only while `session.expires_at > now`; a new session never inherits a subscription.
- App load never creates a subscription.
- Push never changes a Server Action's result; the sender never waits for it.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` and `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` before Tasks 4 and 6 (`AGENTS.md`).
- No `console.log`; one `console.error` in the sender only, with the status code and no endpoint or keys. No em or en dashes anywhere.
- Every task ends green on `pnpm lint`, `pnpm typecheck` and its own tests. DB tests need `pnpm db:up`. Task 11 runs `pnpm verify`.

## Review Focus

1. **Same phone, second account**: user A turned push on, signs out offline (unsubscribe and sign-out both fail, then succeed later), user B signs in. B's app-load check must unsubscribe A's leftover and B must never get A's cheers. Test in Task 2 (`does not count an endpoint saved under another session as current`) and Task 7 (`unsubscribes a subscription the server does not recognise`).
2. **Cheer to a reader with no devices**, the common case: one indexed query, no `web-push` call, no error. Test in Task 4 (`does nothing when the receiver has no live subscriptions`).
3. **Push service down or slow** while a friend taps "Cheer Maria on": the button still flips to "You cheered..." and the result is `{ ok: true }`. Test in Task 5 (`returns ok even when the push throws`).
4. **"Turn on" tapped twice fast, or permission sheet dismissed**: one subscription saved; dismissed counts as "Not now". Test in Task 8 (`counts a dismissed permission prompt as Not now`) and Task 7 (`saves once when turnOn is called twice`).
5. **`localStorage` blocked** (private mode on some browsers): the question still works and never throws. Test in Task 8 (`works when storage throws`).

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `pnpm-lock.yaml` (modify) | `web-push`, `@types/web-push` |
| `src/lib/env.ts`, `.env.example` (modify) | VAPID variables, all-or-none |
| `src/lib/push-config.ts` (create) | `pushConfig` (server-only) |
| `prisma/schema.prisma`, `prisma/migrations/<ts>_push_subscriptions/` | `PushSubscription` model |
| `src/lib/push-dal.ts` (create) | save, refresh, delete, live subscriptions |
| `src/lib/session.ts` (modify) | `getCurrentSessionId` |
| `src/features/push/domain/types.ts` (create) | shared push types |
| `src/features/push/domain/notification.ts` (create) | `cheerNotification` |
| `src/lib/push-sender.ts` (create) | `pushCheers` |
| `src/features/push/commands/{inputs,commands}.ts` (create) | Zod input, command functions |
| `src/actions/push.ts` (create), `src/actions/friends.ts` (modify) | push actions; `after()` hook in `nudgeFriend` |
| `public/sw.js` (create), `src/proxy.ts`, `next.config.ts`, `src/app/manifest.ts` (modify) | service worker, served and reachable |
| `src/features/push/domain/device.ts` (create) | `isPhone`, `pushAvailability` |
| `src/features/push/browser/push-client.ts` (create) | browser push calls |
| `src/features/push/hooks/use-push-device.ts` (create) | status, turnOn, turnOff, session check |
| `src/features/push/hooks/not-now.ts` (create) | `localStorage` counter |
| `src/features/push/components/push-question.tsx` (create) | the second line on Today |
| `src/features/friends/components/cheering-row.tsx` (modify) | `children` slot |
| `src/features/progress/components/progress-screen.tsx`, `src/app/(app)/page.tsx` (modify) | wiring, clearing notifications |
| `src/features/push/components/notifications-section.tsx` (create) | Settings switch |
| `src/features/settings/components/settings-screen.tsx`, `src/app/(app)/settings/page.tsx` (modify) | wiring |
| `src/features/push/components/push-session-check.tsx` (create), `src/app/(app)/layout.tsx` (modify) | app-load check |
| `src/features/auth/hooks/use-sign-out.ts` (modify) | unsubscribe before sign-out |

## Shared types (Task 2 creates `src/features/push/domain/types.ts`)

```ts
export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}
export type PushAvailability = "available" | "needs-install" | "unsupported" | "not-phone";
export type PushDeviceStatus =
  | "loading" | "not-configured" | "not-phone" | "needs-install" | "unsupported"
  | "blocked" | "off" | "on";
export type TurnOnOutcome = "on" | "blocked" | "dismissed" | "failed";
export interface CheerNotification {
  readonly title: string;
  readonly tag: "cheers";
  readonly renotify: true;
  readonly icon: "/icons/icon-192.png";
  readonly data: { readonly url: "/" };
}
export type PushResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: "invalid-input" | "not-found" };
export type RefreshResult =
  | { readonly ok: true; readonly current: boolean }
  | { readonly ok: false; readonly error: "invalid-input" };
```

---

### Task 1: Package and configuration

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/lib/env.ts`, `.env.example`
- Create: `src/lib/push-config.ts`
- Test: `src/lib/__tests__/env.test.ts`

**Interfaces:**
- Produces: `Env` gains `VAPID_PUBLIC_KEY?`, `VAPID_PRIVATE_KEY?`, `VAPID_SUBJECT?` (strings). `pushConfig: { publicKey: string; privateKey: string; subject: string } | null` from `src/lib/push-config.ts` (`import "server-only"`).

- [ ] **Step 1: Install**

Run: `pnpm add web-push@3.6.7 && pnpm add -D @types/web-push@3.6.4`
Expected: exit 0, both in `package.json`.

- [ ] **Step 2: Write the failing tests** in a new `describe("parseEnv: web push")` block:
  - `accepts no VAPID variables` (all three undefined parse; fields undefined)
  - `accepts all three` with `VAPID_SUBJECT: "mailto:hello@example.test"`
  - `rejects a partial set and names the missing variable`: only public + private set, throws `/VAPID_SUBJECT/`
  - `rejects a subject that is not mailto: or https:`: `"hello@example.test"` throws `/VAPID_SUBJECT/`
  - `treats empty strings as unset` (as in `.env.example`)

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm vitest run --project unit src/lib/__tests__/env.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 4: Implement** the three fields with `optionalString`, a `superRefine` rule mirroring the Google pair (message: "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT together, or leave all three empty."), and `VAPID_SUBJECT` checked with `/^(mailto:|https:)/`. Add the three empty to `.env.example` with a comment: "Optional: web push for cheers. Generate with `npx web-push generate-vapid-keys`. Leave all three empty to turn push off." Create `push-config.ts`.

- [ ] **Step 5: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/env.ts src/lib/push-config.ts .env.example src/lib/__tests__/env.test.ts
git commit -m "build(push): add web-push and optional VAPID configuration"
```

---

### Task 2: Subscription table and DAL

**Files:**
- Modify: `prisma/schema.prisma` (new model; back-relations on `User` and `Session`), `src/lib/session.ts`
- Create: `prisma/migrations/<timestamp>_push_subscriptions/migration.sql` (via `pnpm db:migrate --name push_subscriptions`), `src/features/push/domain/types.ts` (the Shared types block above), `src/lib/push-dal.ts`
- Test: `src/lib/__tests__/push-subscriptions.db.test.ts`

**Interfaces:**
- Produces (in `src/lib/push-dal.ts`, `import "server-only"`):
  - `savePushSubscription(userId: string, sessionId: string, input: PushSubscriptionInput, userAgent: string | null): Promise<void>`: upsert on `endpoint`, reassigning `userId`, `sessionId`, keys.
  - `refreshPushSubscription(sessionId: string, input: PushSubscriptionInput): Promise<boolean>`: if a row with that endpoint has this `sessionId`, update its keys and return true; else false. Never creates.
  - `deletePushSubscription(userId: string, endpoint: string): Promise<boolean>`: deletes only the caller's row.
  - `deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>`
  - `getLivePushSubscriptions(userId: string, now?: Date): Promise<readonly StoredPushSubscription[]>` where `StoredPushSubscription = { endpoint: string; p256dh: string; auth: string }`: rows whose `session.expiresAt > now`; deletes that user's rows with expired sessions in the same call.
- Produces (in `src/lib/session.ts`): `getCurrentSessionId = cache(async (): Promise<string | null>)` from the same `auth.api.getSession` call shape as `getCurrentUser`.

Model (columns per spec "Data"): `id` uuid default `gen_random_uuid()`, `userId` text FK cascade, `sessionId` text FK to `Session.id` cascade, `endpoint` text `@unique`, `p256dh`, `auth`, `userAgent?`, `createdAt`, `updatedAt` `timestamptz(3)`; `@@index([userId])`, `@@index([sessionId])`, `@@map("push_subscription")`, snake_case `@map`s.

- [ ] **Step 1: Write the failing tests.** Create sessions directly with `db.session.create({ data: { id: createId(), token: createId(), userId, expiresAt } })` (a local helper `createTestSession(userId, expiresAt = in one day)`).
  - `saves a subscription under the session`
  - `reassigns an existing endpoint to another user and session` (one row remains, new owner)
  - `deletes the subscription when its session is deleted` (cascade)
  - `deletes the subscription when the user is deleted`
  - `refreshes keys only under the same session` (true + keys updated; false for another session, row unchanged)
  - `does not count an endpoint saved under another session as current` (refresh returns false, creates nothing)
  - `deletes only the caller's own row` (other user's endpoint: returns false, row stays)
  - `returns only subscriptions with a live session and removes expired ones` (one live, one with `expiresAt` before `now`: returns one; expired row gone)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run --project db src/lib/__tests__/push-subscriptions.db.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** the model, run `pnpm db:migrate --name push_subscriptions`, then `push-dal.ts` and `getCurrentSessionId`.

- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add prisma src/lib/push-dal.ts src/lib/session.ts src/features/push/domain/types.ts src/lib/__tests__/push-subscriptions.db.test.ts
git commit -m "feat(push): store push subscriptions tied to the login session"
```

---

### Task 3: Notification payload

**Files:**
- Create: `src/features/push/domain/notification.ts`
- Test: `src/features/push/domain/__tests__/notification.test.ts`

**Interfaces:**
- Consumes: `cheeringNames` from `src/features/friends/domain/nudge.ts`.
- Produces: `CHEERS_TAG = "cheers"`; `cheerNotification(senders: readonly { name: string; username: string }[]): CheerNotification | null` (null for no senders).

- [ ] **Step 1: Write the failing tests:** `names one sender` ("Maria is cheering you on"), `names two senders` ("Maria and Ben are cheering you on"), `says others with no number for three or more` ("Maria, Ben and others are cheering you on", `/\d/` absent), `falls back to the username for a blank name` ("@maria is cheering you on"), `returns null for no senders`, `uses the fixed tag, icon and url` (`tag: "cheers"`, `renotify: true`, `icon: "/icons/icon-192.png"`, `data: { url: "/" }`, and no other keys: `Object.keys` equals exactly those five).
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run --project unit src/features/push`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "feat(push): build the cheer notification from the banner wording"`

---

### Task 4: Sender

**Files:**
- Create: `src/lib/push-sender.ts` (`import "server-only"`)
- Test: `src/lib/__tests__/push-sender.db.test.ts` (`vi.mock("web-push")`, `vi.mock("@/lib/push-config")` to supply a config or null)

**Interfaces:**
- Consumes: `getOpenNudges` (`friends-dal.ts:612`), `getLivePushSubscriptions`, `deletePushSubscriptionByEndpoint` (Task 2), `cheerNotification` (Task 3), `pushConfig` (Task 1).
- Produces: `pushCheers(receiverId: string, now?: Date): Promise<void>`. Never throws.

Calls `webpush.setVapidDetails(subject, publicKey, privateKey)` once (module level, only when `pushConfig` is set) and `webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { TTL: 86_400 })` per device with `Promise.allSettled`. A rejection whose `statusCode` is 404 or 410 deletes that endpoint; any other rejection gets one `console.error("Push failed", statusCode)`.

- [ ] **Step 1: Write the failing tests** (real DB for nudges and subscriptions, mocked `web-push`):
  - `sends the open senders' title to every live subscription`
  - `does nothing when the receiver has no live subscriptions` (`sendNotification` not called)
  - `does nothing when push is not configured`
  - `does nothing when the receiver has no open nudges` (they read in the meantime)
  - `skips a subscription whose session has expired`
  - `deletes a subscription the push service reports gone` (reject with `{ statusCode: 410 }`, then 404)
  - `keeps other subscriptions and resolves when one send fails with 500` (row kept, no throw)
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run --project db src/lib/__tests__/push-sender.db.test.ts`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): send cheers to the receiver's live devices"`

---

### Task 5: Push actions and the nudge hook

**Files:**
- Create: `src/features/push/commands/inputs.ts`, `src/features/push/commands/commands.ts`, `src/actions/push.ts`
- Modify: `src/actions/friends.ts` (`nudgeFriend`)
- Test: `src/features/push/commands/__tests__/commands.db.test.ts`, `src/actions/__tests__/push.test.ts`, `src/actions/__tests__/friends-nudge.test.ts`

**Interfaces:**
- Consumes: Task 2 DAL and `getCurrentSessionId`; `pushCheers` (Task 4).
- Produces:
  - `pushSubscriptionInput` (Zod): `endpoint` `z.url()` with `https:` only, max 2048; `keys.p256dh` and `keys.auth` non-empty, max 512. `endpointInput`: `{ endpoint }` same rule.
  - Commands: `savePushSubscriptionFor(userId, sessionId, input: unknown, userAgent: string | null): Promise<PushResult>`; `refreshPushSubscriptionFor(sessionId, input: unknown): Promise<RefreshResult>`; `deletePushSubscriptionFor(userId, input: unknown): Promise<PushResult>` (`not-found` when nothing deleted).
  - Actions (`"use server"`, each calls `requireUser()` then `getCurrentSessionId()`; a null session id redirects like `requireUser`): `savePushSubscription(input: PushSubscriptionInput)`, `refreshPushSubscription(input: PushSubscriptionInput)`, `deletePushSubscription(input: { endpoint: string })`. `savePushSubscription` passes `(await headers()).get("user-agent")`, truncated to 512.
  - `nudgeFriend`: after `commands.nudgeFriendFor` returns `{ ok: true }`, call `after(() => pushCheers(input.userId))`. Result unchanged.

- [ ] **Step 1: Write the failing tests.**
  - Commands (DB): `saves a valid subscription`, `rejects a non-https endpoint as invalid-input`, `refresh reports current only for the same session`, `delete of someone else's endpoint is not-found`.
  - Actions (mock `@/lib/session`, commands, `next/headers`, as `src/actions/__tests__/reading.test.ts` does): `each push action checks the session first`, `passes the session id and user agent to save`.
  - Nudge hook (mock `next/server` `after` to run its callback immediately, mock `@/lib/push-sender`): `schedules a push only when the nudge was sent` (not for `already-nudged`, `already-read`, `not-found`), `returns ok even when the push throws`.
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run src/features/push/commands src/actions`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): add subscription actions and push after a cheer"`

---

### Task 6: Service worker, served and reachable

**Files:**
- Create: `public/sw.js`
- Modify: `src/proxy.ts` (matcher excludes `sw\\.js`), `next.config.ts` (`headers()` for `/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Security-Policy: default-src 'self'; script-src 'self'`), `src/app/manifest.ts:5` comment
- Test: `src/__tests__/proxy.test.ts` (existing; add a case)

**Interfaces:**
- Produces: `SW_URL = "/sw.js"` (exported from `src/features/push/browser/push-client.ts` in Task 7). The worker accepts a JSON payload shaped as `CheerNotification` (Task 3).

`sw.js` handles only: `push` (parse JSON, `self.registration.showNotification(title, { tag, renotify, icon, badge: icon, data })`), and `notificationclick` (close; focus an existing same-origin client and `navigate(data.url)`, else `clients.openWindow(data.url)`). No `fetch` listener. Plain JS that passes `pnpm lint` (add a Biome override for `public/sw.js` globals only if lint requires it).

Manifest comment becomes: "Installable, not offline: the app needs the server for every write. The only service worker (`public/sw.js`) shows cheer notifications; it caches nothing."

- [ ] **Step 1: Write the failing test:** `the proxy matcher skips the service worker`: build `new RegExp(\`^${config.matcher[0]}$\`)` and assert it does not match `/sw.js` and still matches `/friends`.
- [ ] **Step 2: Run to verify it fails:** `pnpm vitest run --project unit src/__tests__/proxy.test.ts`
- [ ] **Step 3: Implement** all four files.
- [ ] **Step 4: Run to verify it passes**, then `pnpm lint && pnpm typecheck && pnpm build`.
Expected: build succeeds; `curl -sI http://localhost:3100/sw.js` against `pnpm start` shows `200` and the three headers without a session cookie.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): add a push-only service worker"`

---

### Task 7: Device detection, browser client and `usePushDevice`

**Files:**
- Create: `src/features/push/domain/device.ts`, `src/features/push/browser/push-client.ts`, `src/features/push/hooks/use-push-device.ts`
- Test: `src/features/push/domain/__tests__/device.test.ts`, `src/features/push/hooks/__tests__/use-push-device.dom.test.tsx`

**Interfaces:**
- Consumes: Task 5 actions; `SW_URL`.
- Produces:
  - `isPhone(nav: { userAgent: string; userAgentData?: { mobile: boolean } }): boolean`: `userAgentData.mobile` when present, else `/iPhone|Android.*Mobile/` on `userAgent`.
  - `pushAvailability(input: { phone: boolean; serviceWorker: boolean; pushManager: boolean; ios: boolean }): PushAvailability`: `not-phone` / `available` (sw and pushManager) / `needs-install` (ios without pushManager) / `unsupported`.
  - `push-client.ts`: `SW_URL`, `registerServiceWorker(): Promise<ServiceWorkerRegistration>`, `currentSubscription(): Promise<PushSubscription | null>`, `subscribeDevice(publicKey: string): Promise<PushSubscriptionInput>` (VAPID key base64url to `Uint8Array` as the PWA guide's `urlBase64ToUint8Array`), `unsubscribeDevice(): Promise<string | null>` (returns the endpoint it removed), `clearCheerNotifications(): Promise<void>` (closes `getNotifications({ tag: "cheers" })`; no-op without a registration).
  - `usePushDevice(publicKey: string | null): { status: PushDeviceStatus; turnOn(): Promise<TurnOnOutcome>; turnOff(): Promise<void> }`.

Status rules: `not-configured` when `publicKey` is null; then availability; then `Notification.permission === "denied"` gives `blocked`; with an existing browser subscription, call `refreshPushSubscription`: `current: true` gives `on`, `false` unsubscribes the browser side and gives `off`; no subscription gives `off`. Registration happens only inside `turnOn`, or when a subscription already exists (via `navigator.serviceWorker.getRegistration()`, which does not register). `turnOn` requests permission (`granted` subscribes and saves, `denied` gives `blocked`, `default` gives `dismissed`, any throw or `{ ok: false }` gives `failed`) and ignores a second call while one is in flight. `turnOff` unsubscribes, then `deletePushSubscription`.

- [ ] **Step 1: Write the failing tests.**
  - `device.test.ts`: `isPhone` for an iPhone UA, an Android Mobile UA, an Android tablet UA (false), a desktop Chrome UA, an iPad desktop-mode UA (false), and `userAgentData.mobile` overriding the UA; `pushAvailability` for each of the four results.
  - `use-push-device.dom.test.tsx` (stub `navigator.serviceWorker`, `window.PushManager`, `Notification`, mock `@/actions/push`): `is not-configured without a key`, `is blocked when permission is denied`, `is on when the server recognises the subscription`, `unsubscribes a subscription the server does not recognise`, `never subscribes on load even when permission is granted`, `turnOn saves and reports on`, `turnOn reports dismissed when the prompt is closed`, `saves once when turnOn is called twice`, `turnOff unsubscribes and deletes`.
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run src/features/push/domain src/features/push/hooks`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): detect phones and manage this device's subscription"`

---

### Task 8: The question on Today

**Files:**
- Create: `src/features/push/hooks/not-now.ts`, `src/features/push/components/push-question.tsx`
- Modify: `src/features/friends/components/cheering-row.tsx` (optional `children` rendered as a second line under the text, aligned with it, not the avatars), `src/features/progress/components/progress-screen.tsx`, `src/app/(app)/page.tsx`
- Test: `src/features/push/components/__tests__/push-question.dom.test.tsx`, `src/features/friends/components/__tests__/cheering-row.dom.test.tsx`, `src/features/progress/components/__tests__/progress-screen.dom.test.tsx`

**Interfaces:**
- Consumes: `usePushDevice` (Task 7), `clearCheerNotifications`.
- Produces:
  - `not-now.ts`: `NOT_NOW_KEY = "push-not-now-count"`, `NOT_NOW_LIMIT = 3`, `readNotNowCount(): number`, `addNotNow(): number`.
  - `PushQuestion({ publicKey }: { publicKey: string | null })`: renders nothing unless `status === "off"`, `Notification.permission === "default"` and `readNotNowCount() < 3`; decided after mount, fading in.
  - `ProgressScreen` gains `vapidPublicKey: string | null`; the page passes `pushConfig?.publicKey ?? null`. `CheeringRow` gets `<PushQuestion publicKey={vapidPublicKey} />` as children. `ProgressScreen` calls `clearCheerNotifications()` on mount and when `completionLookup.has(today)` becomes true.

Turn on outcomes: `on` shows "You'll get cheers on your lock screen" for 3000 ms, then nothing; `blocked` hides; `dismissed` calls `addNotNow()` and hides; `failed` shows `Couldn't turn on notifications. Try again.` under the buttons and keeps them. Both buttons at least 44px tall; "Turn on" a small primary pill, "Not now" muted text.

- [ ] **Step 1: Write the failing tests** (mock `usePushDevice`; fake timers for the 3 s):
  - `shows the question when off, never asked and under the limit`
  - `hides when on, blocked, needs-install, not-phone or not-configured`
  - `hides after three Not now taps and stays hidden on a new render`
  - `Not now hides the line and increments the count`
  - `shows the confirmation for three seconds after turning on`
  - `counts a dismissed permission prompt as Not now`
  - `shows the error and keeps the buttons when turning on fails`
  - `works when storage throws` (stub `localStorage.getItem`/`setItem` to throw: shows, no throw)
  - CheeringRow: `renders children under the names`, and `the X dismisses without touching the question count`
  - ProgressScreen: `clears cheer notifications on load and when today is completed`
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run --project dom src/features/push src/features/friends/components src/features/progress/components`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): ask for lock-screen cheers from the Today banner"`

---

### Task 9: Settings switch

**Files:**
- Create: `src/features/push/components/notifications-section.tsx`
- Modify: `src/features/settings/components/settings-screen.tsx` (section between Appearance and Account), `src/app/(app)/settings/page.tsx` (passes `vapidPublicKey`)
- Test: `src/features/push/components/__tests__/notifications-section.dom.test.tsx`, `src/features/settings/components/__tests__/settings-screen.dom.test.tsx`

**Interfaces:**
- Consumes: `usePushDevice`.
- Produces: `NotificationsSection({ publicKey }: { publicKey: string | null })`, rendering nothing for `not-configured`, `not-phone` and `loading`. `SettingsScreen` gains `vapidPublicKey: string | null`.

Row "Cheers from friends" with a `role="switch"` button (`aria-checked`, accessible name "Cheers from friends"), heading "Notifications" via `SectionHeader`. Footnotes, verbatim:
- on / off: "Get a notification on this phone when a friend cheers you on."
- blocked (disabled): "Notifications are blocked for Bible Daily. Allow them in your phone's settings, then come back."
- needs-install (disabled): "On iPhone, add Bible Daily to your Home Screen first: tap Share, then Add to Home Screen, and open it from there."
- unsupported (disabled): "This browser can't show notifications."

Toggling on calls `turnOn` (works regardless of the "Not now" count); a `failed` outcome shows `Couldn't turn on notifications. Try again.`; toggling off calls `turnOff`.

- [ ] **Step 1: Write the failing tests:** one per footnote state, `renders nothing on desktop or without a key`, `turning on calls turnOn even after three Not nows`, `turning off calls turnOff`, `shows the error when turning on fails`; SettingsScreen: `places Notifications between Appearance and Account`.
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run --project dom src/features/push/components src/features/settings`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): add the Cheers from friends switch to Settings"`

---

### Task 10: App-load check and sign-out

**Files:**
- Create: `src/features/push/components/push-session-check.tsx`
- Modify: `src/app/(app)/layout.tsx` (renders `<PushSessionCheck publicKey={pushConfig?.publicKey ?? null} />` inside the providers), `src/features/auth/hooks/use-sign-out.ts`
- Test: `src/features/push/components/__tests__/push-session-check.dom.test.tsx`, `src/features/auth/hooks/__tests__/use-sign-out.dom.test.tsx` (create)

**Interfaces:**
- Consumes: `usePushDevice` (its mount logic is the check), `unsubscribeDevice`, `deletePushSubscription`.
- Produces: `PushSessionCheck({ publicKey })` renders null.

`useSignOut.signOut`: before `authClient.signOut()`, best effort `const endpoint = await unsubscribeDevice()` then `deletePushSubscription({ endpoint })` when non-null, both wrapped so any failure is ignored. Sign-out behaviour otherwise unchanged.

- [ ] **Step 1: Write the failing tests:** `PushSessionCheck` `refreshes a recognised subscription and renders nothing`, `unsubscribes an unrecognised one`, `does nothing without a key`; `useSignOut` `unsubscribes this device before signing out`, `still signs out when unsubscribing fails`.
- [ ] **Step 2: Run to verify they fail:** `pnpm vitest run --project dom src/features/push/components src/features/auth`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass**, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5: Commit:** `git commit -m "feat(push): drop a device's subscription when its session ends"`

---

### Task 11: Verify, check by hand, mark the spec implemented

**Files:**
- Modify: `docs/superpowers/specs/2026-11-01-friend-web-push-design.md` (`Status: implemented`)

- [ ] **Step 1: Run the full check**

Run: `pnpm verify`
Expected: lint, typecheck and all three `test:tz` runs pass.

- [ ] **Step 2: Check the layout** at 320px and 390px wide, light and dark: the banner with the question line, the confirmation, the error; the Settings section in each state (fake the states with devtools overrides).

- [ ] **Step 3: By hand on real phones** (needs VAPID keys in `.env` and an HTTPS URL reachable from the phone, e.g. a Coolify preview): Christian's iPhone from the Home Screen and an Android phone in Chrome. Check: question appears on the first cheer; "Turn on" shows the browser prompt; a cheer reaches the lock screen; a second cheer replaces the first ("Maria and Ben are cheering you on"); tap opens Today; marking read clears it; Settings off stops pushes; signing out stops pushes; deleting that device's `session` row stops pushes; iPhone Safari (not installed) shows no question and the how-to in Settings; desktop shows neither.

- [ ] **Step 4: Mark the spec implemented and commit**

```bash
git add docs/superpowers/specs/2026-11-01-friend-web-push-design.md
git commit -m "docs(friends): mark web push design implemented"
```

- [ ] **Step 5: Production note for the PR description:** generate keys with `npx web-push generate-vapid-keys`, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` as runtime variables in Coolify, redeploy (the migration runs on boot). No rebuild-time variables.
