import { describe, expect, it } from "vitest";

import { cn } from "../utils";

// The app's text sizes and shadows are its own (globals.css). Unconfigured, cn reads
// `text-headline` as a colour and silently drops the real colour beside it.
describe("cn with the app's theme", () => {
  it("keeps a colour next to a custom text size", () => {
    expect(cn("text-primary-foreground", "text-headline")).toBe(
      "text-primary-foreground text-headline",
    );
    expect(cn("text-muted-foreground", "text-footnote")).toBe(
      "text-muted-foreground text-footnote",
    );
  });

  it("lets a later text size replace an earlier one", () => {
    expect(cn("text-sm", "text-headline")).toBe("text-headline");
    expect(cn("text-footnote", "text-callout")).toBe("text-callout");
  });

  it("treats card and raised as shadows, not shadow colours", () => {
    expect(cn("shadow-sm", "shadow-card")).toBe("shadow-card");
    expect(cn("shadow-card", "shadow-primary")).toBe(
      "shadow-card shadow-primary",
    );
  });
});
