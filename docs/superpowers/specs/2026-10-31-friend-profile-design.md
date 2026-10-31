# Friends: friend profile (phase 2a)

Date: 2026-10-31
Status: implemented

## Why

The long-term aim of Friends is accountability (see
`2026-10-31-friends-connections-design.md`, "Why"). Phase 1 built the connection only.

Christian's moment: "I want to check if my friend read today and whether they're keeping
up, so I can encourage them if they've missed days."

This phase lets a reader **look**: open a friend's profile and see their reading the same
way they see their own, and spot at a glance on the Friends list who has read today. The
**encouraging** part (a nudge button, an in-app banner, web push) is deliberately split
into later phases, listed under "Follow-ups". Nothing here should make those harder.

## Goals

- Tapping a friend on `/friends` opens **that friend's profile**.
- The profile answers "did they read today, and are they keeping up?" in the first card.
- The profile shows the friend's **month calendar**, the same grid as the reader's own,
  with previous/next month navigation (arrows and swipe).
- Tapping a day on the calendar opens **that day's details**: exactly what the friend
  read, extra readings and verse spans included. View only.
- Below the calendar, the friend's **6-month heatmap** and **day-by-day journal**, as on
  the reader's own `/history`.
- The `/friends` list shows a small **read-today mark** on each friend, so the reader can
  see who is behind without opening every profile.

## Non-goals (this phase)

- The nudge button, the in-app banner, and web push (phases 2b and 2c, below).
- Any way for a reader to hide their reading from friends, or share less with some
  friends than others. Accepted friends see everything (decided, see below).
- Editing anything on a friend's profile: no marking read, no undo, no plan changes.
- Comments, reactions, or messages.
- Profiles of people who are not accepted friends (pending requests, search results,
  invite pages stay exactly as phase 1 defined them).

## Anti-goals

- **Reading data leaking past the friendship.** A friend's readings must only ever be
  served to a reader who is an accepted friend *at the time of the request*. Pending,
  declined, cancelled, removed: nothing. This is checked on the server for every page,
  route and action that returns friend data, never inferred from the client.
- **Confirming that an account exists.** A profile URL for someone who is not your friend
  (or does not exist, or removed you) gets the same plain "not found" in every case.
- **Email ever reaching another reader.** Same rule as phase 1. Profile data is name,
  photo, `@username`, and reading data only.
- **A leaderboard feel.** The read-today mark must not rank or reorder friends. The list
  stays sorted by name. No "most consistent friend", no comparisons between friends, and
  no comparison between the friend and the viewer.
- **Scolding.** Missed days keep the calendar's existing soft neutral treatment
  (`day-appearance.ts:30-33`: "encourage consistency, not scold"). Copy on the profile
  and list follows the same tone: "Hasn't read yet today", not "Missed!" in red.
- **The reader's own reading state getting mixed up with a friend's.** Viewing a friend
  must never touch the reader's own snapshot, its query cache entry, or its writes.

## Decisions made with Christian

1. Three projects, in this order: **(a) friend profile** (this doc), (b) nudge + in-app
   banner, (c) web push. Each gets its own design and PR.
2. **Full detail is shared with accepted friends**: the exact chapters read each day,
   extras and verse spans included, same as the reader's own calendar and history.
   "Friends are mutual and accepted, so that's fine."
3. **Layout B, everything on one page**: header, today card, month calendar, then heatmap
   and journal underneath. (Option A, history on a second screen, was rejected.)
4. **Tapping a calendar day opens that day's details**, view only.
5. Entry is **tapping the friend's row** on `/friends`; the row's "..." menu (Remove)
   stays as it is.
6. **Always the month view** on the profile, never the week strip, on any width.
7. **Only accepted friends** can open a profile; everyone else gets "not found".
8. **"Today" is the friend's day, in the friend's time zone**, so a friend in another
   zone is not shown as behind on a day that has not ended for them.
