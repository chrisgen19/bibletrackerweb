"use server";

import { cookies } from "next/headers";

import * as commands from "@/features/reading-plan/commands/commands";
import type {
  ChangePlanInput,
  CompleteReadingInput,
  SetAppearanceInput,
  StartPlanInput,
  SyncTimeZoneInput,
  UndoReadingEntryInput,
  UndoReadingInput,
} from "@/features/reading-plan/commands/inputs";
import type {
  ReadingResult,
  SettingResult,
} from "@/features/reading-plan/commands/results";
import {
  TIME_ZONE_COOKIE,
  TIME_ZONE_COOKIE_MAX_AGE,
} from "@/lib/reader-time-zone";
import { requireUser } from "@/lib/session";

// Server Actions are public POST endpoints: each one checks the session itself, and the
// commands parse their input again. The logic lives in
// src/features/reading-plan/commands/commands.ts, which is tested without a request.

export async function startPlan(input: StartPlanInput): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.startPlanFor(user.id, input);
}

export async function changePlan(
  input: ChangePlanInput,
): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.changePlanFor(user.id, input);
}

export async function completeReading(
  input: CompleteReadingInput,
): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.completeReadingFor(user.id, input);
}

export async function undoReading(
  input: UndoReadingInput,
): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.undoReadingFor(user.id, input);
}

export async function undoReadingEntry(
  input: UndoReadingEntryInput,
): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.undoReadingEntryFor(user.id, input);
}

export async function resetProgress(): Promise<ReadingResult> {
  const user = await requireUser();
  return commands.resetProgressFor(user.id);
}

/** Stores the browser's zone and sets this device's cookie for server rendering. */
export async function syncTimeZone(
  input: SyncTimeZoneInput,
): Promise<SettingResult> {
  const user = await requireUser();
  const result = await commands.syncTimeZoneFor(user.id, input);
  if (result.ok) {
    (await cookies()).set(TIME_ZONE_COOKIE, input.timeZone, {
      path: "/",
      maxAge: TIME_ZONE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return result;
}

export async function setAppearance(
  input: SetAppearanceInput,
): Promise<SettingResult> {
  const user = await requireUser();
  return commands.setAppearanceFor(user.id, input);
}
