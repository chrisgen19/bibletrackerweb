import { fireEvent, render, screen } from "@testing-library/react";

import { navigation } from "@/test/dom-setup";

import { LensTabBar } from "../lens-tab-bar";

/** The lens's slot, as the percentage it is moved across the bar. */
const lensOffset = () => screen.getByTestId("tab-lens").style.transform;

function renderAt(pathname: string) {
  navigation.pathname = pathname;
  return render(<LensTabBar />);
}

describe("LensTabBar", () => {
  beforeEach(() => {
    // jsdom has no Web Animations; the squash is decoration, so a stub is enough.
    HTMLElement.prototype.animate = vi.fn();
  });

  it("links the four tabs", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      Array.from(nav.querySelectorAll("a"), (a) => a.getAttribute("href")),
    ).toEqual(["/", "/history", "/friends", "/profile"]);
  });

  it.each([
    ["/", "Home"],
    ["/history", "History"],
    ["/settings", "Profile"],
  ])("marks the tab for %s as the current page", (pathname, label) => {
    renderAt(pathname);

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });

  it("sits the lens over the current tab", () => {
    renderAt("/friends");

    expect(lensOffset()).toBe("translateX(200%)");
  });

  it("renders nothing during onboarding", () => {
    const { container } = renderAt("/onboarding/start");

    expect(container.innerHTML).toBe("");
  });

  it("moves the lens to a pressed tab before the route changes", () => {
    renderAt("/");

    fireEvent.pointerDown(screen.getByRole("link", { name: "Profile" }), {
      button: 0,
    });

    expect(lensOffset()).toBe("translateX(300%)");
    // Still the old page until the navigation lands.
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("sends the lens back when the finger slides off before lifting", () => {
    renderAt("/");
    const history = screen.getByRole("link", { name: "History" });
    history.getBoundingClientRect = () => new DOMRect(0, 0, 50, 50);

    fireEvent.pointerDown(history, { button: 0 });
    fireEvent.pointerUp(history, { clientX: 200, clientY: 200 });

    expect(lensOffset()).toBe("translateX(0%)");
  });

  it("keeps the lens on a tab released over it, for the navigation that follows", () => {
    renderAt("/");
    const history = screen.getByRole("link", { name: "History" });
    history.getBoundingClientRect = () => new DOMRect(0, 0, 50, 50);

    fireEvent.pointerDown(history, { button: 0 });
    fireEvent.pointerUp(history, { clientX: 20, clientY: 20 });

    expect(lensOffset()).toBe("translateX(100%)");
  });

  it("ignores a right click", () => {
    renderAt("/");

    fireEvent.pointerDown(screen.getByRole("link", { name: "Friends" }), {
      button: 2,
    });

    expect(lensOffset()).toBe("translateX(0%)");
  });

  it("drops a press once the route changes", () => {
    const { rerender } = renderAt("/");
    fireEvent.pointerDown(screen.getByRole("link", { name: "Profile" }), {
      button: 0,
    });

    navigation.pathname = "/history";
    rerender(<LensTabBar />);

    expect(lensOffset()).toBe("translateX(100%)");
  });

  it("only adds the refraction filter where the browser can use it", () => {
    renderAt("/");

    expect(document.getElementById("lens-refract")).toBeNull();
    expect(screen.getByRole("navigation").hasAttribute("data-refract")).toBe(
      false,
    );
  });

  it("refracts through the SVG filter in Chromium", () => {
    // Only Chromium exposes userAgentData, which is how the bar tells it apart.
    Object.defineProperty(navigator, "userAgentData", {
      value: {},
      configurable: true,
    });
    try {
      renderAt("/");

      expect(document.getElementById("lens-refract")).not.toBeNull();
      expect(screen.getByRole("navigation").hasAttribute("data-refract")).toBe(
        true,
      );
    } finally {
      Reflect.deleteProperty(navigator, "userAgentData");
    }
  });

  it("forgets a press once its route is left, so going back does not revive it", () => {
    const { rerender } = renderAt("/");
    const history = screen.getByRole("link", { name: "History" });
    history.getBoundingClientRect = () => new DOMRect(0, 0, 50, 50);
    fireEvent.pointerDown(history, { button: 0 });
    fireEvent.pointerUp(history, { clientX: 20, clientY: 20 });

    navigation.pathname = "/history";
    rerender(<LensTabBar />);
    // The browser's back button.
    navigation.pathname = "/";
    rerender(<LensTabBar />);

    expect(lensOffset()).toBe("translateX(0%)");
  });

  it.each([
    ["ctrlKey"],
    ["metaKey"],
    ["shiftKey"],
    ["altKey"],
  ])("ignores a click with %s, which the browser handles without navigating here", (key) => {
    renderAt("/");

    fireEvent.pointerDown(screen.getByRole("link", { name: "Friends" }), {
      button: 0,
      [key]: true,
    });

    expect(lensOffset()).toBe("translateX(0%)");
  });

  it("sends the lens back when a held mouse leaves the tab", () => {
    renderAt("/");
    const friends = screen.getByRole("link", { name: "Friends" });

    fireEvent.pointerDown(friends, { button: 0, pointerType: "mouse" });
    fireEvent.pointerLeave(friends, { pointerType: "mouse", buttons: 1 });

    expect(lensOffset()).toBe("translateX(0%)");
  });

  it("keeps a touch press through the pointerleave that follows lifting", () => {
    renderAt("/");
    const friends = screen.getByRole("link", { name: "Friends" });

    fireEvent.pointerDown(friends, { button: 0, pointerType: "touch" });
    fireEvent.pointerLeave(friends, { pointerType: "touch", buttons: 0 });

    expect(lensOffset()).toBe("translateX(200%)");
  });
});
