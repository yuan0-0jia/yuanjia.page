import type { Entry, Resume, SkillCategory } from "../data";
import { isBuiltInKey, resolveSectionOrder } from "../data";

// Letter page area available for content, given the print CSS margins
// (uniform 0.35in on all sides). 1in = 72pt.
//
// Height: (11 - 0.35 - 0.35) * 72 = 741.6 pt
// Slight headroom buffer (~12pt) so we warn before the actual hard limit
// without being so pessimistic that we cry wolf on a fitting resume.
const LETTER_USABLE_PT = 730;

// Print body line metrics — must stay in sync with resume.css:
//   font-size: 9.5pt; line-height: 1.3  →  ~12.35pt per line.
const LINE_PT = 12.35;

// Rough average characters per body line, derived from Lora 9.5pt rendering
// in a 7.8in column (page width 8.5in − 0.7in horizontal margins).
const CHARS_PER_BODY_LINE = 100;
const CHARS_PER_META_LINE = 120;

function stripMarkup(text: string): string {
  return text.replace(/\*\*/g, "").replace(/`/g, "");
}

function wrappedLines(text: string, charsPerLine: number): number {
  const clean = stripMarkup(text);
  if (clean.length === 0) return 0;
  return Math.max(1, Math.ceil(clean.length / charsPerLine));
}

function estimateBulletHeight(text: string): number {
  return wrappedLines(text, CHARS_PER_BODY_LINE) * LINE_PT + 1; // +1pt bullet margin-bottom
}

function estimateEntryHeight(e: Entry): number {
  let pt = LINE_PT; // name + period header row
  if (e.stack.length > 0) {
    pt += wrappedLines(e.stack.join(" · "), CHARS_PER_META_LINE) * (LINE_PT * 0.9);
  }
  // Summary is hidden in print, so we don't count it.
  pt += e.bullets.reduce((sum, b) => sum + estimateBulletHeight(b), 0);
  pt += 4; // entry bottom margin (matches resume-print__project margin-bottom: 6pt)
  return pt;
}

function estimateCategoriesHeight(cats: SkillCategory[]): number {
  // Each category renders as one table row at ~9pt font.
  // If items wrap, the row grows — estimate per category.
  return cats.reduce((sum, c) => {
    const lines = wrappedLines(c.items.join(" · "), CHARS_PER_META_LINE);
    return sum + Math.max(LINE_PT, lines * (LINE_PT * 0.95));
  }, 0);
}

function estimateSectionHeight(key: string, resume: Resume): number {
  const titleAndBorder = LINE_PT + 5; // section title + border + bottom margin
  const sectionTopMargin = 6;

  if (isBuiltInKey(key)) {
    if (key === "education") {
      const eduHeight = resume.education.length * (LINE_PT * 2 + 2); // ~2 lines per entry
      return sectionTopMargin + titleAndBorder + eduHeight;
    }
    if (key === "skills") {
      return sectionTopMargin + titleAndBorder + estimateCategoriesHeight(resume.skills);
    }
    return (
      sectionTopMargin +
      titleAndBorder +
      resume.projects.reduce((s, e) => s + estimateEntryHeight(e), 0)
    );
  }

  const cs = resume.customSections?.find((s) => s.id === key);
  if (!cs) return 0;

  if (cs.shape === "bullets") {
    return (
      sectionTopMargin +
      titleAndBorder +
      cs.bullets.reduce((s, b) => s + estimateBulletHeight(b), 0)
    );
  }
  if (cs.shape === "entries") {
    return (
      sectionTopMargin +
      titleAndBorder +
      cs.entries.reduce((s, e) => s + estimateEntryHeight(e), 0)
    );
  }
  // categories
  return (
    sectionTopMargin +
    titleAndBorder +
    estimateCategoriesHeight(cs.categories)
  );
}

export function estimatePrintHeight(resume: Resume): number {
  // Header (name + contact + bottom border)
  let pt = 36;

  const order = resolveSectionOrder(resume.sectionOrder, resume.customSections);
  for (const key of order) {
    pt += estimateSectionHeight(key, resume);
  }

  return pt;
}

export type PageFitStatus = "ok" | "tight" | "overflow";

export interface PageFitEstimate {
  estimatedHeight: number;
  pages: number;
  status: PageFitStatus;
  usableHeight: number;
}

/**
 * Estimate how the current resume will land on a printed page.
 * - `ok`: comfortable fit, <90% of usable height
 * - `tight`: 90–100% — likely fits but no headroom
 * - `overflow`: >100% — will spill onto a second page
 *
 * Heuristic only — the actual print engine's exact pt usage depends on
 * font metrics and wrap behavior we can't measure without rendering.
 */
export function estimatePageFit(resume: Resume): PageFitEstimate {
  const estimatedHeight = estimatePrintHeight(resume);
  const pages = estimatedHeight / LETTER_USABLE_PT;

  let status: PageFitStatus;
  if (pages < 0.9) status = "ok";
  else if (pages <= 1.0) status = "tight";
  else status = "overflow";

  return {
    estimatedHeight,
    pages,
    status,
    usableHeight: LETTER_USABLE_PT,
  };
}
