import { Book } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/features/auth/components/account-menu";

/** Each line arrives a little after the one before, as on iOS; still under reduced motion. */
const ENTER =
  "animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-[340ms] motion-reduce:animate-none";

export function WelcomeScreen() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      {/* The way out for someone who signed in with the wrong account. */}
      <div className="flex justify-end pt-3">
        <AccountMenu />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div
          className={`${ENTER} flex size-[60px] items-center justify-center rounded-2xl bg-primary-soft`}
        >
          <Book className="size-[26px] text-primary" aria-hidden />
        </div>
        <h1 className={`${ENTER} mt-6 text-large-title [animation-delay:80ms]`}>
          Build a daily rhythm of Scripture.
        </h1>
        <p
          className={`${ENTER} mt-4 text-body text-muted-foreground [animation-delay:160ms]`}
        >
          One chapter a day, tracked on a calendar you actually want to look at.
          Your progress is saved to your account, so it is there on every device
          you sign in on.
        </p>
      </div>
      <div
        className={`${ENTER} pb-[max(1rem,env(safe-area-inset-bottom))] [animation-delay:240ms]`}
      >
        <Button asChild size="large" className="w-full">
          <Link href="/onboarding/start">Get Started</Link>
        </Button>
      </div>
    </main>
  );
}
