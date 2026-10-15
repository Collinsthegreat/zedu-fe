"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useRef, useState } from "react";
import { DataContext, DataProvider } from "~/store/GlobalState";
import { provisionTemplateChannels } from "~/data/templates";

/** Resolves the logged-in destination path, preserving template query param for un-onboarded users. */
function getLoggedInRedirectPath(
  orgSlugFromState?: string,
  template?: string | null
) {
  const storedOrgSlug = localStorage.getItem("orgSlug") || "";
  let user: {
    current_organisation_slug?: string;
    is_onboarded?: boolean;
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

  return user?.is_onboarded === false
    ? `/${orgSlug}/welcome${query}`
    : `/${orgSlug}`;
}

/** Root authentication layout providing OAuth context and onboarding redirects. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { state } = useContext(DataContext);
  const { orgSlug } = state;
  const provisionedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (token) {
        const t = new URLSearchParams(window.location.search).get("template");
        const orgId = localStorage.getItem("orgId");
        let user: { is_onboarded?: boolean } | null = null;
        try {
          user = JSON.parse(localStorage.getItem("user") || "null");
        } catch {
          user = null;
        }

        // Only provision to the existing org if user is already onboarded;
        // un-onboarded users will create their organization and provision in create-organization.
        if (
          t &&
          orgId &&
          user?.is_onboarded !== false &&
          !provisionedRef.current
        ) {
          provisionedRef.current = true;
          try {
            await provisionTemplateChannels(orgId, t, token);
          } catch {
            // continue to redirect even if provisioning fails
          }
        }
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
