// Resume types + section-ordering helpers shared across the resume subsystem
// (parse-md / parse-blocks, screen view, print view, terminal pager).
//
// The resume *content* lives in the `site.resume_md` markdown column — edited
// via the terminal ~/resume.md editor and parsed by parse-md.ts. This module
// intentionally holds no static content: types + helpers only.

export type ContactItem = {
  label: string;
  value: string;
  href?: string;
};

export type EducationItem = {
  school: string;
  period: string;
  degree: string;
  minor?: string;
};

export type SkillCategory = {
  name: string;
  items: string[];
};

// Generic "detailed entry" — used by the built-in projects section AND by
// custom sections of `entries` shape (work experience, internships,
// publications, talks, side projects, etc.).
export type Entry = {
  name: string;
  title?: string;
  period?: string;
  link?: { label: string; href: string };
  repo?: { label: string; href: string };
  stack: string[];
  summary?: string;
  bullets: string[];
};

export type SectionKey = "education" | "skills" | "projects";

export type SectionTitles = Partial<Record<SectionKey, string>>;

// User-added sections. Each section has a stable id (used in sectionOrder)
// and a shape that selects which renderer / editor is used.
//
// The `entries` shape is intentionally generic so the same renderer covers
// work experience, internships, publications, talks, and side projects —
// not just "projects."
export type CustomSection =
  | {
      id: string;
      shape: "bullets";
      title: string;
      bullets: string[];
    }
  | {
      id: string;
      shape: "entries";
      title: string;
      entries: Entry[];
    }
  | {
      id: string;
      shape: "categories";
      title: string;
      categories: SkillCategory[];
    };

// sectionOrder entries are either a built-in SectionKey or a custom-section
// id. We type the array as plain string[] for storage / JSON-roundtrip
// simplicity; isBuiltInKey + resolveSectionOrder narrow at the boundary.
export type Resume = {
  name: string;
  tagline?: string;
  location?: string;
  lastUpdated?: string;
  sectionTitles?: SectionTitles;
  sectionOrder?: string[];
  customSections?: CustomSection[];
  contact: ContactItem[];
  education: EducationItem[];
  skills: SkillCategory[];
  projects: Entry[];
};

// Defaults used when sectionTitles or one of its keys is missing.
export const DEFAULT_SECTION_TITLES: Record<SectionKey, string> = {
  education: "Education",
  skills: "Skills",
  projects: "Experience",
};

// Default rendering order — used when sectionOrder is missing.
export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "projects",
  "skills",
  "education",
];

/** Type guard: tell built-in section keys apart from custom section ids. */
export function isBuiltInKey(s: string): s is SectionKey {
  return s === "education" || s === "skills" || s === "projects";
}

/**
 * Returns a section-order array that always covers every built-in key
 * and every known custom section id.
 *
 * - Drops unknown / duplicate entries from a stored order.
 * - Appends any missing built-in keys in default position.
 * - Appends any missing custom-section ids at the end.
 *
 * This means future renames of section types, or deletion of a custom
 * section, stay safe — the cleaned-up array always matches reality.
 */
export function resolveSectionOrder(
  order: string[] | undefined,
  customSections: CustomSection[] | undefined,
): string[] {
  const known = new Set<string>([
    ...DEFAULT_SECTION_ORDER,
    ...(customSections?.map((s) => s.id) ?? []),
  ]);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const k of order ?? []) {
    if (known.has(k) && !seen.has(k)) {
      cleaned.push(k);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!seen.has(k)) cleaned.push(k);
  }
  for (const cs of customSections ?? []) {
    if (!seen.has(cs.id)) cleaned.push(cs.id);
  }
  return cleaned;
}

/**
 * Generate a stable id for a new custom section.
 * Uses crypto.randomUUID() when available (modern browsers + Node), with
 * a Math.random fallback for unusual environments.
 */
export function newCustomSectionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
