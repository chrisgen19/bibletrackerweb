# Bible Daily (web)

A daily Bible reading tracker for desktop and mobile browsers. One chapter a day,
tracked on a monthly calendar.

This is the web counterpart of [bibletrackerapp](https://github.com/chrisgen19/bibletrackerapp)
(iOS). How a reading is recorded must behave exactly the same as the iOS app: the
domain layer is ported verbatim and its test suites run unchanged. The build plan
and phase checklist live in [issue #1](https://github.com/chrisgen19/bibletrackerweb/issues/1).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4, shadcn/ui (Radix) |
| Data | PostgreSQL, Prisma 7 with the `pg` driver adapter |
| Auth | Better Auth (email + password, Google) |
| Lint / format | Biome |
| Tests | Vitest |

## Running locally

Requires Node 22.13+ or 24 (recommended), pnpm 11, and Docker. 22.13 is the floor
because pnpm 11 needs it; Vitest 5 does not support Node 25.

```bash
pnpm install          # also runs `prisma generate`
cp .env.example .env  # local defaults match compose.yaml
# then replace BETTER_AUTH_SECRET in .env with the output of: openssl rand -base64 32
pnpm db:up            # Postgres 18 on localhost:5434
pnpm db:deploy        # apply migrations to the dev database
pnpm dev              # http://localhost:3100
```

The database listens on **5434** so it does not clash with a native Postgres on 5432.
The dev database is `bibletrackerweb`; tests use their own `bibletrackerweb_test`.
The app runs on **3100**: Google's OAuth redirect URI has to name a fixed port.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3100 |
| `pnpm verify` | Lint + type-check + tests in three timezones. Needs `pnpm db:up`. Run before every commit. |
| `pnpm lint` / `pnpm lint:fix` | Biome check (and apply safe fixes) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest: unit, component and database tests |
| `pnpm test:unit` | Unit tests only, no database needed |
| `pnpm test:tz` | Every test under UTC, Asia/Manila and America/Los_Angeles |
| `pnpm db:up` / `pnpm db:down` | Start or stop the local Postgres container |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:deploy` | Apply pending migrations (CI / production) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Prisma Studio |

## Testing

Three Vitest projects:

- **unit**: pure logic, including the domain suites ported unedited from bibletrackerapp.
- **dom** (`*.dom.test.tsx`): components in jsdom with React Testing Library.
  bibletrackerapp's component tests (day detail, today card, calendar, month pager) are
  ported here nearly line for line; the components carry the iOS testIDs as
  `data-testid`. `next/navigation` and `next/link` are mocked in `src/test/dom-setup.ts`.
- **db** (`*.db.test.ts`): the data layer against real Postgres. The test database is the
  dev database's name plus `_test`, created and migrated with `prisma migrate deploy`
  automatically. Setup refuses any database whose name does not end in `_test`, and every
  test makes its own reader, so files run in parallel without clearing tables between
  tests. Set `TEST_DATABASE_URL` to point it elsewhere (CI).

## Authentication

[Better Auth](https://www.better-auth.com) with email + password, and Google when it is
configured. Config lives in `src/lib/auth.ts`; every endpoint is served by
`src/app/api/auth/[...all]/route.ts`.

- `src/proxy.ts` sends visitors without a session cookie to `/sign-in`. It only checks
  that a cookie exists, so every protected page, layout and Server Action calls
  `requireUser()` (`src/lib/session.ts`), which validates the session.
- There is no email provider yet: addresses are not verified and there is no password
  reset by email. Google accounts are unaffected.
- `BETTER_AUTH_SECRET` must be at least 32 characters. The `.env.example` placeholder
  works locally and is refused in production.

### Google sign-in (optional)

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty and the Google button is
hidden. To turn it on:

1. In Google Cloud Console, open **APIs & Services > Credentials** and create an
   **OAuth client ID** of type **Web application**.
2. Add the authorised redirect URI `http://localhost:3100/api/auth/callback/google`
   (and the production one, `https://<your-domain>/api/auth/callback/google`, later).
3. Put the client ID and secret in `.env`, and restart `pnpm dev`.

**Preview deployments:** Better Auth rejects sign-in requests from any origin other
than `BETTER_AUTH_URL` (`403 INVALID_ORIGIN`), so neither email + password nor Google
works on Vercel preview URLs yet. Phase 6 adds this project's own preview hosts to
`baseURL.allowedHosts`; never allow all of `*.vercel.app`, which would trust every
Vercel deployment on the internet.

## Reading data

The reading logic is bibletrackerapp's, unchanged; the web adds a server round trip.

- **Writes** are Server Actions in `src/actions/reading.ts`. Each checks the session and
  hands off to `src/features/reading-plan/commands/commands.ts`, which validates the input
  (no future days, real chapters, verse spans within the chapter), writes through the DAL
  and returns the whole snapshot, as the iOS provider re-read it after every write.
- **The screen updates first.** `ReadingDataProvider` (TanStack Query) applies the same
  change locally (`commands/optimistic.ts`), then replaces it with the server's snapshot. A
  contract test runs identical writes through both and requires the results to match.
  New readings carry client-generated ids, so undoing one before the server answers
  removes the right row.
- **Offline**, a write waits instead of failing: TanStack Query pauses it and Next.js
  replays the Server Action when the connection returns, so it stays on screen until it is
  stored. When the server refuses a write, the screen is rebuilt from the server's last
  snapshot with any writes still waiting applied on top, and the reason is shown.
- **Other devices**: the snapshot is refetched (`GET /api/reading/snapshot`) whenever the
  tab regains focus, unless a write is still pending.
- **"Today" belongs to the device**, as on iOS. The server renders with the device's `tz`
  cookie (then the stored zone, then UTC); the browser corrects it after loading, re-checks
  on focus and at local midnight, and tells the server when its zone changes.

## Screens

The screens are bibletrackerapp's, with its copy, on the same design tokens.

- **Theme**: the iOS palette, type ramp and radii live in `src/app/globals.css` as CSS
  variables. Appearance (system, light, dark) is stored per account and in an
  `appearance` cookie per device; the root layout renders it onto `<html>`, and "system"
  follows the device through a media query, so the first paint is right without a script.
  Use `cn` from `@/lib/utils`, which knows the custom text sizes.
- **Day sheet**: opening a day from inside the app is an intercepted route
  (`src/app/(app)/@sheet/(.)day/[date]`) shown as a sheet, from the bottom on a phone and
  the right from 768px. Loading `/day/<date>` directly renders it as a page.
- **Navigating after a write** waits for the server's answer (`useWritesSettled`):
  starting a plan, resetting progress and the redirects to onboarding. The server renders
  the next page, so it must already have the write.

## Database

- The schema is ported from bibletrackerapp's `src/db/schema.ts`, with every reading row
  scoped to a user (Better Auth's `user` table).
- CHECK constraints are hand-written at the end of the `init` migration because Prisma
  cannot express them; Prisma leaves them alone when diffing.
- The "one open plan per user" index uses Prisma's `partialIndexes` preview feature, so
  Prisma manages it instead of dropping it as unknown.
- `prisma migrate reset` deletes all data. Only ever run it against a local database.

## Project rules

- All database access goes through `src/lib/dal.ts`. `src/lib/db.ts` (the Prisma
  client) is imported by the DAL only.
- Server Actions live in `src/actions/`.
- Environment variables are read through `src/lib/env.ts` (validated with Zod), never
  `process.env` in feature code.
- The Prisma config is `prisma7.config.ts`, the default name for Prisma 7.10+.

## License

[MIT](LICENSE)
