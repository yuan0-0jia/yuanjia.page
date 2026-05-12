"use client";

import { useEffect, useState, useTransition } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCheck,
  FaCircleExclamation,
  FaFloppyDisk,
  FaPlus,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import { updateResumeData } from "@/app/_lib/auth-action";
import type {
  ContactItem,
  CustomSection,
  CustomSectionShape,
  EducationItem,
  Entry,
  Resume,
  SkillCategory,
} from "../data";
import {
  DEFAULT_SECTION_TITLES,
  isBuiltInKey,
  newCustomSectionId,
  resolveSectionOrder,
} from "../data";

// ---------------------------------------------------------------------------
// Editor root
// ---------------------------------------------------------------------------

export default function ResumeEditor({
  initialResume,
}: {
  initialResume: Resume;
}) {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const patch = (p: Partial<Resume>) => {
    setStatus("idle");
    setDirty(true);
    setResume({ ...resume, ...p });
  };

  const onSave = () => {
    setStatus("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateResumeData(resume);
        setDirty(false);
        setStatus("saved");
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  // Warn the user before they navigate away with unsaved edits. The browser
  // shows its own generic confirmation; the returnValue is only required by
  // older browsers for the prompt to fire.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <div className="mx-4 md:mx-12 lg:mx-20 my-12 flex flex-col items-center p-4">
      <div className="max-w-3xl w-full space-y-12">
        <header className="text-center">
          <div className="vintage-divider mb-6">
            <span className="font-typewriter text-xs uppercase tracking-[0.3em] text-sepia-500 dark:text-sepia-400 px-2">
              Edit Resume
            </span>
          </div>
          <p className="font-typewriter text-xs text-sepia-600 dark:text-sepia-300 tracking-wider">
            Changes are saved to Supabase. Bullets accept{" "}
            <code className="px-1 bg-sepia-100 dark:bg-sepia-800 rounded">
              **bold**
            </code>{" "}
            and{" "}
            <code className="px-1 bg-sepia-100 dark:bg-sepia-800 rounded">
              `code`
            </code>{" "}
            inline.
          </p>
        </header>

        <HeaderSection resume={resume} onChange={patch} />
        <SectionsList resume={resume} patch={patch} />

        <SaveBar
          pending={pending}
          status={status}
          errorMsg={errorMsg}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections list — renders built-in sections AND custom sections in the
// configured order. Provides per-section reorder controls plus an
// "Add custom section" footer.
// ---------------------------------------------------------------------------

function SectionsList({
  resume,
  patch,
}: {
  resume: Resume;
  patch: (p: Partial<Resume>) => void;
}) {
  const order = resolveSectionOrder(
    resume.sectionOrder,
    resume.customSections
  );

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ sectionOrder: next });
  };

  const updateCustomSection = (id: string, next: CustomSection) => {
    patch({
      customSections: (resume.customSections ?? []).map((s) =>
        s.id === id ? next : s
      ),
    });
  };

  const removeCustomSection = (id: string) => {
    patch({
      customSections: (resume.customSections ?? []).filter((s) => s.id !== id),
      sectionOrder: order.filter((k) => k !== id),
    });
  };

  const addCustomSection = (shape: CustomSectionShape) => {
    const id = newCustomSectionId();
    const newSection: CustomSection =
      shape === "bullets"
        ? { id, shape, title: "Awards", bullets: [] }
        : shape === "entries"
          ? { id, shape, title: "Experience", entries: [] }
          : { id, shape, title: "Tools", categories: [] };
    patch({
      customSections: [...(resume.customSections ?? []), newSection],
      sectionOrder: [...order, id],
    });
  };

  return (
    <>
      {order.map((key, i) => {
        const onMoveUp = i > 0 ? () => swap(i, i - 1) : undefined;
        const onMoveDown =
          i < order.length - 1 ? () => swap(i, i + 1) : undefined;

        if (isBuiltInKey(key)) {
          if (key === "education") {
            return (
              <EducationSection
                key={key}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                sectionTitle={resume.sectionTitles?.education}
                onSectionTitleChange={(t) =>
                  patch({
                    sectionTitles: { ...resume.sectionTitles, education: t },
                  })
                }
                value={resume.education}
                onChange={(education) => patch({ education })}
              />
            );
          }
          if (key === "skills") {
            return (
              <SkillsSection
                key={key}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                sectionTitle={resume.sectionTitles?.skills}
                onSectionTitleChange={(t) =>
                  patch({
                    sectionTitles: { ...resume.sectionTitles, skills: t },
                  })
                }
                value={resume.skills}
                onChange={(skills) => patch({ skills })}
              />
            );
          }
          return (
            <ProjectsSection
              key={key}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              sectionTitle={resume.sectionTitles?.projects}
              onSectionTitleChange={(t) =>
                patch({
                  sectionTitles: { ...resume.sectionTitles, projects: t },
                })
              }
              value={resume.projects}
              onChange={(projects) => patch({ projects })}
            />
          );
        }

        const cs = resume.customSections?.find((s) => s.id === key);
        if (!cs) return null;
        return (
          <CustomSectionEditor
            key={key}
            section={cs}
            onChange={(next) => updateCustomSection(cs.id, next)}
            onRemove={() => removeCustomSection(cs.id)}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        );
      })}

      <AddCustomSectionRow onAdd={addCustomSection} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Field primitives
// ---------------------------------------------------------------------------

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-typewriter text-[10px] uppercase tracking-widest text-sepia-500 dark:text-sepia-400 block mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 font-serif text-sm bg-cream dark:bg-warmGray-900 text-sepia-900 dark:text-cream border border-sepia-300 dark:border-sepia-700 rounded-sm focus:outline-none focus:border-sepia-500 dark:focus:border-sepia-400"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-typewriter text-[10px] uppercase tracking-widest text-sepia-500 dark:text-sepia-400 block mb-1">
        {label}
      </span>
      <textarea
        value={value ?? ""}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 font-serif text-sm bg-cream dark:bg-warmGray-900 text-sepia-900 dark:text-cream border border-sepia-300 dark:border-sepia-700 rounded-sm focus:outline-none focus:border-sepia-500 dark:focus:border-sepia-400 leading-relaxed"
      />
    </label>
  );
}

