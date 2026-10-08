"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "~/components/ui/input";
import type { Contributor } from "../_lib/contributors";
import { TeamList } from "./team-list";

// Lowercase and strip accents so "oreoluwa" matches "Orèoluwa".
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function ContributorsDirectory({
  contributors,
}: {
  contributors: Contributor[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return contributors;
    // Every typed word must appear somewhere in the name, in any order.
    return contributors.filter((contributor) => {
      const name = normalize(contributor.name);
      return words.every((word) => name.includes(word));
    });
  }, [contributors, query]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl md:text-4xl">
            Our Contributors
          </h1>
          <p className="text-sm text-neutral-600 sm:text-base">
            The LARK team members who have contributed to building Zedu.
          </p>
          <p
            className="text-sm text-neutral-600 sm:text-base"
            aria-live="polite"
          >
            {isSearching
              ? `${filtered.length} of ${contributors.length} contributors`
              : `${contributors.length} contributors`}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contributors"
            aria-label="Search contributors by name"
            className="rounded-lg border-neutral-200 bg-white pl-9"
          />
        </div>
      </div>

      {isSearching && filtered.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-600">
          No contributors match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <TeamList contributors={filtered} />
      )}
    </div>
  );
}
