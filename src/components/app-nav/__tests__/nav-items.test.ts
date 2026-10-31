import { NAV_ITEMS, showsNav } from "../nav-items";

/** The label of the tab that owns `pathname`, or null when none does. */
const activeTab = (pathname: string): string | null =>
  NAV_ITEMS.find((item) => item.match(pathname))?.label ?? null;

describe("NAV_ITEMS", () => {
  it("lists the four tabs in order", () => {
    expect(NAV_ITEMS.map(({ label, href }) => [label, href])).toEqual([
      ["Home", "/"],
      ["History", "/history"],
      ["Friends", "/friends"],
      ["Profile", "/profile"],
    ]);
  });

  it.each([
    ["/", "Home"],
    ["/day/2026-10-31", "Home"],
    ["/history", "History"],
    ["/friends", "Friends"],
    ["/add/abc", "Friends"],
    ["/profile", "Profile"],
    // Pushed from Profile, so Profile stays lit under them.
    ["/settings", "Profile"],
    ["/reading-plan", "Profile"],
  ])("puts %s under %s", (pathname, label) => {
    expect(activeTab(pathname)).toBe(label);
  });

  it("gives every route to at most one tab", () => {
    for (const pathname of ["/", "/day/2026-10-31", "/history", "/settings"]) {
      expect(NAV_ITEMS.filter((item) => item.match(pathname))).toHaveLength(1);
    }
  });

  it("matches whole segments, not prefixes of a word", () => {
    expect(activeTab("/historyx")).toBeNull();
    expect(activeTab("/daybreak")).toBeNull();
    expect(activeTab("/profiles")).toBeNull();
  });
});

describe("showsNav", () => {
  it("hides the tabs through onboarding", () => {
    expect(showsNav("/onboarding")).toBe(false);
    expect(showsNav("/onboarding/start")).toBe(false);
  });

  it("shows them everywhere else", () => {
    expect(showsNav("/")).toBe(true);
    expect(showsNav("/settings")).toBe(true);
  });
});
