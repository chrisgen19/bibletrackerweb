import { act, renderHook } from "@testing-library/react";

import { useSignOut } from "../use-sign-out";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  unsubscribeDevice: vi.fn(),
  deletePushSubscription: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
  catchNetworkFailure: async (run: () => Promise<{ error: unknown }>) => run(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/features/push/browser/push-client", () => ({
  unsubscribeDevice: mocks.unsubscribeDevice,
}));
vi.mock("@/actions/push", () => ({
  deletePushSubscription: mocks.deletePushSubscription,
}));

beforeEach(() => {
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.replace.mockReset();
  mocks.refresh.mockReset();
  mocks.unsubscribeDevice.mockReset().mockResolvedValue(null);
  mocks.deletePushSubscription.mockReset().mockResolvedValue({ ok: true });
});

describe("useSignOut", () => {
  it("unsubscribes this device before signing out", async () => {
    const order: string[] = [];
    mocks.unsubscribeDevice.mockImplementation(async () => {
      order.push("unsubscribe");
      return "https://push.example.com/device-1";
    });
    mocks.deletePushSubscription.mockImplementation(async () => {
      order.push("delete");
      return { ok: true };
    });
    mocks.signOut.mockImplementation(async () => {
      order.push("signOut");
      return { error: null };
    });
    const { result } = renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });
    expect(order).toEqual(["unsubscribe", "delete", "signOut"]);
    expect(mocks.deletePushSubscription).toHaveBeenCalledWith({
      endpoint: "https://push.example.com/device-1",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("skips the server delete when there was no subscription", async () => {
    const { result } = renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });
    expect(mocks.deletePushSubscription).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("still signs out when unsubscribing fails", async () => {
    mocks.unsubscribeDevice.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSignOut());
    await act(async () => {
      await result.current.signOut();
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/sign-in");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(result.current.failed).toBe(false);
  });
});
