# Friends Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let readers become mutual friends through a resettable personal invite link or an exact username search, with requests the receiver accepts.

**Architecture:** Three schema additions (`user.username`, `friend_invite`, `friendship` with one ordered row per pair) in one migration. A new data-access module `src/lib/friends-dal.ts` owns every friends query; commands in `src/features/friends/commands/` validate input and map outcomes to error codes; thin Server Actions in `src/actions/friends.ts` add the session check. The Friends tab and the new `/add/[code]` page are server-rendered from the DAL, and client components call actions and then `router.refresh()`.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, Prisma 7.10 (PostgreSQL, `prisma-client` generator), Better Auth 1.7, Zod 4, React Hook Form, Vitest 5 (unit / dom / db projects), Biome, Tailwind 4, Lucide.

**Spec:** `docs/superpowers/specs/2026-10-31-friends-connections-design.md`

## Global Constraints

- Username: stored lowercase; `^[a-z0-9_]{3,20}$`; input normalised by trim, strip one leading `@`, lowercase.
- Reserved usernames: `admin`, `support`, `bibletracker`, `friends`, `add`, `me`.
- Invite code: exactly 10 chars of `[A-Za-z0-9]`, from `crypto.getRandomValues`; regenerate on unique collision.
- Limits: 50 outgoing pending requests per reader; 500 friends per reader, checked for both people on accept and on crossed-request accept.
- "Decline all" appears only when there are more than 5 incoming requests, behind a confirm.
- Search is exact username match only and returns `@username` only: never name, photo or email. The Sent list shows `@username` only. Email is never returned by any friends function.
- Name and photo are returned only for: the invite owner (`/add/<code>`), incoming requesters, and accepted friends.
- Opening `/add/<code>` never writes anything. Sending happens on a button tap.
- Decline, cancel and remove delete the row and notify no one.
- DB conventions: snake_case via `@map`, `@db.Timestamptz(3)`, UUID ids via `gen_random_uuid()`, CHECK constraints hand-written in migration SQL with a comment.
- No new packages. No `console.log`. No em or en dashes in code comments, copy or commits.
- Every task ends green on `pnpm lint` and `pnpm typecheck` plus its own tests. Final task runs `pnpm verify`.
- DB tests need Postgres: `pnpm db:up` first.

## Review Focus

