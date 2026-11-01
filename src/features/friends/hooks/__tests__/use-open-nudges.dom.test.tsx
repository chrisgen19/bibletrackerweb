import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { OpenNudges } from "@/features/friends/domain/types";

import { useOpenNudges } from "../use-open-nudges";

const actions = vi.hoisted(() => ({ dismissNudges: vi.fn() }));
vi.mock("@/actions/friends", () => actions);

const sender = (id: string, name: string) => ({
  userId: `user-${id}`,
  username: id,
  name,
  image: null,
});
const INITIAL: OpenNudges = {
  senders: [sender("maria", "Maria"), sender("ben", "Ben")],
};

function setup(todayCompleted = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useOpenNudges(INITIAL, { todayCompleted }), {
    wrapper,
  });
}

beforeEach(() => {
  actions.dismissNudges.mockReset();
  actions.dismissNudges.mockResolvedValue({ ok: true });
});

describe("useOpenNudges", () => {
  it("returns the initial senders", () => {
    const { result } = setup();
    expect(result.current.senders).toEqual(INITIAL.senders);
  });

  it("returns no one once today is completed", () => {
    const { result } = setup(true);
    expect(result.current.senders).toEqual([]);
  });

  it("dismiss empties the list at once and sends the shown ids", async () => {
    const { result } = setup();
    await act(async () => {
      result.current.dismiss();
    });
    await waitFor(() => expect(result.current.senders).toEqual([]));
    expect(actions.dismissNudges).toHaveBeenCalledWith({
      senderIds: ["user-maria", "user-ben"],
    });
  });

  it("a failed dismiss stays hidden until the next refetch", async () => {
    actions.dismissNudges.mockRejectedValue(new Error("boom"));
    const { result } = setup();
    await act(async () => {
      result.current.dismiss();
    });
    await waitFor(() => expect(result.current.senders).toEqual([]));
  });

  it("does not call the action when there is no one to dismiss", async () => {
    const { result } = setup(true);
    await act(async () => {
      result.current.dismiss();
    });
    expect(actions.dismissNudges).not.toHaveBeenCalled();
  });
});
