// Resume content — single source of truth for both screen and print layouts.
//
// Inline formatting in bullet strings:
//   **bold**   -> <strong>
//   `code`     -> <code>
//
// To revise content, edit this file only. Both layouts re-render automatically.

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

export type CustomSectionShape = CustomSection["shape"];

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
  projects: "Projects",
};

// Default rendering order — used when sectionOrder is missing.
export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "education",
  "skills",
  "projects",
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
  customSections: CustomSection[] | undefined
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

/**
 * Defensive normalizer for resume payloads coming from Supabase.
 *
 * Goals:
 * - Page never crashes on render because of malformed stored JSON.
 * - Optional fields fall back to safe defaults so renderers can `.map`
 *   without null-checking every array.
 * - Legacy data shapes (e.g. `shape: "projects"` → `shape: "entries"`)
 *   are transparently migrated on read.
 * - Unknown custom-section shapes are dropped with a warning rather than
 *   propagating into the editor / view layer.
 *
 * The input is typed as `Resume` for ergonomics but treated as `unknown`
 * because Supabase's `jsonb` can in practice carry anything.
 */
export function normalizeResume(resume: Resume): Resume {
  // Helpers — kept inline so this file stays a single source of truth.
  const asString = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : fallback;
  const asOptString = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;
  const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];

  const r = resume as unknown as Record<string, unknown>;

  return {
    name: asString(r.name),
    tagline: asOptString(r.tagline),
    location: asOptString(r.location),
    lastUpdated: asOptString(r.lastUpdated),
    sectionTitles:
      r.sectionTitles && typeof r.sectionTitles === "object"
        ? (r.sectionTitles as SectionTitles)
        : undefined,
    sectionOrder: Array.isArray(r.sectionOrder)
      ? (r.sectionOrder as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : undefined,
    customSections: normalizeCustomSections(r.customSections),
    contact: asArray<ContactItem>(r.contact),
    education: asArray<EducationItem>(r.education),
    skills: asArray<SkillCategory>(r.skills).map((s) => ({
      name: asString((s as unknown as Record<string, unknown>).name),
      items: asStringArray((s as unknown as Record<string, unknown>).items),
    })),
    projects: asArray<Entry>(r.projects).map(normalizeEntry),
  };
}

