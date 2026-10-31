"use client";

import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";

import { searchUsername } from "@/actions/friends";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  FriendsResult,
  SearchMatch,
} from "@/features/friends/commands/results";
import { useFriendAction } from "@/features/friends/hooks/use-friend-action";

import { SearchResultRow } from "./search-result-row";

/** Submit-driven search for one exact username. Shows the handle and nothing else. */
export function UsernameSearch() {
  const search = useFriendAction();
  const row = useFriendAction();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [match, setMatch] = useState<SearchMatch | null>(null);

  async function find(text: string) {
    const result = await search.run(() => searchUsername({ query: text }), {
      refresh: false,
    });
    if (result === null) {
      setSearched(null);
      setMatch(null);
      return;
    }
    setSearched(text);
    setMatch(result.match);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (query.trim() === "") return;
    row.clearError();
    void find(query);
  }

  /** Runs a row action, then searches again so the row's relationship is fresh. */
  async function act(call: () => Promise<FriendsResult>) {
    const result = await row.run(call);
    if (result !== null && searched !== null) await find(searched);
  }

  return (
    <Panel padded={false}>
      <form onSubmit={onSubmit} className="flex gap-2 p-4">
        <Input
          aria-label="Username to search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="@username"
          className="h-11 min-w-0 flex-1"
        />
        <Button
          type="submit"
          size="medium"
          className="px-4"
          disabled={search.pending || query.trim() === ""}
        >
          <Search aria-hidden className="size-4" />
          Search
        </Button>
      </form>
      {search.error === null ? null : (
        <p role="alert" className="px-4 pb-4 text-footnote text-destructive">
          {search.error}
        </p>
      )}
      {searched === null ? null : (
        <div className="border-t">
          <SearchResultRow
            match={match}
            error={row.error}
            pending={row.pending}
            act={act}
          />
        </div>
      )}
    </Panel>
  );
}
