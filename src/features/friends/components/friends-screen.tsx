import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";

/** A tab held for reading with friends, which is not built yet. */
export function FriendsScreen() {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6 pb-24">
      <h1 className="mb-6 text-large-title">Friends</h1>
      <Panel>
        <EmptyState
          icon={Users}
          title="Reading with friends is on its way"
          description="Soon you can invite friends, see who read today, and keep each other going."
        />
      </Panel>
    </main>
  );
}
