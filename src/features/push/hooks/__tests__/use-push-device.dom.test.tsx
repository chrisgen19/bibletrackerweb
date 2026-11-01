import { act, renderHook, waitFor } from "@testing-library/react";

import { usePushDevice } from "../use-push-device";

const actions = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
  refreshPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
}));
vi.mock("@/actions/push", () => actions);

const KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ENDPOINT = "https://push.example.com/device-1";
const SUBSCRIPTION_JSON = {
  endpoint: ENDPOINT,
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

const navigatorProps: string[] = [];
function setNavigator(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
  navigatorProps.push(name);
}

function fakeSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => SUBSCRIPTION_JSON,
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

type FakeSubscription = ReturnType<typeof fakeSubscription>;

/** An iPhone home-screen app with push, permission and an optional subscription. */
function setupDevice(options: {
  permission?: NotificationPermission;
  subscription?: FakeSubscription | null;
  prompt?: NotificationPermission;
}) {
  let subscription = options.subscription ?? null;
  const pushManager = {
    getSubscription: vi.fn(async () => subscription),
    subscribe: vi.fn(async () => {
      subscription = fakeSubscription();
      return subscription;
    }),
  };
  const registration = { pushManager, getNotifications: vi.fn(async () => []) };
  const serviceWorker = {
    register: vi.fn(async () => registration),
    getRegistration: vi.fn(async () =>
      subscription === null ? undefined : registration,
    ),
    ready: Promise.resolve(registration),
  };
  setNavigator("userAgent", IPHONE_UA);
  setNavigator("serviceWorker", serviceWorker);
  vi.stubGlobal("PushManager", class {});
  const requestPermission = vi.fn(async () => options.prompt ?? "granted");
  vi.stubGlobal("Notification", {
    permission: options.permission ?? "default",
    requestPermission,
  });
  return {
    serviceWorker,
    pushManager,
    requestPermission,
    current: () => subscription,
  };
}

beforeEach(() => {
  actions.savePushSubscription.mockReset().mockResolvedValue({ ok: true });
  actions.refreshPushSubscription
    .mockReset()
    .mockResolvedValue({ ok: true, current: true });
  actions.deletePushSubscription.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of navigatorProps.splice(0)) {
    delete (navigator as unknown as Record<string, unknown>)[name];
  }
});

describe("usePushDevice", () => {
  it("is not-configured without a key", async () => {
    setupDevice({});
    const { result } = renderHook(() => usePushDevice(null));
    await waitFor(() => expect(result.current.status).toBe("not-configured"));
  });

  it("starts loading before the browser checks run", () => {
    setupDevice({});
    const { result } = renderHook(() => usePushDevice(KEY));
    expect(result.current.status).toBe("loading");
  });

  it("is not-phone on a desktop", async () => {
    setupDevice({});
    setNavigator(
      "userAgent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
    );
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("not-phone"));
  });

  it("is needs-install on an iPhone in Safari", async () => {
    setupDevice({});
    // An iPhone in Safari (not on the Home Screen) has no PushManager.
    delete (window as unknown as Record<string, unknown>).PushManager;
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("needs-install"));
  });

  it("is blocked when permission is denied", async () => {
    setupDevice({ permission: "denied" });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("blocked"));
  });

  it("is on when the server recognises the subscription", async () => {
    const subscription = fakeSubscription();
    const device = setupDevice({ permission: "granted", subscription });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(actions.refreshPushSubscription).toHaveBeenCalledWith(
      SUBSCRIPTION_JSON,
    );
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(device.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("unsubscribes a subscription the server does not recognise", async () => {
    actions.refreshPushSubscription.mockResolvedValue({
      ok: true,
      current: false,
    });
    const subscription = fakeSubscription();
    setupDevice({ permission: "granted", subscription });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("never subscribes on load even when permission is granted", async () => {
    const device = setupDevice({ permission: "granted" });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(device.serviceWorker.register).not.toHaveBeenCalled();
    expect(device.pushManager.subscribe).not.toHaveBeenCalled();
    expect(device.requestPermission).not.toHaveBeenCalled();
    expect(actions.refreshPushSubscription).not.toHaveBeenCalled();
  });

  it("turnOn saves and reports on", async () => {
    const device = setupDevice({});
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.turnOn();
    });
    expect(outcome).toBe("on");
    expect(result.current.status).toBe("on");
    expect(device.serviceWorker.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    const [options] = device.pushManager.subscribe.mock.calls[0] as unknown as [
      { userVisibleOnly: boolean; applicationServerKey: Uint8Array },
    ];
    expect(options.userVisibleOnly).toBe(true);
    expect(options.applicationServerKey).toBeInstanceOf(Uint8Array);
    expect(options.applicationServerKey).toHaveLength(65);
    expect(actions.savePushSubscription).toHaveBeenCalledWith(
      SUBSCRIPTION_JSON,
    );
  });

  it("turnOn reports dismissed when the prompt is closed", async () => {
    const device = setupDevice({ prompt: "default" });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.turnOn();
    });
    expect(outcome).toBe("dismissed");
    expect(result.current.status).toBe("off");
    expect(device.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("turnOn reports blocked when permission is refused", async () => {
    setupDevice({ prompt: "denied" });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.turnOn();
    });
    expect(outcome).toBe("blocked");
    expect(result.current.status).toBe("blocked");
  });

  it("turnOn reports failed when the save fails", async () => {
    actions.savePushSubscription.mockResolvedValue({
      ok: false,
      error: "invalid-input",
    });
    setupDevice({});
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.turnOn();
    });
    expect(outcome).toBe("failed");
    expect(result.current.status).toBe("off");
  });

  it("turnOn reports failed when subscribing throws", async () => {
    const device = setupDevice({});
    device.pushManager.subscribe.mockRejectedValue(new Error("no"));
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.turnOn();
    });
    expect(outcome).toBe("failed");
    expect(actions.savePushSubscription).not.toHaveBeenCalled();
  });

  it("saves once when turnOn is called twice", async () => {
    setupDevice({});
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("off"));
    let outcomes: unknown[] = [];
    await act(async () => {
      outcomes = await Promise.all([
        result.current.turnOn(),
        result.current.turnOn(),
      ]);
    });
    expect(outcomes).toEqual(["on", "on"]);
    expect(actions.savePushSubscription).toHaveBeenCalledTimes(1);
  });

  it("turnOff unsubscribes and deletes", async () => {
    const subscription = fakeSubscription();
    setupDevice({ permission: "granted", subscription });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("on"));
    await act(async () => {
      await result.current.turnOff();
    });
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(actions.deletePushSubscription).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
    });
    expect(result.current.status).toBe("off");
  });

  it("turnOff reports off even when the server delete fails", async () => {
    actions.deletePushSubscription.mockRejectedValue(new Error("offline"));
    setupDevice({ permission: "granted", subscription: fakeSubscription() });
    const { result } = renderHook(() => usePushDevice(KEY));
    await waitFor(() => expect(result.current.status).toBe("on"));
    await act(async () => {
      await result.current.turnOff();
    });
    expect(result.current.status).toBe("off");
  });
});
