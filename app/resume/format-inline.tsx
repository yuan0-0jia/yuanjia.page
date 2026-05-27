/**
 * format-inline.tsx — shared inline markdown formatter.
 *
 * Single source of truth for inline marks across the entire resume surface:
 * - LessPager (terminal less ~/resume.md)
 * - ResumeScreen (/resume page)
 * - ResumePrint (print view)
 *
 * Returns React nodes (not an HTML string) so React owns the inline subtree.
 * That matters for the pager, which mutates the DOM at runtime to insert
 * search highlights — dangerouslySetInnerHTML would wipe them on re-render.
 *
 * Supported marks: **bold**, *italic*, `code`, [label](url).
 */

import { Fragment, type ReactNode } from "react";

type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "link"; label: string; href: string };

// Tokenize in a single pass: at each position, try each inline pattern in
// priority order. First match wins. This avoids the regex-replace ordering
// hazards of a string-based formatter.
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
