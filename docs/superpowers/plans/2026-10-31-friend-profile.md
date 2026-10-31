# Friend Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader open an accepted friend's profile to see their today status, month calendar, view-only day details, heatmap and journal, and show a read-today mark on each row of `/friends`.

**Architecture:** The derived reading data the calendar, heatmap and journal hooks need is pulled out of `ReadingDataProvider` into a pure `deriveReadingView(snapshot, today)` and a read-only `ReadingViewContext`. The reader's own provider supplies it as before; a new `FriendReadingProvider` supplies it from a friend's snapshot (loaded on the server through a friendship-checked DAL function, refreshed on focus through a GET route), so the existing hooks render a friend's data unchanged. Friend day details open as a sheet through an intercepting route in the existing `@sheet` slot, with a full-page fallback.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TanStack Query 5, Prisma 7.10 (PostgreSQL), Vitest (unit / dom / db projects), Biome, Tailwind 4, Lucide.

**Spec:** `docs/superpowers/specs/2026-10-31-friend-profile-design.md`

## Global Constraints

- Friend reading data is served only when `getRelationship(viewer, friend) === "friends"` at request time, checked on the server in the same DAL function that reads the data.
- Not a friend, unknown username, malformed username, pending in either direction, removed: one identical "not found" (page: `notFound()`; API: 404 `{ "error": "not-found" }`).
- Email never appears in any friend payload. Profile fields are `userId`, `username`, `name`, `image` only.
- A friend's "today" is `getTodayDateKeyInZone(friendZone ?? "UTC")`, where `friendZone` is `getTimeZone(friendId)`. The viewer's zone plays no part.
- The friends list stays sorted by name. Nothing ranks or compares friends.
- Missed days keep the existing soft treatment; copy is kind ("Hasn't read yet today"), never red or "Missed!".
- Viewing a friend never reads or writes the reader's `READING_SNAPSHOT_KEY` cache entry or calls reading actions.
- Profile route `/friends/[username]`; friend day route `/friends/[username]/day/[date]`.
- Profile is always the month view, single column `max-w-2xl`.
- No new packages, no schema changes, no `console.log`, no em or en dashes in code, comments, copy or commits.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/intercepting-routes.md`, `parallel-routes.md` and `route.md` before writing routes (`AGENTS.md`). Route handlers type their context with the global `RouteContext<"/api/friends/[username]/reading">`.
- Every task ends green on `pnpm lint`, `pnpm typecheck` and its own tests. DB tests need `pnpm db:up`. The last task runs `pnpm verify`.

## Review Focus

1. **Friendship removed while the profile is open**: the next focus refetch answers 404 and the screen shows "This profile isn't available", not the last data. Test in Task 6 (`shows the unavailable state when a refetch answers 404`).
2. **Username in the URL with capitals or a leading `@`** (`/friends/Maria`, `/friends/%40maria`): resolves to `maria`. Test in Task 2 (`normalises the username before looking it up`).
3. **Garbage date in a friend's day URL** (`2026-13-45`, `abc`): "That day isn't available", never a 500. Test in Task 8 (`shows the unavailable state for an invalid date`).
4. **Friend who reset their progress** (no plans, no completions): list shows no mark, profile shows the no-plan state, the today summary does not throw on empty plans. Tests in Task 3, Task 5 and Task 7.
5. **Friend data shadowing the reader's own**: inside `FriendReadingProvider`, `useReadingView()` is the friend's; outside it, the reader's own is untouched. Test in Task 6 (`does not leak into the reader's own view`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/features/reading-plan/domain/reading-view.ts` (create) | `ReadingView` type and pure `deriveReadingView` |
| `src/features/reading-plan/hooks/reading-view-context.tsx` (create) | `ReadingViewProvider`, `useReadingView`, `useDayHref` |
| `src/features/reading-plan/hooks/reading-data-provider.tsx` (modify) | uses `deriveReadingView`, supplies `ReadingViewProvider` |
| `src/features/progress/hooks/use-{month-progress,reading-heatmap,reading-journal,streaks}.ts` (modify) | read from `useReadingView()` |
| `src/features/progress/components/journal-entry.tsx` (modify) | day links from `useDayHref()` |
| `src/features/progress/components/history-panels.tsx` (create) | heatmap panel + journal, extracted from `history-screen.tsx` |
| `src/features/friends/domain/types.ts` (modify) | `FriendReading`, `FriendReadingLookup`, `ReadTodayStatus`, `FriendListEntry` |
| `src/lib/friends-dal.ts` (modify) | `getFriendReading`, read-today statuses in `getFriendsOverview` |
| `src/features/friends/components/read-today-mark.tsx` (create) | the list mark |
| `src/features/friends/components/{friend-list,person-row}.tsx` (modify) | row link to profile, mark line |
| `src/features/friends/domain/friend-today.ts` (create) | `summariseFriendDay`, `describeFriendToday` |
| `src/app/api/friends/[username]/reading/route.ts` (create) | GET refresh of a friend's reading |
| `src/features/friends/hooks/friend-reading-provider.tsx` (create) | query + `ReadingViewProvider` for a friend |
| `src/features/friends/components/friend-profile/*.tsx` (create) | profile screen, today card, calendar card, day detail, unavailable state |
| `src/app/(app)/friends/[username]/page.tsx`, `.../day/[date]/page.tsx` (create) | profile and full-page day |
| `src/app/(app)/@sheet/friends/[username]/page.tsx` (create) | empty slot for the profile |
| `src/app/(app)/@sheet/(.)friends/[username]/day/[date]/page.tsx` (create) | friend day sheet |

