"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "../resume/parse-blocks";
import { parseBlocks, formatInline } from "../resume/parse-blocks";
import "./less-pager.css";

// Respect prefers-reduced-motion for JS-driven smooth scrolls — CSS-only
// transitions are already covered by the .yjt-root reduced-motion rule.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = (): ScrollBehavior =>
  prefersReducedMotion() ? "auto" : "smooth";

// Approximate "line height" used to translate scrollTop → "lines 1–N of M".
// Initialized from CSS at mount so it stays accurate if the font-size or
// line-height in .less-pager.css changes.
const FALLBACK_LINE_HEIGHT_PX = 13.5 * 1.65;

// `less ~/resume.md` viewer. Takes over the terminal body pane the same way
// NanoEditor does — no overlay, no nested chrome. The parent yjt-window stays
// as the surrounding chrome.
//
// Rendering model: the markdown source is parsed into a flat block stream
// (h2 / h3 / p / ul / ol / quote / hr) and rendered as standard HTML with
// site-specific typography. Frontmatter is the one departure from raw markdown
// — it gets projected into a header band (h1 + subtitle + contact links row)
// so visitors don't see raw `---` YAML. When the file has no frontmatter, the
// header band is skipped and the body renders from line 1.
export default function LessPager({
  markdown,
  onClose,
}: {
  markdown: string;
  onClose: () => void;
}) {
  // Parse once per markdown string. parseBlocks is pure and cheap; memoizing
  // also stabilizes object identity for downstream effects.
  const doc = useMemo(() => parseBlocks(markdown), [markdown]);
  const fm = doc.frontmatter;

  const viewportRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lineHeightRef = useRef(FALLBACK_LINE_HEIGHT_PX);

  // Position readout — recomputed on scroll, on mount, after fonts settle.
  const [pos, setPos] = useState({ top: 1, bottom: 1, total: 1 });
  const [pct, setPct] = useState(0);
  const updatePosition = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const lh = lineHeightRef.current;
    const total = Math.max(1, Math.round(vp.scrollHeight / lh));
    const top = Math.round(vp.scrollTop / lh) + 1;
    const view = Math.max(1, Math.round(vp.clientHeight / lh));
    const bottom = Math.min(total, top + view - 1);
    setPos({ top, bottom, total });
    const max = vp.scrollHeight - vp.clientHeight;
    setPct(max <= 0 ? 100 : Math.round((vp.scrollTop / max) * 100));
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (vp) {
      // Resolve actual line-height from computed style so the position
      // readout doesn't drift if CSS font sizing changes.
      const cs = window.getComputedStyle(vp);
      const parsed = parseFloat(cs.lineHeight);
      if (Number.isFinite(parsed) && parsed > 0) lineHeightRef.current = parsed;
    }
    requestAnimationFrame(updatePosition);
    viewportRef.current?.focus({ preventScroll: true });
  }, [updatePosition]);

  // ─── Search ──────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState<{ idx: number; total: number } | null>(null);
  const matchesRef = useRef<HTMLSpanElement[]>([]);
  const currentMatchRef = useRef(-1);

  const clearMatches = useCallback(() => {
    matchesRef.current.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
      parent.normalize();
    });
    matchesRef.current = [];
    currentMatchRef.current = -1;
  }, []);

  // Belt-and-suspenders cleanup: React unmounts the whole subtree on close
  // (so the highlight spans go with it), but flushing the refs keeps the
  // mutation state from sticking around if the component is ever moved
  // rather than torn down.
  useEffect(() => () => clearMatches(), [clearMatches]);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const applyHighlights = useCallback(
    (q: string) => {
      clearMatches();
      if (!q) {
        setMatchCount(null);
        return;
      }
      const vp = viewportRef.current;
      if (!vp) return;
      const re = new RegExp(escapeRegExp(q), "gi");
      const walker = document.createTreeWalker(vp, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      const collected: HTMLSpanElement[] = [];
      nodes.forEach((node) => {
        const text = node.nodeValue ?? "";
        if (!re.test(text)) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const span = document.createElement("span");
          span.className = "less-hi";
          span.textContent = m[0];
          frag.appendChild(span);
          collected.push(span);
          last = re.lastIndex;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode?.replaceChild(frag, node);
      });
      matchesRef.current = collected;
      if (collected.length > 0) {
        currentMatchRef.current = 0;
        collected[0].classList.add("is-current");
        collected[0].scrollIntoView({ behavior: scrollBehavior(), block: "center" });
        setMatchCount({ idx: 1, total: collected.length });
      } else {
        setMatchCount({ idx: 0, total: 0 });
      }
    },
    [clearMatches]
  );

  const moveToMatch = useCallback((dir: 1 | -1) => {
    const list = matchesRef.current;
    if (list.length === 0) return;
    list[currentMatchRef.current]?.classList.remove("is-current");
    currentMatchRef.current = (currentMatchRef.current + dir + list.length) % list.length;
    const el = list[currentMatchRef.current];
    el.classList.add("is-current");
    el.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    setMatchCount({ idx: currentMatchRef.current + 1, total: list.length });
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    clearMatches();
    setMatchCount(null);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [clearMatches]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    // Don't clear matches — highlights persist so n/N navigation keeps working.
    // A new / press calls openSearch which calls clearMatches first.
    viewportRef.current?.focus();
  }, []);

  // ─── Keyboard nav ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const vp = viewportRef.current;
      if (!vp) return;
      if (document.activeElement === searchInputRef.current) {
        if (e.key === "Escape") {
          closeSearch();
          e.preventDefault();
        } else if (e.key === "Enter") {
          moveToMatch(+1);
          e.preventDefault();
        }
        return;
      }
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          vp.scrollBy({ top: lineHeightRef.current * 2, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case "k":
        case "ArrowUp":
          vp.scrollBy({ top: -lineHeightRef.current * 2, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case " ":
        case "PageDown":
          vp.scrollBy({ top: vp.clientHeight * 0.9, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case "b":
        case "PageUp":
          vp.scrollBy({ top: -vp.clientHeight * 0.9, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case "g":
          vp.scrollTo({ top: 0, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case "G":
          vp.scrollTo({ top: vp.scrollHeight, behavior: scrollBehavior() });
          e.preventDefault();
          break;
        case "/":
          openSearch();
          e.preventDefault();
          break;
        case "n":
          moveToMatch(+1);
          e.preventDefault();
          break;
        case "N":
          moveToMatch(-1);
          e.preventDefault();
          break;
        case "q":
        case "Escape":
          onClose();
          e.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeSearch, moveToMatch, openSearch]);

  // ─── Block renderer ──────────────────────────────────────────────────────
  // The pager renders the parsed block stream as standard HTML — markdown
  // semantics 1:1. Frontmatter is projected into the header band below.
  // Inline marks are React children (not dangerouslySetInnerHTML) so React
  // owns the subtree and won't wipe the highlight spans we inject at runtime.
  const renderBlock = (block: Block, i: number) => {
    switch (block.kind) {
      case "h2":
        return (
          <h2 key={i} className="less-h2">
            {formatInline(block.text)}
            <span className="rule"></span>
          </h2>
        );
      case "h3":
        return (
          <h3 key={i} className="less-h3">
            {formatInline(block.text)}
          </h3>
        );
      case "p":
        return (
          <p key={i} className="less-p">
            {formatInline(block.text)}
          </p>
        );
      case "ul":
        return (
          <ul key={i} className="less-bullets">
            {block.items.map((it, j) => (
              <li key={j}>{formatInline(it)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} className="less-ol">
            {block.items.map((it, j) => (
              <li key={j}>{formatInline(it)}</li>
            ))}
          </ol>
        );
      case "quote":
        return (
          <blockquote key={i} className="less-blockquote">
            {formatInline(block.text)}
          </blockquote>
        );
      case "hr":
        return <hr key={i} className="less-hr" />;
    }
  };

  const contactLinks = (fm?.contact ?? [])
    .filter((c) => c.value)
    .map((c, i, arr) => (
      <span key={i}>
        {c.href ? (
          <a
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            {c.value}
          </a>
        ) : (
          <span>{c.value}</span>
        )}
        {i < arr.length - 1 && <span className="pipe">|</span>}
      </span>
    ));


  return (
    <div className="less-host" role="region" aria-label="less ~/resume.md">
      <div className="less-statusbar">
        <div className="left">
          <span className="file">resume.md</span>
          <span className="pos">
            lines {pos.top}–{pos.bottom} of {pos.total}
          </span>
        </div>
        <div className="right">
          {fm?.lastUpdated && <span>{fm.lastUpdated.toLowerCase()}</span>}
          <span className="pct">{pct}%</span>
        </div>
      </div>

      <div className="less-viewport" ref={viewportRef} tabIndex={0} onScroll={updatePosition}>
        {fm && (
          <>
            {fm.name && <h1 className="less-h1">{fm.name}</h1>}
            {(fm.tagline || fm.location) && (
              <p className="less-sub">
                {fm.tagline}
                {fm.tagline && fm.location && <span className="pipe">|</span>}
                {fm.location}
              </p>
            )}
            {contactLinks.length > 0 && <p className="less-contact">{contactLinks}</p>}
            <hr className="less-hr" />
          </>
        )}

        {doc.blocks.map(renderBlock)}

        <div className="less-eof">END</div>
      </div>

      <div className={`less-cmd${searchOpen ? " is-searching" : ""}`}>
        {/* Stack both rows in the same grid cell so the bar reserves the
            menu's natural height — switching to search swaps visibility
            instead of resizing the bar. */}
        <div className="less-cmd-stack">
          <div className="keys-row" aria-hidden={searchOpen}>
            <span className="key">
              <kbd>:q</kbd> close
            </span>
            <span className="key">
              <kbd>/</kbd> search
            </span>
            <span className="key">
              <kbd>n</kbd>/<kbd>N</kbd> next/prev
            </span>
            <span className="key">
              <kbd>j</kbd>/<kbd>k</kbd> scroll
            </span>
          </div>
          <div className="less-search is-open" aria-hidden={!searchOpen}>
            <span className="slash">/</span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                applyHighlights(e.target.value.trim());
              }}
              placeholder="search…"
              autoComplete="off"
              spellCheck={false}
              tabIndex={searchOpen ? 0 : -1}
            />
            {matchCount && (
              <span className="count">
                {matchCount.total === 0 ? "no match" : `${matchCount.idx}/${matchCount.total}`}
              </span>
            )}
            {matchCount && matchCount.total > 0 && (
              <>
                <button
                  type="button"
                  className="match-nav"
                  onClick={() => moveToMatch(-1)}
                  aria-label="Previous match"
                  tabIndex={searchOpen ? 0 : -1}
                >▲</button>
                <button
                  type="button"
                  className="match-nav"
                  onClick={() => moveToMatch(+1)}
                  aria-label="Next match"
                  tabIndex={searchOpen ? 0 : -1}
                >▼</button>
              </>
            )}
          </div>
        </div>
        <div className="spacer"></div>
        <button
          type="button"
          className="esc"
          onClick={onClose}
          aria-label="Close pager"
        >
          esc
        </button>
      </div>
    </div>
  );
}
