import { PostRequest } from "~/utils/request";

export interface TemplatePreset {
  slug: string;
  title: string;
  subtitle: string;
  category: "Bootcamps" | "Fellowships" | "Universities";
  icon: string;
  channels: string[];
  aiPreset: string;
  description: string;
}

export const TEMPLATE_CATEGORIES = [
  "All",
  "Bootcamps",
  "Fellowships",
  "Universities",
] as const;

const PRESET_DATA = [
  "coding-bootcamp|CODING BOOTCAMP|12-Week Intensive Program|Bootcamps|💻|announcements,lectures-and-slides,daily-standup,debugging-help,project-showcase|Code Explainer & Review Bot|Structured workspace for coding bootcamps with lecture broadcasts and daily standups.",
  "ui-ux-design-fellowship|UI/UX DESIGN FELLOWSHIP|Mentorship & Critique Hub|Fellowships|🎨|critiques-feedback,design-inspiration,weekly-milestones,figma-help|Design Prompt Generator|Critique-centric design community blueprint featuring feedback channels and showcases.",
  "university-college-class|UNIVERSITY / COLLEGE CLASS|Semester Class & TA Space|Universities|🎓|syllabus,lecture-notes,study-groups,ta-office-hours|Exam Study & FAQ Bot|Academic classroom setup connecting professors, TAs, and student study circles.",
  "data-science-ai-cohort|DATA SCIENCE & AI COHORT|Notebooks, Datasets & Models|Bootcamps|📊|datasets,python-sql-help,model-review|Python Debugger Agent|Data cohort architecture for dataset sharing, model reviews, and ML pipelines.",
  "executive-masterclass|EXECUTIVE / MASTERCLASS WORKSHOP|High-Impact Executive Workshop|Bootcamps|⚡|agenda,speaker-ama,networking|Workshop Summary Bot|High-engagement executive workshop layout with real-time AMA coordination.",
];

export const TEMPLATES: TemplatePreset[] = PRESET_DATA.map((r) => {
  const [slug, title, subtitle, category, icon, ch, aiPreset, description] =
    r.split("|");
  return {
    slug,
    title,
    subtitle,
    category: category as TemplatePreset["category"],
    icon,
    channels: ch.split(","),
    aiPreset,
    description,
  };
});

/** Retrieves a template preset by slug or normalized string. */
export const getTemplateBySlug = (slug: string) =>
  TEMPLATES.find(
    (t) =>
      t.slug === slug ||
      t.slug.replace(/-/g, "") === slug?.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

/** Reads a key safely from localStorage in browser environments. */
const getStored = (k: string) =>
  typeof window !== "undefined" ? localStorage.getItem(k) : null;

/** Provisions template channels for an organization via parallel API requests. */
export async function provisionTemplateChannels(
  orgId: string,
  slug?: string | null,
  token?: string
): Promise<boolean> {
  const t =
    orgId && getTemplateBySlug(slug || getStored("selected_template") || "");
  if (!t) {
    if (typeof window !== "undefined" && getStored("selected_template")) {
      localStorage.removeItem("selected_template");
    }
    return false;
  }
  const auth = token || getStored("token") || "";
  let u: any = {};
  try {
    u = JSON.parse(getStored("user") || "{}");
  } catch {
    u = {};
  }
  const Username = u?.username || u?.email;
  const payload = (n: string) => ({
    name: n.replace(/^#/, ""),
    organisation_id: orgId,
    is_private: false,
    Username,
  });
  try {
    const results = await Promise.all(
      t.channels.map((n) => PostRequest("/channels", payload(n), auth))
    );
    const isSuccessOrConflict = (res: any) =>
      res &&
      (res.status === 200 ||
        res.status === 201 ||
        res.status === 409 ||
        res?.data?.status_code === 200 ||
        res?.data?.status_code === 201 ||
        res?.data?.status_code === 409);

    const hasSuccess =
      results.length > 0 &&
      results.some((res: any) => isSuccessOrConflict(res));

    return hasSuccess;
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("selected_template");
    }
  }
}