9. The `/friends` list gets a **read-today mark** next to each friend.
10. **No notice for existing friendships.** Friends accepted under phase 1 ("nothing is
    shared") can see each other's full reading as soon as this ships, with no one-time
    announcement or opt-in.

## The profile screen

Route: `/friends/[username]`. (*My call:* username rather than user id, since it is what
the reader already sees and what the rest of Friends uses. A friend who changes their
username breaks old links to their profile, which just show "not found"; the list always
links to the current one.)

Top to bottom, single column (*my call:* `max-w-2xl`, like `/history`; desktop is the
same column, centred):

1. **Back link** "Friends" to `/friends`, styled like the day page's back link
   (`src/app/(app)/day/[date]/page.tsx`).
2. **Header**: avatar (the existing `Avatar` from `features/friends/components`), name as
   the page heading, `@username` under it.
3. **Today card**: the at-a-glance answer.
   - Read today: "Read today" with what they read (formatted as the reader's own today
     card and journal format references, e.g. "Luke 5" or "Luke 5 · Psalm 23").
   - Not yet: "Hasn't read yet today".
   - Under it, how they are keeping up: missed scheduled days in a row before today
     (only when 1 or more, e.g. "Missed the last 2 days"), current streak and longest
     streak. *My call on exact copy;* keep it short and kind.
   - "Missed the last N days" counts consecutive *scheduled* days before today that have
     no reading, using the same rules as `features/progress/domain/streak.ts` (today
     never counts as missed while it is still pending).
4. **Month calendar card**: the reader's own month view, view only: the month navigator
   (title, previous/next, return to this month), the month summary (headline and progress
   ring, `month-summary.tsx`), the weekday header and the swipeable month pager. No "Month
   view" toggle and no "See your reading history" link (history is already on the page).
   Navigation is unbounded in both directions, as on the reader's own calendar.
5. **Heatmap card**: the 6-month heatmap and legend, as on `/history`. Picking a square or
   a month scrolls the journal to it, as on `/history`.
6. **Journal**: the day-by-day journal, as on `/history`, with "show earlier weeks".
   *My call:* a journal row opens that day's details too, the same as tapping the
   calendar, since that is what a journal row does on the reader's own history. Note
   `journal-entry.tsx:69` and `:93` hard-code `/day/${entry.date}`; on the profile they
   must open the friend's day instead, never the viewer's own.

### Day details (view only)

Tapping a calendar day (or a journal row) opens that day for the friend:

- As a **sheet over the profile**, the same presentation as the reader's own day sheet
  (`day-sheet.tsx`: from the bottom on a phone, from the right on wider screens), and the
  **browser back button closes it**.
- A direct load or refresh of the day's URL shows the day on its own page with a back
  link to the friend's profile, like `/day/[date]` does for the reader's own days.
- Shows: the overline and date title, what was scheduled for the plan that day, what was
  recorded (chapters with verse spans), and extra readings. The same information the
  reader's own day detail shows about a day.
- Shows **no controls**: no "Reading plan / Custom" tabs, no mark read, undo, verse
  pickers, "count toward plan", or extra-reading dialogs.
- A future day shows what is scheduled, like the reader's own future days.
- An invalid date shows the same "not found" handling the reader's own day page uses.

### Empty and edge states

- **Friend has no active plan** (they reset their progress): the header, plus an empty
  state such as "@maria hasn't started a reading plan yet." Earlier readings, if any
  remain, are not shown (a reset deletes them anyway, `resetAllProgress`).
- **Friend has a plan but has never read**: the calendar and empty heatmap/journal render
  as they do for a new reader of their own.
- **Viewer opens their own username**: redirect to `/` (*my call*).
- **Viewer has no active plan of their own**: redirect to `/onboarding`, as `/friends`
  and every other app page does (*my call*, for consistency).
- **Not a friend, unknown username, or friendship removed**: Next.js `notFound()`. Same
  response in every case.
- **Friendship removed while the profile is open**: the next fetch of friend data fails
  with not found; the screen shows the not-found state rather than stale data (*my call;*
  reloading the page gives the same result).
- **Loading and errors**: the page is server-rendered with the friend's data, so first
  paint has content. Background refresh failures keep the last data on screen (*my call*).

### Freshness

The friend's data is loaded on the server for the first render. *My call:* when the
window regains focus it is refreshed, mirroring the reader's own snapshot (which
refetches on focus, `reading-data-provider.tsx`), so checking in on a friend later in the
day shows their latest reading without a manual reload. The refresh goes through a GET
route or the page's own data, never through a Server Action (those are for writes, per
`src/app/api/reading/snapshot/route.ts`). If a route is added, it lives under `/api`,
which the proxy skips, so it checks the session and the friendship itself and answers
401/404 with no body detail.

## The read-today mark on `/friends`

- Each friend row on the Friends list shows whether that friend has read today **in the
  friend's own time zone** (decision 8).
- *My call on the look:* a small check icon (Lucide `Check` or `CircleCheck`, primary
  colour) with the text "Read today" in the footnote line, next to or in place of nothing
  when they have not. When they have not read yet, show muted "Not yet today". A friend
  with no active plan shows nothing extra. The `@username` line stays.
