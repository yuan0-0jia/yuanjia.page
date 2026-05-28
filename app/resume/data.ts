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
        "Production event platform built ground-up by a 5-person team driving AI coding agents (~77k LOC). Engineered the guardrails — deploy pipeline, security, disaster recovery — that make agent-driven shipping safe.",
      bullets: [
        "**Designed a multi-mode GitHub Actions deploy workflow** with post-deploy health probes and auto-rollback from a deploy-history ledger — a bad agent-authored deploy reverts itself in under two minutes.",
        "**Built a deploy state machine in Bash** with remote locking, drift detection, and a CI-gating layer that blocks promotion until tests for the exact deploy commit pass — two prod-mutating ops can't interleave even when multiple agent sessions race the same branch.",
        "**Locked down the CI deploy key** with a forced-command wrapper, strict argument allowlist, and audited invocations — a leaked key (or a misbehaving agent) can't open an interactive shell.",
        "**Hardened the stack end-to-end** — daily encrypted Postgres → S3 backups (restore-tested via a scratch-container drill), migrated off a DB superuser to a least-privilege role, closed a PII leak in proxy logs, and SHA-pinned third-party actions with shell linting + bats coverage on every infra script.",
        "**Migrated all CI + deploy jobs onto a self-hosted k3s runner cluster** (Actions Runner Controller, ephemeral pod per job) — CI rode through a hosted-runner billing outage that would've blocked any cloud-runner job.",
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
        "Ubuntu 24.04",
        "Lima (Apple Silicon arm64 VM)",
      ],
      summary:
        "Mixed-arch k3s cluster on repurposed Intel + Apple Silicon hardware; hosts ephemeral GitHub Actions runner pools that keep Flyer's agent-built CI cheap, fast, and outage-resilient.",
      bullets: [
        "**Built a 3-node mixed-arch k3s cluster on repurposed Intel + Apple Silicon hardware** running Actions Runner Controller — each CI job spawns an ephemeral pod (clean filesystem; runner pools scale to zero when idle).",
        "**Cut Flyer CI wall-clock ~42% end-to-end (13m35s → 7m50s)** with a custom multi-arch runner image, node-local npm/Playwright caches that replaced WAN-bound hosted caches, and an arm64-native pool that skips QEMU emulation for build + heavy test jobs.",
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
        "matplotlib",
        "Claude Code",
        "Codex CLI",
        "Gemini CLI",
        "uv",
        "ruff",
      ],
      summary:
        "Empirical study of whether source-code style affects AI coding-agent bug-fix performance — a 1,920-trial benchmark on Claude Code under six controlled stylistic variants, run on a pluggable harness built for Claude Code, Codex CLI, and Gemini CLI.",
      bullets: [
        "**Ran a 1,920-trial bug-fix benchmark on Claude Code (Haiku 4.5)** across 4 real-world Python projects (~20k LOC, 3,000+ tests), 6 stylistic variants, and 14 mutation types — plus an 80-trial Codex CLI pilot.",
        "**Built a tree-sitter AST transformation framework** + a multi-agent harness with pluggable CLI adapters (Claude Code, Codex CLI, Gemini CLI) — checkpoint-resume on rate limits, deterministic manifest mode for byte-identical inputs, and process-group cleanup on timeout.",
        "**Code style had no statistically significant effect on agent fix rate** (p ≈ 1.0, ~1pp spread); repository difficulty and mutation type dominated by ~30pp each.",
      ],
    },
  ] satisfies Entry[],
};
