/**
 * parse-md.ts — bidirectional markdown ↔ Resume converter.
 *
 * Markdown format:
 *
 *   ---
 *   name: Yuan Jia
 *   tagline: Platform engineer building with AI coding agents
 *   location: Santa Clara, CA
 *   lastUpdated: May 2026
 *   phone: 859-608-4045
 *   email: hello.yuanjia@gmail.com
 *   linkedin: linkedin.com/in/yuanjia1
 *   github: github.com/yuan0-0jia
 *   site: yuanjia.page
 *   ---
 *
 *   ## Experience
 *
 *   ### Flyer — Platform Engineer · 5-person agent-driven team  *(2025 – Present)*
 *
 *   [joinflyer.com](https://joinflyer.com)
 *
 *   `TypeScript` `Next.js 16` `Docker`
 *
 *   > One-line summary sentence.
 *
 *   - **Bold lead** rest of bullet.
 *
 *   ## Skills
 *
 *   - **AI Tools** · Claude Code · Codex CLI · Copilot CLI
 *
 *   ## Education
 *
 *   - **UC Santa Cruz** · Master of Science: CS · 2024–2026
 */

import type {
  Resume,
  EducationItem,
  SkillCategory,
  Entry,
  CustomSection,
} from "./data";
import {
  newCustomSectionId,
  resolveSectionOrder,
  DEFAULT_SECTION_TITLES,
} from "./data";
import {
  parseFrontmatter,
  splitFrontmatter,
  LABEL_TO_KEY,
} from "./parse-frontmatter";

// ─── Frontmatter parsing now lives in parse-frontmatter.ts (shared with the
//     pager's parse-blocks.ts so the two parsers can't drift on contact
//     handling). The rest of this file is body-section parsing. ─────────────

// ─── Entry parser ────────────────────────────────────────────────────────────

// ### Flyer — Platform Engineer · 5-person agent-driven team  *(2025 – Present)*
const ENTRY_HEADING = /^###\s+(.+?)(?:\s+[—–]\s+(.+?))?(?:\s+\*\(([^)]+)\)\*\s*)?$/;

