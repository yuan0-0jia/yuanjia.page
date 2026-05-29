import { FaArrowUpRightFromSquare, FaGithub } from "react-icons/fa6";
import type { ContactItem, EducationItem, Entry, Resume, SkillCategory } from "../data";
import { DEFAULT_SECTION_TITLES } from "../data";
import { getContactIcon } from "../contact-icon";
import { formatInline } from "../format-inline";
import PrintButton from "./PrintButton";
import BackToHomeLink from "./BackToHomeLink";

// /resume page layout: 280px rail (Contact / Skills / Education) + main
// column (Experience + any custom-entries sections). Two-column at lg
// (≥1024px); below that, single column with the rail flattened via
// `display: contents` and mobile order Contact → Experience → Skills →
// Education. Layout rules live in app/_components/resume.css.
//
// Rail/main routing is hardcoded by section identity (not derived from
// customSections.shape) — confirmed in the handoff. sectionOrder is
// ignored for column placement; within each column we use a fixed order
// (Contact → Skills → Education in rail, Experience → custom-entries in
// main). The structural split is the layout's job; sectionOrder lives
// on the data model for the markdown round-trip + the less pager, where
// file-order = render-order.
export default function ResumeScreen({
  resume,
}: {
  resume: Resume;
}) {
  return (
    <div className="resume-screen flex flex-col items-center px-4 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16">
      <div className="w-full max-w-3xl lg:max-w-5xl">
        <BackToHomeLink />
        <ResumeHeader resume={resume} />
        {/* Desktop: 2-col grid — rs-rail is a flex column in col 1, rs-main
            is its own grid item in col 2. Mobile: rs-rail's `display:
            contents` dissolves the wrapper so the three rail sections become
            direct flex items of resume-grid alongside rs-main, letting
            `order` reorder them (Contact → Experience → Skills → Education). */}
        <div className="resume-grid">
          <div className="rs-rail">
            {resume.contact.length > 0 && (
              <div className="rs-contact">
                <Section compact title="Contact">
                  <ContactBody items={resume.contact} />
                </Section>
              </div>
            )}
            {resume.skills.length > 0 && (
              <div className="rs-skills">
                <Section
                  compact
                  title={resume.sectionTitles?.skills || DEFAULT_SECTION_TITLES.skills}
                >
                  <CategoriesBody categories={resume.skills} compact />
                </Section>
              </div>
            )}
            {resume.education.length > 0 && (
              <div className="rs-education">
                <Section
                  compact
                  title={resume.sectionTitles?.education || DEFAULT_SECTION_TITLES.education}
                >
                  <EducationBody items={resume.education} compact />
                </Section>
              </div>
            )}
          </div>
          <main className="rs-main">
            {resume.projects.length > 0 && (
              <Section
                title={resume.sectionTitles?.projects || DEFAULT_SECTION_TITLES.projects}
              >
                <EntriesBody entries={resume.projects} />
              </Section>
            )}
            {(resume.customSections ?? []).map((cs) => {
              const body =
                cs.shape === "bullets" ? (
                  <BulletsBody bullets={cs.bullets} />
                ) : cs.shape === "entries" ? (
                  <EntriesBody entries={cs.entries} />
                ) : (
                  <CategoriesBody categories={cs.categories} />
                );
              return (
                <Section key={cs.id} title={cs.title}>
                  {body}
                </Section>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}

function ResumeHeader({ resume }: { resume: Resume }) {
  return (
    <header className="mb-8 md:mb-10 lg:mb-12">
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
      {resume.lastUpdated && (
        <p className="resume-micro text-soft opacity-60 mt-5 animate-fade-in opacity-0 stagger-3">
          Last updated · {resume.lastUpdated}
        </p>
      )}
      <div aria-hidden className="resume-rule mt-7" />
    </header>
  );
}

function ContactBody({ items }: { items: ContactItem[] }) {
  // Gap and direction (row-wrap on mobile, column on rail) are owned by
  // `.rs-contact ul` in resume.css since they're viewport-dependent.
  return (
    <ul className="resume-meta text-soft flex flex-col">
      {items.map((c) => {
        const Icon = getContactIcon(c.label);
        const inner = (
          <>
            <Icon className="w-3 h-3 opacity-70 shrink-0" aria-hidden />
            <span className="truncate">{c.value}</span>
          </>
        );
        return (
          <li key={c.label} className="min-w-0">
            {c.href ? (
              <a
                href={c.href}
                className="inline-flex items-center gap-2 transition-colors hover:text-accent underline-offset-4 hover:underline max-w-full"
              >
                {inner}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 max-w-full">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EducationBody({ items, compact = false }: { items: EducationItem[]; compact?: boolean }) {
  // Compact (rail) stacks school / degree / period vertically — there's no
  // horizontal room for the school-left / period-right split at 280px wide.
  return (
    <ul className="space-y-4">
      {items.map((e, i) => (
        <li key={i}>
          {compact ? (
            <>
              <p className="resume-emphasis text-ink">{e.school}</p>
              <p className="resume-body text-soft mt-0.5">{e.degree}</p>
              {e.minor && <p className="resume-body italic text-soft">{e.minor}</p>}
              <p className="resume-micro text-soft mt-1">{e.period}</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <p className="resume-emphasis text-ink">{e.school}</p>
                <p className="resume-meta text-soft">{e.period}</p>
              </div>
              <p className="resume-body text-soft mt-1">{e.degree}</p>
              {e.minor && <p className="resume-body italic text-soft">{e.minor}</p>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function CategoriesBody({
  categories,
  compact = false,
}: {
  categories: SkillCategory[];
  compact?: boolean;
}) {
  // Compact (rail) drops the 2-col grid since the rail is 280px wide.
  return (
    <dl className={compact ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5"}>
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
  // Between-entry spacing ramps in step with the page's section ramp
  // (32 / 40 / 48 at default / md / lg) so the visual rhythm inside a
  // section matches the rhythm between sections.
  return (
    <div className="space-y-8 md:space-y-10 lg:space-y-12">
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
            <blockquote className="resume-body italic mt-4 pl-4 text-soft border-l-2 border-accent opacity-[0.85]">
              {p.summary}
            </blockquote>
          )}
          <ul className="mt-5 space-y-3 list-none">
            {p.bullets.map((b, i) => (
              <li key={i} className="resume-body text-ink pl-6 relative">
                <span className="absolute left-0 top-0 text-accent" aria-hidden>✦</span>
                {formatInline(b)}
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
          {formatInline(b)}
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  // No bottom margin — parent layout (resume-grid + rs-main flex gaps)
  // owns all inter-section spacing so we never double-pay between a
  // section's mb and the parent's gap.
  return (
    <section>
      <div
        className={`flex items-center gap-3 ${compact ? "mb-3" : "mb-5 md:mb-6"}`}
      >
        <span className="resume-eyebrow text-accent">{title}</span>
        <div aria-hidden className="resume-rule flex-1" />
      </div>
      {children}
    </section>
  );
}
