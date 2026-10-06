// Server Actions are public POST endpoints: each must check the session before doing
// anything. The commands are mocked here; they are tested against Postgres separately.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, commands, setCookie } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  commands: {
    startPlanFor: vi.fn(),
    changePlanFor: vi.fn(),
    completeReadingFor: vi.fn(),
    undoReadingFor: vi.fn(),
    undoReadingEntryFor: vi.fn(),
    resetProgressFor: vi.fn(),
    syncTimeZoneFor: vi.fn(),
    setAppearanceFor: vi.fn(),
  },
  setCookie: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));
vi.mock("@/features/reading-plan/commands/commands", () => commands);
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setCookie }) }));

import {
  changePlan,
  completeReading,
  resetProgress,
  setAppearance,
  startPlan,
  syncTimeZone,
  undoReading,
  undoReadingEntry,
} from "../reading";

const USER = {
  id: "user-1",
  name: "Reader",
  email: "r@example.test",
  image: null,
};

// Each action, a sample input, and the command it must hand off to.
const cases = [
  ["startPlan", startPlan, { draft: {} }, "startPlanFor"],
  ["changePlan", changePlan, { draft: {}, timeZone: "UTC" }, "changePlanFor"],
  [
    "completeReading",
    completeReading,
    { date: "2026-08-01", chapters: [], timeZone: "UTC" },
    "completeReadingFor",
  ],
  ["undoReading", undoReading, { date: "2026-08-01" }, "undoReadingFor"],
  ["undoReadingEntry", undoReadingEntry, { id: "x" }, "undoReadingEntryFor"],
  ["syncTimeZone", syncTimeZone, { timeZone: "UTC" }, "syncTimeZoneFor"],
  ["setAppearance", setAppearance, { appearance: "dark" }, "setAppearanceFor"],
] as const;

type CommandName = keyof typeof commands;

/** Every action takes one input; the cases mix their types, so call through `unknown`. */
function call(action: unknown, input: unknown): Promise<unknown> {
  return (action as (input: unknown) => Promise<unknown>)(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const command of Object.values(commands)) {
    command.mockResolvedValue({
      ok: true,
      snapshot: { plans: [], activePlan: null, completions: [] },
    });
  }
});

describe("signed out", () => {
  it.each(
    cases,
  )("%s stops at requireUser", async (_name, action, input, command) => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(call(action, input)).rejects.toThrow("NEXT_REDIRECT");
    expect(commands[command as CommandName]).not.toHaveBeenCalled();
  });

  it("resetProgress stops at requireUser", async () => {
    requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(resetProgress()).rejects.toThrow("NEXT_REDIRECT");
    expect(commands.resetProgressFor).not.toHaveBeenCalled();
  });
});

describe("signed in", () => {
  beforeEach(() => {
    requireUser.mockResolvedValue(USER);
  });

  it.each(
    cases,
  )("%s passes the session's user id and the raw input on", async (_name, action, input, command) => {
    await call(action, input);
    expect(commands[command as CommandName]).toHaveBeenCalledWith(
      USER.id,
      input,
    );
  });

  it("syncTimeZone sets this device's cookie only when the zone was accepted", async () => {
    await syncTimeZone({ timeZone: "Asia/Manila" });
    expect(setCookie).toHaveBeenCalledWith(
      "tz",
      "Asia/Manila",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );

    setCookie.mockClear();
    commands.syncTimeZoneFor.mockResolvedValue({
      ok: false,
      error: "invalid-input",
    });
    await syncTimeZone({ timeZone: "Mars/Base" });
    expect(setCookie).not.toHaveBeenCalled();
  });
});
