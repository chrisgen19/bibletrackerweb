// Setup for the "dom" project (jsdom). React Testing Library cleans up after each test on
// its own, since Vitest's globals are on.
import { vi } from "vitest";

// jsdom has no layout, so no media queries: every query reports "no match", which is a
// wide-enough-to-not-matter, motion-allowed browser.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// The App Router only exists inside a running Next app. Components get a router whose
// calls the tests can inspect.
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// A plain anchor: these tests check where a link points, not how Next navigates.
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children?: unknown;
    }) => createElement("a", { href, ...props }, children as never),
  };
});
