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
    } else {
      // Unknown shape — skip with a warning. Don't propagate to the renderer.
      console.warn(
        `[resume] dropping custom section with unknown shape: ${String(r.shape)}`,
      );
    }
  }
  return out;
}

export const RESUME: Resume = {
  name: "Yuan Jia",
  tagline: "Software Engineer",
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
      title: "Platform Engineer (Co-author on a 5-person team)",
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
        "**Built a 3-mode GitHub Actions deploy workflow** with post-deploy SHA probe + auto-rollback via a `.deploy-history` ledger — broken-deploy MTTR ~90s.",
        "**Built a `wait-for-ci` gate on auto-deploy** — polls the GitHub Actions API for the deploy SHA (15s interval, 15min cap) and blocks promotion until CI concludes green; closes a race where deploys could ship ahead of in-flight CI on the same commit.",
        "**Restricted the CI deploy SSH key with an `authorized_keys` forced-command wrapper** — strict `IMAGE_TAG` regex, op allowlist, audited invocations; a leaked key can't open a shell.",
        "**Built a schema-versioned deploy state machine in Bash** — one remote `flock` for the full lifecycle + a `peek_claim` gate on drift CI; two prod-mutating ops can't interleave.",
        "**Shipped daily PostgreSQL → S3 backups** with `pg_dump | gzip` integrity checks, 14-day lifecycle, EC2 instance-profile auth (no static AWS keys); verified via live restore drill from prod.",
        "**Migrated PostgreSQL from superuser to a least-privilege role** via idempotent `public`-schema ownership transfer — SQL-injection blast radius cut from full DBA to app-scoped data.",
        "**Stripped a JWT-payload PII leak from proxy logs** — every authenticated request was logging the decoded session token (email, name, image URL, admin state); replaced with safe diagnostics scoped to the unauthenticated redirect path.",
        "**Hardened CI against supply-chain + drift risks** — SHA-pinned third-party actions, an SSH-based prod-drift check, and `shellcheck` + `bats` coverage on every infra script.",
        "**Migrated 100% of CI + deploy jobs onto self-hosted homelab runner pools** — ephemeral pods across three pools (mac-mini, Dell async, M2 ARM64) in the Tailscale mesh, including the path-filter fan-out gate; CI rode through a May 2026 GitHub Actions billing outage that would've blocked any hosted-runner job.",
        "**Led the production domain cutover** from `heywhatsup.app` to `joinflyer.com` — DNS, dual Let's Encrypt certs, host-based 301s, Resend DKIM swap, NextAuth + Google OAuth callbacks, PWA service-worker cache-name bump.",
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
        "Lima (Apple Silicon arm64 VM)",
      ],
      summary:
        "Three-node mixed-arch k3s cluster — Dell desktop + Mac mini on Ubuntu 24.04 (Intel) + an Ubuntu-ARM64 Lima VM on an M2 MacBook (Apple Silicon); hosts ephemeral GitHub Actions runner pools for Flyer across three roles.",
      bullets: [
        "**Built a 3-node mixed-arch k3s cluster** on repurposed hardware — Dell desktop + Mac mini on Ubuntu 24.04 (Intel) + an Ubuntu-ARM64 Lima VM on an M2 MacBook — running **Actions Runner Controller (ARC)** across three scale sets (`homelab`, `homelab-async`, `homelab-arm64`); each Flyer CI job spawns an ephemeral pod (clean filesystem per job, zero idle compute).",
        "**Cut Flyer CI wall-clock 31:30 → ~7:50 (~75%) end-to-end** — staged through a custom multi-arch runner image (psql, `docker compose` v2, Playwright deps, `shellcheck`/`bats`/`actionlint` baked in), k3s `hostPath` caches replacing `actions/cache`, an x86 two-pool split, and an M2 ARM64 pool that runs build + CPU-heavy test jobs arm64-native (no QEMU emulation).",
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
        "**Ran a 1,920-trial benchmark** measuring whether code style affects AI coding-agent bug-fix rates — 4 Python projects (~20k LOC, 3,039 tests), 6 styles, 14 mutation types, 2 evaluation modes.",
        "**Built a tree-sitter AST transformation framework** (whitelist renames, `pytest.mark.parametrize` syncing) + a multi-agent harness with Claude Code / Codex CLI / Gemini CLI adapters — checkpoint-resume on rate limits, manifest mode for byte-identical input across agents, process-group termination on timeout.",
        "**Code style had no statistically significant effect on fix rate** (p = 0.998; 1pp spread); repository difficulty (28pp) and mutation type (29pp) dominated.",
      ],
    },
  ] satisfies Entry[],
};
