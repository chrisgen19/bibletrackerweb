import { act, fireEvent, render, screen } from "@testing-library/react";

import type {
  PushDeviceStatus,
  TurnOnOutcome,
} from "@/features/push/domain/types";

import { NotificationsSection } from "../notifications-section";

const device = vi.hoisted(() => ({
  status: "off" as PushDeviceStatus,
  turnOn: vi.fn(),
  turnOff: vi.fn(),
}));

vi.mock("@/features/push/hooks/use-push-device", () => ({
  usePushDevice: () => ({
    status: device.status,
    turnOn: device.turnOn,
    turnOff: device.turnOff,
  }),
}));

const FOOTNOTE =
  "Get a notification on this phone when a friend cheers you on.";
const toggle = () =>
  screen.getByRole("switch", { name: "Cheers from friends" });
const click = async () => {
  await act(async () => {
    fireEvent.click(toggle());
  });
};

beforeEach(() => {
  device.status = "off";
  device.turnOn = vi.fn(async (): Promise<TurnOnOutcome> => "on");
  device.turnOff = vi.fn(async () => {});
  window.localStorage.clear();
});

describe("NotificationsSection", () => {
  it("shows the footnote and an unchecked switch when off", () => {
    render(<NotificationsSection publicKey="k" />);
    expect(screen.getByText("Notifications")).not.toBeNull();
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(FOOTNOTE)).not.toBeNull();
  });

  it("shows a checked switch when on", () => {
    device.status = "on";
    render(<NotificationsSection publicKey="k" />);
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(FOOTNOTE)).not.toBeNull();
  });

  it.each([
    [
      "blocked",
      "Notifications are blocked for Bible Daily. Allow them in your phone's settings, then come back.",
    ],
    [
      "needs-install",
      "On iPhone, add Bible Daily to your Home Screen first: tap Share, then Add to Home Screen, and open it from there.",
    ],
    ["unsupported", "This browser can't show notifications."],
  ] as const)("disables the switch when %s", (status, copy) => {
    device.status = status;
    render(<NotificationsSection publicKey="k" />);
    expect(screen.getByText(copy)).not.toBeNull();
    expect((toggle() as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    "loading",
    "not-configured",
    "not-phone",
  ] as const)("renders nothing for %s", (status) => {
    device.status = status;
    const { container } = render(<NotificationsSection publicKey="k" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing without a key", () => {
    device.status = "not-configured";
    const { container } = render(<NotificationsSection publicKey={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("turning on calls turnOn even after three Not nows", async () => {
    window.localStorage.setItem("push-not-now-count", "3");
    render(<NotificationsSection publicKey="k" />);
    await click();
    expect(device.turnOn).toHaveBeenCalledTimes(1);
  });

  it("turning off calls turnOff", async () => {
    device.status = "on";
    render(<NotificationsSection publicKey="k" />);
    await click();
    expect(device.turnOff).toHaveBeenCalledTimes(1);
    expect(device.turnOn).not.toHaveBeenCalled();
  });

  it("shows the error when turning on fails", async () => {
    device.turnOn = vi.fn(async (): Promise<TurnOnOutcome> => "failed");
    render(<NotificationsSection publicKey="k" />);
    await click();
    expect(screen.getByRole("alert").textContent).toBe(
      "Couldn't turn on notifications. Try again.",
    );
  });

  it("disables the switch while a change is pending", async () => {
    let finish: (outcome: TurnOnOutcome) => void = () => {};
    device.turnOn = vi.fn(
      () => new Promise<TurnOnOutcome>((resolve) => (finish = resolve)),
    );
    render(<NotificationsSection publicKey="k" />);
    await click();
    expect((toggle() as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish("on"));
    expect((toggle() as HTMLButtonElement).disabled).toBe(false);
  });
});
