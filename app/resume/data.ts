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
          (s): s is string => typeof s === "string",
        )
      : undefined,
    customSections: normalizeCustomSections(r.customSections),
    contact: asArray<ContactItem>(r.contact),
    education: asArray<EducationItem>(r.education),
    skills: asArray<SkillCategory>(r.skills).map((s) => ({
      name: asString((s as unknown as Record<string, unknown>).name),
      items: asCleanStringArray(
        (s as unknown as Record<string, unknown>).items,
      ),
    })),
    projects: asArray<Entry>(r.projects).map(normalizeEntry),
  };
}

/**
 * Filter an unknown value to a clean string[]: keep only strings, trim
 * whitespace, drop empties. Empty lines accumulate in the editor's
 * textarea-list fields while typing (we keep them in state so Enter
 * keypresses work); this is where they get cleaned up on the way back
 * into the renderer.
 */
function asCleanStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
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
    stack: asCleanStringArray(r.stack),
    summary: typeof r.summary === "string" ? r.summary : undefined,
    bullets: asCleanStringArray(r.bullets),
  };
}

function normalizeCustomSections(raw: unknown): CustomSection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CustomSection[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const r = s as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id ? r.id : newCustomSectionId();
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
        bullets: asCleanStringArray(r.bullets),
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
                items: asCleanStringArray(cr.items),
              };
            })
          : [],
      });
    } else if (process.env.NODE_ENV !== "production") {
      // Unknown shape — skip with a warning. Don't propagate to the renderer.
      // Dev-only so it doesn't spam server logs (normalize runs on every read).
      console.warn(
        `[resume] dropping custom section with unknown shape: ${String(r.shape)}`,
      );
    }
  }
  return out;
}

export const RESUME: Resume = {
  name: "Yuan Jia",
  tagline: "Platform engineer building with AI coding agents",
  location: "Santa Clara, CA",
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
    },
  ] satisfies EducationItem[],

  skills: [
    {
      name: "AI Tools",
      items: [
        "Claude Code",
        "Codex CLI",
        "Copilot CLI",
        "Gemini CLI",
        "Anthropic API",
        "OpenAI API",
        "agent workflow design (spec→plan→execute)",
        "parallel git-worktree sessions",
      ],
    },
    {
      name: "Languages",
      items: ["TypeScript", "Python", "Bash", "C/C++"],
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
        "Tailscale",
        "GitHub Actions",
        "Linux/Ubuntu",
      ],
    },
    {
      name: "Testing",
      items: ["Vitest", "Playwright", "pytest", "bats", "tree-sitter"],
    },
  ] satisfies SkillCategory[],

  projects: [
    {
      name: "Flyer",
      title: "Platform Engineer · 5-person agent-driven team",
      period: "2025 – Present",
      link: { label: "joinflyer.com", href: "https://joinflyer.com" },
      stack: [
        "TypeScript",
        "Next.js 16",
        "PostgreSQL 16",
        "NextAuth v5",
        "Docker",
        "AWS EC2 Graviton (ARM64)",
        "Claude Code / Copilot CLI",
      ],
      summary:
        "Production event platform built ground-up by a 5-person team driving AI coding agents (~70k LOC). Engineered the guardrails — deploy pipeline, security, disaster recovery — that make agent-driven shipping safe.",
      bullets: [
        "**Designed a multi-mode GitHub Actions deploy workflow** with post-deploy health probes and auto-rollback from a deploy-history ledger — a bad agent-authored deploy reverts itself in under two minutes.",
        "**Built a deploy state machine in Bash** with remote locking, drift detection, and a CI-gating layer that blocks promotion until tests for the exact deploy commit pass — two prod-mutating ops can't interleave even when multiple agent sessions race the same branch.",
        "**Locked down the CI deploy key** with a forced-command wrapper, strict argument allowlist, and audited invocations — a leaked key (or a misbehaving agent) can't open an interactive shell.",
        "**Hardened the stack end-to-end** — daily encrypted Postgres → S3 backups (verified via live restore), migrated off a DB superuser to a least-privilege role, closed a PII leak in proxy logs, and SHA-pinned third-party actions with shell linting + bats coverage on every infra script.",
        "**Migrated all CI + deploy jobs onto self-hosted runner pools** behind a Tailscale mesh — ephemeral pods per job, zero idle compute; CI rode through a hosted-runner billing outage that would've blocked any cloud-runner job.",
      ],
    },
    {
      name: "Homelab",
      title: "Self-hosted CI for the agent-built pipeline",
      period: "2026 – Present",
      stack: [
        "k3s",
        "Actions Runner Controller",
        "GitHub Actions",
        "Tailscale",
        "Ubuntu 24.04",
        "Lima (Apple Silicon arm64 VM)",
      ],
      summary:
        "Mixed-arch k3s cluster on repurposed Intel + Apple Silicon hardware; hosts ephemeral GitHub Actions runner pools that keep Flyer's agent-built CI cheap, fast, and outage-resilient.",
      bullets: [
        "**Built a mixed-arch k3s cluster on repurposed Intel + Apple Silicon hardware** running Actions Runner Controller — each CI job spawns an ephemeral pod (clean filesystem, zero idle compute).",
        "**Cut Flyer CI wall-clock by ~75% end-to-end** with a custom multi-arch runner image, in-cluster caches replacing hosted artifact caches, and an arm64-native pool that skips QEMU emulation for build + heavy test jobs.",
      ],
    },
    {
      name: "StyleBench",
      title: "Master's Capstone — Empirical Study of AI Coding Agents",
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
        "Empirical study of whether code style affects AI coding-agent bug-fix performance — a head-to-head benchmark of Claude Code, Codex CLI, and Gemini CLI under controlled stylistic variants.",
      bullets: [
        "**Ran a ~2,000-trial benchmark** of Claude Code / Codex CLI / Gemini CLI on real-world bug-fix tasks across 4 Python projects (~20k LOC, 3,000+ tests), 6 stylistic variants, and 14 mutation types.",
        "**Built a tree-sitter AST transformation framework** + a multi-agent harness with pluggable CLI adapters — checkpoint-resume on rate limits, deterministic manifest mode for byte-identical inputs, and process-group cleanup on timeout.",
        "**Code style had no statistically significant effect on agent fix rate** (p ≈ 1.0, ~1pp spread); repository difficulty and mutation type dominated by ~30pp each.",
      ],
    },
  ] satisfies Entry[],
};
