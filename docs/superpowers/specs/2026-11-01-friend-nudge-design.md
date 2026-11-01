# Friends: nudge and in-app banner (phase 2b)

Date: 2026-11-01
Status: implemented

## Why

The long-term aim of Friends is accountability (`2026-10-31-friends-connections-design.md`,
"Why"). Phase 2a (`2026-10-31-friend-profile-design.md`) let a reader **look** at a
friend's reading. Christian's moment from 2a was: "I want to check if my friend read today
and whether they're keeping up, so I can **encourage them** if they've missed days."

This phase is the encouraging part: a reader can cheer a friend on from the friend's
profile, and the friend sees a warm banner the next time they open Today. Web push (2c) is
a separate follow-up; nothing here should make it harder.

## Goals

- On a friend's profile, a **"Cheer Maria on"** button on the today card, shown only while
  the friend has not read today.
- **One nudge per friend per day.** After nudging, the button is replaced by a quiet
  confirmation for the rest of that day.
- The friend sees **"Maria is cheering you on"** at the top of their Today's reading card,
  with the sender's photo and a dismiss button, right above "Mark as Read".
- The banner **stays until the friend reads or dismisses it**, across days.
- Several senders collapse into **one row** ("Maria and Ben are cheering you on").

## Non-goals (this phase)

- Web push or any notification outside the app (2c).
- Replies, reactions, messages, or a custom note with the nudge.
- Telling the sender whether or when the friend saw or dismissed the nudge.
- A history or count of nudges anywhere in the UI.
- Nudging anyone who is not an accepted friend.
- Live updates of the banner while Today is open (it refreshes on load and focus).

## Anti-goals

- **Guilt or scolding.** The banner and button never mention missed days, never use red or
  warning styling, and never show counts ("3 friends nudged you"). The friend profile's
  existing "Missed the last 2 days" detail line stays as it is (2a), but the nudge copy
  never repeats it. Tone is "someone is cheering for you", nothing more.
- **Spam.** One nudge per sender, per receiver, per receiver's day, enforced on the server.
  A tampered client gets the same result as a second tap: no second nudge.
- **A leaderboard feel.** No "most nudged", no ranking of friends by nudges, no counts
  shown to either side (2a anti-goal, still applies).
- **Nudges leaking past the friendship.** Nudging checks the friendship on the server at
  the time of the request. A banner never names someone who is no longer an accepted
  friend. Removing a friend deletes the nudges between the two.
- **Confirming that an account exists.** A nudge to a non-friend, unknown user or removed
  friend gets the same "not found" result in every case, as 2a's profile does.
- **Email ever reaching another reader.** The banner shows name and photo only.
- **Mixing the viewer's and friend's reading state.** Sending a nudge never touches the
  sender's own snapshot or query cache entry (2a anti-goal).

## Decisions made with Christian

1. **Banner placement: option C**, a tinted row at the top of the Today's reading card
   (`today-reading-card.tsx`), so the nudge sits right next to "Mark as Read". Not a
   separate card above the calendar, not a slim strip under the heading.
2. **The card stays where it is**: below the calendar on phones. In month view the row may
   sit just below the fold on a small phone; scrolling to it is fine.
3. **Banner copy**: "Maria is cheering you on", warm and not guilt-trippy. Dismissable
   with an X; it goes away once the friend reads.
