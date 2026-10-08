"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

export type Contributor = {
  id: string;
  name: string;
  username: string;
  workspaceEmail: string;
  gitHubEmail: string;
  role: string;
  hobbies?: string[];
};

const getInitials = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ContactLink = ({ value }: { value: string }) => {
  if (!value || value === "N/A") {
    return <span className="text-neutral-400">&mdash;</span>;
  }

  if (isEmail(value)) {
    return (
      <a
        href={`mailto:${value}`}
        title={value}
        className="block truncate font-medium text-neutral-600 transition-colors hover:text-primary-500"
      >
        {value}
      </a>
    );
  }

  return (
    <span title={value} className="block truncate font-medium text-neutral-600">
      {value}
    </span>
  );
};

const Badge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-block w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
      className
    )}
  >
    {children}
  </span>
);

export const ContributorCard = ({
  contributor,
}: {
  contributor: Contributor;
}) => {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { id, name, username, workspaceEmail, gitHubEmail, role, hobbies } =
    contributor;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/30">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-500">
          {getInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-neutral-900">
            {name}
          </h2>
          <p className="truncate text-xs text-neutral-500">{username}</p>
        </div>
        <Badge className="bg-primary-50/60 capitalize text-primary-500">
          {role}
        </Badge>
      </div>

      {!!hobbies?.length && (
        <ul className="flex flex-wrap gap-1.5">
          {hobbies.map((hobby) => (
            <li key={hobby}>
              <Badge className="bg-neutral-100 text-neutral-600">{hobby}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-neutral-100 pt-3">
        <button
          type="button"
          onClick={() => setShowContactInfo((prev) => !prev)}
          aria-expanded={showContactInfo}
          className="flex w-full items-center justify-between gap-2 text-xs font-medium text-neutral-500 transition-colors hover:text-primary-500"
        >
          <span>
            {showContactInfo ? "Hide contact info" : "Show contact info"}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 transition-transform duration-200",
              showContactInfo && "rotate-180"
            )}
          />
        </button>

        {showContactInfo && (
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-neutral-400">Workspace</dt>
              <dd className="min-w-0">
                <ContactLink value={workspaceEmail} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-neutral-400">GitHub</dt>
              <dd className="min-w-0">
                <ContactLink value={gitHubEmail} />
              </dd>
            </div>
          </dl>
        )}
      </div>

      <span className="sr-only">Contributor #{id}</span>
    </article>
  );
};
