"use client";

import { useEffect, useState } from "react";

import { readMissedUsername } from "@/features/friends/missed-username";

interface MissedUsernameNoteProps {
  /** The reader, to find a username they picked at sign-up that was taken. */
  userId: string;
  className?: string;
}

/** Says why a username step is asking again, when the sign-up pick was taken. */
export function MissedUsernameNote({
  userId,
  className,
}: MissedUsernameNoteProps) {
  // Read after mount: storage is browser-only, and the server render has no note.
  const [missed, setMissed] = useState<string | null>(null);
  useEffect(() => {
    setMissed(readMissedUsername(userId));
  }, [userId]);

  if (missed === null) return null;
  return (
    <p className={className ?? "text-callout text-muted-foreground"}>
      @{missed} was already taken when you signed up, so pick another one.
    </p>
  );
}
