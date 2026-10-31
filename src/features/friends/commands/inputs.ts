import { z } from "zod";

import { usernameSchema } from "@/features/friends/domain/username";

/**
 * What the browser may send to the friends Server Actions.
 *
 * Shared by both sides: the client builds these, and the server parses them again,
 * because a Server Action is a public endpoint whatever the TypeScript types say.
 */

export const setUsernameInput = z.object({ username: usernameSchema });

/** Raw text: the command normalises it, and a malformed query just finds nobody. */
export const searchInput = z.object({ query: z.string() });

// Not checked further: an id that matches no reader is refused as not-found.
export const targetInput = z.object({ userId: z.string().min(1).max(64) });

export const inviteInput = z.object({ code: z.string().max(64) });

export type SetUsernameInput = z.input<typeof setUsernameInput>;
export type SearchInput = z.input<typeof searchInput>;
export type TargetInput = z.input<typeof targetInput>;
export type InviteInput = z.input<typeof inviteInput>;
