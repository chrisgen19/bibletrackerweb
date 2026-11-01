import { act, render, waitFor } from "@testing-library/react";

import { makeCompletion } from "@/features/reading-plan/domain/__tests__/fixtures";
import { createCompletionLookup } from "@/features/reading-plan/domain/schedule";

import { PushSessionCheck } from "../push-session-check";

const actions = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
  refreshPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));
vi.mock("@/actions/push", () => actions);

const TODAY = "2026-10-31";
const reader = vi.hoisted(() => ({
  data: null as null | { today: string; completionLookup: unknown },
}));
vi.mock("@/features/reading-plan/hooks/reading-data-provider", () => ({
  useReadingData: () => reader.data,
}));

const cheers = vi.hoisted(() => ({ clear: vi.fn(() => Promise.resolve()) }));
vi.mock("@/features/push/browser/push-client", async (importActual) => ({
  ...(await importActual<
    typeof import("@/features/push/browser/push-client")
  >()),
  clearCheerNotifications: cheers.clear,
}));

function readerWith(completionDates: string[]) {
  reader.data = {
    today: TODAY,
    completionLookup: createCompletionLookup(
      completionDates.map((date) => makeCompletion(date)),
    ),
  };
}

const KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const SUBSCRIPTION_JSON = {
  endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

const navigatorProps: string[] = [];
function setNavigator(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
  navigatorProps.push(name);
}

/** An iPhone home-screen app with push, granted permission and an existing subscription. */
function setupSubscribedDevice() {
  const subscription = {
    endpoint: SUBSCRIPTION_JSON.endpoint,
    toJSON: () => SUBSCRIPTION_JSON,
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
  const registration = {
    pushManager: {
      getSubscription: vi.fn(async () => subscription),
      subscribe: vi.fn(),
    },
    getNotifications: vi.fn(async () => []),
  };
  setNavigator("userAgent", IPHONE_UA);
  setNavigator("serviceWorker", {
    register: vi.fn(async () => registration),
    getRegistration: vi.fn(async () => registration),
    ready: Promise.resolve(registration),
  });
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: vi.fn(),
  });
  return subscription;
}

beforeEach(() => {
  readerWith([]);
  cheers.clear.mockClear();
  actions.refreshPushSubscription
    .mockReset()
    .mockResolvedValue({ ok: true, current: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of navigatorProps.splice(0)) {
    delete (navigator as unknown as Record<string, unknown>)[name];
  }
});

describe("PushSessionCheck cheer notifications", () => {
  it("clears them on load and when today is completed", () => {
    const { rerender } = render(<PushSessionCheck publicKey={KEY} />);
    expect(cheers.clear).toHaveBeenCalledTimes(1);
    rerender(<PushSessionCheck publicKey={KEY} />);
    expect(cheers.clear).toHaveBeenCalledTimes(1);
    readerWith([TODAY]);
    rerender(<PushSessionCheck publicKey={KEY} />);
    expect(cheers.clear).toHaveBeenCalledTimes(2);
  });

  it("clears them even without a key", () => {
    render(<PushSessionCheck publicKey={null} />);
    expect(cheers.clear).toHaveBeenCalledTimes(1);
  });

  it("ignores a failing clear", () => {
    cheers.clear.mockRejectedValueOnce(new Error("no worker"));
    expect(() => render(<PushSessionCheck publicKey={null} />)).not.toThrow();
  });
});

describe("PushSessionCheck", () => {
  it("refreshes a recognised subscription and renders nothing", async () => {
    const subscription = setupSubscribedDevice();
    const { container } = render(<PushSessionCheck publicKey={KEY} />);
    await waitFor(() =>
      expect(actions.refreshPushSubscription).toHaveBeenCalledWith(
        SUBSCRIPTION_JSON,
      ),
    );
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });

  it("unsubscribes an unrecognised one", async () => {
    actions.refreshPushSubscription.mockResolvedValue({
      ok: true,
      current: false,
    });
    const subscription = setupSubscribedDevice();
    render(<PushSessionCheck publicKey={KEY} />);
    await waitFor(() =>
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1),
    );
  });

  it("does nothing without a key", async () => {
    const subscription = setupSubscribedDevice();
    const { container } = render(<PushSessionCheck publicKey={null} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(actions.refreshPushSubscription).not.toHaveBeenCalled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });
});
