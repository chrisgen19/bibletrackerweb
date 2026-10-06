import { afterAll } from "vitest";

import { db } from "@/lib/db";

// Close the pool so the worker can exit once its file is done.
afterAll(async () => {
  await db.$disconnect();
});