function parseEntryBlock(lines: string[]): Entry {
  const entry: Entry = { name: "", stack: [], bullets: [] };
  const m = ENTRY_HEADING.exec(lines[0]?.trim() ?? "");
  if (m) {
    entry.name = m[1].trim();
    if (m[2]) entry.title = m[2].trim();
    if (m[3]) entry.period = m[3].trim();
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // repo: [label](href)
    if (line.toLowerCase().startsWith("repo:")) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(line);
      if (lm) entry.repo = { label: lm[1], href: lm[2] };
      continue;
    }

    // Standalone markdown link → entry.link
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(line);
    if (linkMatch) {
      entry.link = { label: linkMatch[1], href: linkMatch[2] };
      continue;
    }

    // Backtick stack line
    if (line.startsWith("`")) {
      const tokens = [...line.matchAll(/`([^`]+)`/g)].map((t) => t[1]);
      if (tokens.length > 0) { entry.stack = tokens; continue; }
    }

    // Blockquote summary
    if (line.startsWith(">")) {
      entry.summary = line.slice(1).trim();
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      entry.bullets.push(line.slice(2).trim());
    }
  }

  return entry;
}

function parseEntriesSection(lines: string[]): Entry[] {
  const entries: Entry[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) { entries.push(parseEntryBlock(buffer)); buffer = []; }
  };

  for (const line of lines) {
    if (/^###\s/.test(line)) { flush(); buffer = [line]; }
    else buffer.push(line);
  }
  flush();
  return entries;
}

// ─── Skills / Education parsers ───────────────────────────────────────────────

// - **AI Tools** · item · item
function parseSkillsSection(lines: string[]): SkillCategory[] {
  const cats: SkillCategory[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l.startsWith("- ") && !l.startsWith("* ")) continue;
    const parts = l.slice(2).split(/\s*·\s*/);
    const name = parts[0].replace(/^\*\*|\*\*$/g, "").trim();
    const items = parts.slice(1).filter((p) => p.length > 0);
    cats.push({ name, items });
  }
  return cats;
}

// - **School** · degree · period
function parseEducationSection(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (!l.startsWith("- ") && !l.startsWith("* ")) continue;
    const parts = l.slice(2).split(/\s*·\s*/);
    if (parts.length < 2) continue;
    const school = parts[0].replace(/^\*\*|\*\*$/g, "").trim();
    const degree = parts[1].trim();
    const period = parts[2]?.trim() ?? "";
    items.push({ school, degree, period });
  }
  return items;
}

// ─── Custom section parser ────────────────────────────────────────────────────

function parseCustomSection(title: string, lines: string[], id: string): CustomSection {
  if (lines.some((l) => /^###\s/.test(l))) {
    return { id, shape: "entries", title, entries: parseEntriesSection(lines) };
  }
  const bulletLines = lines.filter((l) => /^\s*[-*]\s/.test(l));
  if (bulletLines.length > 0 && bulletLines.every((l) => /^\s*[-*]\s+\*\*/.test(l))) {
    return { id, shape: "categories", title, categories: parseSkillsSection(lines) };
  }
  const bullets = bulletLines.map((l) => l.trim().replace(/^[-*]\s+/, ""));
  return { id, shape: "bullets", title, bullets };
}

// ─── Section type detection ───────────────────────────────────────────────────

function getSectionType(title: string): "projects" | "skills" | "education" | "custom" {
  const t = title.toLowerCase();
  if (["experience", "experiences", "projects", "project"].includes(t)) return "projects";
  if (["skills", "skill"].includes(t)) return "skills";
  if (t === "education") return "education";
  return "custom";
}

// ─── Public: parseMd ─────────────────────────────────────────────────────────

export function parseMd(markdown: string): Resume {
  const { fm: fmText, body } = splitFrontmatter(markdown);
  const fm = parseFrontmatter(fmText);

  // Split body into ## sections
  type RawSection = { title: string; lines: string[] };
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  for (const line of body.split("\n")) {
    if (/^##\s/.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  const sectionTitles: Resume["sectionTitles"] = {};
  const sectionOrder: string[] = [];
  const customSections: CustomSection[] = [];
  let projects: Entry[] = [];
  let skills: SkillCategory[] = [];
  let education: EducationItem[] = [];

  for (const sec of sections) {
    const type = getSectionType(sec.title);
    if (type === "projects") {
      projects = parseEntriesSection(sec.lines);
      sectionTitles.projects = sec.title;
      if (!sectionOrder.includes("projects")) sectionOrder.push("projects");
    } else if (type === "skills") {
      skills = parseSkillsSection(sec.lines);
      sectionTitles.skills = sec.title;
      if (!sectionOrder.includes("skills")) sectionOrder.push("skills");
    } else if (type === "education") {
      education = parseEducationSection(sec.lines);
      sectionTitles.education = sec.title;
      if (!sectionOrder.includes("education")) sectionOrder.push("education");
    } else {
      const id = newCustomSectionId();
      customSections.push(parseCustomSection(sec.title, sec.lines, id));
      sectionOrder.push(id);
    }
  }

  return {
    name: fm.name ?? "",
    tagline: fm.tagline,
    location: fm.location,
    lastUpdated: fm.lastUpdated,
    contact: fm.contact ?? [],
    education,
    skills,
    projects,
    sectionTitles: Object.keys(sectionTitles).length ? sectionTitles : undefined,
    sectionOrder: sectionOrder.length ? sectionOrder : undefined,
    customSections: customSections.length ? customSections : undefined,
  };
}

// ─── Public: resumeToMd ───────────────────────────────────────────────────────

function serializeEntry(entry: Entry): string[] {
  const lines: string[] = [];

  let heading = `### ${entry.name}`;
  if (entry.title) heading += ` — ${entry.title}`;
  if (entry.period) heading += `  *(${entry.period})*`;
  lines.push(heading, "");

  if (entry.link) lines.push(`[${entry.link.label}](${entry.link.href})`, "");
  if (entry.repo) lines.push(`repo: [${entry.repo.label}](${entry.repo.href})`, "");
  if (entry.stack.length) lines.push(entry.stack.map((s) => `\`${s}\``).join(" "), "");
  if (entry.summary) lines.push(`> ${entry.summary}`, "");
  for (const b of entry.bullets) lines.push(`- ${b}`);
  lines.push("");

  return lines;
}

function contactKeyFor(label: string): string {
  return LABEL_TO_KEY[label.toLowerCase()] ?? label.toLowerCase();
}

export function resumeToMd(resume: Resume): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`name: ${resume.name}`);
  if (resume.tagline) lines.push(`tagline: ${resume.tagline}`);
  if (resume.location) lines.push(`location: ${resume.location}`);
  if (resume.lastUpdated) lines.push(`lastUpdated: ${resume.lastUpdated}`);
  for (const c of resume.contact) {
    lines.push(`${contactKeyFor(c.label)}: ${c.value}`);
  }
  lines.push("---", "");

  const order = resolveSectionOrder(resume.sectionOrder, resume.customSections);

  for (const id of order) {
    if (id === "projects") {
      const title = resume.sectionTitles?.projects ?? DEFAULT_SECTION_TITLES.projects;
      lines.push(`## ${title}`, "");
      for (const e of resume.projects) lines.push(...serializeEntry(e));
    } else if (id === "skills") {
      const title = resume.sectionTitles?.skills ?? DEFAULT_SECTION_TITLES.skills;
      lines.push(`## ${title}`, "");
      for (const cat of resume.skills) {
        lines.push(`- **${cat.name}** · ${cat.items.join(" · ")}`);
      }
      lines.push("");
    } else if (id === "education") {
      const title = resume.sectionTitles?.education ?? DEFAULT_SECTION_TITLES.education;
      lines.push(`## ${title}`, "");
      for (const edu of resume.education) {
        lines.push(`- **${edu.school}** · ${edu.degree} · ${edu.period}`);
      }
      lines.push("");
    } else {
      const cs = resume.customSections?.find((s) => s.id === id);
      if (!cs) continue;
      lines.push(`## ${cs.title}`, "");
      if (cs.shape === "entries") {
        for (const e of cs.entries) lines.push(...serializeEntry(e));
      } else if (cs.shape === "categories") {
        for (const cat of cs.categories) {
          lines.push(`- **${cat.name}** · ${cat.items.join(" · ")}`);
        }
        lines.push("");
      } else {
        for (const b of cs.bullets) lines.push(`- ${b}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
