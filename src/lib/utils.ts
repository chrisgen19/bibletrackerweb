import { createCn } from "cn/config";

/** The type ramp in globals.css, from bibletrackerapp's tokens. */
const TEXT_SIZES = [
  "large-title",
  "title",
  "display",
  "headline",
  "body",
  "callout",
  "footnote",
  "overline",
  "calendar-day",
  "weekday",
];

/**
 * Joins class names and resolves Tailwind conflicts, knowing this app's theme.
 *
 * Plain `cn` would read `text-headline` as a colour (it only knows Tailwind's own sizes),
 * so `cn("text-primary-foreground", "text-headline")` dropped the colour, and `shadow-card`
 * as a shadow colour. Import from here, not from "cn": shadcn's CLI writes the latter.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: TEXT_SIZES }],
      shadow: [{ shadow: ["card", "raised"] }],
    },
  },
});
