import { Fragment } from "react";
import type {
  ContactItem,
  EducationItem,
  Entry,
  Resume,
  SkillCategory,
} from "../data";
import {
  DEFAULT_SECTION_TITLES,
  isBuiltInKey,
  resolveSectionOrder,
} from "../data";
import { getContactIcon } from "../contact-icon";
import { formatInline } from "../format-inline";

// Print PDF surface for /resume. Composes with the shared .resume-* type
// classes from app/globals.css — the same scale as ResumeScreen, just
// reframed at pt sizes via .resume-print overrides in resume.css. Keeping
// the type scale in one place means a single edit ripples through the
// terminal pager, the screen view, and the printed PDF together.
//
// Layout:
//   ┌─────────────────────────────────────────┬─ contact list (right) ─┐
//   │  Name (display, italic)                 │  ☏ phone               │
//   │  tagline                                │  ✉ email               │
//   │  location                               │  in linkedin … etc.    │
//   └─────────────────────────────────────────┴────────────────────────┘
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   EXPERIENCE
//     project / role …                                       period
//     stack · stack · stack
//     ✦ bullet
//   …
//
// Section order respects the user's sectionOrder (built-ins + custom);
// see resolveSectionOrder.
export default function ResumePrint({ resume }: { resume: Resume }) {
  const order = resolveSectionOrder(
    resume.sectionOrder,
    resume.customSections
  );

  return (
    <div className="resume-print">
      <header className="resume-print__header">
        <div className="resume-print__identity">
          <h1 className="resume-print__name resume-display">{resume.name}</h1>
          {resume.tagline && (
            <p className="resume-print__tagline resume-meta">{resume.tagline}</p>
          )}
          {resume.location && (
            <p className="resume-print__location resume-micro">{resume.location}</p>
          )}
        </div>
        {resume.contact.length > 0 && (
          <ContactBody items={resume.contact} />
        )}
      </header>

      {order.map((key) => (
        <Fragment key={key}>{renderPrintSection(key, resume)}</Fragment>
      ))}
    </div>
  );
}

function renderPrintSection(key: string, resume: Resume): React.ReactNode {
  if (isBuiltInKey(key)) {
    if (key === "education") {
      return (
        <PrintSection
          title={
            resume.sectionTitles?.education || DEFAULT_SECTION_TITLES.education
          }
        >
          <EducationBody items={resume.education} />
        </PrintSection>
      );
    }
    if (key === "skills") {
      return (
        <PrintSection
          title={resume.sectionTitles?.skills || DEFAULT_SECTION_TITLES.skills}
        >
          <CategoriesBody categories={resume.skills} />
        </PrintSection>
      );
    }
    return (
      <PrintSection
        title={
          resume.sectionTitles?.projects || DEFAULT_SECTION_TITLES.projects
        }
      >
        <EntriesBody entries={resume.projects} />
      </PrintSection>
    );
  }

  const cs = resume.customSections?.find((s) => s.id === key);
  if (!cs) return null;

  const body =
    cs.shape === "bullets" ? (
      <BulletsBody bullets={cs.bullets} />
    ) : cs.shape === "entries" ? (
      <EntriesBody entries={cs.entries} />
    ) : (
      <CategoriesBody categories={cs.categories} />
    );

  return <PrintSection title={cs.title}>{body}</PrintSection>;
}

function PrintSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="resume-print__section">
      <h2 className="resume-print__section-title resume-eyebrow">{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Body components — each shape's renderer. Types are picked up by composing
// the shared .resume-* classes; this file's job is just structure.
// ---------------------------------------------------------------------------

function ContactBody({ items }: { items: ContactItem[] }) {
  // The icon + value pair is wrapped in an inline-flex container (the <a>
  // when a href is present, a <span> otherwise) so the icon sits beside
  // the text on a single line. Mirrors the screen rail's pattern; without
  // this, each <a> would be a single flex item containing inline content,
  // and the SVG would push the text to its own line under text-align: right.
  //
  // Note: no .resume-meta — `.resume-print__contact` owns its own (smaller)
  // type scale so the right column visually matches the left column's
  // height (name + tagline + location ≈ 49pt) instead of sitting taller
  // and pushing a phantom line above the name.
  return (
    <ul className="resume-print__contact">
      {items.map((c) => {
        const Icon = getContactIcon(c.label);
        const inner = (
          <>
            <Icon className="resume-print__contact-icon" aria-hidden />
            <span>{c.value}</span>
          </>
        );
        return (
          <li key={c.label}>
            {c.href ? (
              <a href={c.href} className="resume-print__contact-link">
                {inner}
              </a>
            ) : (
              <span className="resume-print__contact-link">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EducationBody({ items }: { items: EducationItem[] }) {
  return (
    <ul className="resume-print__edu-list">
      {items.map((e, i) => (
        <li key={i} className="resume-print__edu">
          <div className="resume-print__line">
            <span className="resume-print__edu-school resume-emphasis">
              {e.school}
            </span>
            <span className="resume-print__period resume-meta">{e.period}</span>
          </div>
          <div className="resume-print__degree resume-body">
            {e.degree}
            {e.minor && ` · ${e.minor}`}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CategoriesBody({ categories }: { categories: SkillCategory[] }) {
  // 2-col grid: category name (left) / items (right). Using a real <dl>
  // keeps the markup semantic for ATS — copy-paste yields
  // "Languages\nTypeScript · Python · …" in linear reading order.
  return (
    <dl className="resume-print__skills">
      {categories.map((s, i) => (
        <Fragment key={`${s.name}-${i}`}>
          <dt className="resume-print__skill-name resume-eyebrow">{s.name}</dt>
          <dd className="resume-print__skill-items resume-body">
            {s.items.join(" · ")}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function EntriesBody({ entries }: { entries: Entry[] }) {
  return (
    <div className="resume-print__entries">
      {entries.map((p, idx) => (
        <article key={`${p.name}-${idx}`} className="resume-print__project">
          <div className="resume-print__line resume-print__entry-head">
            <h3 className="resume-print__entry-title-row">
              <span className="resume-print__entry-name resume-kicker">
                {p.name}
              </span>
              {p.title && (
                <span className="resume-print__entry-title resume-body">
                  {" · "}
                  {p.title}
                </span>
              )}
            </h3>
            {p.period && (
              <span className="resume-print__period resume-meta">
                {p.period}
              </span>
            )}
          </div>
          {(p.link || p.repo) && (
            <div className="resume-print__link resume-meta">
              {p.link && <a href={p.link.href}>{p.link.label}</a>}
              {p.link && p.repo && (
                <span className="resume-print__sep"> · </span>
              )}
              {p.repo && <a href={p.repo.href}>{p.repo.label}</a>}
            </div>
          )}
          {p.stack.length > 0 && (
            <p className="resume-print__stack resume-meta">
              {p.stack.join(" · ")}
            </p>
          )}
          {p.summary && (
            <p className="resume-print__summary resume-body">{p.summary}</p>
          )}
          <BulletList bullets={p.bullets} />
        </article>
      ))}
    </div>
  );
}

function BulletsBody({ bullets }: { bullets: string[] }) {
  return <BulletList bullets={bullets} />;
}

// ✦ bullets in accent-red — mirrors the screen layout's ✦ marker so the
// printed PDF reads as a quieter, ATS-safe version of the same design.
function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="resume-print__bullets resume-body">
      {bullets.map((b, i) => (
        <li key={i}>
          <span className="resume-print__bullet-mark" aria-hidden>
            ✦
          </span>
          {formatInline(b)}
        </li>
      ))}
    </ul>
  );
}
