import { act, fireEvent, render, screen } from "@testing-library/react";

import type {
  PushDeviceStatus,
  TurnOnOutcome,
} from "@/features/push/domain/types";

import { PushQuestion } from "../push-question";

const device = vi.hoisted(() => ({
  status: "off" as PushDeviceStatus,
  turnOn: vi.fn(),
}));

vi.mock("@/features/push/hooks/use-push-device", () => ({
  usePushDevice: () => ({
    status: device.status,
    turnOn: device.turnOn,
    turnOff: vi.fn(),
  }),
}));

const KEY = "push-not-now-count";
const setPermission = (value: NotificationPermission) => {
  vi.stubGlobal("Notification", { permission: value });
};
const ask = () => screen.queryByText("Want these on your lock screen?");
const tap = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

beforeEach(() => {
  device.status = "off";
  device.turnOn = vi.fn();
  window.localStorage.clear();
  setPermission("default");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PushQuestion", () => {
  it("shows the question when off, never asked and under the limit", () => {
    render(<PushQuestion publicKey="k" />);
    expect(ask()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Turn on" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Not now" })).not.toBeNull();
  });

  it.each([
    "on",
    "blocked",
    "needs-install",
    "not-phone",
    "not-configured",
  ] as const)("hides when the status is %s", (status) => {
    device.status = status;
    const { container } = render(<PushQuestion publicKey="k" />);
    expect(ask()).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("hides when permission was already answered", () => {
    setPermission("granted");
    render(<PushQuestion publicKey="k" />);
    expect(ask()).toBeNull();
  });

  it("hides after three Not now taps and stays hidden on a new render", async () => {
    window.localStorage.setItem(KEY, "2");
    const first = render(<PushQuestion publicKey="k" />);
    await tap("Not now");
    expect(ask()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe("3");
    first.unmount();
    render(<PushQuestion publicKey="k" />);
    expect(ask()).toBeNull();
  });

  it("Not now hides the line and increments the count", async () => {
    render(<PushQuestion publicKey="k" />);
    await tap("Not now");
    expect(ask()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("shows the confirmation for three seconds after turning on", async () => {
    vi.useFakeTimers();
    device.turnOn.mockResolvedValue("on" satisfies TurnOnOutcome);
    render(<PushQuestion publicKey="k" />);
    await tap("Turn on");
    expect(
      screen.queryByText("You'll get cheers on your lock screen"),
    ).not.toBe(null);
    expect(ask()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.queryByText(/lock screen$/)).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText(/lock screen/)).toBeNull();
  });

  it("hides with no error when the browser blocks it", async () => {
    device.turnOn.mockResolvedValue("blocked" satisfies TurnOnOutcome);
    render(<PushQuestion publicKey="k" />);
    await tap("Turn on");
    expect(ask()).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("counts a dismissed permission prompt as Not now", async () => {
    device.turnOn.mockResolvedValue("dismissed" satisfies TurnOnOutcome);
    render(<PushQuestion publicKey="k" />);
    await tap("Turn on");
    expect(ask()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("shows the error and keeps the buttons when turning on fails", async () => {
    device.turnOn.mockResolvedValue("failed" satisfies TurnOnOutcome);
    render(<PushQuestion publicKey="k" />);
    await tap("Turn on");
    expect(screen.getByRole("alert").textContent).toBe(
      "Couldn't turn on notifications. Try again.",
    );
    expect(ask()).not.toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Turn on" })
        .disabled,
    ).toBe(false);
  });

  it("disables both buttons while turning on is pending", async () => {
    device.turnOn.mockReturnValue(new Promise(() => {}));
    render(<PushQuestion publicKey="k" />);
    await tap("Turn on");
    for (const name of ["Turn on", "Not now"]) {
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name }).disabled,
      ).toBe(true);
    }
  });

  it("works when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<PushQuestion publicKey="k" />);
    expect(ask()).not.toBeNull();
    await tap("Not now");
    expect(ask()).toBeNull();
  });
});
