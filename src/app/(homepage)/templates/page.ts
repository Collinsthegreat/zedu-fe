import type { Metadata } from "next";

export { default } from "../_components/templates/templates-page";

/**
 * Static metadata configuration for the community templates directory route.
 */
export const metadata: Metadata = {
  title: "Free Community & Channel Templates Directory",
  description: "Pre-configured cohort workspaces and channel presets.",
  openGraph: {
    title: "Free Community & Channel Templates Directory",
    description: "Pre-configured cohort workspaces and channel presets.",
    url: "/templates",
    siteName: "Zedu",
  },
};
