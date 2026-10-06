import { TodayPanel } from "@/features/progress/components/today-panel";
import { requireUser } from "@/lib/session";

/** Temporary home until the progress screen lands in Phase 5 (see issue #1). */
export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user.name}
      </h1>
      <TodayPanel />
    </main>
  );
}