function SectionShell({
  title,
  onMoveUp,
  onMoveDown,
  children,
}: {
  title: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: React.ReactNode;
}) {
  const reorderable = onMoveUp !== undefined || onMoveDown !== undefined;
  return (
    <section>
      <div className="vintage-divider mb-6">
        <span className="font-typewriter text-xs uppercase tracking-[0.3em] text-sepia-500 dark:text-sepia-400 px-2 inline-flex items-center gap-2">
          {title}
          {reorderable && (
            <span className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!onMoveUp}
                aria-label="Move section up"
                className="p-1 text-sepia-500 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FaArrowUp className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!onMoveDown}
                aria-label="Move section down"
                className="p-1 text-sepia-500 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FaArrowDown className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </span>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function RemoveButton({
  onClick,
  label = "Remove",
  confirmMessage,
}: {
  onClick: () => void;
  label?: string;
  // When set, the trash icon transforms inline into a "Delete? ✓ ✗" row
  // on click instead of firing immediately. The message itself is used as
  // a tooltip on the confirm row so the user can still see the context
  // before committing.
  confirmMessage?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={confirmMessage}
      >
        <span className="font-typewriter text-[10px] uppercase tracking-widest text-red-700 dark:text-red-400">
          Delete?
        </span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onClick();
          }}
          aria-label={`${label} — confirm`}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-1"
        >
          <FaCheck className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel"
          className="text-sepia-500 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-cream transition-colors p-1"
        >
          <FaXmark className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (confirmMessage) {
          setConfirming(true);
        } else {
          onClick();
        }
      }}
      aria-label={label}
      className="text-sepia-500 dark:text-sepia-400 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1"
    >
      <FaTrash className="w-3 h-3" />
    </button>
  );
}

function AddButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-typewriter text-xs tracking-wider text-sepia-700 dark:text-sepia-300 hover:text-sepia-900 dark:hover:text-cream border border-dashed border-sepia-300 dark:border-sepia-700 hover:border-sepia-500 px-3 py-1.5 rounded-sm inline-flex items-center gap-2 transition-colors"
    >
      <FaPlus className="w-3 h-3" />
      {label}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-sepia-200 dark:border-sepia-800 rounded-sm p-4 space-y-3 bg-sepia-50/30 dark:bg-warmGray-900/30">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header section (name + tagline + location + last updated + contact items)
// ---------------------------------------------------------------------------

