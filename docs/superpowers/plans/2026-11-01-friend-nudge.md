# Friend Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader cheer an accepted friend on from the friend's profile (once per friend per friend's day), and show the friend a dismissable "Maria is cheering you on" row at the top of their Today's reading card until they read or dismiss it.

**Architecture:** A new `friend_nudge` table, keyed unique on (sender, receiver, receiver's local day) and cascading from `friendship`, so removing a friend deletes nudges with no extra code. Friendship-checked DAL functions in `friends-dal.ts` send, list and dismiss nudges; "closed by reading" is computed at read time (a nudge is open while the receiver has no completion on or after its day). The sender side extends `FriendReading` with `nudgedToday` and exposes it from `FriendReadingProvider`; the receiver side loads open nudges with `/` on the server and refreshes them on focus through `GET /api/nudges`.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TanStack Query 5, Prisma 7.10 (PostgreSQL), Zod 4, Vitest (unit / dom / db projects), Biome, Tailwind 4, Lucide.

**Spec:** `docs/superpowers/specs/2026-11-01-friend-nudge-design.md`

## Global Constraints

- A nudge is sent only when `getRelationship(sender, receiver) === "friends"` at request time, checked in the DAL function that writes it. Stranger, pending (either way), removed, unknown and self all return `"not-found"`.
- "Today" for the daily limit and for `nudgedToday` is `getTodayDateKeyInZone((await getTimeZone(receiverId)) ?? "UTC", now)`. The sender's zone plays no part.
- One nudge per (sender, receiver, receiver's day), enforced by a unique index, so two concurrent sends store one row.
- Any completion counts as "read", extras included, the same rule as `readTodayStatuses` (`src/lib/friends-dal.ts:369`) and the streak.
- A nudge is open when: not dismissed, and the receiver has no completion with `local_date >= nudge.local_date`. No expiry.
- Payloads carry `userId`, `username`, `name`, `image` only. Never email.
- Copy, verbatim: button "Cheer {first} on"; after sending "You cheered {first} on today"; row "{A} is cheering you on" / "{A} and {B} are cheering you on" / "{A}, {B} and others are cheering you on" (names bold, no counts); dismiss button accessible name "Dismiss".
- `{first}` is the first whitespace-separated word of the trimmed display name, or `@username` when the name is blank.
- No red, no warning styling, no missed-day wording in the button, the confirmation or the row.
- Writes through Server Actions in `src/actions/friends.ts`; refreshes through GET routes under `/api` that check the session themselves (401 `{ "error": "unauthorized" }`).
- No new packages, no `console.log`, no em or en dashes in code, comments, copy or commits.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` before writing the route (`AGENTS.md`).
- Every task ends green on `pnpm lint`, `pnpm typecheck` and its own tests. DB tests need `pnpm db:up`. The last task runs `pnpm verify`.

## Review Focus

1. **Friend's profile left open past the friend's midnight**: the 5 minute refetch brings a new `today` with `nudgedToday: false`, and the "You cheered..." row must turn back into the button, not stay from yesterday's optimistic state. Test in Task 5 (`shows the button again when the friend's day moves on`).
2. **A nudge arrives between Today loading and the reader tapping X**: only the senders the reader saw are dismissed; the new one shows on the next refresh. Test in Task 2 (`dismisses only the given senders`).
3. **Removed, then re-friended, the same day**: the old nudge was cascaded away, so the sender can cheer again and the receiver sees only the new nudge. Test in Task 2 (`a re-friended pair can nudge again the same day`).
4. **Friend with a blank or one-word display name, or a very long one**: button reads "Cheer @maria on" for a blank name; long names truncate on one line, never wrap the button. Test in Task 4 (`falls back to the username for a blank name`); the truncation is checked by hand in Task 7.
5. **Reader resets their progress** (all completions deleted): earlier nudges become open again by the closing rule. Accepted; `getOpenNudges` must not throw on a reader with no completions. Test in Task 2 (`treats a reader with no completions as unread`).

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` (modify) | `FriendNudge` model, relations on `User` and `Friendship` |
| `prisma/migrations/<timestamp>_friend_nudges/migration.sql` (create) | table, indexes, FKs, hand-written CHECK |
| `src/features/friends/domain/types.ts` (modify) | `FriendReading.nudgedToday`, `OpenNudges`, `NudgeOutcome` |
| `src/lib/friends-dal.ts` (modify) | `sendNudge`, `getOpenNudges`, `dismissOpenNudges`, `nudgedToday` in `getFriendReading` |
| `src/features/friends/commands/{inputs,results,commands}.ts` (modify) | `nudgeFriendFor`, `dismissNudgesFor`, new error codes and copy |
| `src/actions/friends.ts` (modify) | `nudgeFriend`, `dismissNudges` |
| `src/features/friends/domain/nudge.ts` (create) | `firstName`, `cheeringNames` |
| `src/features/friends/hooks/friend-reading-provider.tsx` (modify) | `useFriendNudgeState` |
| `src/features/friends/components/friend-profile/cheer-button.tsx` (create) | sender's button and confirmation |
| `src/features/friends/components/friend-profile/friend-today-card.tsx` (modify) | renders `CheerButton` while unread |
| `src/features/friends/components/friend-profile/friend-profile-screen.tsx` (modify) | passes `profile` to the today card |
| `src/app/api/nudges/route.ts` (create) | GET the reader's open nudges |
| `src/features/friends/hooks/use-open-nudges.ts` (create) | query, focus refresh, optimistic dismiss |
| `src/features/friends/components/cheering-row.tsx` (create) | receiver's row |
| `src/features/progress/components/today-reading-card.tsx` (modify) | optional `banner` slot |
| `src/features/progress/components/progress-screen.tsx`, `src/app/(app)/page.tsx` (modify) | load and wire open nudges |

---

### Task 1: `friend_nudge` table

**Files:**
- Modify: `prisma/schema.prisma` (new model after `Friendship`, relation fields on `User` and `Friendship`)
- Create: `prisma/migrations/<timestamp>_friend_nudges/migration.sql`
- Test: `src/lib/__tests__/friends-schema.db.test.ts` (add a `describe("friend_nudge")`)

**Interfaces:**
- Produces: Prisma model `FriendNudge { id, friendshipId, senderId, receiverId, localDate, createdAt, dismissedAt }` (`db.friendNudge`), unique input name `senderId_receiverId_localDate`.

- [ ] **Step 1: Write the failing tests** in `friends-schema.db.test.ts`, using raw Prisma writes on an accepted friendship row created through `sendFriendRequest` + `acceptFriendRequest`:
  - `rejects a second nudge for the same sender, receiver and day`: second `db.friendNudge.create` with the same three values rejects with `isUniqueViolation(error) === true`.
  - `allows the same pair on another day`: `localDate` one day later succeeds.
  - `deletes nudges when the friendship is removed`: after `removeFriend(a, b)`, `db.friendNudge.count({ where: { friendshipId } })` is `0`.
  - `deletes nudges when the sender is deleted`: after `db.user.delete({ where: { id: sender } })`, count is `0`.
  - `rejects a nudge to yourself`: `senderId === receiverId` rejects (CHECK).

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run --project db src/lib/__tests__/friends-schema.db.test.ts`
Expected: FAIL, `db.friendNudge` is undefined.

- [ ] **Step 3: Add the model**

```prisma
/// A friend cheering another on for the receiver's day. Open until the receiver reads on
/// or after `local_date`, or dismisses it. Cascades from the friendship, so removing a
/// friend deletes the nudges between the two.
model FriendNudge {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  friendshipId String    @map("friendship_id") @db.Uuid
  senderId     String    @map("sender_id")
  receiverId   String    @map("receiver_id")
  /// The receiver's local day when it was sent: the daily limit's key.
  localDate    DateTime  @map("local_date") @db.Date
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  dismissedAt  DateTime? @map("dismissed_at") @db.Timestamptz(3)

  friendship Friendship @relation(fields: [friendshipId], references: [id], onDelete: Cascade)
  sender     User       @relation("FriendNudgeSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiver   User       @relation("FriendNudgeReceiver", fields: [receiverId], references: [id], onDelete: Cascade)

  @@unique([senderId, receiverId, localDate])
  @@index([receiverId, dismissedAt])
  @@map("friend_nudge")
}
```

Add `nudgesSent FriendNudge[] @relation("FriendNudgeSender")` and `nudgesReceived FriendNudge[] @relation("FriendNudgeReceiver")` to `User`, and `nudges FriendNudge[]` to `Friendship`.

- [ ] **Step 4: Create the migration without applying it**, append the hand-written CHECK (as `20261031041026_friends/migration.sql` does), then apply:

Run: `pnpm db:up && pnpm prisma migrate dev --create-only --name friend_nudges`

Append to the generated `migration.sql`:

```sql
-- Hand-written, as in the init migration: Prisma cannot express CHECK constraints.
ALTER TABLE "friend_nudge"
  ADD CONSTRAINT "friend_nudge_not_self" CHECK ("sender_id" <> "receiver_id");
```

Run: `pnpm db:migrate` then `pnpm prisma migrate status`
Expected: "Database schema is up to date!". The test database picks the migration up through `src/test/db-global-setup.ts`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run --project db src/lib/__tests__/friends-schema.db.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/__tests__/friends-schema.db.test.ts
git commit -m "feat(friends): add the friend nudge table"
```

---

### Task 2: Nudge DAL

**Files:**
- Modify: `src/features/friends/domain/types.ts`
- Modify: `src/lib/friends-dal.ts` (new section after `getFriendReading`; `getFriendReading` at `:491`)
- Test: `src/lib/__tests__/friend-nudges.db.test.ts` (create), `src/lib/__tests__/friends-reading.db.test.ts` (extend)
- Modify fixtures that build a `FriendReading` literal: `src/features/friends/components/__tests__/friend-profile-screen.dom.test.tsx`, `src/features/friends/hooks/__tests__/friend-reading-provider.dom.test.tsx`, and any other hit of `grep -rn "FriendReading = {" src` (add `nudgedToday: false`).

**Interfaces:**
- Consumes: `getRelationship`, `orderPair`, `getTimeZone`, `isUniqueViolation`, `isForeignKeyViolation`, `toDbDate`, `fromDbDate`, `getTodayDateKeyInZone`.
- Produces:
  - `FriendReading` gains `readonly nudgedToday: boolean` (the viewer has nudged this friend on the friend's current day).
  - `type NudgeOutcome = "sent" | "already-nudged" | "already-read" | "not-found"`.
  - `interface OpenNudges { readonly senders: readonly FriendProfile[] }`, most recent nudge first, one entry per sender.
  - `sendNudge(senderId: string, receiverId: string, now?: Date): Promise<NudgeOutcome>`
  - `getOpenNudges(receiverId: string): Promise<OpenNudges>`
  - `dismissOpenNudges(receiverId: string, senderIds: readonly string[], now?: Date): Promise<number>` (count dismissed)

- [ ] **Step 1: Write the failing tests** in `friend-nudges.db.test.ts` (same setup style as `friends-reading.db.test.ts`: `createTestUser`, `createReadingPlan`, `befriend`, `NOW = new Date("2026-10-31T11:00:00Z")`, receiver zone set with `setTimeZone`):
  - `sendNudge`:
    - `sends to an accepted friend`: returns `"sent"`; one row with `localDate` = receiver's today.
    - `answers not-found for a stranger, both pending directions, a removed friend and yourself` (five calls, all `"not-found"`, zero rows).
    - `refuses a second nudge the same receiver day`: second call `"already-nudged"`.
    - `stores one nudge from two concurrent sends`: `Promise.all` of two calls gives `["sent", "already-nudged"]` in some order; one row.
    - `refuses when the friend read today`: plan reading on receiver's today gives `"already-read"`; same for an extra only (`markReadingComplete(..., { isExtra: true })`).
    - `follows the receiver's midnight, not the sender's`: receiver zone `Pacific/Kiritimati`, sender zone `Pacific/Pago_Pago`; send at `2026-10-31T09:00:00Z` (receiver Oct 31, 23:00) is `"sent"` with day `2026-10-31`; send at `2026-10-31T10:30:00Z` (receiver Nov 1, 00:30) is `"sent"` with day `2026-11-01`.
    - `a re-friended pair can nudge again the same day`: send, `removeFriend`, befriend again, send: `"sent"`.
  - `getOpenNudges`:
    - `returns yesterday's nudge when nothing was read since`.
    - `closes a nudge once the receiver reads on or after its day`: completion on the nudge's day closes it; a completion on the day before does not.
    - `treats a reader with no completions as unread`.
    - `omits dismissed nudges`.
    - `lists each sender once, most recent first`: Ben nudges Oct 30, Maria Oct 31, Ben Nov 1 (no reading) gives `[Ben, Maria]`.
    - `drops nudges from a removed friend`.
    - `never includes email`: `JSON.stringify(result)` does not contain `"@example.test"`.
  - `dismissOpenNudges`:
    - `dismisses only the given senders`: Maria and Ben open, dismiss `[maria]`, open list is `[Ben]`.
    - `never touches nudges the reader sent`: dismissing as the sender's id returns `0`.
  - In `friends-reading.db.test.ts`: `reports nudgedToday for the viewer on the friend's day` (`false` before, `true` after `sendNudge(viewer, friend, NOW)`, `false` for a second friend of the same person).

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run --project db src/lib/__tests__/friend-nudges.db.test.ts src/lib/__tests__/friends-reading.db.test.ts`
Expected: FAIL, `sendNudge` is not exported.

- [ ] **Step 3: Implement the three functions and `nudgedToday`** in `friends-dal.ts`:
  - `sendNudge`: self returns `"not-found"`; load the friendship by `orderPair` and require `status === "accepted"`; compute the receiver's today; any `readingCompletion` for the receiver on that day returns `"already-read"`; `db.friendNudge.create`; map `isUniqueViolation` to `"already-nudged"` and `isForeignKeyViolation` (friendship deleted mid-call) to `"not-found"`. Keep it one function so 2c can hook in after the create (spec, "Constraints").
  - `getOpenNudges`: two queries, undismissed nudges for the receiver (with `sender` selecting `id, username, name, image`, ordered `createdAt desc`) and `readingCompletion.aggregate({ _max: { localDate } })`; keep nudges whose `localDate` is after the max (all of them when there is none); dedupe by sender keeping first; skip senders with a null username.
  - `dismissOpenNudges`: `updateMany` where `receiverId`, `senderId in senderIds`, `dismissedAt: null`.
  - `getFriendReading`: once the friend's today is known, one `friendNudge.findUnique` on `senderId_receiverId_localDate` (viewer, friend, friend's today), as `reading.nudgedToday`.

- [ ] **Step 4: Run the tests to verify they pass**, then the typecheck (fixtures)

Run: `pnpm vitest run --project db src/lib/__tests__/friend-nudges.db.test.ts src/lib/__tests__/friends-reading.db.test.ts && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/friends-dal.ts src/features/friends/domain/types.ts src/lib/__tests__ src/features/friends
git commit -m "feat(friends): send, list and dismiss nudges in the DAL"
```

---

### Task 3: Nudge commands and actions

**Files:**
- Modify: `src/features/friends/commands/inputs.ts`, `results.ts`, `commands.ts`
- Modify: `src/actions/friends.ts`
- Test: `src/features/friends/commands/__tests__/commands.db.test.ts`, `results.test.ts`

**Interfaces:**
- Consumes: `sendNudge`, `dismissOpenNudges` (Task 2).
- Produces:
  - `FriendsErrorCode` gains `"already-nudged"` and `"already-read"`; `friendsErrorMessage` copy: `"already-nudged"` gives `"You've already cheered them on today."`, `"already-read"` gives `"They've already read today."`.
  - `dismissNudgesInput = z.object({ senderIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_FRIENDS) })`, `type DismissNudgesInput = z.input<typeof dismissNudgesInput>`.
  - `nudgeFriendFor(userId: string, input: unknown): Promise<FriendsResult>` ("sent" is `{ ok: true }`, the rest `fail(outcome)`).
  - `dismissNudgesFor(userId: string, input: unknown): Promise<FriendsResult>` (always ok after a valid parse).
  - Actions `nudgeFriend(input: TargetInput): Promise<FriendsResult>` and `dismissNudges(input: DismissNudgesInput): Promise<FriendsResult>`, each `requireUser()` first, as the others.

- [ ] **Step 1: Write the failing tests**
  - `commands.db.test.ts`: `nudgeFriendFor` returns `{ ok: true }` for a friend, `{ ok: false, error: "not-found" }` for a stranger, `"already-nudged"` on a repeat, `"invalid-input"` for `{ userId: "" }`; `dismissNudgesFor` returns `"invalid-input"` for `{ senderIds: [] }` and `{ ok: true }` for a valid list, after which `getOpenNudges` is empty.
  - `results.test.ts`: the two new codes map to the copy above (the existing exhaustive test, if any, picks them up).

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/features/friends/commands/__tests__`
Expected: FAIL, `nudgeFriendFor` is not exported.

- [ ] **Step 3: Implement** the inputs, codes, copy, commands and actions with the signatures above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/friends/commands/__tests__ && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/friends/commands src/actions/friends.ts
git commit -m "feat(friends): add nudge and dismiss actions"
```

---

### Task 4: Name helpers

**Files:**
- Create: `src/features/friends/domain/nudge.ts`
- Test: `src/features/friends/domain/__tests__/nudge.test.ts`

**Interfaces:**
- Produces:
  - `firstName(person: { readonly name: string; readonly username: string }): string`
  - `cheeringNames(senders: readonly { name: string; username: string }[]): { readonly names: readonly string[]; readonly others: boolean }`: `names` is the first names of the first two senders, `others` is `senders.length > 2`.

- [ ] **Step 1: Write the failing tests**
  - `takes the first word of the name`: `{ name: "  Maria  Santos ", username: "maria" }` gives `"Maria"`.
  - `falls back to the username for a blank name`: `{ name: "   ", username: "maria" }` gives `"@maria"`.
  - `names one, two, or two and others`: 1 sender gives `{ names: ["Maria"], others: false }`; 2 gives `["Maria", "Ben"], false`; 4 gives `["Maria", "Ben"], true`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run --project unit src/features/friends/domain/__tests__/nudge.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** both functions.

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command. Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/friends/domain/nudge.ts src/features/friends/domain/__tests__/nudge.test.ts
git commit -m "feat(friends): add name helpers for nudge copy"
```

---

### Task 5: Cheer button on the friend profile

**Files:**
- Modify: `src/features/friends/hooks/friend-reading-provider.tsx`
- Create: `src/features/friends/components/friend-profile/cheer-button.tsx`
- Modify: `src/features/friends/components/friend-profile/friend-today-card.tsx`, `friend-profile-screen.tsx` (`FriendProfileBody` takes `profile: FriendProfile` instead of `username`)
- Test: `src/features/friends/components/__tests__/cheer-button.dom.test.tsx` (create), `friend-profile-screen.dom.test.tsx` (extend)

**Interfaces:**
- Consumes: `nudgeFriend` action (Task 3), `firstName` (Task 4), `FriendReading.nudgedToday` (Task 2), `friendsErrorMessage`.
- Produces:
  - `useFriendNudgeState(): { nudgedToday: boolean; refresh: () => void }`, supplied by `FriendReadingProvider` from its query (`refresh` is the query's `refetch`); throws `"useFriendNudgeState must be used inside a FriendReadingProvider."` outside one.
  - `CheerButton({ friend }: { friend: FriendProfile })`.
  - `FriendTodayCard({ profile }: { profile: FriendProfile })`; renders `<CheerButton key={view.today} friend={profile} />` under the detail line only when `summary.todayPassages === null`.

- [ ] **Step 1: Write the failing tests** (mock `@/actions/friends` with `vi.hoisted`, as `friends-screen.dom.test.tsx:13-24`; render inside `QueryClientProvider` + `FriendReadingProvider`, as `friend-profile-screen.dom.test.tsx`):
  - `shows "Cheer Maria on" while the friend has not read`.
  - `hides the button once the friend has read today` (fixture with a completion on `today`): no button, no "You cheered" text.
  - `shows the confirmation when the server says already nudged` (`nudgedToday: true`): text `"You cheered Maria on today"`, no button.
  - `switches to the confirmation at once and sends one request on a double tap`: two clicks, `nudgeFriend` called once with `{ userId: "user-maria" }`, confirmation visible before the promise resolves.
  - `reverts with an error when sending fails`: `nudgeFriend` rejects; button is back and `"Couldn't save that. Check your connection and try again."` shows.
  - `keeps the confirmation without an error for already-nudged and already-read` (two cases; no `role="alert"` / error text, `fetch` called for the refresh).
  - `shows the button again when the friend's day moves on`: rerender the provider's query data with `today: "2026-11-01", nudgedToday: false` after a send; the button is back.
  - `uses no warning colours`: the button and confirmation have no class containing `destructive`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run --project dom src/features/friends/components/__tests__/cheer-button.dom.test.tsx src/features/friends/components/__tests__/friend-profile-screen.dom.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**
  - Provider: a small context next to `ReadingViewProvider` carrying `data.nudgedToday` and `refetch`.
  - `CheerButton`: local `sent` state (optimistic) and `pending`; shows the confirmation when `nudgedToday || sent`. On click: set both, await `nudgeFriend({ userId: friend.userId })`; `ok` or a refusal of `already-nudged`, `already-read` or `not-found` calls `refresh()` and keeps `sent` (a `not-found` refresh 404s into the existing unavailable state, an `already-read` refresh swaps the card to "Read today"); a throw sets `sent` false and shows `friendsErrorMessage("network")`, and any other refusal (`invalid-input`) sets `sent` false and shows `friendsErrorMessage(error)`, in a muted footnote under the button. Button: existing `Button size="large" className="w-full"` with Lucide `HandHeart`, label truncating on one line. Confirmation: `bg-secondary` rounded row, Lucide `Check`, `text-muted-foreground`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command, then `pnpm vitest run --project dom src/features/friends`
Expected: PASS (existing profile tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/features/friends
git commit -m "feat(friends): cheer a friend on from their profile"
```

---

### Task 6: Open nudges route and hook

**Files:**
- Create: `src/app/api/nudges/route.ts`
- Create: `src/features/friends/hooks/use-open-nudges.ts`
- Test: `src/app/api/nudges/__tests__/route.db.test.ts`, `src/features/friends/hooks/__tests__/use-open-nudges.dom.test.tsx`

**Interfaces:**
- Consumes: `getOpenNudges` (Task 2), `dismissNudges` action (Task 3).
- Produces:
  - `GET /api/nudges`: 401 `{ "error": "unauthorized" }` without a session; otherwise 200 `OpenNudges` with `cache-control: no-store`.
  - `OPEN_NUDGES_KEY = ["open-nudges"] as const`
  - `useOpenNudges(initial: OpenNudges, options: { todayCompleted: boolean }): { senders: readonly FriendProfile[]; dismiss: () => void }`. Query: `initialData: initial`, `staleTime: 0`, `refetchOnMount: false`, `refetchOnWindowFocus: true`. `senders` is `[]` whenever `todayCompleted`.

- [ ] **Step 1: Write the failing tests**
  - Route (same harness as `src/app/api/friends/[username]/reading/__tests__/route.db.test.ts`): `answers 401 without a session`; `returns the reader's open nudges` (Maria nudged, body `{ senders: [{ userId, username, name: "Maria", image: null }] }`); `returns no one else's nudges` (signed in as a third user, `{ senders: [] }`).
  - Hook: `returns the initial senders`; `returns no one once today is completed`; `dismiss empties the list at once and sends the shown ids` (`dismissNudges` called with `{ senderIds: ["user-maria", "user-ben"] }`); `a failed dismiss stays hidden until the next refetch` (action rejects, list stays empty, no throw).

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/app/api/nudges src/features/friends/hooks/__tests__/use-open-nudges.dom.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** the route and the hook with the contracts above (`dismiss` sets the query data to `{ senders: [] }` before calling the action, and swallows its failure).

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command. Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nudges src/features/friends/hooks
git commit -m "feat(friends): load and dismiss the reader's open nudges"
```

---

### Task 7: Cheering row on Today

**Files:**
- Create: `src/features/friends/components/cheering-row.tsx`
- Modify: `src/features/progress/components/today-reading-card.tsx` (both `Panel` returns, `:60` and `:86`)
- Modify: `src/features/progress/components/progress-screen.tsx`, `src/app/(app)/page.tsx`
- Test: `src/features/friends/components/__tests__/cheering-row.dom.test.tsx` (create), `src/features/progress/components/__tests__/today-reading-card.dom.test.tsx` (extend)

**Interfaces:**
- Consumes: `cheeringNames` (Task 4), `useOpenNudges` (Task 6), `getOpenNudges` (Task 2), `Avatar`.
- Produces:
  - `CheeringRow({ senders, onDismiss }: { senders: readonly FriendProfile[]; onDismiss: () => void })`, renders nothing for an empty list.
  - `TodayReadingCardProps` gains `banner?: ReactNode`, rendered as the first child of the card's `Panel` in every variant, edge to edge across the top (`-mx-5 -mt-5 mb-4`, `rounded-t-2xl`, `bg-primary-soft`).
  - `ProgressScreenProps` gains `initialNudges: OpenNudges`; it passes `banner={<CheeringRow senders={senders} onDismiss={dismiss} />}` with `useOpenNudges(initialNudges, { todayCompleted: todayReading.status === "completed" })`.
  - `page.tsx` loads `getOpenNudges(user.id)` in parallel with the calendar preference.

- [ ] **Step 1: Write the failing tests**
  - `cheering-row.dom.test.tsx`: text content is exactly `"Maria is cheering you on"` for one sender, `"Maria and Ben are cheering you on"` for two, `"Maria, Ben and others are cheering you on"` for four; names are in `<strong>`; at most two avatars render; the X has accessible name `"Dismiss"` and calls `onDismiss`; nothing renders for `[]`; no text contains a digit.
  - `today-reading-card.dom.test.tsx`: `renders the banner above the reading in a scheduled day` (banner text precedes `today-reference` in document order) and `renders the banner on a not-scheduled day`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run --project dom src/features/friends/components/__tests__/cheering-row.dom.test.tsx src/features/progress/components/__tests__/today-reading-card.dom.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement** the row, the `banner` slot, and the `ProgressScreen` / `page.tsx` wiring as above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command. Expected: PASS

- [ ] **Step 5: Check by hand at phone width** (`pnpm dev`, two test accounts that are friends, browser at 375px): cheer from the profile, see the confirmation; open Today as the friend, see the row in the week strip and month view; mark as read, the row goes; long display name truncates on the button. Note anything not checked.

- [ ] **Step 6: Commit**

```bash
git add src/features/friends/components src/features/progress/components src/app/\(app\)/page.tsx
git commit -m "feat(friends): show who is cheering you on above today's reading"
```

---

### Task 8: Verify and close out

**Files:**
- Modify: `docs/superpowers/specs/2026-11-01-friend-nudge-design.md` (`Status: implemented`)

- [ ] **Step 1: Run the full check**

Run: `pnpm verify`
Expected: lint, typecheck and all three time-zone test runs pass.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-11-01-friend-nudge-design.md
git commit -m "docs(friends): mark the nudge design implemented"
```
