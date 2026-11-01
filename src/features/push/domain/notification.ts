import { cheeringNames } from "@/features/friends/domain/nudge";

import type { CheerNotification } from "./types";

export const CHEERS_TAG = "cheers";

/**
 * The push notification for unseen cheers, worded exactly like the Today banner
 * ("Maria and Ben are cheering you on"). Returns null when there is no sender.
 */
export const cheerNotification = (
  senders: readonly { name: string; username: string }[],
): CheerNotification | null => {
  if (senders.length === 0) return null;
  const { names, others } = cheeringNames(senders);
  const joined = others
    ? `${names.join(", ")} and others`
    : names.join(" and ");
  const verb = names.length > 1 || others ? "are" : "is";
  return {
    title: `${joined} ${verb} cheering you on`,
    tag: CHEERS_TAG,
    renotify: true,
    icon: "/icons/icon-192.png",
    data: { url: "/" },
  };
};
