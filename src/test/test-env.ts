import { getTestDatabaseUrl } from "./test-database-url";

// First setup file of every test project: point DATABASE_URL at <name>_test before any
// test imports `src/lib/env.ts` or the Prisma client, so nothing under test can reach the
// dev database.
process.env.DATABASE_URL = getTestDatabaseUrl();