function HeaderSection({
  resume,
  onChange,
}: {
  resume: Resume;
  onChange: (p: Partial<Resume>) => void;
}) {
  const updateContactRow = (i: number, p: Partial<ContactItem>) => {
    const next = [...resume.contact];
    next[i] = { ...next[i], ...p };
    onChange({ contact: next });
  };
  const removeContactRow = (i: number) => {
    onChange({ contact: resume.contact.filter((_, idx) => idx !== i) });
  };
  const addContactRow = () => {
    onChange({
      contact: [...resume.contact, { label: "", value: "", href: "" }],
    });
  };

  return (
    <SectionShell title="Header">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Name"
          value={resume.name}
          onChange={(name) => onChange({ name })}
        />
        <TextField
          label="Tagline"
          value={resume.tagline}
          onChange={(tagline) => onChange({ tagline })}
          placeholder="Platform / Infrastructure Engineer"
        />
        <TextField
          label="Location"
          value={resume.location}
          onChange={(location) => onChange({ location })}
          placeholder="Santa Cruz, CA"
        />
        <TextField
          label="Last Updated"
          value={resume.lastUpdated}
          onChange={(lastUpdated) => onChange({ lastUpdated })}
          placeholder="May 2026"
        />
      </div>

      <div>
        <p className="font-typewriter text-[10px] uppercase tracking-widest text-sepia-500 dark:text-sepia-400 mb-2">
          Contact Items
        </p>
        <div className="space-y-3">
          {resume.contact.map((c, i) => (
            <Card key={i}>
              <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_auto] gap-3 items-end">
                <TextField
                  label="Label"
                  value={c.label}
                  onChange={(v) => updateContactRow(i, { label: v })}
                />
                <TextField
                  label="Value (shown)"
                  value={c.value}
                  onChange={(v) => updateContactRow(i, { value: v })}
                />
                <TextField
                  label="Link (optional)"
                  value={c.href}
                  onChange={(v) => updateContactRow(i, { href: v })}
                />
                <div className="pb-2">
                  <RemoveButton
                    onClick={() => removeContactRow(i)}
                    label="Remove contact row"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-3">
          <AddButton onClick={addContactRow} label="Add contact row" />
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Shared list editors — used by both built-in sections and custom sections
// of the same shape.
// ---------------------------------------------------------------------------

function EntriesListEditor({
  value,
  onChange,
}: {
  value: Entry[];
  onChange: (v: Entry[]) => void;
}) {
  const updateEntry = (i: number, p: Partial<Entry>) => {
    const next = [...value];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  const removeEntry = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));
  const addEntry = () =>
    onChange([...value, { name: "", stack: [], bullets: [] } as Entry]);

  return (
    <>
      <div className="space-y-4">
        {value.map((p, i) => (
          <Card key={i}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label="Name"
                value={p.name}
                onChange={(v) => updateEntry(i, { name: v })}
              />
              <TextField
                label="Period"
                value={p.period}
                onChange={(v) => updateEntry(i, { period: v })}
                placeholder="2026 – Present"
              />
              <TextField
                label="Title / Role"
                value={p.title}
                onChange={(v) => updateEntry(i, { title: v })}
              />
              <TextField
                label="Live link label"
                value={p.link?.label}
                onChange={(v) =>
                  updateEntry(i, {
                    link: v
                      ? { label: v, href: p.link?.href ?? "" }
                      : undefined,
                  })
                }
                placeholder="joinflyer.com"
              />
              <TextField
                label="Live link URL"
                value={p.link?.href}
                onChange={(v) =>
                  updateEntry(i, {
                    link: v
                      ? { label: p.link?.label ?? "", href: v }
                      : undefined,
                  })
                }
                placeholder="https://…"
              />
              <TextField
                label="Repo label"
                value={p.repo?.label}
                onChange={(v) =>
                  updateEntry(i, {
                    repo: v
                      ? { label: v, href: p.repo?.href ?? "" }
                      : undefined,
                  })
                }
                placeholder="github.com/…"
              />
              <TextField
                label="Repo URL"
                value={p.repo?.href}
                onChange={(v) =>
                  updateEntry(i, {
                    repo: v
                      ? { label: p.repo?.label ?? "", href: v }
                      : undefined,
                  })
                }
                placeholder="https://github.com/…"
              />
            </div>

            <TextAreaField
              label="Tech stack (one per line)"
              rows={3}
              value={p.stack.join("\n")}
              onChange={(v) =>
                updateEntry(i, {
                  stack: v
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />

            <TextAreaField
              label="Summary"
              rows={2}
              value={p.summary}
              onChange={(v) => updateEntry(i, { summary: v })}
            />

            <TextAreaField
              label="Bullets (one per line — supports **bold** and `code`)"
              rows={Math.max(4, p.bullets.length + 1)}
              value={p.bullets.join("\n")}
              onChange={(v) =>
                updateEntry(i, {
                  bullets: v
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />

            <div className="flex justify-end pt-2 border-t border-sepia-200 dark:border-sepia-800">
              <RemoveButton
                onClick={() => removeEntry(i)}
                label="Remove entry"
                confirmMessage="Remove this entry? Its bullets, summary, and stack will be lost."
              />
            </div>
          </Card>
        ))}
      </div>
      <div>
        <AddButton onClick={addEntry} label="Add entry" />
      </div>
    </>
  );
}

function CategoriesListEditor({
  value,
  onChange,
}: {
  value: SkillCategory[];
  onChange: (v: SkillCategory[]) => void;
}) {
  const updateCategory = (i: number, p: Partial<SkillCategory>) => {
    const next = [...value];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  const removeCategory = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));
  const addCategory = () => onChange([...value, { name: "", items: [] }]);

  return (
    <>
      <div className="space-y-3">
        {value.map((c, i) => (
          <Card key={i}>
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-start">
              <TextField
                label="Category"
                value={c.name}
                onChange={(v) => updateCategory(i, { name: v })}
              />
              <TextAreaField
                label="Items (one per line)"
                rows={3}
                value={c.items.join("\n")}
                onChange={(v) =>
                  updateCategory(i, {
                    items: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className="pt-6">
                <RemoveButton
                  onClick={() => removeCategory(i)}
                  label="Remove category"
                  confirmMessage="Remove this category and its items?"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div>
        <AddButton onClick={addCategory} label="Add category" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Education section (built-in)
// ---------------------------------------------------------------------------

function EducationSection({
  sectionTitle,
  onSectionTitleChange,
  onMoveUp,
  onMoveDown,
  value,
  onChange,
}: {
  sectionTitle: string | undefined;
  onSectionTitleChange: (t: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  value: EducationItem[];
  onChange: (v: EducationItem[]) => void;
}) {
  const updateRow = (i: number, p: Partial<EducationItem>) => {
    const next = [...value];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  const removeRow = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));
  const addRow = () =>
    onChange([...value, { school: "", period: "", degree: "" }]);

  return (
    <SectionShell title="Education" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <TextField
        label="Display title (shows on resume)"
        value={sectionTitle}
        onChange={onSectionTitleChange}
        placeholder={DEFAULT_SECTION_TITLES.education}
      />
      <div className="space-y-3">
        {value.map((e, i) => (
          <Card key={i}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                label="School"
                value={e.school}
                onChange={(v) => updateRow(i, { school: v })}
              />
              <TextField
                label="Period"
                value={e.period}
                onChange={(v) => updateRow(i, { period: v })}
                placeholder="2024–2026"
              />
              <TextField
                label="Degree"
                value={e.degree}
                onChange={(v) => updateRow(i, { degree: v })}
              />
              <TextField
                label="Minor (optional)"
                value={e.minor}
                onChange={(v) => updateRow(i, { minor: v })}
              />
            </div>
            <div className="flex justify-end">
              <RemoveButton
                onClick={() => removeRow(i)}
                label="Remove education entry"
                confirmMessage="Remove this education entry?"
              />
            </div>
          </Card>
        ))}
      </div>
      <div>
        <AddButton onClick={addRow} label="Add education entry" />
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Skills section (built-in)
// ---------------------------------------------------------------------------

function SkillsSection({
  sectionTitle,
  onSectionTitleChange,
  onMoveUp,
  onMoveDown,
  value,
  onChange,
}: {
  sectionTitle: string | undefined;
  onSectionTitleChange: (t: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  value: SkillCategory[];
  onChange: (v: SkillCategory[]) => void;
}) {
  return (
    <SectionShell title="Skills" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <TextField
        label="Display title (shows on resume)"
        value={sectionTitle}
        onChange={onSectionTitleChange}
        placeholder={DEFAULT_SECTION_TITLES.skills}
      />
      <CategoriesListEditor value={value} onChange={onChange} />
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Projects section (built-in)
// ---------------------------------------------------------------------------

function ProjectsSection({
  sectionTitle,
  onSectionTitleChange,
  onMoveUp,
  onMoveDown,
  value,
  onChange,
}: {
  sectionTitle: string | undefined;
  onSectionTitleChange: (t: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  value: Entry[];
  onChange: (v: Entry[]) => void;
}) {
  return (
    <SectionShell title="Projects" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <TextField
        label="Display title (shows on resume — e.g. Projects, Experience, Work)"
        value={sectionTitle}
        onChange={onSectionTitleChange}
        placeholder={DEFAULT_SECTION_TITLES.projects}
      />
      <EntriesListEditor value={value} onChange={onChange} />
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Custom section editor — dispatches on shape, supports remove + move.
// ---------------------------------------------------------------------------

function CustomSectionEditor({
  section,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: CustomSection;
  onChange: (next: CustomSection) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const setTitle = (title: string) =>
    onChange({ ...section, title } as CustomSection);

  const shellTitle =
    section.title || `Custom (${shapeLabel(section.shape)})`;

  return (
    <SectionShell title={shellTitle} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-typewriter text-[10px] uppercase tracking-widest text-sepia-500 dark:text-sepia-400">
          Custom · {shapeLabel(section.shape)} shape
        </span>
        <RemoveButton
          onClick={onRemove}
          label="Remove custom section"
          confirmMessage="Remove this entire section? All its content will be lost."
        />
      </div>

      <TextField
        label="Display title (shows on resume)"
        value={section.title}
        onChange={setTitle}
        placeholder={defaultTitleForShape(section.shape)}
      />

      {section.shape === "bullets" && (
        <TextAreaField
          label="Bullets (one per line — supports **bold** and `code`)"
          rows={Math.max(4, section.bullets.length + 1)}
          value={section.bullets.join("\n")}
          onChange={(v) =>
            onChange({
              ...section,
              bullets: v
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      )}

      {section.shape === "entries" && (
        <EntriesListEditor
          value={section.entries}
          onChange={(entries) => onChange({ ...section, entries })}
        />
      )}

      {section.shape === "categories" && (
        <CategoriesListEditor
          value={section.categories}
          onChange={(categories) => onChange({ ...section, categories })}
        />
      )}
    </SectionShell>
  );
}

function shapeLabel(shape: CustomSectionShape): string {
  if (shape === "bullets") return "Bullet list";
  if (shape === "entries") return "Entries";
  return "Categories";
}

function defaultTitleForShape(shape: CustomSectionShape): string {
  if (shape === "bullets") return "Awards";
  if (shape === "entries") return "Experience";
  return "Tools";
}

function AddCustomSectionRow({
  onAdd,
}: {
  onAdd: (shape: CustomSectionShape) => void;
}) {
  return (
    <div className="border-t border-sepia-200/60 dark:border-sepia-800/60 pt-6 flex flex-wrap items-center gap-3 justify-center">
      <span className="font-typewriter text-xs uppercase tracking-widest text-sepia-500 dark:text-sepia-400 w-full md:w-auto text-center md:text-left">
        Add Custom Section
      </span>
      <AddButton onClick={() => onAdd("bullets")} label="Bullet list" />
      <AddButton onClick={() => onAdd("entries")} label="Entries (jobs, projects…)" />
      <AddButton onClick={() => onAdd("categories")} label="Categories" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save bar
// ---------------------------------------------------------------------------

function SaveBar({
  pending,
  status,
  errorMsg,
  onSave,
}: {
  pending: boolean;
  status: "idle" | "saved" | "error";
  errorMsg: string | null;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex justify-center">
      <div className="bg-cream/95 dark:bg-warmGray-900/95 backdrop-blur-sm border border-sepia-300 dark:border-sepia-700 rounded-sm px-4 py-3 shadow-md flex items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="font-typewriter text-sm tracking-wider text-sepia-700 dark:text-sepia-300 hover:text-sepia-900 dark:hover:text-cream border border-sepia-300 dark:border-sepia-700 hover:border-sepia-500 px-4 py-2 rounded-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaFloppyDisk className="w-3.5 h-3.5" />
          {pending ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && (
          <span className="font-typewriter text-xs text-green-700 dark:text-green-400 tracking-wider inline-flex items-center gap-1.5">
            <FaCheck className="w-3 h-3" />
            Saved
          </span>
        )}
        {status === "error" && (
          <span className="font-typewriter text-xs text-red-700 dark:text-red-400 tracking-wider inline-flex items-center gap-1.5">
            <FaCircleExclamation className="w-3 h-3" />
            {errorMsg ?? "Save failed"}
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="underline underline-offset-2 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 ml-1"
            >
              Retry
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
