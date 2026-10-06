import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "../button";

// Guards a local change to the shadcn component: re-adding it with
// `shadcn add button --overwrite` would silently restore the submit default.
describe("Button type", () => {
  it("defaults a native button to type=button so it cannot submit a form by accident", () => {
    expect(renderToStaticMarkup(<Button>Cancel</Button>)).toContain(
      'type="button"',
    );
  });

  it("keeps an explicit submit or reset type", () => {
    expect(renderToStaticMarkup(<Button type="submit">Save</Button>)).toContain(
      'type="submit"',
    );
    expect(renderToStaticMarkup(<Button type="reset">Clear</Button>)).toContain(
      'type="reset"',
    );
  });

  it("does not add a type to an asChild element", () => {
    const html = renderToStaticMarkup(
      <Button asChild>
        <a href="/settings">Settings</a>
      </Button>,
    );
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain("type=");
  });
});