- It must be readable by screen readers as text, not colour alone.
- **Order does not change**: still sorted by name (anti-goal: leaderboard).
- Tapping the row (anywhere except the "..." button) opens the profile. The row becomes a
  link; the "..." button keeps working without opening the profile.
- The status is computed on the server when `/friends` renders. It does not need to live
  update while the list is open (*my call*).
- Computing it must not load every friend's full snapshot: friends are capped at 500
  (`MAX_FRIENDS`). Something like "each friend's today date from their time zone, then one
  query for completions on those (user, date) pairs" is the expected shape; exact query is
  the builder's call.

## Time zones

- "Today" for a friend is computed from the friend's **stored time zone** (the
  `time_zone` app setting, `getTimeZone` in `src/lib/dal.ts`), falling back to UTC when
  they have none. This is the account-wide zone their devices last reported; it can lag
  if they travel, which is acceptable.
- The viewer's own time zone plays no part in a friend's statuses.
- The month the profile opens on is the month containing the friend's today.

## Constraints

- Next.js 16.3 App Router with breaking changes from older versions. Read the relevant
  guide in `node_modules/next/dist/docs/` before writing routes, intercepting routes or
  parallel route slots (`AGENTS.md`).
- Reuse the existing calendar, heatmap, journal and day detail pieces rather than forking
  them. Today they all read the signed-in reader's data from `useReadingData()`
  (`reading-data-provider.tsx`), which also carries writes, the reader's query cache entry
  and onboarding redirects. A friend's view needs the same derived values (plans,
  completions, lookups, schedule contexts, today) from the friend's snapshot, and none of
  the writes.
- Server-side data access goes through the DAL (`src/lib/dal.ts`, `src/lib/friends-dal.ts`),
  with the friendship check next to the read so it cannot be skipped.
- No new packages. No schema changes are expected (all data already exists).
- Follow the existing test layout: `*.test.ts` for domain, `*.db.test.ts` for DAL and
  routes against the test database, `*.dom.test.tsx` for components.
- Mobile first; check the profile and the list at phone width.
- The existing Friends tab highlight already covers `/friends/*`
  (`src/components/app-nav/nav-items.ts:39`).

## Testing expectations

- DAL / route: an accepted friend gets the snapshot; pending (either direction),
  no relationship, removed, unknown username, and self all get the documented result;
  the response never contains email.
- Read-today status: friends in different time zones around midnight get their own day;
  a friend with no plan; a friend with only an extra reading today counts as read (extras
  count toward the day, as on the reader's own calendar and streak).
- Today card: "missed the last N days" across a plan change and across a day with only
  an extra reading.
- Day details: view only (no recording controls render), extras and verse spans shown.
- Friends list: rows link to profiles; "..." still opens the menu without navigating; the
  mark has text for screen readers; order is unchanged.

## Left to the builder

- How the derivation hooks get friend data: for example, a narrow read-only "reading
  view" context that both the reader's provider and a new friend provider supply, so the
  calendar, heatmap, journal and day-detail hooks work unchanged on either. Whatever the
  approach, the reader's own provider keeps its behaviour and tests.
- How the day sheet is routed for a friend (an intercepting route in the existing
  `@sheet` slot, or a URL-flag sheet like the Add friends sheet, `use-url-flag.ts`), as
  long as it meets "Day details" above.
- The view-only day detail component: a trimmed variant of `DayDetail` or a new component
  built from `recorded-block.tsx`, `extra-readings-block.tsx` and `reference-block.tsx`.
- The exact query for read-today statuses.
- Exact copy, within the tone above.

## Follow-ups (not this phase)

- **2b. Nudge + in-app banner.** A nudge button on the friend profile; the friend sees a
  banner the next time they open the app. Needs a table for nudges and rate limiting
  (anti-spam). The profile's today card is the natural place for the button.
- **2c. Web push.** Nudges also arrive as phone notifications. Needs a service worker
  (the app has none on purpose today, `src/app/manifest.ts:5`), VAPID keys, a push
  subscription table, a permission prompt, and a sending library (the bundled Next.js
  PWA guide uses [`web-push`](https://www.npmjs.com/package/web-push), a new package that
  needs approval). On iPhone, push only works once the app is added to the home screen
  (iOS 16.4+); others still get the in-app banner.
- Update the phase 1 spec's "Visibility before accepting" table to add a row for what
  accepted friends now see.