---

### Task 1: Read-only reading view context

**Files:**
- Create: `src/features/reading-plan/domain/reading-view.ts`
- Create: `src/features/reading-plan/hooks/reading-view-context.tsx`
- Modify: `src/features/reading-plan/hooks/reading-data-provider.tsx` (the `ReadingDataValue` interface and the `value` memo, around lines 75-100 and 336-390)
- Modify: `src/features/progress/hooks/use-month-progress.ts`, `use-reading-heatmap.ts`, `use-reading-journal.ts`, `use-streaks.ts`
- Modify: `src/features/progress/components/journal-entry.tsx:69,93`
- Test: `src/features/reading-plan/domain/__tests__/reading-view.test.ts`, `src/features/progress/components/__tests__/journal-entry.dom.test.tsx`

**Interfaces:**
- Produces:
  - `interface ReadingView { plans; activePlan; completions; completionLookup; scheduleContext; planReadings; planCompletionLookup; planScheduleContext; progressReadings; currentReadThrough; finishedReadThroughs; canStartNextReadThrough; today }` with exactly the types those fields have in `ReadingDataValue` today.
  - `deriveReadingView(snapshot: ReadingSnapshot, today: DateKey): ReadingView` (pure; the body is the current `value` memo's derivation, moved).
  - `ReadingViewProvider({ view, dayHref, children }: { view: ReadingView; dayHref?: (date: DateKey) => string; children: ReactNode })`; `dayHref` defaults to ``(date) => `/day/${date}` ``.
  - `useReadingView(): ReadingView` (throws `"useReadingView must be used inside a ReadingViewProvider."` outside one).
  - `useDayHref(): (date: DateKey) => string`.
  - `ReadingDataValue extends ReadingView` (writes, `error`, `isSaving`, `hasCompletedOnboarding` stay on it only).

- [ ] **Step 1: Write the failing tests**

`reading-view.test.ts` (build snapshots from plain objects matching `ReadingSnapshot`):
```ts
it("derives lookups and today from a snapshot", () => {
  const view = deriveReadingView(snapshotWith({ plan: genesisFrom("2026-10-01"), rows: [row("2026-10-02", "GEN", 2), extra("2026-10-02", "PSA", 23)] }), "2026-10-03");
  expect(view.today).toBe("2026-10-03");
  expect(view.completionLookup.get("2026-10-02")).toHaveLength(2);
  expect(view.planCompletionLookup.get("2026-10-02")).toHaveLength(1);
  expect(view.currentReadThrough).toBe(1);
});
it("derives an empty view from an empty snapshot", () => {
  const view = deriveReadingView({ plans: [], activePlan: null, completions: [] }, "2026-10-03");
  expect(view.activePlan).toBeNull();
  expect(view.completionLookup.has("2026-10-03")).toBe(false);
});
```
`journal-entry.dom.test.tsx`:
```ts
it("links a day to /day/<date> by default", ...);           // render <JournalEntry> inside <ReadingViewProvider view={v}>
it("links a day through the provider's dayHref", ...);      // dayHref={(d) => `/friends/maria/day/${d}`} -> link href "/friends/maria/day/2026-10-28"
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/reading-plan/domain/__tests__/reading-view.test.ts src/features/progress/components/__tests__/journal-entry.dom.test.tsx`
Expected: FAIL, modules `reading-view` and `reading-view-context` not found.

- [ ] **Step 3: Implement `deriveReadingView` and the context, then switch the provider and hooks**

Move the derivation out of the provider's `value` memo into `deriveReadingView`. In the provider, memo `view = deriveReadingView(snapshot, today)` on `[snapshot, today]`, spread it into `value`, and wrap children in `<ReadingViewProvider view={view}>` inside the existing context provider. Switch the four hooks from `useReadingData()` to `useReadingView()` (they only use view fields). In `journal-entry.tsx`, replace both `` `/day/${entry.date}` `` with `dayHref(entry.date)`. Leave `use-day-detail.ts`, `use-reading-progress.ts`, `use-week-window.ts` and the screens on `useReadingData()`.

- [ ] **Step 4: Run the new tests and the whole progress and reading-plan suites**

Run: `pnpm vitest run src/features/reading-plan src/features/progress`
Expected: PASS (existing tests unchanged prove the reader's own screens still behave).

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/reading-plan src/features/progress
git commit -m "refactor(progress): read derived reading data from a read-only view context"
```

---

### Task 2: Friendship-checked friend reading in the DAL

**Files:**
- Modify: `src/features/friends/domain/types.ts`
- Modify: `src/lib/friends-dal.ts`
- Test: `src/lib/__tests__/friends-reading.db.test.ts`

**Interfaces:**
- Produces (in `types.ts`, `import type { ReadingSnapshot } from "@/lib/dal"`):
  ```ts
  export interface FriendReading { readonly snapshot: ReadingSnapshot; readonly today: DateKey }
  export type FriendReadingLookup =
    | { readonly kind: "self" }
    | { readonly kind: "not-found" }
    | { readonly kind: "friend"; readonly profile: FriendProfile; readonly reading: FriendReading };
  ```
- Produces (in `friends-dal.ts`): `getFriendReading(viewerId: string, rawUsername: string, now?: Date): Promise<FriendReadingLookup>`.

- [ ] **Step 1: Write the failing tests**

Make friends with `sendFriendRequest(a, b)` then `acceptFriendRequest(b, a)`; give the friend a plan with `createReadingPlan` and readings with `markReadingComplete`.
```ts
it("returns the profile, snapshot and today for an accepted friend")  // kind "friend", profile {userId,username,name,image}, snapshot.plans has the friend's plan id
it("returns not-found for pending requests in either direction")
it("returns not-found with no relationship, after removal, and for an unknown username")
it("returns not-found for a malformed username")                       // "ab", "has space", "x".repeat(21)
it("returns self for the viewer's own username")
it("normalises the username before looking it up")                       // " @MARIA_x " finds maria_x
it("computes today in the friend's stored time zone", async () => {
  await setTimeZone(friend, "Pacific/Kiritimati");
  const result = await getFriendReading(viewer, friendName, new Date("2026-10-31T11:00:00Z"));
  expect(result.kind === "friend" && result.reading.today).toBe("2026-11-01");
});
it("falls back to UTC when the friend has no time zone")                 // same now -> "2026-10-31"
it("never includes an email", async () => { expect(JSON.stringify(result)).not.toContain("@example.test"); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/friends-reading.db.test.ts`
Expected: FAIL, `getFriendReading` is not exported.

- [ ] **Step 3: Implement `getFriendReading`**

Normalise with `normalizeUsername`; if `usernameSchema.safeParse` fails return `not-found`. Select `{ id, username, name, image }` by username (not `findUserByUsername`, which returns the handle only). Then `self` when the id is the viewer's, `not-found` unless `getRelationship` is `"friends"`, else `Promise.all([getReadingSnapshot(id), getTimeZone(id)])` and `today = getTodayDateKeyInZone(zone ?? "UTC", now)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/friends-reading.db.test.ts`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/friends/domain/types.ts src/lib/friends-dal.ts src/lib/__tests__/friends-reading.db.test.ts
git commit -m "feat(friends): load an accepted friend's reading through the DAL"
```

---

### Task 3: Read-today statuses on the friends overview

**Files:**
- Modify: `src/features/friends/domain/types.ts`
- Modify: `src/lib/friends-dal.ts` (`getFriendsOverview`, around line 348)
- Modify: `src/features/friends/components/__tests__/friends-screen.dom.test.tsx` (the `profile()` factory gains `readToday: "not-yet"`, so it still compiles)
- Test: `src/lib/__tests__/friends-read-today.db.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ReadTodayStatus = "read" | "not-yet" | "no-plan";
  export interface FriendListEntry extends FriendProfile { readonly readToday: ReadTodayStatus }
  // FriendsOverview.friends becomes readonly FriendListEntry[]
  ```
- `getFriendsOverview(userId: string, now: Date = new Date()): Promise<FriendsOverview>`.

- [ ] **Step 1: Write the failing tests**

All with `now = new Date("2026-10-31T11:00:00Z")`:
```ts
it("marks a friend who read on their own today as read")                 // no zone, reading on 2026-10-31
it("counts an extra reading as read")                                     // isExtra: true on 2026-10-31
it("uses each friend's time zone", ...)   // Kiritimati friend read 2026-10-31 -> "not-yet" (their today is 11-01); Pago_Pago friend read 2026-10-31 -> "read"
it("marks a friend with no active plan as no-plan")                       // resetAllProgress(friend)
it("keeps friends sorted by name whatever their status")
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/friends-read-today.db.test.ts`
Expected: FAIL, `readToday` is undefined.

- [ ] **Step 3: Add the statuses inside `getFriendsOverview`**

A private `readTodayStatuses(friendIds: readonly string[], now: Date): Promise<Map<string, ReadTodayStatus>>` with three queries total, not one per friend: `appSetting` rows with key `time_zone` for the ids (validate with `isValidTimeZone`, else UTC), open plans (`isActive: true, endDate: null`) for the ids, and `readingCompletion` rows `where: { userId: { in: ids }, localDate: { in: distinctTodaysAsDbDates } }` selecting `userId, localDate`. Match each row to its friend's own today in JS. Skip the queries when there are no friends.

- [ ] **Step 4: Run the tests and the existing friends suites**

Run: `pnpm vitest run src/lib src/features/friends`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/friends src/lib
git commit -m "feat(friends): work out whether each friend has read today"
```

---

### Task 4: Friends list rows link to profiles and show the mark

**Files:**
- Create: `src/features/friends/components/read-today-mark.tsx`
- Modify: `src/features/friends/components/person-row.tsx`
- Modify: `src/features/friends/components/friend-list.tsx`
- Test: `src/features/friends/components/__tests__/friends-screen.dom.test.tsx`

**Interfaces:**
- Consumes: `FriendListEntry`, `ReadTodayStatus` (Task 3).
- Produces:
  - `ReadTodayMark({ status }: { status: ReadTodayStatus })`: `"read"` renders Lucide `CircleCheck` (`aria-hidden`, `text-primary`) and the text "Read today"; `"not-yet"` renders muted "Not yet today"; `"no-plan"` renders nothing.
  - `PersonRow` gains `href?: string` (avatar and name become one `next/link` to it; the action buttons stay outside the link) and `detail?: ReactNode` (a footnote line under `@username`).
  - `FriendList` takes `friends: readonly FriendListEntry[]`; each row passes `href={`/friends/${friend.username}`}` and `detail={<ReadTodayMark status={friend.readToday} />}`.

- [ ] **Step 1: Write the failing tests** (in the existing `friends-screen.dom.test.tsx`)

```ts
it("links each friend to their profile")          // getByRole("link", { name: /Reader 1/ }) has href "/friends/reader1"
it("shows the read-today mark as text")           // statuses read / not-yet / no-plan -> "Read today", "Not yet today", neither
it("keeps the options button outside the profile link")  // expect(link).not.toContainElement(getByRole("button", { name: "Options for Reader 1" }))
it("keeps the given order whatever the statuses")
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/friends/components/__tests__/friends-screen.dom.test.tsx`
Expected: FAIL, no link role for the friend.

- [ ] **Step 3: Implement the mark, `PersonRow` props and `FriendList` wiring**

Link styling follows the app's row links (`min-h-11`, `outline-none`, `focus-visible:ring-3 focus-visible:ring-ring/50`, `hover:bg-muted` on the link only, rounded).

- [ ] **Step 4: Run the friends dom tests**

Run: `pnpm vitest run src/features/friends`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/friends/components
git commit -m "feat(friends): open a friend's profile from the list and show who read today"
```

---

### Task 5: Friend today summary

**Files:**
- Create: `src/features/friends/domain/friend-today.ts`
- Test: `src/features/friends/domain/__tests__/friend-today.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface FriendDaySummary {
    readonly todayPassages: string | null;   // describePassages(all rows today, extras included), null when none
    readonly missedInARow: number;
    readonly streak: StreakSummary;
  }
  export function summariseFriendDay(view: ReadingView, index: CanonIndex): FriendDaySummary;
  export function describeFriendToday(summary: FriendDaySummary): { headline: string; detail: string };
  ```

`missedInARow`: walk back from the day before `view.today` to `getEarliestPlanStart(view.plans)`. Days where `isScheduledDay(plans, date, scheduleContext)` is false are skipped; a day in `completionLookup` stops the walk; any other day adds 1. `streak` is `calculateStreaks` with the view's `plans`, `completionLookup`, `scheduleContext`, `today`.

Copy (exact):
| Case | headline | detail |
|---|---|---|
| read today | `Read today: ${todayPassages}` | streak part |
| not yet, missed 0 | `Hasn't read yet today` | streak part |
| not yet, missed 1 | `Hasn't read yet today` | `Missed yesterday · ${streak part}` |
| not yet, missed N ≥ 2 | `Hasn't read yet today` | `Missed the last ${N} days · ${streak part}` |

Streak part: `${current} day streak · longest ${longest}`; when `current` is 1, `1 day streak · longest ${longest}`.

- [ ] **Step 1: Write the failing tests**

```ts
it("describes a friend who read today, extras included")       // rows GEN 3 + extra PSA 23 today -> todayPassages "Genesis 3, Psalms 23" (whatever describePassages returns for those rows)
it("counts missed scheduled days before today, not today")     // read 10-28, nothing 10-29..10-31, today 10-31 -> missedInARow 2
it("treats a day with only an extra reading as read")          // extra on 10-30 -> missedInARow 0
it("counts across a plan change")                              // segment ends 10-29, next starts 10-30, nothing on either -> both count
it("returns zeros for a friend with no plans")                 // { todayPassages: null, missedInARow: 0, streak: { current: 0, longest: 0 } }
it("uses the exact copy", ...)                                 // each table row
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/friends/domain/__tests__/friend-today.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `summariseFriendDay` and `describeFriendToday`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/friends/domain/__tests__/friend-today.test.ts`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/friends/domain
git commit -m "feat(friends): summarise how a friend is keeping up"
```

---

### Task 6: Friend reading route and provider

**Files:**
- Create: `src/app/api/friends/[username]/reading/route.ts`
- Create: `src/features/friends/hooks/friend-reading-provider.tsx`
- Create: `src/features/friends/components/friend-profile/friend-unavailable.tsx`
- Test: `src/app/api/friends/[username]/reading/__tests__/route.db.test.ts`, `src/features/friends/hooks/__tests__/friend-reading-provider.dom.test.tsx`

**Interfaces:**
- Consumes: `getFriendReading` (Task 2), `deriveReadingView`, `ReadingViewProvider`, `useReadingView` (Task 1).
- Produces:
  - `GET(_request: Request, ctx: RouteContext<"/api/friends/[username]/reading">): Promise<Response>`: 401 `{ error: "unauthorized" }` without a session (`getCurrentUser`), 200 `FriendReading` JSON with `cache-control: no-store` for a friend, 404 `{ error: "not-found" }` for `self` and `not-found`.
  - `FriendReadingProvider({ username, initial, children }: { username: string; initial: FriendReading; children: ReactNode })`. Query key `["friend-reading", username]`, `initialData: initial`, `staleTime: 0`, `refetchOnMount: false`, `refetchOnWindowFocus: true`, no retry on a 404 (the fetcher throws a `FriendGoneError` for 404; `retry: (count, error) => !(error instanceof FriendGoneError) && count < 3`). On `FriendGoneError` it renders `<FriendUnavailable />` instead of children. Otherwise `<ReadingViewProvider view={deriveReadingView(data.snapshot, data.today)} dayHref={(date) => `/friends/${username}/day/${date}`}>`.
  - `FriendUnavailable()`: `EmptyState` with title "This profile isn't available", description "You might not be friends anymore.", action `{ label: "Back to Friends", href: "/friends" }`.

- [ ] **Step 1: Write the failing tests**

Route (mock `@/lib/session` as `src/app/api/reading/snapshot/__tests__/route.db.test.ts` does):
```ts
it("answers 401 without a session")
it("returns a friend's reading, uncached")                 // 200, no-store, body.snapshot.plans[0].id is the friend's plan
it("answers 404 for a non-friend, a pending request and self, with the same body")  // all { error: "not-found" }
```
Provider (wrap in a fresh `QueryClient`; mock `global.fetch`):
```ts
it("gives children the friend's view and day links")        // child shows useReadingView().today and useDayHref()("2026-10-28") === "/friends/maria/day/2026-10-28"
it("does not leak into the reader's own view")             // sibling outside the provider, under an outer ReadingViewProvider with the reader's view, still reads the reader's today
it("shows the unavailable state when a refetch answers 404") // fetch -> 404, focusManager.setFocused(false) then setFocused(true) -> "This profile isn't available"
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/app/api/friends src/features/friends/hooks`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the route, `FriendUnavailable` and `FriendReadingProvider`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/app/api/friends src/features/friends/hooks`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/app/api/friends src/features/friends/hooks src/features/friends/components/friend-profile
git commit -m "feat(friends): serve and refresh a friend's reading for their profile"
```

---

### Task 7: Profile page and screen

**Files:**
- Create: `src/features/progress/components/history-panels.tsx`
- Modify: `src/features/progress/components/history-screen.tsx` (renders `<main>`, the `h1` and `<HistoryPanels />`)
- Create: `src/features/friends/components/friend-profile/friend-profile-screen.tsx`, `friend-today-card.tsx`, `friend-calendar-card.tsx`
- Create: `src/app/(app)/friends/[username]/page.tsx`
- Create: `src/app/(app)/@sheet/friends/[username]/page.tsx`
- Test: `src/features/friends/components/__tests__/friend-profile-screen.dom.test.tsx`

**Interfaces:**
- Consumes: `FriendReadingLookup` (Task 2), `FriendReadingProvider` (Task 6), `summariseFriendDay`, `describeFriendToday` (Task 5), `useReadingView`, `useDayHref` (Task 1).
- Produces:
  - `HistoryPanels({ className }: { className?: string })`: everything inside `HistoryScreen`'s `<main>` after the `h1` (heatmap panel with legend, journal, select and reveal behaviour), unchanged.
  - `FriendProfileScreen({ profile, initial }: { profile: FriendProfile; initial: FriendReading })`: `<main className="mx-auto w-full max-w-2xl px-5 pt-4 pb-tab-bar">`, back link "Friends" to `/friends` (styled as in `src/app/(app)/day/[date]/page.tsx`), header (`Avatar` at `size-14`, name as `h1`, `@username`), then inside `FriendReadingProvider`: when `activePlan` is null, `EmptyState` "@{username} hasn't started a reading plan yet."; otherwise `FriendTodayCard`, `FriendCalendarCard`, `HistoryPanels`, stacked with `gap-6`.
  - `FriendTodayCard()`: `Panel` with `describeFriendToday(summariseFriendDay(view, index))` (`headline` as `text-headline`, `detail` as `text-footnote text-muted-foreground`); `index = getCanonIndex(view.activePlan?.canonId ?? DEFAULT_CANON_ID)`.
  - `FriendCalendarCard()`: `Panel variant="raised"` with `MonthNavigator` (title `monthWindow.current.calendar.title`, `onReturnToToday` only when the shown month is not today's), `MonthSummary`, `WeekdayHeader`, `MonthPager` (`onSelectDay={(date) => router.push(dayHref(date))}`). Month state is `useState(monthKeyFromDateKey(view.today))` stepped with `addMonthsToMonthKey`; `useMonthWindow(month)`.
  - Page: `requireUser()`; viewer without an active plan `redirect("/onboarding")`; `getFriendReading(user.id, username)`: `self` `redirect("/")`, `not-found` `notFound()`, `friend` renders `<FriendProfileScreen profile initial />`. `metadata = { title: "Friend" }`.
  - `@sheet/friends/[username]/page.tsx` returns `null` with the same comment pattern as `@sheet/settings/page.tsx`.

- [ ] **Step 1: Write the failing tests**

Render `FriendProfileScreen` with a `QueryClientProvider` and a friend snapshot (Maria, plan from 2026-10-01, readings on most days, today 2026-10-31):
```ts
it("shows the friend's name, handle and today status")         // h1 "Maria", "@maria", "Hasn't read yet today"
it("shows the friend's month, starting on their today")         // heading "October 2026"
it("opens the friend's day from the calendar")                  // click day 28 -> router.push("/friends/maria/day/2026-10-28")
it("links journal rows to the friend's days")                   // a journal link has href starting "/friends/maria/day/"
it("has no month toggle and no history link")                   // queryByRole("button", { name: "Month view" }) null; queryByText(/See your reading history/) null
it("shows the no-plan state for a friend without a plan")       // "@maria hasn't started a reading plan yet."
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/friends/components/__tests__/friend-profile-screen.dom.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Extract `HistoryPanels`, build the three components, add the page and the empty slot**

- [ ] **Step 4: Run the tests plus the history and progress suites**

Run: `pnpm vitest run src/features/friends src/features/progress`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/progress/components src/features/friends/components "src/app/(app)/friends" "src/app/(app)/@sheet/friends"
git commit -m "feat(friends): add the friend profile with calendar, heatmap and journal"
```

---

### Task 8: View-only friend day details

**Files:**
- Create: `src/features/friends/components/friend-profile/friend-day-detail.tsx`
- Create: `src/app/(app)/friends/[username]/day/[date]/page.tsx`
- Create: `src/app/(app)/@sheet/(.)friends/[username]/day/[date]/page.tsx`
- Test: `src/features/friends/components/__tests__/friend-day-detail.dom.test.tsx`

**Interfaces:**
- Consumes: `useReadingView` (Task 1), `FriendReadingProvider` (Task 6), `getFriendReading` (Task 2), `DaySheet` (`src/features/progress/components/day-detail/day-sheet.tsx`), `describeRow` (`day-detail-logic.ts`), `describePassages`, `formatReferenceSpan`.
- Produces:
  - `FriendDayDetail({ date, heading }: { date: string; heading: "page" | "sheet" })`. Invalid date (`isValidDateKey` false): `EmptyState` "That day isn't available", compact, no action. Otherwise, with `day = getDayReading(plans, date, planScheduleContext)`, `rows = planCompletionLookup.get(date) ?? []`, `extras = (completionLookup.get(date) ?? []).filter((r) => r.isExtra)`:
    - overline `TODAY` or the weekday in caps, and the title `format(date, "d MMMM yyyy")` (`SheetTitle` when `heading === "sheet"`, else `h1`), as `day-detail.tsx` does;
    - "Planned" line with `formatReferenceSpan(day.scheduled.chapters, index)` when `day.scheduled.kind === "scheduled"`;
    - "Read" line with `describePassages(rows, index)` when rows exist; else past day "Not read", today "Not read yet", future nothing;
    - an "EXTRA READINGS" list of `describeRow(row, index)` when extras exist.
    - No buttons of its own.
  - Full page: `requireUser`, onboarding redirect, `getFriendReading`; `self` `redirect(`/day/${date}`)`, `not-found` `notFound()`; `<main className="mx-auto w-full max-w-lg px-5 pt-4 pb-tab-bar">` with a back link to `/friends/${username}` labelled with the friend's name, `Panel`, `FriendReadingProvider`, `FriendDayDetail heading="page"`.
  - Sheet: same lookup; anything but `friend` returns `null`; else `<DaySheet><FriendReadingProvider ...><FriendDayDetail heading="sheet" /></FriendReadingProvider></DaySheet>`.

- [ ] **Step 1: Write the failing tests**

Render under `ReadingViewProvider` with a hand-built view:
```ts
it("shows what was planned and read, verse spans included")   // row PSA 119 verses 1-40 -> "Read" line contains describePassages output, e.g. "Psalms 119:1-40"
it("lists extra readings")                                     // "EXTRA READINGS" + describeRow output
it("says not read on a missed past day")                       // "Not read"
it("shows only the plan on a future day")                      // "Planned" present, no "Read"/"Not read"
it("has no controls")                                          // heading "page": queryAllByRole("button") is empty
it("shows the unavailable state for an invalid date")          // "2026-13-45" and "abc" -> "That day isn't available"
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/friends/components/__tests__/friend-day-detail.dom.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `FriendDayDetail` and both routes**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/friends`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/friends/components "src/app/(app)/friends" "src/app/(app)/@sheet/(.)friends"
git commit -m "feat(friends): open a friend's day as a view-only sheet or page"
```

---

### Task 9: Verify, check by hand, update the phase 1 spec

**Files:**
- Modify: `docs/superpowers/specs/2026-10-31-friends-connections-design.md` ("Visibility before accepting" table)
- Modify: `docs/superpowers/specs/2026-10-31-friend-profile-design.md` (`Status: implemented`)

- [ ] **Step 1: Add the row to the phase 1 visibility table**

`| Friend profile `/friends/<username>` | each accepted friend | name, photo, `@username`, and full reading data (see 2026-10-31-friend-profile-design.md) |`

- [ ] **Step 2: Run the full check**

Run: `pnpm verify`
Expected: lint, typecheck and all three `test:tz` runs pass.

- [ ] **Step 3: Check by hand at 375px and desktop width** (`pnpm db:up && pnpm dev`, two accounts that are friends)

- `/friends`: rows show "Read today" / "Not yet today"; tapping a row opens the profile; "..." still opens Remove.
- Profile: today card, calendar arrows and swipe, "Back to today", heatmap reveal scrolls the journal.
- Tap a day: sheet opens; browser back closes it; refresh on the day URL shows the full page with a back link.
- `/friends/<non-friend>` and `/friends/<own username>`: not found and redirect to `/`.
- Remove the friend in another tab, refocus the profile: "This profile isn't available".
- Your own `/` and `/history` still show your own reading after visiting a friend.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs
git commit -m "docs(friends): record what friends see and mark the profile design implemented"
```
