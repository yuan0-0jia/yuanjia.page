import { Fragment } from "react";
import type {
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
import { formatInline } from "../format-inline";

export default function ResumePrint({ resume }: { resume: Resume }) {
  const order = resolveSectionOrder(
    resume.sectionOrder,
    resume.customSections
  );

  return (
    <div className="resume-print">
      <header className="resume-print__header">
        <h1 className="resume-print__name">{resume.name}</h1>
        <p className="resume-print__contact">
          {resume.contact.map((c, i) => (
            <span key={c.label}>
              {i > 0 && <span className="resume-print__sep"> · </span>}
              {c.href ? <a href={c.href}>{c.value}</a> : c.value}
            </span>
          ))}
        </p>
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
      <h2 className="resume-print__section-title">{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Print body components — shape renderers used by built-ins and customs.
// ---------------------------------------------------------------------------

function EducationBody({ items }: { items: EducationItem[] }) {
  return (
    <>
      {items.map((e, i) => (
        <div key={i} className="resume-print__edu">
          <div className="resume-print__line">
            <strong>{e.school}</strong>
            <span className="resume-print__period">{e.period}</span>
          </div>
          <div className="resume-print__degree">
            {e.degree}
            {e.minor && ` · ${e.minor}`}
          </div>
        </div>
      ))}
    </>
  );
}

function CategoriesBody({ categories }: { categories: SkillCategory[] }) {
  return (
    <table className="resume-print__skills">
      <tbody>
        {categories.map((s, i) => (
          <tr key={`${s.name}-${i}`}>
            <td className="resume-print__skill-name">{s.name}</td>
            <td className="resume-print__skill-items">{s.items.join(" · ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EntriesBody({ entries }: { entries: Entry[] }) {
  return (
    <>
      {entries.map((p, idx) => (
        <article key={`${p.name}-${idx}`} className="resume-print__project">
          <div className="resume-print__line">
            <span>
              <span className="resume-print__entry-name">{p.name}</span>
              {p.title && (
                <span className="resume-print__entry-title"> — {p.title}</span>
              )}
            </span>
            {p.period && (
              <span className="resume-print__period">{p.period}</span>
            )}
          </div>
          {(p.link || p.repo) && (
            <div className="resume-print__link">
              {p.link && <a href={p.link.href}>{p.link.label}</a>}
              {p.link && p.repo && (
                <span className="resume-print__sep"> · </span>
              )}
              {p.repo && <a href={p.repo.href}>{p.repo.label}</a>}
            </div>
          )}
          <div className="resume-print__stack">{p.stack.join(" · ")}</div>
          {p.summary && (
            <div className="resume-print__summary">{p.summary}</div>
          )}
          <ul className="resume-print__bullets">
            {p.bullets.map((b, i) => (
              <li key={i}>{formatInline(b)}</li>
            ))}
          </ul>
        </article>
      ))}
    </>
  );
}

function BulletsBody({ bullets }: { bullets: string[] }) {
  return (
    <ul className="resume-print__bullets">
      {bullets.map((b, i) => (
        <li key={i}>{formatInline(b)}</li>
      ))}
    </ul>
  );
}
