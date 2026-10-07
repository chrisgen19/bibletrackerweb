// Before this, the first page after signing up was worked out in UTC: a new account had
// no stored zone, so in Manila before 8am it opened on yesterday.
import { render } from "@testing-library/react";

import { DeviceTimeZone } from "../device-time-zone";

describe("DeviceTimeZone", () => {
  it("puts this device's zone in the cookie the server reads", () => {
    render(<DeviceTimeZone />);

    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(document.cookie).toContain(`tz=${encodeURIComponent(zone)}`);
  });
});
