"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { FlamingoContributor } from "../_lib/contributors";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FlamingoTable({
  contributors,
}: {
  contributors: FlamingoContributor[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Usernames are shown with a leading "@", so ignore one in the search.
  const query = searchQuery.toLowerCase().trim().replace(/^@/, "");
  const filtered = query
    ? contributors.filter(
        (c) =>
          c.fullName.toLowerCase().includes(query) ||
          c.zeduUsername.toLowerCase().includes(query)
      )
    : contributors;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50/40 p-6 sm:flex-row sm:items-center">
        <h2 className="text-xl font-bold text-neutral-900">
          Contributors (
          {query
            ? `${filtered.length} of ${contributors.length}`
            : contributors.length}
          )
        </h2>

        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            aria-label="Search contributors by name or username"
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7141F8]/30"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100/70 text-xs font-bold uppercase tracking-wider text-neutral-700">
              <th className="px-6 py-4">Full Name</th>
              <th className="px-6 py-4">Zedu Username</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-sm">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-purple-50/20"
                >
                  <td className="px-6 py-4 font-semibold text-neutral-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#7141F8] to-[#9E77ED] text-xs font-bold text-white">
                        {initials(item.fullName)}
                      </div>
                      <span>{item.fullName}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-neutral-700">
                    {item.zeduUsername && (
                      <span className="inline-flex items-center rounded-md bg-[#7141F8]/10 px-2.5 py-1 text-xs font-semibold text-[#7141F8]">
                        @{item.zeduUsername}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-6 py-12 text-center text-sm text-neutral-500"
                >
                  {query
                    ? `No contributor matching "${searchQuery}"`
                    : "No contributors yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
