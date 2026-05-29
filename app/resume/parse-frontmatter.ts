/**
 * parse-frontmatter.ts — shared YAML-ish frontmatter parser used by both
 * `parseMd` (→ typed Resume for /resume route) and `parseBlocks` (→ pager block
 * stream). Centralized here so the two parsers can't drift on contact-key
 * handling, key aliasing, or href inference.
 */

import type { ContactItem } from "./data";

export type Frontmatter = {
  name?: string;
  tagline?: string;
  location?: string;
  lastUpdated?: string;
  contact: ContactItem[];
};

// Contact key (frontmatter key) ↔ display label.
export const KEY_TO_LABEL: Record<string, string> = {
  phone: "Phone",
  tel: "Phone",
  email: "Email",
  mail: "Email",
  linkedin: "LinkedIn",
  github: "GitHub",
  site: "Site",
  website: "Site",
  twitter: "Twitter",
  youtube: "YouTube",
  mastodon: "Mastodon",
};

const RESERVED_KEYS = new Set([
  "name",
  "tagline",
  "location",
  "lastupdated",
  "last-updated",
]);

/** Infer an href from a contact key + value (e.g. `phone: 555…` → `tel:555…`). */
export function inferHref(key: string, value: string): string {
  const k = key.toLowerCase();
  if (k === "phone" || k === "tel") return `tel:${value.replace(/\D/g, "")}`;
  if (k === "email" || k === "mail") return `mailto:${value}`;
  if (/^https?:\/\/|^mailto:|^tel:/.test(value)) return value;
  return `https://${value}`;
}

/**
 * Split a markdown document into its frontmatter block + body. If the file
 * doesn't start with `---`, returns an empty `fm` and the original body — so
 * callers can render the body straight without a header band.
 */
export function splitFrontmatter(md: string): { fm: string; body: string } {
  const lines = md.split("\n");
  if (lines[0]?.trim() !== "---") return { fm: "", body: md };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { fm: "", body: md };
  return {
    fm: lines.slice(1, end).join("\n"),
    body: lines.slice(end + 1).join("\n"),
  };
}

/** Parse the frontmatter block text into a typed Frontmatter object. */
export function parseFrontmatter(block: string): Frontmatter {
  const fm: Frontmatter = { contact: [] };
  if (!block) return fm;

  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!value) continue;

    if (key === "name") { fm.name = value; continue; }
    if (key === "tagline") { fm.tagline = value; continue; }
    if (key === "location") { fm.location = value; continue; }
    if (key === "lastupdated" || key === "last-updated") {
      fm.lastUpdated = value;
      continue;
    }
    if (RESERVED_KEYS.has(key)) continue;

    const label = KEY_TO_LABEL[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
    fm.contact.push({ label, value, href: inferHref(key, value) });
  }
  return fm;
}
