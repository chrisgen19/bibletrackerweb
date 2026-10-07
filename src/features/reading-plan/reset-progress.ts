/**
 * Reset Progress: the only irreversible action in the app, so its copy and the order of
 * its buttons are pinned here (bibletrackerapp's reset-progress.ts).
 *
 * The message differs from iOS in one phrase: there the data lived "on this device"; here
 * it lives in the reader's account, so the reset reaches every device.
 */
export const RESET_PROGRESS = {
  title: "Reset progress?",
  message:
    "This permanently deletes your reading plan and every completed day from your account, on every device. It cannot be undone.",
  cancel: "Cancel",
  confirm: "Reset Everything",
} as const;

export function describeResetImpact(completionCount: number): string {
  if (completionCount === 0) return "You have no completed readings yet.";
  const noun = completionCount === 1 ? "chapter" : "chapters";
  return `This will remove ${completionCount} completed ${noun}.`;
}
