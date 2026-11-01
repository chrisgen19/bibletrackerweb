import { isPhone, pushAvailability } from "../device";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

describe("isPhone", () => {
  it("is true for an iPhone", () => {
    expect(isPhone({ userAgent: IPHONE })).toBe(true);
  });

  it("is true for an Android phone", () => {
    expect(isPhone({ userAgent: ANDROID_PHONE })).toBe(true);
  });

  it("is false for an Android tablet", () => {
    expect(isPhone({ userAgent: ANDROID_TABLET })).toBe(false);
  });

  it("is false for desktop Chrome", () => {
    expect(isPhone({ userAgent: DESKTOP_CHROME })).toBe(false);
  });

  it("is false for an iPad in desktop mode", () => {
    expect(isPhone({ userAgent: IPAD_DESKTOP_MODE })).toBe(false);
  });

  it("prefers userAgentData.mobile over the user agent", () => {
    expect(
      isPhone({ userAgent: DESKTOP_CHROME, userAgentData: { mobile: true } }),
    ).toBe(true);
    expect(
      isPhone({ userAgent: ANDROID_PHONE, userAgentData: { mobile: false } }),
    ).toBe(false);
  });
});

describe("pushAvailability", () => {
  const phone = {
    phone: true,
    serviceWorker: true,
    pushManager: true,
    ios: false,
  };

  it("is not-phone off a phone", () => {
    expect(pushAvailability({ ...phone, phone: false })).toBe("not-phone");
  });

  it("is available with a service worker and PushManager", () => {
    expect(pushAvailability(phone)).toBe("available");
  });

  it("is needs-install on an iPhone without PushManager", () => {
    expect(pushAvailability({ ...phone, ios: true, pushManager: false })).toBe(
      "needs-install",
    );
  });

  it("is unsupported otherwise", () => {
    expect(pushAvailability({ ...phone, pushManager: false })).toBe(
      "unsupported",
    );
    expect(pushAvailability({ ...phone, serviceWorker: false })).toBe(
      "unsupported",
    );
  });
});
