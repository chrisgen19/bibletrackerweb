import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { act } from "react";

import type { FriendReading } from "@/features/friends/domain/types";
import { deriveReadingView } from "@/features/reading-plan/domain/reading-view";
import {
  ReadingViewProvider,
  useDayHref,
  useReadingView,
} from "@/features/reading-plan/hooks/reading-view-context";

import { FriendReadingProvider } from "../friend-reading-provider";

const EMPTY = { plans: [], activePlan: null, completions: [] };
const FRIEND: FriendReading = { snapshot: EMPTY, today: "2026-10-31" };
const READER_TODAY = "2026-11-02";

function Probe({ id }: { id: string }) {
  const { today } = useReadingView();
  const dayHref = useDayHref();
  return (
    <p data-testid={id}>
      {today} {dayHref("2026-10-28")}
    </p>
  );
}

function renderUnderReader(children: React.ReactNode) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ReadingViewProvider view={deriveReadingView(EMPTY, READER_TODAY)}>
        {children}
      </ReadingViewProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
});

describe("FriendReadingProvider", () => {
  it("gives children the friend's view and day links", () => {
    renderUnderReader(
      <FriendReadingProvider username="maria" initial={FRIEND}>
        <Probe id="child" />
      </FriendReadingProvider>,
    );

    expect(screen.getByTestId("child").textContent).toBe(
      "2026-10-31 /friends/maria/day/2026-10-28",
    );
  });

  it("does not leak into the reader's own view", () => {
    renderUnderReader(
      <>
        <FriendReadingProvider username="maria" initial={FRIEND}>
          <Probe id="friend" />
        </FriendReadingProvider>
        <Probe id="reader" />
      </>,
    );

    expect(screen.getByTestId("reader").textContent).toBe(
      `${READER_TODAY} /day/2026-10-28`,
    );
  });

  it("shows the unavailable state when a refetch answers 404", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: "not-found" }, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderUnderReader(
      <FriendReadingProvider username="maria" initial={FRIEND}>
        <Probe id="child" />
      </FriendReadingProvider>,
    );

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));

    expect(
      await screen.findByText("This profile isn't available"),
    ).toBeTruthy();
    expect(screen.queryByTestId("child")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
