"use client";

import { ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "~/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Contributor } from "../_lib/contributors";
import { ContributorCard } from "./contributor-card";
const PAGE_SIZE = 12;
const collator = new Intl.Collator("en", { sensitivity: "base" });
type SortOption = "name-asc" | "name-desc" | "username-asc";
export function ContributorsDirectory({
  contributors,
}: {
  contributors: Contributor[];
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [page, setPage] = useState(1);
  const filteredContributors = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    const matches = contributors.filter(
      ({ name, username }) =>
        !search ||
        name.toLocaleLowerCase().includes(search) ||
        username.toLocaleLowerCase().includes(search)
    );
    return matches.sort((first, second) => {
      if (sortBy === "name-desc") {
        return collator.compare(second.name, first.name);
      }
      if (sortBy === "username-asc") {
        return collator.compare(first.username, second.username);
      }
      return collator.compare(first.name, second.name);
    });
  }, [contributors, query, sortBy]);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredContributors.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleContributors = filteredContributors.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const clearSearch = () => {
    setQuery("");
    setPage(1);
  };

  return (
    <section
      aria-labelledby="contributors-directory-title"
      className="w-full px-4 sm:px-8 lg:px-12"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                id="contributors-directory-title"
                className="text-lg font-semibold text-neutral-900"
              >
                Contributor directory
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Search by name or username, then hover over a profile for more.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_11rem]">
              <label className="relative">
                <span className="sr-only">Search contributors</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search contributors"
                  className="h-11 pl-9"
                />
              </label>

              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => {
                  setSortBy(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11" aria-label="Sort contributors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name: A–Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z–A</SelectItem>
                  <SelectItem value="username-asc">Username: A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <p className="mb-4 text-sm text-neutral-500" aria-live="polite">
          {filteredContributors.length === 0
            ? "No contributors found"
            : `Showing ${startIndex + 1}–${Math.min(
                startIndex + PAGE_SIZE,
                filteredContributors.length
              )} of ${filteredContributors.length}`}
        </p>

        {visibleContributors.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleContributors.map((contributor) => (
              <li key={contributor.username}>
                <ContributorCard {...contributor} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center">
            <span className="mb-4 rounded-full bg-white p-3 shadow-sm">
              <SearchX className="size-6 text-neutral-400" aria-hidden="true" />
            </span>
            <h3 className="font-semibold text-neutral-900">
              No matching contributors
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Try a different name or username.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={clearSearch}
              className="mt-5"
            >
              Clear search
            </Button>
          </div>
        )}

        {filteredContributors.length > PAGE_SIZE && (
          <Pagination className="mt-10">
            <PaginationContent>
              <PaginationItem>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Go to previous page"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <Button
                      type="button"
                      variant={
                        currentPage === pageNumber ? "default" : "outline"
                      }
                      size="icon"
                      aria-label={`Go to page ${pageNumber}`}
                      aria-current={
                        currentPage === pageNumber ? "page" : undefined
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Go to next page"
                  disabled={currentPage === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </section>
  );
}