4. **Button: option A**, full-width primary button on the friend profile's today card,
   label **"Cheer Maria on"** (the friend's name), echoing the banner's words.
5. **After nudging**: the button becomes a quiet grey row, "✓ You cheered Maria on today",
   for the rest of that day.
6. **Hide the button once the friend has read today.** The card then shows only "Read
   today: Luke 6" and the streak line, as in 2a.
7. **One nudge per friend per day.**
8. **A nudge persists across days**: sent at 11pm, still shown the next morning, until the
   friend reads or dismisses it.
9. **Several senders are one row**: "Maria and Ben are cheering you on".

## Sending: the friend profile's today card

`src/features/friends/components/friend-profile/friend-today-card.tsx` today renders the
headline and detail from `describeFriendToday` (`friend-today.ts:69-92`). Under the detail
line it gains one of three things:

| Friend's state today | What shows under the detail line |
| --- | --- |
| Has read today (`todayPassages !== null`) | Nothing (decision 6) |
| Not read, viewer has not nudged them today | Primary full-width button: heart icon (*my call:* Lucide `HandHeart` or `Heart`) + "Cheer {first name} on" |
| Not read, viewer already nudged them today | Muted row on the `secondary` surface: check icon + "You cheered {first name} on today" |

- **"Today" is the friend's day**, in the friend's stored time zone, exactly as the rest of
  the profile (2a decision 8; `getFriendReading` in `src/lib/friends-dal.ts:491`). The
  daily limit resets at the friend's midnight, not the sender's.
- *My call:* "first name" is the first word of the friend's display name, falling back to
  `@username` when the name is blank. Long names truncate on one line.
- A friend with no active plan already shows the 2a empty state, so there is no card and no
  button.
- **Pressing the button**: it switches to the "You cheered..." row immediately
  (optimistic), and sends the nudge through a Server Action (writes go through actions, as
  `src/actions/friends.ts` does). *My call:* the button is disabled while the request is in
  flight so a double tap sends one request.
- **If the action fails**:
  - Network or unexpected error: revert to the button and show the existing inline error
    pattern Friends already uses (`friendsErrorMessage`), e.g. "Couldn't send. Try again."
  - "Already nudged today" (another tab, another device): keep the "You cheered..." row.
    No error shown, since the outcome is what the reader wanted.
  - "Friend has read today" (the profile was stale): refetch the friend's reading so the
    card switches to "Read today: ...". No error shown.
  - "Not found" (friendship removed): the profile shows its not-found state, as 2a does
    when a refresh returns 404.
- **Where "already nudged today" comes from**: the server, not the browser. *My call:* the
  friend reading payload (`getFriendReading` and `GET /api/friends/[username]/reading`)
  gains a `nudgedToday: boolean` for the viewer, so a reload or another device shows the
  right state. The focus refetch from 2a keeps it current.

## Receiving: the row on the Today's reading card

On `/` (`ProgressScreen`, `src/features/progress/components/progress-screen.tsx`), the
Today's reading card (`TodayReadingCard`) gets a tinted row across its top edge:

- Background `primary-soft`, sender avatar(s) (the existing `Avatar`,
  `src/features/friends/components/avatar.tsx`), the text, and an X button on the right.
  The rest of the card is unchanged below it. The row is part of the card, not a separate
  panel.
- **Copy** (*my call* on 3+):
  - One sender: "**Maria** is cheering you on"
  - Two: "**Maria** and **Ben** are cheering you on"
  - Three or more: "**Maria**, **Ben** and others are cheering you on" (no number, per
    the "no counts" anti-goal)
  - Names are display names (first word, same rule as the button). *My call:* ordered by
    most recent nudge first; each sender appears once even if they nudged on several days.
  - Avatars: up to two, overlapping (*my call*).
- **The X** dismisses every nudge currently in the row, at once. It has an accessible name
  ("Dismiss"). The row disappears immediately (optimistic); a failed dismiss brings it
  back on the next refresh, with no error shown (*my call*: low stakes).
- **Shown on every variant of the card** (*my call*): scheduled, "Nothing scheduled",
  "Your plan starts soon", and "You have finished the Bible", since a reader can still
  record a custom or extra reading on those days. **Not shown** once any reading exists
  for today, extras included: `completionLookup.has(today)` from the reader's full view
  (`progress-screen.tsx`). That matches the server's closing rule below, and also covers
  a part-read chapter showing "Continue Reading" and a custom reading on a non-scheduled
  day, not only the "Completed today" state.
- Not the Today card's day status (`todayReading.status`): `useTodayReading` reads the
  plan's view (`planScheduleContext`, `use-today-reading.ts`), which an extra reading
  does not complete, so a reader who logged only an extra would keep seeing the row until
  the next refetch. Review on #35 (Codex).
- Screen readers read the row as text; the avatars are decorative (as `Avatar` already is).
- Mobile first; check at phone width with the week strip and the month view.

### When a nudge is open

A nudge is **open** (shown in the row) when all of these hold:

1. It has not been dismissed.
2. The receiver has **not recorded any reading** (plan or extra, the same rule that makes
   a day count on the calendar and streak) **on the nudge's day or any later day**. The
   nudge's day is the receiver's local day when it was sent.
3. The sender and receiver are still accepted friends.

Consequences, all intended:

- Sent at 11pm, not opened until morning: still open (decision 8). It stays open after a
  week away too; there is no expiry.
- Reading today closes every open nudge, including ones from earlier days.
- *My call:* undoing today's only reading reopens nudges whose day is today or earlier, if
  condition 2 is computed rather than stored. That is acceptable either way; the builder
  may store a "closed" marker instead if simpler, as long as the rules above hold for the
  normal flow.
- A new nudge after a dismissal shows the row again, with only the new sender(s).
- Known edge, accepted: the nudge's day uses the receiver's **stored** account time zone
  (as `getFriendReading` does), while each device computes its own "today" from its own
  zone (`src/lib/reader-time-zone.ts`). A receiver travelling, or with devices in
  different zones, could see the row return after reading on a device whose day is behind
  the stored zone. Not worth extra machinery in this phase.

### Freshness

- Open nudges for the reader are loaded on the server with Today's first render, so first
  paint already has the row.
- *My call:* they refresh when the window regains focus, like the reader's snapshot
  (`reading-data-provider.tsx:150`), through a GET route under `/api` (the proxy skips
  `/api`, so the route checks the session itself and answers 401 with no detail).
- Marking today as read hides the row immediately in the browser (it is derived from the
  reader's local completions, `completionLookup.has(today)`, which are already
  optimistic), without waiting for a refetch.

## Server rules

- **Send** (Server Action, session checked, input parsed with Zod like
  `src/features/friends/commands/inputs.ts`):
  1. Target must be an accepted friend now (`getRelationship`, `friends-dal.ts:345`).
     Otherwise "not-found", same result for stranger, pending, removed and unknown.
     Nudging yourself is "not-found" too (*my call*: no separate "self" leak needed here).
  2. Compute the receiver's today from their stored time zone (UTC fallback), as
     `getFriendReading` does.
  3. If the receiver has any reading on that day: refuse with "already-read".
  4. If this sender already nudged this receiver on that day: refuse with
     "already-nudged". This must hold under concurrency (two tabs tapping at once): a
     unique constraint on (sender, receiver, receiver's day) is the expected shape.
  5. Otherwise store the nudge.
- **Dismiss**: marks every open nudge for the signed-in reader as dismissed. Only ever
  touches nudges where the reader is the receiver.
- **Read open nudges**: for the signed-in reader only, returns sender name, image and
  username for open nudges from current accepted friends. Never email.
- **Remove friend** (`removeFriend`, `friends-dal.ts:320`) also deletes nudges in both
  directions between the pair, in the same transaction or by cascade. Declining or
  cancelling requests needs nothing (no nudges exist without an accepted friendship).
  Deleting a user cascades their nudges.
- Error codes join the existing `FriendsErrorCode` union
  (`src/features/friends/commands/results.ts`) with plain copy, so a Server Action never
  sends a raw error to the browser.

## Data

A new table is needed (2a expected no schema changes; this phase adds one). *My call on
the shape*, the builder may adjust names:

- `friend_nudge`: `id` (uuid), `sender_id`, `receiver_id` (both FK to `user`, cascade on
  delete), `local_date` (`date`, the receiver's day when sent), `created_at`
  (`timestamptz(3)`), `dismissed_at` (`timestamptz(3)`, nullable).
- Unique on (`sender_id`, `receiver_id`, `local_date`): the daily limit.
- Index on (`receiver_id`, `dismissed_at`) or similar for "my open nudges".
- Optionally a FK to `friendship` with cascade, so removing a friend deletes the nudges
  without extra code. Builder's call between that and an explicit delete in `removeFriend`.
- snake_case columns and `@@map`, as the rest of `prisma/schema.prisma`. A new migration
  under `prisma/migrations/`.

## Constraints

- Next.js 16.3 App Router with breaking changes: read the relevant guide in
  `node_modules/next/dist/docs/` before writing routes or actions (`AGENTS.md`).
- No new packages.
- Server-side data access goes through the DAL (`src/lib/friends-dal.ts`), with the
  friendship check next to the read or write so it cannot be skipped.
- Server Actions for writes, GET routes for refreshes, as in 2a.
- The reader's own `ReadingDataProvider` keeps its behaviour and tests; the nudge row is
  added data, not a change to how the snapshot loads or writes.
- Follow the test layout: `*.test.ts` for domain, `*.db.test.ts` for DAL, actions and
  routes against the test database, `*.dom.test.tsx` for components.
- 2c (web push) will want to send a push when a nudge is stored. Keep "store a nudge" one
  function so 2c can hook in after it.

## Testing expectations

- **Send**: accepted friend succeeds; pending (either direction), stranger, removed,
  unknown and self all give "not-found"; second nudge the same receiver-day gives
  "already-nudged" (including two concurrent sends); a friend who read today (plan reading
  or only an extra) gives "already-read"; the limit follows the receiver's time zone around
  their midnight, not the sender's.
- **Open nudges**: nudge from yesterday with no reading since is open; any reading on or
  after the nudge's day closes it; dismissed nudges are not returned; nudges from a
  removed friend are gone; email never appears in the result.
- **Remove friend** deletes nudges both ways.
- **Friend reading payload** has `nudgedToday` true only for the viewer who nudged, on the
  friend's current day.
- **Today card (friend profile)**: button shows when not read and not nudged; hidden when
  read; "You cheered..." after sending and on reload; failure reverts with an error;
  "already-nudged" and "already-read" results do not show an error.
- **Today's reading card (receiver)**: row copy for one, two and three or more senders;
  X dismisses and hides it; hidden on "Completed today"; shown on the non-scheduled
  variants; marking read hides it without a refetch; accessible name on the X.

## Left to the builder

- Whether "closed by reading" is computed at read time or stored.
- Exact table and column names, the index shape, and FK-to-friendship versus explicit
  delete in `removeFriend`.
- How open nudges reach `ProgressScreen` (page props from `src/app/(app)/page.tsx`, a
  small query hook with its own key, or both) and how `TodayReadingCard` receives them
  (a prop or a slot), keeping the card testable on its own.
- How the friend profile learns `nudgedToday` (extending `FriendReading` is suggested,
  not required).
- Icon choice and exact copy within the tone above.

## Follow-ups (not this phase)

- **2c. Web push**, as described in the 2a spec's follow-ups: service worker, VAPID keys,
  subscription table, permission prompt, sending library (needs package approval). It hooks
  in after a nudge is stored.
- Update the phase 1 spec's "Visibility before accepting" table (still open from 2a).
