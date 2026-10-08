"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { ContributorCard, type Contributor } from "./contributor-card";

export const ContributorsList = ({
  contributors,
}: {
  contributors: Contributor[];
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery.trim().toLowerCase();

  const filteredContributors = useMemo(() => {
    if (!query) return contributors;

    return contributors.filter((contributor) =>
      [
        contributor.name,
        contributor.username,
        contributor.role,
        contributor.workspaceEmail,
        contributor.gitHubEmail,
        ...(contributor.hobbies ?? []),
      ].some((field) => field.toLowerCase().includes(query))
    );
  }, [contributors, query]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-neutral-500">
          {filteredContributors.length} contributor
          {filteredContributors.length === 1 ? "" : "s"}
          {query ? ` matching "${query}"` : ""}
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"
            size={20}
          />
          <Input
            type="text"
            aria-label="Search contributors"
            placeholder="Search contributors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>
      </div>

      {filteredContributors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContributors.map((contributor) => (
            <ContributorCard key={contributor.id} contributor={contributor} />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-16">
          <div className="mb-2 text-neutral-300">
            <Search size={48} />
          </div>
          <div className="text-center">
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              No contributors found
            </h3>
            <p className="text-sm text-neutral-600">
              We couldn&apos;t find any contributors matching &ldquo;{query}
              &rdquo;. Try a different search term.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
