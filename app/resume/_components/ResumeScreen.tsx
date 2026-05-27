import { Fragment } from "react";
import type { IconType } from "react-icons";
import {
  FaArrowUpRightFromSquare,
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaLink,
  FaLinkedinIn,
  FaPhone,
} from "react-icons/fa6";
import type { EducationItem, Entry, Resume, SkillCategory } from "../data";
import { DEFAULT_SECTION_TITLES, isBuiltInKey, resolveSectionOrder } from "../data";
import { renderInline } from "./renderInline";
import PrintButton from "./PrintButton";

export default function ResumeScreen({ resume }: { resume: Resume }) {
  const order = resolveSectionOrder(resume.sectionOrder, resume.customSections);

  return (
    <div className="resume-screen mx-4 sm:mx-8 md:mx-12 lg:mx-20 my-10 md:my-16 flex flex-col items-center p-2 sm:p-4">
      <div className="max-w-4xl w-full">
        <ResumeHeader resume={resume} />
        {order.map((key) => (
          <Fragment key={key}>{renderSection(key, resume)}</Fragment>
        ))}
      </div>
    </div>
  );
}

function renderSection(key: string, resume: Resume): React.ReactNode {
  if (isBuiltInKey(key)) {
    if (key === "education") {
      return (
        <Section title={resume.sectionTitles?.education || DEFAULT_SECTION_TITLES.education}>
          <EducationBody items={resume.education} />
        </Section>
      );
    }
    if (key === "skills") {
      return (
        <Section title={resume.sectionTitles?.skills || DEFAULT_SECTION_TITLES.skills}>
          <CategoriesBody categories={resume.skills} />
        </Section>
      );
    }
    return (
      <Section title={resume.sectionTitles?.projects || DEFAULT_SECTION_TITLES.projects}>
        <EntriesBody entries={resume.projects} />
      </Section>
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

  return <Section title={cs.title}>{body}</Section>;
}

function ResumeHeader({ resume }: { resume: Resume }) {
  return (
    <header className="mb-12 md:mb-16">
      <h1 className="resume-display text-ink animate-fade-in-up opacity-0 stagger-1 flex items-baseline gap-3 md:gap-4">
        <span>{resume.name}</span>
        <PrintButton />
      </h1>
      {resume.tagline && (
        <p className="resume-meta text-soft italic mt-3 animate-fade-in-up opacity-0 stagger-2">
          {resume.tagline}
        </p>
      )}
      {resume.location && (
        <p className="resume-micro text-soft mt-1 animate-fade-in-up opacity-0 stagger-2">
          {resume.location}
        </p>
      )}
      <ul className="resume-meta mt-6 flex flex-wrap gap-x-5 gap-y-2 text-soft animate-fade-in-up opacity-0 stagger-3">
        {resume.contact.map((c) => {
          const Icon = getContactIcon(c.label);
          const inner = (
            <>
              <Icon className="w-3 h-3 opacity-70" aria-hidden />
              <span>{c.value}</span>
            </>
          );
          return (
            <li key={c.label} className="inline-flex items-center gap-1.5">
              {c.href ? (
                <a
                  href={c.href}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-accent underline-offset-4 hover:underline"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
      {resume.lastUpdated && (
        <p className="resume-micro text-soft opacity-60 mt-5 animate-fade-in opacity-0 stagger-4">
          Last updated · {resume.lastUpdated}
        </p>
      )}
      <div style={{ marginTop: 32, height: 1, background: "var(--border)", opacity: 0.5 }} />
    </header>
  );
}

function EducationBody({ items }: { items: EducationItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((e, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <p className="resume-emphasis text-ink">{e.school}</p>
            <p className="resume-meta text-soft">{e.period}</p>
          </div>
          <p className="resume-body text-soft mt-1">{e.degree}</p>
          {e.minor && <p className="resume-body italic text-soft">{e.minor}</p>}
        </li>
      ))}
    </ul>
  );
}

function CategoriesBody({ categories }: { categories: SkillCategory[] }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
      {categories.map((s, i) => (
        <div key={`${s.name}-${i}`}>
          <dt className="resume-eyebrow text-soft mb-1.5">{s.name}</dt>
          <dd className="resume-body text-ink">{s.items.join(" · ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function EntriesBody({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-8 md:space-y-12">
      {entries.map((p, idx) => (
        <article key={`${p.name}-${idx}`}>
          <div className="mb-3 flex items-baseline justify-between gap-4 flex-wrap">
            <h3 className="inline-flex items-baseline gap-3 flex-wrap">
              <span className="resume-kicker text-ink">{p.name}</span>
              {p.title && (
                <span className="resume-body italic text-soft">· {p.title}</span>
              )}
              {p.repo && (
                <a
                  href={p.repo.href}
                  aria-label={`${p.name} repository`}
                  className="text-soft hover:text-accent transition-colors self-center"
                >
                  <FaGithub className="w-3.5 h-3.5" />
                </a>
              )}
              {p.link && (
                <a
                  href={p.link.href}
                  aria-label={`${p.name} live site`}
                  className="text-soft hover:text-accent transition-colors self-center"
                >
                  <FaArrowUpRightFromSquare className="w-3 h-3" />
                </a>
              )}
            </h3>
            {p.period && (
              <p className="resume-meta text-soft whitespace-nowrap">{p.period}</p>
            )}
          </div>
          {p.stack.length > 0 && (
            <p className="resume-meta text-soft mt-1">{p.stack.join(" · ")}</p>
          )}
          {p.summary && (
            <blockquote
              className="resume-body italic mt-4 pl-4 text-soft"
              style={{ borderLeft: "2px solid var(--accent)", opacity: 0.85 }}
            >
              {p.summary}
            </blockquote>
          )}
          <ul className="mt-5 space-y-3 list-none">
            {p.bullets.map((b, i) => (
              <li key={i} className="resume-body text-ink pl-6 relative">
                <span className="absolute left-0 top-0 text-accent" aria-hidden>✦</span>
                {renderInline(b)}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function BulletsBody({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-3 list-none">
      {bullets.map((b, i) => (
        <li key={i} className="resume-body text-ink pl-6 relative">
          <span className="absolute left-0 top-0 text-accent" aria-hidden>✦</span>
          {renderInline(b)}
        </li>
      ))}
    </ul>
  );
}

function getContactIcon(label: string): IconType {
  const l = (label ?? "").toLowerCase();
  if (l.includes("phone") || l.includes("tel") || l.includes("cell")) return FaPhone;
  if (l.includes("email") || l.includes("mail")) return FaEnvelope;
  if (l.includes("linkedin")) return FaLinkedinIn;
  if (l.includes("github") || l.includes("git")) return FaGithub;
  if (l.includes("site") || l.includes("web") || l.includes("portfolio") || l.includes("page")) return FaGlobe;
  return FaLink;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 md:mb-16">
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <span className="resume-eyebrow text-accent">{title}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
      </div>
      {children}
    </section>
  );
}