1. **Two people request each other at the same moment**: exactly one row results and it is `accepted`, never two rows or a unique-violation error to the user. Test in Task 4 (`resolves simultaneous crossed requests to one accepted friendship`).
2. **Reader acts on a row they are not in, or in the wrong role** (requester tries to accept their own request, a third reader declines someone else's request): nothing changes and the command reports `not-found`. Tests in Task 4.
3. **Username typed with a capital letter, spaces or a leading `@`** (`" @Maria_1 "`) in search or setup: treated as `maria_1`. Tests in Task 2 and Task 5.
4. **Old invite link after reset, or a garbage code** (`/add/abc`, `/add/<old>`): shows "This invite link no longer works", never a 500 (the code is not validated by Prisma, so a bad format must short-circuit). Tests in Task 3 (`findInviteOwner` returns null for malformed codes) and Task 7.
5. **Brand-new reader arrives via an invite link with no username and no plan**: can pick a username and send the request on the invite page, then lands on `/onboarding`, not on a redirect loop or a lost invite. Test in Task 7 (dom) and manual check in Task 8.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` (modify) | `User.username`, `FriendInvite`, `Friendship`, `FriendshipStatus` |
| `prisma/migrations/<ts>_friends/migration.sql` (create) | generated SQL plus hand-written CHECKs |
| `src/features/friends/domain/username.ts` | `normalizeUsername`, `usernameSchema`, `RESERVED_USERNAMES` |
| `src/features/friends/domain/invite-code.ts` | `generateInviteCode`, `isInviteCode` |
| `src/features/friends/domain/types.ts` | shared friends domain types and limit constants |
| `src/lib/friends-dal.ts` | every friends query (the "only module that queries" rule extends to it) |
| `src/lib/dal.ts` (modify) | doc comment only: name `friends-dal.ts` as the friends half of the DAL |
| `src/features/friends/commands/{inputs,results,commands}.ts` | validation, error codes and copy, command functions |
| `src/actions/friends.ts` | Server Actions: `requireUser()` then command |
| `src/features/friends/components/*` | Friends screen sections, username form, invite screen |
| `src/app/(app)/friends/page.tsx` (modify) | load overview, render screen |
| `src/app/(app)/add/[code]/page.tsx`, `src/app/(app)/@sheet/add/[code]/page.tsx` | invite page and its no-sheet slot |
| `src/test/factories.ts` (modify) | `createTestUser` gains optional `{ name, username }` |

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_friends/migration.sql` (via `prisma migrate dev --create-only`)
- Test: `src/lib/__tests__/friends-schema.db.test.ts`

**Interfaces:**
- Produces: Prisma models `db.friendInvite`, `db.friendship`, enum `FriendshipStatus` (`pending | accepted`), `User.username: string | null`. Exact Prisma blocks are in the spec, "Data model". Back-relations on `User`: `friendInvite FriendInvite?`, `friendshipsAsA Friendship[] @relation("FriendshipUserA")`, `friendshipsAsB Friendship[] @relation("FriendshipUserB")`.

- [ ] **Step 1: Write the failing test** `friends-schema.db.test.ts`. It writes rows with raw `db` calls (no DAL yet) and asserts the constraints:

```ts
it("rejects a friendship stored out of order or with yourself", async () => {
  const [lo, hi] = [a, b].sort();
  await expect(db.friendship.create({ data: { userAId: hi, userBId: lo, requestedById: hi } })).rejects.toThrow();
  await expect(db.friendship.create({ data: { userAId: lo, userBId: lo, requestedById: lo } })).rejects.toThrow();
});
it("rejects a requester outside the pair", ...)          // requestedById = third user
it("requires accepted_at exactly when accepted", ...)     // accepted without acceptedAt, pending with acceptedAt: both reject
it("allows one row per pair", ...)                         // second create with same (lo, hi): rejects
it("rejects usernames outside ^[a-z0-9_]{3,20}$", ...)    // "Ab", "ab", "a-b-c", 21 chars: reject; "ab_1" ok
it("rejects invite codes that are not 10 alphanumerics", ...) // "short", "abcdefghi!": reject
it("cascades both tables when a user is deleted", ...)
```

Sort with plain `[a, b].sort()` (JS code-unit order), which is what the `COLLATE "C"` CHECK must agree with.

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm vitest run --project db src/lib/__tests__/friends-schema.db.test.ts`
Expected: FAIL (`db.friendship` is undefined / type errors).

- [ ] **Step 3: Edit `prisma/schema.prisma`** with the blocks from the spec, then run `pnpm prisma migrate dev --create-only --name friends`.

- [ ] **Step 4: Append the hand-written constraints to the generated `migration.sql`**, after a comment in the init migration's style ("Hand-written: Prisma cannot express CHECK constraints"):

```sql
ALTER TABLE "user"
  ADD CONSTRAINT "user_username_format" CHECK ("username" ~ '^[a-z0-9_]{3,20}$');
ALTER TABLE "friend_invite"
  ADD CONSTRAINT "friend_invite_code_format" CHECK ("code" ~ '^[A-Za-z0-9]{10}$');
ALTER TABLE "friendship"
  ADD CONSTRAINT "friendship_pair_ordered" CHECK ("user_a_id" < "user_b_id" COLLATE "C"),
  ADD CONSTRAINT "friendship_requester_in_pair" CHECK ("requested_by_id" IN ("user_a_id", "user_b_id")),
  ADD CONSTRAINT "friendship_accepted_at_matches" CHECK (("status" = 'accepted') = ("accepted_at" IS NOT NULL));
```

- [ ] **Step 5: Apply and regenerate**: `pnpm db:migrate` then `pnpm db:generate`. Expected: migration applied, client regenerated without errors.

- [ ] **Step 6: Run the test**: same command as Step 2. Expected: PASS. The db project's global setup (`src/test/db-global-setup.ts`) applies migrations to the test database.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add prisma src/lib/__tests__/friends-schema.db.test.ts
git commit -m "feat(friends): add username, invite and friendship tables"
```

---

### Task 2: Domain: usernames, invite codes, types

**Files:**
- Create: `src/features/friends/domain/username.ts`, `src/features/friends/domain/invite-code.ts`, `src/features/friends/domain/types.ts`
- Test: `src/features/friends/domain/__tests__/username.test.ts`, `src/features/friends/domain/__tests__/invite-code.test.ts`

**Interfaces:**
- Produces:
  - `normalizeUsername(raw: string): string` (trim, strip one leading `@`, lowercase; no validation)
  - `usernameSchema: z.ZodType<string>`: preprocesses with `normalizeUsername`, then regex, then refuses `RESERVED_USERNAMES` with the message `"That username isn't available."`. Regex failure message: `"Use 3 to 20 letters, numbers or underscores."`
  - `RESERVED_USERNAMES: ReadonlySet<string>`
  - `generateInviteCode(): string`, `isInviteCode(value: string): boolean`
  - In `types.ts`:

```ts
export const MAX_PENDING_OUTGOING = 50;
export const MAX_FRIENDS = 500;
export const DECLINE_ALL_THRESHOLD = 5;

/** What anyone may see: search results and the Sent list. */
export interface PublicHandle { readonly userId: string; readonly username: string }
/** Invite owner, incoming requester, or friend. */
export interface FriendProfile extends PublicHandle { readonly name: string; readonly image: string | null }
export type Relationship = "none" | "self" | "friends" | "outgoing" | "incoming";
export interface FriendsOverview {
  readonly friends: readonly FriendProfile[];   // sorted by name, case-insensitive
  readonly incoming: readonly FriendProfile[];  // newest first
  readonly outgoing: readonly PublicHandle[];   // newest first
}
```

- [ ] **Step 1: Write failing tests**

```ts
expect(normalizeUsername("  @Maria_1 ")).toBe("maria_1");
expect(normalizeUsername("@@x")).toBe("@x");                 // strips one @ only
expect(usernameSchema.parse(" @Maria_1")).toBe("maria_1");
for (const bad of ["ab", "a".repeat(21), "has space", "dash-ed", "émile"])
  expect(usernameSchema.safeParse(bad).success).toBe(false);
expect(usernameSchema.safeParse("Admin").error?.issues[0]?.message).toBe("That username isn't available.");

const code = generateInviteCode();
expect(code).toMatch(/^[A-Za-z0-9]{10}$/);
expect(new Set(Array.from({ length: 1000 }, generateInviteCode)).size).toBe(1000);
expect(isInviteCode("abc")).toBe(false);
expect(isInviteCode("../../etc!")).toBe(false);
```

- [ ] **Step 2: Run** `pnpm vitest run --project unit src/features/friends/domain`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement.** `generateInviteCode` draws bytes with `crypto.getRandomValues` and rejects values `>= 248` (4 x 62) before taking `% 62`, so every character is equally likely.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends/domain
git commit -m "feat(friends): add username rules and invite codes"
```

---

### Task 3: DAL: usernames and invite links

**Files:**
- Create: `src/lib/friends-dal.ts` (`import "server-only"`; header comment: the friends half of the data access layer, same rules as `dal.ts`)
- Modify: `src/lib/dal.ts:27-34` (doc comment mentions `friends-dal.ts`), `src/test/factories.ts` (`createTestUser(options?: { name?: string; username?: string })`, default unchanged)
- Test: `src/lib/__tests__/friends-invite.db.test.ts`

**Interfaces:**
- Consumes: Task 2 types, `generateInviteCode`, `isInviteCode`; `isUniqueViolation` from `@/lib/dal`.
- Produces (all in `friends-dal.ts`):
  - `getUsername(userId: string): Promise<string | null>`
  - `setUsername(userId: string, username: string): Promise<"ok" | "taken">`: expects a normalised, validated value; returns `"taken"` on unique violation.
  - `findUserByUsername(username: string): Promise<PublicHandle | null>`: selects only `id` and `username`.
  - `getOrCreateInvite(userId: string): Promise<string>`
  - `resetInvite(userId: string): Promise<string>`: new code and `createdAt`.
  - `findInviteOwner(code: string): Promise<FriendProfile | null>`: returns null without querying when `!isInviteCode(code)`; null when the owner has no username.

- [ ] **Step 1: Write failing tests**

```ts
it("returns the same code until reset, then a different one", ...)
it("makes the old code resolve to nobody after reset", async () => {
  const old = await getOrCreateInvite(alice);
  await resetInvite(alice);
  expect(await findInviteOwner(old)).toBeNull();
});
it("returns null for malformed codes without throwing", async () => {
  expect(await findInviteOwner("../x")).toBeNull();
  expect(await findInviteOwner("")).toBeNull();
});
it("returns the owner's name, photo and username, never email", async () => {
  expect(Object.keys((await findInviteOwner(code))!).sort()).toEqual(["image", "name", "userId", "username"]);
});
it("reports a taken username", ...)                     // bob sets alice's username: "taken"
it("lets a reader change their username and frees the old one", ...)
it("finds by exact username only and returns only id and username", async () => {
  expect(await findUserByUsername("mari")).toBeNull();          // alice is "maria"
  expect(await findUserByUsername("maria")).toEqual({ userId: alice, username: "maria" });
});
```

- [ ] **Step 2: Run** `pnpm vitest run --project db src/lib/__tests__/friends-invite.db.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** `getOrCreateInvite` is `findUnique` then `create`; on a unique violation it re-reads (another device created it) or, if the violation was the `code`, retries with a new code (at most 3 tries). `resetInvite` updates in place with the same collision retry.

- [ ] **Step 4: Run** the test. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/friends-dal.ts src/lib/dal.ts src/test/factories.ts src/lib/__tests__/friends-invite.db.test.ts
git commit -m "feat(friends): store usernames and invite links"
```

---

### Task 4: DAL: friendships

**Files:**
- Modify: `src/lib/friends-dal.ts`
- Test: `src/lib/__tests__/friendships.db.test.ts`

**Interfaces:**
- Consumes: Task 2 limits and types.
- Produces:

```ts
export type SendOutcome =
  | "requested" | "accepted"            // accepted = crossed request
  | "already-requested" | "already-friends"
  | "too-many-pending" | "friend-limit" | "not-found";
export function sendFriendRequest(userId: string, otherUserId: string): Promise<SendOutcome>;
export function acceptFriendRequest(userId: string, otherUserId: string): Promise<"accepted" | "not-found" | "friend-limit">;
export function declineFriendRequest(userId: string, otherUserId: string): Promise<boolean>;
export function cancelFriendRequest(userId: string, otherUserId: string): Promise<boolean>;
export function removeFriend(userId: string, otherUserId: string): Promise<boolean>;
export function declineAllFriendRequests(userId: string): Promise<number>;
export function getRelationship(userId: string, otherUserId: string): Promise<Relationship>;
export function getFriendsOverview(userId: string): Promise<FriendsOverview>;
```

Callers never pass `userId === otherUserId`. The command layer refuses it, and `getRelationship` returns `"self"` for it.

- [ ] **Step 1: Write failing tests**, with readers created via `createTestUser({ username })`:

```ts
it("stores one ordered row whichever side asks", ...)
it("turns a crossed request into a friendship", async () => {
  await sendFriendRequest(alice, bob);
  expect(await sendFriendRequest(bob, alice)).toBe("accepted");
  expect(await getRelationship(alice, bob)).toBe("friends");
});
it("resolves simultaneous crossed requests to one accepted friendship", async () => {
  const outcomes = await Promise.all([sendFriendRequest(alice, bob), sendFriendRequest(bob, alice)]);
  expect(outcomes.sort()).toEqual(["accepted", "requested"]);
  expect(await db.friendship.count({ where: { OR: [{ userAId: alice }, { userBId: alice }] } })).toBe(1);
});
it("reports a repeat request instead of failing", ...)        // "already-requested", then after accept "already-friends"
it("only lets the receiver accept or decline", async () => {
  await sendFriendRequest(alice, bob);
  expect(await acceptFriendRequest(alice, bob)).toBe("not-found");
  expect(await declineFriendRequest(alice, bob)).toBe(false);
  expect(await acceptFriendRequest(bob, alice)).toBe("accepted");
});
it("only lets the requester cancel", ...)
it("does not let a reader outside the pair change it", ...)   // carol: accept/decline/cancel/remove all no-ops
it("does not remove a pending request through removeFriend", ...)
it("lets a declined requester ask again", ...)
it("caps outgoing pending requests at 50", ...)                // 50 targets ok, 51st "too-many-pending"
it("caps friends at 500 for both people on accept", ...)       // seed 500 accepted rows for bob with raw createMany, alice->bob, bob accepts: "friend-limit"
it("declines all incoming at once and leaves outgoing alone", ...)
it("returns an overview without email, with outgoing as handles only", async () => {
  const overview = await getFriendsOverview(alice);
  expect(Object.keys(overview.outgoing[0]!).sort()).toEqual(["userId", "username"]);
  expect(Object.keys(overview.incoming[0]!).sort()).toEqual(["image", "name", "userId", "username"]);
});
it("returns not-found for a deleted or unknown user", ...)
```

- [ ] **Step 2: Run** `pnpm vitest run --project db src/lib/__tests__/friendships.db.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Each write that changes a pair runs in a transaction that first takes advisory locks for both readers in sorted order: `pg_advisory_xact_lock(hashtextextended('friends:' || $id, 0))`. The `friends:` prefix keeps it off `lockReader`'s key in `dal.ts:122`. Under the lock: read the pair's row, decide the outcome from the state table in the spec, count limits, then write. Role checks go in the `WHERE` clause: accept and decline match `requestedById: otherUserId, status: "pending"`; cancel matches `requestedById: userId, status: "pending"`; remove matches `status: "accepted"`. A missing other user surfaces as a foreign-key violation, which maps to `"not-found"` (use `isForeignKeyViolation` from `dal.ts`). `getFriendsOverview` selects `name`, `image` and `username` from the related user and never `email`. Friends are sorted by name case-insensitively in JS.

- [ ] **Step 4: Run** the test. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/friends-dal.ts src/lib/__tests__/friendships.db.test.ts
git commit -m "feat(friends): add friend requests and friendships"
```

---

### Task 5: Commands and Server Actions

**Files:**
- Create: `src/features/friends/commands/inputs.ts`, `results.ts`, `commands.ts`; `src/actions/friends.ts`
- Test: `src/features/friends/commands/__tests__/commands.db.test.ts`, `src/features/friends/commands/__tests__/results.test.ts`

**Interfaces:**
- Consumes: Task 3 and Task 4 DAL functions, `usernameSchema`.
- Produces:

```ts
// results.ts
export type FriendsErrorCode =
  | "invalid-input" | "username-required" | "username-taken" | "username-just-taken"
  | "not-found" | "self" | "too-many-pending" | "friend-limit" | "network";
export type FriendsResult = { readonly ok: true } | { readonly ok: false; readonly error: FriendsErrorCode };
export interface SearchMatch { readonly handle: PublicHandle; readonly relationship: Relationship }
export type SearchResult = { readonly ok: true; readonly match: SearchMatch | null } | { readonly ok: false; readonly error: FriendsErrorCode };
export type InviteCodeResult = { readonly ok: true; readonly code: string } | { readonly ok: false; readonly error: FriendsErrorCode };
export function friendsErrorMessage(code: FriendsErrorCode): string;

// inputs.ts (Zod; server parses again)
setUsernameInput = z.object({ username: usernameSchema })
searchInput      = z.object({ query: z.string().max(64) })
targetInput      = z.object({ userId: z.string().min(1).max(64) })
inviteInput      = z.object({ code: z.string().max(64) })

// commands.ts: each `...For(userId, input: unknown)`, `import "server-only"`
setUsernameFor, searchUsernameFor -> SearchResult,
sendRequestFor, sendRequestByInviteFor, acceptRequestFor, declineRequestFor,
cancelRequestFor, removeFriendFor, declineAllRequestsFor -> FriendsResult,
getInviteCodeFor, resetInviteFor -> InviteCodeResult

// src/actions/friends.ts ("use server"): same names without "For", each `requireUser()` first.
```

Exact copy for `friendsErrorMessage`:

| code | message |
|---|---|
| `invalid-input` | Something went wrong. Reload the page and try again. |
| `username-required` | Pick a username first. |
| `username-taken` | That username is taken. |
| `username-just-taken` | That username was just taken. |
| `not-found` | That request is no longer there. |
| `self` | That's you. |
| `too-many-pending` | You have a lot of requests waiting. Cancel some before sending more. |
| `friend-limit` | One of you has reached the friend limit. |
| `network` | Couldn't save that. Check your connection and try again. |

Rules:
- `setUsernameFor`: if `findUserByUsername` returns a different user, then `username-taken`. A `"taken"` from `setUsername` (lost race) gives `username-just-taken`. Setting your own current username is ok.
- `searchUsernameFor`: normalise; if the result fails the username regex, return `{ ok: true, match: null }` without querying. Your own username gives `relationship: "self"`.
- `sendRequestFor` and `sendRequestByInviteFor`: the caller must have a username (`username-required`); the target must not be the caller (`self`). The invite variant resolves the owner with `findInviteOwner`, and an unknown code gives `not-found`. DAL outcomes map as: requested, accepted, already-requested and already-friends give ok; the rest give the code of the same name.
- Declining, cancelling or removing something already gone gives `not-found`.
- `getInviteCodeFor` requires a username (`username-required`).

- [ ] **Step 1: Write failing tests.** `results.test.ts` asserts the copy table above verbatim. `commands.db.test.ts`:

```ts
it("normalises and saves a username", ...)                  // " @Maria_1" -> getUsername === "maria_1"
it("refuses reserved and malformed usernames as invalid-input", ...)
it("reports a username another reader has as username-taken", ...)
it("finds a reader by exact handle without name or photo", async () => {
  const result = await searchUsernameFor(bob, { query: "@MARIA" });
  expect(result).toEqual({ ok: true, match: { handle: { userId: alice, username: "maria" }, relationship: "none" } });
});
it("returns no match for a partial or malformed query", ...)
it("marks your own handle as self", ...)
it("refuses to send without a username", ...)               // reader created with no username
it("refuses to befriend yourself", ...)
it("sends through an invite code and refuses an old one", ...)
it("maps a request that is already gone to not-found", ...)
it("rejects input of the wrong shape as invalid-input", async () => {
  expect(await acceptRequestFor(alice, { userId: 42 })).toEqual({ ok: false, error: "invalid-input" });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/features/friends/commands`. Expected: FAIL.

- [ ] **Step 3: Implement** `results.ts`, `inputs.ts`, `commands.ts`, then `src/actions/friends.ts` in the shape of `src/actions/reading.ts:30-40` (a comment that actions are public endpoints; each awaits `requireUser()` and delegates).

- [ ] **Step 4: Run** the tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/friends/commands src/actions/friends.ts
git commit -m "feat(friends): add friend commands and server actions"
```

---

### Task 6: Friends screen

**Files:**
- Modify: `src/app/(app)/friends/page.tsx`, `src/features/friends/components/friends-screen.tsx` (replace the placeholder; keep the droplet art for the empty Friends state if it fits)
- Create in `src/features/friends/components/`: `username-form.tsx`, `invite-link-panel.tsx`, `username-search.tsx`, `request-lists.tsx` (Requests + Sent), `friend-list.tsx`, `person-row.tsx` (avatar, name, `@username`; name/photo optional so it renders handles too)
- Test: `src/features/friends/components/__tests__/friends-screen.dom.test.tsx`

**Interfaces:**
- Consumes: actions from `@/actions/friends`, `friendsErrorMessage`, `FriendsOverview`, `DECLINE_ALL_THRESHOLD`.
- Produces:
  - `FriendsScreen(props: { username: string | null; inviteUrl: string | null; overview: FriendsOverview })`: a server-safe composition; sections are client components.
  - `UsernameForm(props: { initial?: string; submitLabel: string; onSaved: () => void })`: reused by Task 7.
  - Page: `requireUser()`, onboarding redirect unchanged, then `getUsername`. With a username, it loads `getFriendsOverview` and `getOrCreateInvite`, and `inviteUrl = new URL(\`/add/${code}\`, env.BETTER_AUTH_URL).href`. Without one it passes `null`s and an empty overview.

Behaviour:
- No username: only the "Pick a username" step (`UsernameForm`, rules text "3 to 20 letters, numbers or underscores"). On save, `router.refresh()`.
- With a username, the sections follow the spec's "Friends screen layout" order: header `@username` with a "Change" link that opens `UsernameForm` in the existing `AccountDialog` pattern (`src/features/settings/components/name-row.tsx`).
- Invite panel: Copy (`navigator.clipboard.writeText`, "Copied" feedback), Share (`navigator.share({ url })`, only rendered when `"share" in navigator`), Reset behind `AlertDialog` with the body "People who haven't used your old link won't be able to."
- Search: submit-driven (no live search). It shows one result row with Add / Requested (Cancel) / Accept / Friends, or "No one with that username" or "That's you".
- Requests: Accept / Decline per row. "Decline all" (with a confirm) when `incoming.length > DECLINE_ALL_THRESHOLD`. Hidden when empty. Sent: Cancel. Hidden when empty.
- Friends: remove from a `DropdownMenu`, confirmed in an `AlertDialog` ("Remove @x? They won't be told."). Empty state via `EmptyState`: title "No friends yet", description "Share your invite link or search for a username."
- Every mutation disables its button while pending, shows `friendsErrorMessage` inline on failure, and calls `router.refresh()` on success.

- [ ] **Step 1: Write failing dom tests**, mocking `@/actions/friends` with `vi.mock` as `settings-screen.dom.test.tsx:21` does, and `next/navigation`'s `useRouter`:

```ts
it("asks for a username before anything else", ...)        // username null: form shown, no invite panel
it("shows the server's error copy when a username is taken", ...)
it("shows search results as a handle only", ...)            // no name text, "@maria" visible
it("hides Requests and Sent when empty", ...)
it("offers Decline all only above five incoming", ...)      // 5 -> absent, 6 -> present
it("confirms before removing a friend", ...)                // removeFriend not called until confirm
it("confirms before resetting the invite link", ...)
```

- [ ] **Step 2: Run** `pnpm vitest run --project dom src/features/friends`. Expected: FAIL.

- [ ] **Step 3: Implement** the page and components with existing primitives (`Panel`, `SectionHeader`, `EmptyState`, `Button`, `Input`, `AlertDialog`, `DropdownMenu`, `AccountDialog`) and Lucide icons. Keep each component under 150 lines.

- [ ] **Step 4: Run** the tests. Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add "src/app/(app)/friends" src/features/friends/components
git commit -m "feat(friends): build the friends screen"
```

---

### Task 7: Invite page `/add/[code]`

**Files:**
- Create: `src/app/(app)/add/[code]/page.tsx`, `src/app/(app)/@sheet/add/[code]/page.tsx` (returns `null`, with the comment style of `src/app/(app)/@sheet/friends/page.tsx`), `src/features/friends/components/invite-screen.tsx`
- Test: `src/features/friends/components/__tests__/invite-screen.dom.test.tsx`

**Interfaces:**
- Consumes: `findInviteOwner`, `getRelationship`, `getUsername` (DAL), `getActiveReadingPlan` (`dal.ts`), actions `sendRequestByInvite`, `cancelRequest`, `acceptRequest`, `UsernameForm` (Task 6).
- Produces: `InviteScreen(props: { owner: FriendProfile | null; relationship: Relationship; viewerHasUsername: boolean; code: string; afterHref: "/friends" | "/onboarding"; inviteUrl: string | null })`.

Page: `export default async function AddFriendPage(props: PageProps<"/add/[code]">)`. It awaits `props.params` (Next 16 passes a Promise; see `src/app/(app)/day/[date]/page.tsx:19-24`), calls `requireUser()`, and **does not redirect to onboarding**. `afterHref` is `/onboarding` when `getActiveReadingPlan` is null, else `/friends`. `metadata.title` is "Add friend". The page reads only; it never sends anything.

States, with exact copy:
- `owner === null`: "This invite link no longer works." / "Ask your friend for a new one."
- `self`: "This is your invite link" plus Copy/Share (reuse the invite panel's buttons).
- `friends`: "You're already friends" with a link to `/friends`.
- `outgoing`: "Request sent" with Cancel.
- `incoming`: button "Accept request" (calls `sendRequestByInvite`, which accepts as a crossed request).
- `none`: owner's photo, name, `@username`, and button "Send friend request".
- `!viewerHasUsername` (any state except `owner === null` and `self`): show `UsernameForm` (submitLabel "Save and send request"); on save, call `sendRequestByInvite` and then navigate.
- After a successful send or accept: `router.push(afterHref)`.

- [ ] **Step 1: Write failing dom tests**

```ts
it("shows the dead-link copy when the owner is null", ...)
it("shows the owner's name, photo and handle with a send button", ...)
it("sends only when the button is tapped", ...)        // render: sendRequestByInvite not called; click: called with { code }
it("lets a reader without a username pick one and send in one step", ...)
it("goes to onboarding after sending when there is no plan", ...)   // afterHref "/onboarding" -> router.push("/onboarding")
it("offers Accept when the owner already asked", ...)
```

- [ ] **Step 2: Run** `pnpm vitest run --project dom src/features/friends/components/__tests__/invite-screen.dom.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement** the page, the sheet slot and `InviteScreen`.

- [ ] **Step 4: Run** the tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/add" "src/app/(app)/@sheet/add" src/features/friends/components
git commit -m "feat(friends): add the invite link page"
```

---

### Task 8: Verify end to end

- [ ] **Step 1: Full suite**: `pnpm verify`. Expected: lint, typecheck and tests in all three time zones pass.
- [ ] **Step 2: Manual run** with `pnpm dev`, using two browsers (or one plus a private window) and two accounts, at 390px width:
  1. A opens Friends, picks `@alice_t`, copies the link.
  2. Signed-out B opens the link, gets `/sign-in?next=/add/<code>`, switches to sign-up, and lands back on the invite with A's name and photo.
  3. B picks a username on the invite page and sends. B lands on `/onboarding`, and A sees the request under Requests with B's name.
  4. A accepts. Both see each other under Friends.
  5. A resets the link. The old link shows the dead-link copy.
  6. B searches `@ALICE_T`: one handle, no name, state "Friends".
  7. A removes B. B's list no longer shows A.
  8. No horizontal scroll at 390px on Friends and on the invite page.
- [ ] **Step 3: Update the spec status** to "implemented" and commit:

```bash
git add docs/superpowers/specs/2026-10-31-friends-connections-design.md
git commit -m "docs(friends): mark connections design as implemented"
```
