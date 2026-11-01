import { isPushServiceUrl } from "../push-hosts";

describe("isPushServiceUrl", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("accepts %s", (url) => {
    expect(isPushServiceUrl(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://fcm.googleapis.com@evil.example/x",
    "https://user:pw@fcm.googleapis.com/x",
    "https://evilpush.apple.com/x",
    "https://fcm.googleapis.com.evil.example/x",
    "https://notpush.services.mozilla.com.evil/x",
    "https://169.254.169.254/x",
    "https://localhost/x",
    "https://storage.googleapis.com/x",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isPushServiceUrl(url)).toBe(false);
  });
});
