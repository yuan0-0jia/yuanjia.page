"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Resume } from "@/app/resume/data";
import "../../_components/resume.css";

export default function ResumeModal({ resume }: { resume: Resume }) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collect all entries-shape sections for the Experience section.
  // Currently "projects" are really experience entries; custom sections
  // with shape "entries" also show here.
  const experiences: { title: string; entries: Resume["projects"] }[] = [];

  // Built-in "projects" array (experience entries)
  if (resume.projects.length > 0) {
    const sectionTitle = resume.sectionTitles?.projects ?? "Experience";
    experiences.push({ title: sectionTitle, entries: resume.projects });
  }

  // Any custom sections of shape "entries"
  for (const cs of resume.customSections ?? []) {
    if (cs.shape === "entries" && cs.entries.length > 0) {
      experiences.push({ title: cs.title, entries: cs.entries });
    }
  }

  // Flatten skills for the chip list
  const allSkills = resume.skills.flatMap((cat) =>
    cat.items.map((item) => ({ cat: cat.name, item }))
  );

  const contactEmail = resume.contact.find((c) => c.label === "Email");
  const contactGh    = resume.contact.find((c) => c.label === "GitHub");
  const contactLi    = resume.contact.find((c) => c.label === "LinkedIn");
  const contactSite  = resume.contact.find((c) => c.label === "Site");

  return (
    <div className="yj-resume-overlay" onClick={close}>
      <div className="yj-resume" onClick={(e) => e.stopPropagation()}>
        <button className="yj-resume-close" onClick={close} aria-label="Close">✕</button>

        <header className="yj-resume-head">
          <div>
            <div className="yj-resume-eyebrow">CURRICULUM VITAE · 2026</div>
            <h2 className="yj-resume-name">{resume.name}</h2>
            {resume.tagline && <p className="yj-resume-role">{resume.tagline}</p>}
          </div>
          <div className="yj-resume-contact">
            {contactGh  && <a href={contactGh.href}  target="_blank" rel="noopener noreferrer">{contactGh.value}</a>}
            {contactLi  && <a href={contactLi.href}  target="_blank" rel="noopener noreferrer">{contactLi.value}</a>}
            {contactEmail && <a href={contactEmail.href}>{contactEmail.value}</a>}
            {resume.location && <span className="yj-resume-loc">{resume.location}</span>}
          </div>
        </header>

        <div className="yj-resume-rule" />

        {/* Experience sections */}
        {experiences.map(({ title, entries }) => (
          <section key={title} className="yj-resume-section">
            <h3 className="yj-resume-h">{title}</h3>
            <div className="yj-resume-items">
              {entries.map((entry, i) => (
                <article key={i} className="yj-resume-item">
                  <div className="yj-resume-item-meta">
                    {entry.period && <div className="yj-resume-span">{entry.period}</div>}
                  </div>
                  <div>
                    <div className="yj-resume-item-head">
                      {entry.title && <span className="yj-resume-item-role">{entry.title}</span>}
                      {entry.title && entry.name && <span className="yj-resume-item-sep"> — </span>}
                      {entry.name && <span className="yj-resume-item-org">{entry.name}</span>}
                    </div>
                    {entry.bullets.length > 0 && (
                      <ul className="yj-resume-bullets">
                        {entry.bullets.map((b, j) => (
                          <li key={j} dangerouslySetInnerHTML={{ __html: formatBullet(b) }} />
                        ))}
                      </ul>
                    )}
                    {entry.stack.length > 0 && (
                      <div className="yj-resume-stack">
                        {entry.stack.map((s) => (
                          <span key={s} className="yj-resume-chip">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Education + Skills */}
        <section className="yj-resume-section yj-resume-twocol">
          <div>
            <h3 className="yj-resume-h">Education</h3>
            {resume.education.map((ed, i) => (
              <div key={i} className="yj-resume-item-row" style={{ marginBottom: 10 }}>
                <span className="yj-resume-edu-school">{ed.school}</span>
                <span className="yj-resume-edu-degree">{ed.degree}</span>
                {ed.period && <span className="yj-resume-span">{ed.period}</span>}
              </div>
            ))}
          </div>
          <div>
            <h3 className="yj-resume-h">Stack &amp; tools</h3>
            <div className="yj-resume-stack">
              {allSkills.map(({ item }, i) => (
                <span key={i} className="yj-resume-chip">{item}</span>
              ))}
            </div>
          </div>
        </section>

        <footer className="yj-resume-foot">
          <span>{contactSite ? contactSite.value : "yuanjia.page"}{resume.lastUpdated ? ` · ${resume.lastUpdated}` : ""}</span>
          <a href="/resume">open full résumé ↗</a>
        </footer>
      </div>
    </div>
  );
}

/** Convert **bold** and `code` markers to HTML. */
function formatBullet(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}
