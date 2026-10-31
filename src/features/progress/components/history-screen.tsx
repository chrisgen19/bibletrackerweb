import { HistoryPanels } from "./history-panels";

/** The reader's history: the heatmap and journal under a title. */
export function HistoryScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-4 pb-tab-bar">
      <h1 className="mt-2 mb-6 text-large-title">Reading history</h1>
      <HistoryPanels />
    </main>
  );
}
