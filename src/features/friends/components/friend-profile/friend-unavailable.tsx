import { EmptyState } from "@/components/empty-state";

/** Shown in place of a friend's profile once they are no longer an accepted friend. */
export function FriendUnavailable() {
  return (
    <EmptyState
      title="This profile isn't available"
      description="You might not be friends anymore."
      action={{ label: "Back to Friends", href: "/friends" }}
    />
  );
}
