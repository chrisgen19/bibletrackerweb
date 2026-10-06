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
pnpm db:up            # Postgres 18 on localhost:5434
pnpm db:deploy        # apply migrations to the dev database
pnpm dev
```

The database listens on **5434** so it does not clash with a native Postgres on 5432.
The dev database is `bibletrackerweb`; tests use their own `bibletrackerweb_test`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm verify` | Lint + type-check + tests in three timezones. Needs `pnpm db:up`. Run before every commit. |
| `pnpm lint` / `pnpm lint:fix` | Biome check (and apply safe fixes) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest, unit and database tests |
| `pnpm test:unit` | Unit tests only, no database needed |
| `pnpm test:tz` | Every test under UTC, Asia/Manila and America/Los_Angeles |
| `pnpm db:up` / `pnpm db:down` | Start or stop the local Postgres container |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:deploy` | Apply pending migrations (CI / production) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Prisma Studio |

## Testing

Two Vitest projects:

- **unit**: pure logic, including the domain suites ported unedited from bibletrackerapp.
- **db** (`*.db.test.ts`): the data layer against real Postgres. The test database is the
  dev database's name plus `_test`, created and migrated with `prisma migrate deploy`
  automatically. Setup refuses any database whose name does not end in `_test`, and every
  test makes its own reader, so files run in parallel without clearing tables between
  tests. Set `TEST_DATABASE_URL` to point it elsewhere (CI).

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
