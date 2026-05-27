/**
 * parse-blocks.ts — flat-block markdown walker used by the less pager.
 *
 * Deliberately hand-rolled (not marked / markdown-it): the pager is dynamic-
 * imported, so any added weight hits the resume code-path. We control the
 * input shape (only the owner edits resume.md) and need ~7 block types + 4
 * inline constructs — a hand-rolled walker is ~100 LOC vs. 25-50 KB for a
 * CommonMark library.
 *
 * Block types: h2 | h3 | p | ul | ol | quote | hr
 *
 * What we deliberately don't support: nested lists (flattened), images,
 * tables, setext headings, fenced code blocks. The resume use case doesn't
 * need them and adding them would just be feature creep.
 */

import type { Frontmatter } from "./parse-frontmatter";
import { parseFrontmatter, splitFrontmatter } from "./parse-frontmatter";

export type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

export type ParsedDoc = {
  // null when the file has no frontmatter → caller skips the header band.
  frontmatter: Frontmatter | null;
  blocks: Block[];
};

export function parseBlocks(md: string): ParsedDoc {
  const { fm, body } = splitFrontmatter(md);
  const frontmatter = fm ? parseFrontmatter(fm) : null;
  const blocks: Block[] = [];

  // Buffers for multi-line constructs (paragraph, list, quote).
  let para: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushUl = () => {
    if (ul.length) { blocks.push({ kind: "ul", items: ul }); ul = []; }
  };
  const flushOl = () => {
    if (ol.length) { blocks.push({ kind: "ol", items: ol }); ol = []; }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ kind: "quote", text: quote.join("\n") });
      quote = [];
    }
  };
  const flushAll = () => { flushPara(); flushUl(); flushOl(); flushQuote(); };

  for (const raw of body.split("\n")) {
    const line = raw.replace(/\s+$/, ""); // trim trailing whitespace only
    const trimmed = line.trim();

    // Blank line → close all open blocks
    if (!trimmed) { flushAll(); continue; }

    // ── Block-starters that break any open buffer ─────────────────────────
    if (trimmed === "---" || /^(-\s*){3,}$/.test(trimmed) || /^(\*\s*){3,}$/.test(trimmed)) {
      flushAll();
      blocks.push({ kind: "hr" });
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^##\s+(.+)$/))) {
      flushAll();
      blocks.push({ kind: "h2", text: m[1].trim() });
      continue;
    }
    if ((m = trimmed.match(/^###\s+(.+)$/))) {
      flushAll();
      blocks.push({ kind: "h3", text: m[1].trim() });
      continue;
    }

    // Quote line — group with adjacent quote lines, break paragraphs/lists.
    if ((m = trimmed.match(/^>\s?(.*)$/))) {
      flushPara(); flushUl(); flushOl();
      quote.push(m[1]);
      continue;
    }

    // Unordered list
    if ((m = trimmed.match(/^[-*]\s+(.+)$/))) {
      flushPara(); flushOl(); flushQuote();
      ul.push(m[1].trim());
      continue;
    }

    // Ordered list
    if ((m = trimmed.match(/^\d+\.\s+(.+)$/))) {
      flushPara(); flushUl(); flushQuote();
      ol.push(m[1].trim());
      continue;
    }

    // Otherwise → paragraph. Break any open list/quote first, then append.
    flushUl(); flushOl(); flushQuote();
    para.push(trimmed);
  }
  flushAll();

  return { frontmatter, blocks };
}

// ─── Inline formatter ─────────────────────────────────────────────────────────
// Lives here so the pager renderer stays thin. Handles **bold**, *italic*,
// `code`, and [label](url). Returns a flat array of React nodes so React owns
// the tree — important because the pager mutates the DOM at runtime to insert
// search highlights, and dangerouslySetInnerHTML would cause React to wipe
// those mutations on subsequent re-renders.

import { Fragment, type ReactNode } from "react";

type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "link"; label: string; href: string };

// Tokenize in a single pass: at each position, try each inline pattern in
// priority order. First match wins. This avoids the regex-replace ordering
// hazards of the previous string-based formatter.
function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  let buf = "";
  const flushText = () => {
    if (buf) { tokens.push({ kind: "text", text: buf }); buf = ""; }
  };
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpMatchArray | null;

    if ((m = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/))) {
      flushText();
      tokens.push({ kind: "link", label: m[1], href: m[2] });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      flushText();
      tokens.push({ kind: "bold", text: m[1] });
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^`([^`]+)`/))) {
      flushText();
      tokens.push({ kind: "code", text: m[1] });
      i += m[0].length;
      continue;
    }
    // Italic: require word boundary on both sides to avoid eating * in
    // unrelated contexts (URLs, file globs, etc.)
    const prev = i === 0 ? "" : text[i - 1];
    const wordBoundaryBefore = i === 0 || /[\s(]/.test(prev);
    if (wordBoundaryBefore && (m = rest.match(/^\*(?!\s)([^*\n]+?)\*(?=[\s).,!?:;]|$)/))) {
      flushText();
      tokens.push({ kind: "italic", text: m[1] });
      i += m[0].length;
      continue;
    }
    buf += text[i];
    i += 1;
  }
  flushText();
  return tokens;
}

export function formatInline(text: string): ReactNode {
  const tokens = tokenizeInline(text);
  return tokens.map((tok, idx) => {
    switch (tok.kind) {
      case "text":
        return <Fragment key={idx}>{tok.text}</Fragment>;
      case "code":
        return <code key={idx}>{tok.text}</code>;
      case "bold":
        return <strong key={idx}>{tok.text}</strong>;
      case "italic":
        return <em key={idx}>{tok.text}</em>;
      case "link": {
        const ext = /^https?:\/\//.test(tok.href);
        return (
          <a
            key={idx}
            href={tok.href}
            target={ext ? "_blank" : undefined}
            rel={ext ? "noopener noreferrer" : undefined}
          >
            {tok.label}
          </a>
        );
      }
    }
  });
}