function normalizeEntry(e: unknown): Entry {
  const r = (e ?? {}) as Record<string, unknown>;
  return {
    name: typeof r.name === "string" ? r.name : "",
    title: typeof r.title === "string" ? r.title : undefined,
    period: typeof r.period === "string" ? r.period : undefined,
    link:
      r.link && typeof r.link === "object"
        ? (r.link as Entry["link"])
        : undefined,
    repo:
      r.repo && typeof r.repo === "object"
        ? (r.repo as Entry["repo"])
        : undefined,
    stack: Array.isArray(r.stack)
      ? (r.stack as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    summary: typeof r.summary === "string" ? r.summary : undefined,
    bullets: Array.isArray(r.bullets)
      ? (r.bullets as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : [],
  };
}

function normalizeCustomSections(raw: unknown): CustomSection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CustomSection[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const r = s as Record<string, unknown>;
    const id =
      typeof r.id === "string" && r.id ? r.id : newCustomSectionId();
    const title = typeof r.title === "string" ? r.title : "";

    // Legacy: shape "projects" -> "entries"
    if (r.shape === "projects" && Array.isArray(r.projects)) {
      out.push({
        id,
        shape: "entries",
        title,
        entries: (r.projects as unknown[]).map(normalizeEntry),
      });
      continue;
    }

    if (r.shape === "bullets") {
      out.push({
        id,
        shape: "bullets",
        title,
        bullets: Array.isArray(r.bullets)
          ? (r.bullets as unknown[]).filter(
              (b): b is string => typeof b === "string"
            )
          : [],
      });
    } else if (r.shape === "entries") {
      out.push({
        id,
        shape: "entries",
        title,
        entries: Array.isArray(r.entries)
          ? (r.entries as unknown[]).map(normalizeEntry)
          : [],
      });
    } else if (r.shape === "categories") {
      out.push({
        id,
        shape: "categories",
        title,
        categories: Array.isArray(r.categories)
          ? (r.categories as unknown[]).map((c) => {
              const cr = (c ?? {}) as Record<string, unknown>;
              return {
                name: typeof cr.name === "string" ? cr.name : "",
                items: Array.isArray(cr.items)
                  ? (cr.items as unknown[]).filter(
                      (i): i is string => typeof i === "string"
                    )
                  : [],
              };
            })
          : [],
      });
    } else {
      // Unknown shape — skip with a warning. Don't propagate to the renderer.
      console.warn(
        `[resume] dropping custom section with unknown shape: ${String(r.shape)}`
      );
    }
  }
  return out;
}

export const RESUME: Resume = {
  name: "Yuan Jia",
  tagline: "Platform / Infrastructure Engineer",
  location: "Santa Cruz, CA",
  lastUpdated: "May 2026",
  sectionTitles: { ...DEFAULT_SECTION_TITLES },
  sectionOrder: [...DEFAULT_SECTION_ORDER],

  contact: [
    { label: "Phone", value: "859-608-4045", href: "tel:8596084045" },
    {
      label: "Email",
      value: "hello.yuanjia@gmail.com",
      href: "mailto:hello.yuanjia@gmail.com",
    },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/yuanjia1",
      href: "https://linkedin.com/in/yuanjia1/",
    },
    {
      label: "GitHub",
      value: "github.com/yuan0-0jia",
      href: "https://github.com/yuan0-0jia",
    },
    {
      label: "Site",
      value: "yuanjia.page",
      href: "https://yuanjia.page",
    },
  ] satisfies ContactItem[],

  education: [
    {
      school: "University of California, Santa Cruz",
      period: "2024–2026",
      degree: "Master of Science: Computer Science & Engineering",
    },
    {
      school: "University of California, Santa Cruz",
      period: "2019–2023",
      degree: "Bachelor of Science: Computer Engineering",
      minor: "Minor: Computer Science",
    },
  ] satisfies EducationItem[],

  skills: [
    {
      name: "Languages",
      items: ["TypeScript", "Python", "JavaScript", "Bash", "C/C++"],
    },
    {
      name: "Web",
      items: [
        "Next.js",
        "React",
        "Node.js",
        "NextAuth.js",
        "Prisma",
        "Tailwind CSS",
      ],
    },
    {
      name: "Infrastructure",
      items: [
        "AWS EC2 (Graviton/ARM64)",
        "Docker",
        "PostgreSQL",
        "k3s",
        "Actions Runner Controller",
        "Nginx",
        "Tailscale",
        "GitHub Actions",
        "Linux/Ubuntu",
      ],
    },
    {
      name: "Testing & Tooling",
      items: [
        "Vitest",
        "Playwright",
        "pytest",
        "bats",
        "tree-sitter",
        "ruff",
        "uv",
        "shellcheck",
        "Git",
      ],
    },
    {
      name: "AI Tools",
      items: ["Claude Code", "Anthropic API", "OpenAI API", "Gemini CLI"],
    },
  ] satisfies SkillCategory[],

  projects: [
    {
      name: "Flyer",
      title: "Platform Engineer (1 of 6 contributors)",
      period: "2026 – Present",
      link: { label: "joinflyer.com", href: "https://joinflyer.com" },
      stack: [
        "TypeScript",
        "Next.js 16",
        "PostgreSQL 16",
        "NextAuth v5",
        "Docker",
        "AWS EC2 Graviton (ARM64)",
      ],
      summary:
        "Production event platform for college communities; owned the deploy pipeline, security hardening, and disaster recovery.",
      bullets: [
        "**Built a 3-mode GitHub Actions deploy workflow** with a post-deploy SHA probe and automated rollback from a `.deploy-history` ledger — cutting MTTR for a broken deploy to ~90 seconds.",
        "**Restricted the CI deploy SSH key with an `authorized_keys` forced-command wrapper** — strict `IMAGE_TAG` regex, op allowlist, audited invocations. A leaked key can no longer obtain a shell.",
        "**Built a schema-versioned deploy state machine in Bash** holding one remote `flock` for the full deploy lifecycle plus a `peek_claim` gate on the drift CI job — structurally impossible for two prod-mutating ops to interleave.",
        "**Shipped automated daily PostgreSQL → S3 backups** with `pg_dump | gzip` integrity checks, 14-day lifecycle, and EC2 instance-profile auth (no static AWS keys); executed a live restore drill from prod backup.",
        "**Replaced the app's PostgreSQL superuser connection with a least-privilege role** via idempotent `public`-schema ownership transfer — shrinking SQL-injection blast radius from full DBA access to only the data the app needs.",
      ],
    },
    {
      name: "Homelab",
      title: "Self-hosted CI on a k3s cluster",
      period: "2026 – Present",
      stack: [
        "k3s",
        "Actions Runner Controller (ARC)",
        "GitHub Actions",
        "Tailscale",
        "Ubuntu 24.04",
        "containerd",
      ],
      summary:
        "Two-node k3s cluster on repurposed Intel hardware (Dell desktop + Mac mini reflashed from macOS to Ubuntu, with additional MacBooks reflashed and staged to join); hosts an ephemeral GitHub Actions runner pool for Flyer.",
      bullets: [
        "**Built a 2-node k3s cluster** (control plane on the Dell desktop, worker on the Mac mini) on Ubuntu 24.04 + `containerd`; more reflashed Intel MacBooks staged to join.",
        "**Deployed Actions Runner Controller (ARC)** with a runner scale set labeled `homelab` — each CI job spawns an ephemeral pod (clean filesystem per job, zero idle compute when the queue is empty). Hosts ops-class CI for Flyer.",
      ],
    },
    {
      name: "StyleBench",
      title: "Master's Capstone Research Project",
      repo: {
        label: "github.com/yuan0-0jia/stylebench",
        href: "https://github.com/yuan0-0jia/stylebench",
      },
      stack: [
        "Python",
        "tree-sitter",
        "pytest",
        "Claude Code",
        "Codex CLI",
        "Gemini CLI",
        "uv",
        "ruff",
      ],
      summary:
        "Empirical study of whether code style affects AI coding-agent bug-fix performance.",
      bullets: [
        "**Designed and ran a 1,920-trial benchmark** measuring whether code style affects AI coding-agent bug-fix rates — 4 Python projects (~20k LOC, 3,039 tests), 6 style variants, 14 mutation types, 2 evaluation modes.",
        "**Built a tree-sitter AST transformation framework** that rewrites a codebase across naming / formatting / documentation styles while leaving external API references intact — whitelist-only renames, `pytest.mark.parametrize` string-argument syncing.",
        "**Authored a multi-agent benchmark harness** with pluggable adapters for Claude Code, Codex CLI, and Gemini CLI — rate-limit detection with checkpoint resumption, manifest mode for byte-identical input across agents, process-group termination on timeout.",
        "**Headline finding:** code style had no statistically significant effect on fix rate (p = 0.998; 1pp spread). Repository difficulty (28pp spread) and mutation type (29pp spread) dominated.",
      ],
    },
  ] satisfies Entry[],
};
