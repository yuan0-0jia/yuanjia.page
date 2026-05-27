"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Resume } from "../resume/data";
import "./less-pager.css";

// Approximate "line height" used to translate scrollTop → "lines 1–N of M".
// Initialized from CSS at mount so it stays accurate if the font-size or
// line-height in .less-pager.css changes.
const FALLBACK_LINE_HEIGHT_PX = 13.5 * 1.65;

// `less ~/resume.md` viewer. Takes over the terminal body pane the same way
// NanoEditor does — no overlay, no nested chrome. The parent yjt-window stays
// as the surrounding chrome.
export default function LessPager({
  resume,
  onClose,
}: {
  resume: Resume;
  onClose: () => void;
}) {
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
        collected[0].scrollIntoView({ behavior: "smooth", block: "center" });
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
    list[currentMatchRef.current].classList.add("is-current");
    list[currentMatchRef.current].scrollIntoView({ behavior: "smooth", block: "center" });
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
    setSearchQuery("");
    clearMatches();
    setMatchCount(null);
    viewportRef.current?.focus();
  }, [clearMatches]);

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
          vp.scrollBy({ top: lineHeightRef.current * 2, behavior: "smooth" });
          e.preventDefault();
          break;
        case "k":
        case "ArrowUp":
          vp.scrollBy({ top: -lineHeightRef.current * 2, behavior: "smooth" });
          e.preventDefault();
          break;
        case " ":
        case "PageDown":
          vp.scrollBy({ top: vp.clientHeight * 0.9, behavior: "smooth" });
          e.preventDefault();
          break;
        case "b":
        case "PageUp":
          vp.scrollBy({ top: -vp.clientHeight * 0.9, behavior: "smooth" });
          e.preventDefault();
          break;
        case "g":
          vp.scrollTo({ top: 0, behavior: "smooth" });
          e.preventDefault();
          break;
        case "G":
          vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
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

  // ─── Derived content ─────────────────────────────────────────────────────
  const expEntries =
    resume.projects.length > 0
      ? [{ title: resume.sectionTitles?.projects ?? "Experience", entries: resume.projects }]
      : [];
  for (const cs of resume.customSections ?? []) {
    if (cs.shape === "entries" && cs.entries.length > 0) {
      expEntries.push({ title: cs.title, entries: cs.entries });
    }
  }

  const contactLinks = resume.contact
    .filter((c) => c.value)
    .map((c, i) => (
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
        {i < resume.contact.length - 1 && <span className="pipe">|</span>}
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
          {resume.lastUpdated && <span>{resume.lastUpdated.toLowerCase()}</span>}
          <span className="pct">{pct}%</span>
        </div>
      </div>

      <div className="less-viewport" ref={viewportRef} tabIndex={0} onScroll={updatePosition}>
        <h1 className="less-h1">{resume.name}</h1>
        <p className="less-sub">
          {resume.tagline}
          {resume.tagline && resume.location && <span className="pipe">|</span>}
          {resume.location}
        </p>
        {contactLinks.length > 0 && <p className="less-contact">{contactLinks}</p>}

        <hr className="less-hr" />

        {expEntries.map(({ title, entries }) => (
          <section key={title}>
            <h2 className="less-h2">
              {title.toLowerCase()}
              <span className="rule"></span>
            </h2>
            {entries.map((entry, i) => (
              <article key={i} className="less-entry">
                <div className="less-entry-head">
                  <div className="less-entry-name">
                    {entry.name}
                    {entry.title && (
                      <>
                        <span className="sep">—</span>
                        <span className="role">{entry.title}</span>
                      </>
                    )}
                  </div>
                  {entry.period && <div className="less-entry-period">{entry.period}</div>}
                </div>
                {entry.stack.length > 0 && (
                  <div className="less-entry-stack">
                    {entry.stack.map((s) => s.toLowerCase()).join(" · ")}
                  </div>
                )}
                {entry.summary && <div className="less-entry-summary">{entry.summary}</div>}
                {entry.bullets.length > 0 && (
                  <ul className="less-bullets">
                    {entry.bullets.map((b, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: formatBullet(b) }} />
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        ))}

        {resume.skills.length > 0 && (
          <section>
            <h2 className="less-h2">
              {(resume.sectionTitles?.skills ?? "Skills").toLowerCase()}
              <span className="rule"></span>
            </h2>
            <dl className="less-skills">
              {resume.skills.map((cat) => (
                <div key={cat.name} className="less-skill-row">
                  <dt>{cat.name}</dt>
                  <dd>
                    {cat.items.map((item, idx) => (
                      <span key={item}>
                        {item}
                        {idx < cat.items.length - 1 && <span className="bullet">·</span>}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {resume.education.length > 0 && (
          <section>
            <h2 className="less-h2">
              {(resume.sectionTitles?.education ?? "Education").toLowerCase()}
              <span className="rule"></span>
            </h2>
            {resume.education.map((ed, i) => (
              <div key={i} className="less-edu">
                <div>
                  <span className="school">{ed.school}</span>
                  {ed.period && <span className="period"> · {ed.period}</span>}
                </div>
                <div className="deg">{ed.degree}</div>
              </div>
            ))}
          </section>
        )}

        <div className="less-eof">END</div>
      </div>

      <div className={`less-cmd${searchOpen ? " is-searching" : ""}`}>
        {!searchOpen ? (
          <div className="keys-row">
            <span className="key">
              <kbd>:q</kbd> close
            </span>
            <span className="key">
              <kbd>/</kbd> search
            </span>
            <span className="key">
              <kbd>j</kbd>/<kbd>k</kbd> scroll
            </span>
            <span className="key">
              <kbd>g</kbd>/<kbd>G</kbd> top/bottom
            </span>
            <span className="key">
              <kbd>n</kbd>/<kbd>N</kbd> next/prev match
            </span>
          </div>
        ) : (
          <div className="less-search is-open">
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
            />
            {matchCount && (
              <span className="count">
                {matchCount.total === 0 ? "no match" : `${matchCount.idx}/${matchCount.total}`}
              </span>
            )}
          </div>
        )}
        <div className="spacer"></div>
        <span className="esc">esc</span>
      </div>
    </div>
  );
}

// Convert **bold** and `code` markers to HTML for dangerouslySetInnerHTML.
function formatBullet(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}
