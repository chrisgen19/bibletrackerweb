// Review on #35 (Codex): the cheering row hid only when the plan's view of today was
// complete, so a reader who logged just an extra reading kept seeing "Maria is cheering
// you on" until the next refetch, though the server had already closed the nudge.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import type { OpenNudges } from "@/features/friends/domain/types";
import {
  makeCompletion,
  makePlan,
} from "@/features/reading-plan/domain/__tests__/fixtures";
import {
  deriveReadingView,
  type ReadingView,
} from "@/features/reading-plan/domain/reading-view";
import type { ReadingCompletion } from "@/features/reading-plan/domain/types";
import { ReadingViewProvider } from "@/features/reading-plan/hooks/reading-view-context";

import { ProgressScreen } from "../progress-screen";

const reader = vi.hoisted(() => ({ view: null as ReadingView | null }));

vi.mock("@/features/reading-plan/hooks/reading-data-provider", () => ({
  useReadingData: () => ({
    ...reader.view,
    hasCompletedOnboarding: true,
    completeReading: vi.fn(),
    startNextReadThrough: vi.fn(),
  }),
}));
vi.mock("@/actions/reading", () => ({ setCalendarView: vi.fn() }));
vi.mock("@/actions/friends", () => ({ dismissNudges: vi.fn() }));

vi.mock("@/features/push/components/push-question", () => ({
  PushQuestion: () => null,
}));

const TODAY = "2026-10-31";
const PLAN = makePlan({ startDate: "2026-10-01" });
const CHEERED: OpenNudges = {
  senders: [
    { userId: "user-maria", username: "maria", name: "Maria", image: null },
  ],
};

const client = new QueryClient();

function Screen({ view }: { view: ReadingView }) {
  return (
    <QueryClientProvider client={client}>
      <ReadingViewProvider view={view}>
        <ProgressScreen
          readerId="reader-1"
          initialNudges={CHEERED}
          vapidPublicKey={null}
        />
      </ReadingViewProvider>
    </QueryClientProvider>
  );
}

function viewWith(completions: ReadingCompletion[]): ReadingView {
  const view = deriveReadingView(
    { plans: [PLAN], activePlan: PLAN, completions },
    TODAY,
  );
  reader.view = view;
  return view;
}

function renderToday(completions: ReadingCompletion[]) {
  render(<Screen view={viewWith(completions)} />);
}

const cheeringRow = () => screen.queryByText(/is cheering you on/);

describe("ProgressScreen cheering row", () => {
  it("shows who is cheering the reader on before they read today", () => {
    renderToday([]);
    expect(cheeringRow()).not.toBeNull();
  });

  it("hides the row once today's plan reading is logged", () => {
    renderToday([makeCompletion(TODAY)]);
    expect(cheeringRow()).toBeNull();
  });

  it("hides the row when the only reading today is an extra", () => {
    renderToday([
      makeCompletion(TODAY, { bookId: "REV", chapter: 5, isExtra: true }),
    ]);
    expect(cheeringRow()).toBeNull();
  });
});
