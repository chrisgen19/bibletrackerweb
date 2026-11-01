import { X } from "lucide-react";
import { Fragment } from "react";

import { cheeringNames } from "../domain/nudge";
import type { FriendProfile } from "../domain/types";
import { Avatar } from "./avatar";

interface CheeringRowProps {
  senders: readonly FriendProfile[];
  onDismiss: () => void;
}

/**
 * "Maria is cheering you on", tinted and edge to edge across the top of the Today card
 * (the card's `Panel` is `p-5`, hence the negative margins). Renders nothing when no one
 * has cheered. No counts, by design: past two names it says "and others".
 */
export function CheeringRow({ senders, onDismiss }: CheeringRowProps) {
  if (senders.length === 0) return null;
  const { names, others } = cheeringNames(senders);
  const plural = names.length > 1 || others;

  return (
    <div className="-mx-5 -mt-5 mb-4 flex items-center gap-3 rounded-t-2xl bg-primary-soft py-1 pr-1 pl-5">
      <div className="flex shrink-0 -space-x-2">
        {senders.slice(0, 2).map((sender) => (
          <Avatar
            key={sender.userId}
            name={sender.name || sender.username}
            image={sender.image}
            className="size-8 bg-card text-callout ring-2 ring-background"
          />
        ))}
      </div>
      <p
        data-testid="cheering-text"
        className="min-w-0 flex-1 text-callout text-foreground"
      >
        {senders.slice(0, 2).map((sender, index) => (
          <Fragment key={sender.userId}>
            {index > 0 ? (others ? ", " : " and ") : null}
            <strong className="font-semibold">{names[index]}</strong>
          </Fragment>
        ))}
        {others ? " and others" : null}
        {plural ? " are" : " is"} cheering you on
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
