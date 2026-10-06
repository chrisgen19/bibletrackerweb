import { requireUser } from "@/lib/session";

/** Placeholder until the progress screen lands in Phase 5 (see issue #1). */
export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome, {user.name}
      </h1>
      <p className="text-muted-foreground">
        Your reading plan will appear here.
      </p>
    </main>
  );
}
