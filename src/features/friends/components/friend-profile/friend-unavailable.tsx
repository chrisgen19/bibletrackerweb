import { EmptyState } from "@/components/empty-state";
import { SheetTitle } from "@/components/ui/sheet";

interface FriendUnavailableProps {
  /**
   * Inside the day sheet, which needs a title to name the dialog. The empty state has no
   * heading of its own, so it gets a visually hidden one.
   */
  inSheet?: boolean;
}

/** Shown in place of a friend's profile once they are no longer an accepted friend. */
export function FriendUnavailable({ inSheet = false }: FriendUnavailableProps) {
  return (
    <>
      {inSheet ? (
        <SheetTitle className="sr-only">Profile unavailable</SheetTitle>
      ) : null}
      <EmptyState
        title="This profile isn't available"
        description="You might not be friends anymore."
        action={{ label: "Back to Friends", href: "/friends" }}
      />
    </>
  );
}
