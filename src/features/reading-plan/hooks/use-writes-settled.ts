"use client";

import { useIsMutating } from "@tanstack/react-query";

import { READING_WRITE_KEY } from "./reading-writes";

/**
 * True once no reading write is waiting for the server.
 *
 * On iOS a write is done the moment it is made. Here, navigating on the optimistic state
 * alone can reach a server render that has not seen the write yet: starting a plan and
 * going home before it is stored would bounce straight back to onboarding. Screens that
 * navigate because of a write wait for this first.
 */
export function useWritesSettled(): boolean {
  return useIsMutating({ mutationKey: READING_WRITE_KEY }) === 0;
}
