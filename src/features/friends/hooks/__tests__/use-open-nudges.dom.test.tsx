import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { OpenNudges } from "@/features/friends/domain/types";

import { OPEN_NUDGES_KEY, useOpenNudges } from "../use-open-nudges";

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
  const hook = renderHook(() => useOpenNudges(INITIAL, { todayCompleted }), {
    wrapper,
  });
  return { ...hook, client };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    let finish: (value: unknown) => void = () => {};
    actions.dismissNudges.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = setup();
    act(() => {
      result.current.dismiss();
    });
    // The action has not resolved yet: the list is already empty.
    await waitFor(() => expect(result.current.senders).toEqual([]));
    expect(actions.dismissNudges).toHaveBeenCalledWith({
      senderIds: ["user-maria", "user-ben"],
    });
    await act(async () => {
      finish({ ok: true });
    });
    expect(result.current.senders).toEqual([]);
  });

  it("an in-flight refetch cannot bring a dismissed row back", async () => {
    let respond: (response: Response) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result, client } = setup();
    act(() => {
      void client.refetchQueries({ queryKey: OPEN_NUDGES_KEY });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.dismiss();
    });
    await waitFor(() => expect(result.current.senders).toEqual([]));
    await act(async () => {
      respond(new Response(JSON.stringify(INITIAL)));
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(result.current.senders).toEqual([]);
  });

  it("uses the new server data when Today is opened again", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = renderHook(
      () =>
        useOpenNudges(
          { senders: [sender("maria", "Maria")] },
          { todayCompleted: false },
        ),
      { wrapper },
    );
    expect(first.result.current.senders).toEqual([sender("maria", "Maria")]);
    first.unmount();
    // Lets TanStack's zero-delay garbage collection of the unmounted query run.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    const second = renderHook(
      () =>
        useOpenNudges(
          { senders: [sender("ben", "Ben")] },
          { todayCompleted: false },
        ),
      { wrapper },
    );

    expect(second.result.current.senders).toEqual([sender("ben", "Ben")]);
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
