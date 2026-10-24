"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import { DataContext, DataProvider } from "~/store/GlobalState";

/**
 * Determines whether an organization was auto-created by the backend during signup.
 * @param type The organization type designation string.
 * @returns True if type matches the auto-created default workspace indicator.
 */
const isAutoCreatedOrg = (type?: string) =>
  (type ?? "").trim().toLowerCase() === "user default org";

/**
 * Resolves the logged-in destination path, preserving template query param for un-onboarded users
 * or users on an auto-created workspace.
 * @param orgSlugFromState Organization slug available in GlobalState context.
 * @param template Optional template slug passed in query parameters.
 * @returns Destination URL string or null if organization slug is unresolved.
 */
function getLoggedInRedirectPath(
  orgSlugFromState?: string,
  template?: string | null
) {
  const storedOrgSlug = localStorage.getItem("orgSlug") || "";
  let user: {
    current_organisation_slug?: string;
    is_onboarded?: boolean;
    organisation?: { type?: string };
  } | null = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const orgSlug =
    orgSlugFromState || storedOrgSlug || user?.current_organisation_slug || "";

  if (!orgSlug) return null;

  const query = template ? `?template=${encodeURIComponent(template)}` : "";

  return user?.is_onboarded === false ||
    isAutoCreatedOrg(user?.organisation?.type)
    ? `/${orgSlug}/welcome${query}`
    : `/${orgSlug}`;
}

/**
 * Root authentication layout providing OAuth context and onboarding redirects.
 * @param props Layout component properties containing child elements.
 * @returns Rendered authentication layout tree.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { state } = useContext(DataContext);
  const { orgSlug } = state;

  useEffect(() => {
    (async () => {
      const t = new URLSearchParams(window.location.search).get("template");
      if (t) {
        localStorage.setItem("selected_template", t);
      }
      const token = localStorage.getItem("token");
      if (token) {
        const r = getLoggedInRedirectPath(orgSlug, t);
        if (r) return router.replace(r);
      }
      setLoading(false);
    })();
  }, [orgSlug, router]);

  if (loading) return;

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <DataProvider>{children}</DataProvider>
    </GoogleOAuthProvider>
  );
}
