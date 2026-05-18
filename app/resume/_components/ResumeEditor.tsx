"use client";

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaCheck,
  FaCircleExclamation,
  FaEye,
  FaFloppyDisk,
  FaPlus,
  FaTrash,
  FaTriangleExclamation,
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
  normalizeResume,
  resolveSectionOrder,
} from "../data";
import ResumeScreen from "./ResumeScreen";
import ResumePrint from "./ResumePrint";

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
  const [previewMode, setPreviewMode] = useState<"off" | "screen" | "print">(
    "off"
  );

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

  // Print-page fit, measured from a real off-screen render of the print
  // layout (see usePrintPageFit) — the SaveBar reports the exact same
  // page count the print preview does, never a heuristic guess. Run on the
  // normalized resume so empty lines etc. don't inflate it while typing.
  const normalized = useMemo(() => normalizeResume(resume), [resume]);
  const { fit: pageFit, measureRef } = usePrintPageFit(normalized);

  if (previewMode !== "off") {
    return (
      <PreviewView
        resume={normalized}
        mode={previewMode}
        onModeChange={setPreviewMode}
        onBack={() => setPreviewMode("off")}
      />
    );
  }

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
          onPreview={() => setPreviewMode("screen")}
          pageFitStatus={pageFit.status}
          pageFitPages={pageFit.pages}
        />
      </div>
      <PrintMeasureProbe resume={normalized} innerRef={measureRef} />
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
                  // Preserve raw lines (including empties) so Enter keypresses
                  // work. The normalizer filters empties on read.
                  stack: v.split("\n"),
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
                  bullets: v.split("\n"),
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
                    items: v.split("\n"),
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
              bullets: v.split("\n"),
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
  onPreview,
  pageFitStatus,
  pageFitPages,
}: {
  pending: boolean;
  status: "idle" | "saved" | "error";
  errorMsg: string | null;
  onSave: () => void;
  onPreview: () => void;
  pageFitStatus: PageFitStatus;
  pageFitPages: number;
}) {
  return (
    <div className="sticky bottom-4 z-10 flex justify-center">
      <div className="bg-cream/95 dark:bg-warmGray-900/95 backdrop-blur-sm border border-sepia-300 dark:border-sepia-700 rounded-sm shadow-md flex flex-col">
        {pageFitStatus !== "ok" && (
          <PageFitBanner status={pageFitStatus} pages={pageFitPages} />
        )}
        <div className="px-4 py-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            className="font-typewriter text-sm tracking-wider text-sepia-700 dark:text-sepia-300 hover:text-sepia-900 dark:hover:text-cream border border-sepia-300 dark:border-sepia-700 hover:border-sepia-500 px-4 py-2 rounded-sm transition-colors inline-flex items-center gap-2"
          >
            <FaEye className="w-3.5 h-3.5" />
            Preview
          </button>
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
    </div>
  );
}

function PageFitBanner({
  status,
  pages,
}: {
  status: PageFitStatus;
  pages: number;
}) {
  if (status === "ok") return null;
  const tight = status === "tight";
  const message = tight
    ? `Approaching one-page limit (~${(pages * 100).toFixed(0)}% of usable height).`
    : `Estimated ${pages.toFixed(1)} pages — print will overflow.`;
  const colorClasses = tight
    ? "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40"
    : "text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50/60 dark:bg-red-950/40";
  return (
    <div
      className={`px-4 py-2 border-b ${colorClasses} font-typewriter text-[11px] tracking-wider inline-flex items-center gap-2 rounded-t-sm`}
      role="status"
    >
      <FaTriangleExclamation className="w-3 h-3" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview view — sticky bar at the top with a Screen / Print toggle and a
// Back-to-editor button; content renders either the on-brand screen layout
// or the print layout inside a paper-shaped wrapper.
// ---------------------------------------------------------------------------

function PreviewView({
  resume,
  mode,
  onModeChange,
  onBack,
}: {
  resume: Resume;
  mode: "screen" | "print";
  onModeChange: (m: "screen" | "print") => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="sticky top-16 z-20 flex justify-center mt-6 mx-4">
        <div className="bg-cream/95 dark:bg-warmGray-900/95 backdrop-blur-sm border border-sepia-300 dark:border-sepia-700 rounded-sm shadow-md px-3 py-2 inline-flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="font-typewriter text-xs uppercase tracking-widest leading-none text-sepia-700 dark:text-sepia-300 hover:text-sepia-900 dark:hover:text-cream inline-flex items-center gap-1.5 px-2 py-1"
          >
            {/* Optical nudge: the typewriter font's uppercase caps sit
                high in their line box, so a box-centered icon reads as
                bottom-aligned. Lift the icon to the caps' visual center.
                Tune the px if the font/size changes. */}
            <FaArrowLeft className="w-3 h-3 shrink-0 -translate-y-[2px]" />
            Back to editor
          </button>
          <span className="w-px h-4 bg-sepia-300 dark:bg-sepia-700" aria-hidden />
          <span className="font-typewriter text-[10px] uppercase tracking-widest text-sepia-500 dark:text-sepia-400">
            View
          </span>
          <div className="inline-flex border border-sepia-300 dark:border-sepia-700 rounded-sm overflow-hidden">
            {(["screen", "print"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`font-typewriter text-[10px] uppercase tracking-widest px-3 py-1 transition-colors ${
                  mode === m
                    ? "bg-sepia-200 dark:bg-sepia-700 text-sepia-900 dark:text-cream"
                    : "text-sepia-600 dark:text-sepia-400 hover:bg-sepia-100 dark:hover:bg-sepia-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "screen" && <ResumeScreen resume={resume} />}
      {mode === "print" && <PrintPreview resume={resume} />}
    </>
  );
}

/**
 * Mimic the print engine's `page-break-inside: avoid` and
 * `page-break-after: avoid` behavior on screen.
 *
 * Print breaks happen at the **usable** page bottom — that is, the page
 * height minus the bottom margin — not at the full sheet height. An
 * element whose bottom would extend into the bottom-margin band of
 * page N gets pushed to start at the usable-content top of page N+1.
 *
 * Coordinates are all in CSS px relative to the content element's top.
 * Page N starts at content-y = N * pageStride, where pageStride is the
 * full sheet height plus the visual gap between page frames.
 */
function paginateForPrintPreview(
  content: HTMLElement,
  pageStridePx: number,
  topMarginPx: number,
  usableBottomPx: number
): void {
  // Reset previous shifts so re-runs are idempotent.
  content.querySelectorAll<HTMLElement>("[data-pagination-shift]").forEach(
    (el) => {
      el.style.marginTop = "";
      el.removeAttribute("data-pagination-shift");
    }
  );

  const contentTop = content.getBoundingClientRect().top;
  const topOf = (el: HTMLElement) =>
    el.getBoundingClientRect().top - contentTop;
  const bottomOf = (el: HTMLElement) =>
    el.getBoundingClientRect().bottom - contentTop;

  // page-break-inside: avoid — push the whole element to the next page if
  // its bottom would extend past the usable-content bottom of its page.
  const keepWhole = Array.from(
    content.querySelectorAll<HTMLElement>(
      ".resume-print__edu, .resume-print__bullets li"
    )
  );
  for (const el of keepWhole) {
    const top = topOf(el);
    const bottom = bottomOf(el);
    if (bottom <= top) continue;
    const pageOfTop = Math.max(0, Math.floor(top / pageStridePx));
    const usableBottom = pageOfTop * pageStridePx + usableBottomPx;
    if (bottom > usableBottom) {
      const newTop = (pageOfTop + 1) * pageStridePx + topMarginPx;
      const gap = newTop - top;
      if (gap > 0) {
        el.style.marginTop = `${gap}px`;
        el.setAttribute("data-pagination-shift", String(gap));
      }
    }
  }

  // page-break-after: avoid — if a section-title sits on page N but its
  // first following sibling now lands on page N+1, push the title down so
  // the pair stays together.
  const keepWithNext = Array.from(
    content.querySelectorAll<HTMLElement>(".resume-print__section-title")
  );
  for (const el of keepWithNext) {
    const next = el.nextElementSibling as HTMLElement | null;
    if (!next) continue;
    const elPage = Math.floor(topOf(el) / pageStridePx);
    const nextPage = Math.floor(topOf(next) / pageStridePx);
    if (elPage !== nextPage) {
      const newTop = nextPage * pageStridePx + topMarginPx;
      const gap = newTop - topOf(el);
      if (gap > 0) {
        el.style.marginTop = `${gap}px`;
        el.setAttribute("data-pagination-shift", String(gap));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Print-page measurement — the single source of truth shared by the editor's
// SaveBar and the print preview. Both render the same <ResumePrint> at the
// same width and run the same paginate-then-measure pass, so the page count
// they report can never disagree. (The old character-heuristic estimator
// undercounted long bullets and drifted as content grew.)
// ---------------------------------------------------------------------------

// Letter dimensions in CSS px (96 dpi). Margins mirror @page in resume.css:
// 0.35in uniform. The stride includes the visual gap between page frames so
// measured coordinates line up with the rendered sheets.
const PAGE_HEIGHT_IN = 11;
const PAGE_HEIGHT_PX = PAGE_HEIGHT_IN * 96;
const PRINT_TOP_MARGIN_PX = 0.35 * 96;
const PRINT_BOTTOM_MARGIN_PX = 0.35 * 96;
const PAGE_GAP_PX = 28;
const PAGE_STRIDE_PX = PAGE_HEIGHT_PX + PAGE_GAP_PX;
const PRINT_USABLE_BOTTOM_PX = PAGE_HEIGHT_PX - PRINT_BOTTOM_MARGIN_PX;

type PageFitStatus = "ok" | "tight" | "overflow";

interface PrintPageFit {
  pageCount: number;
  pages: number; // fractional — drives the SaveBar "% of page" / "N.N pages" copy
  status: PageFitStatus;
}

// Paginate the live content element (idempotent mutation) then measure its
// real height. This IS the definition of "how many pages" for both the
// preview frames and the SaveBar banner.
function measurePrintPages(content: HTMLElement): PrintPageFit {
  paginateForPrintPreview(
    content,
    PAGE_STRIDE_PX,
    PRINT_TOP_MARGIN_PX,
    PRINT_USABLE_BOTTOM_PX
  );
  const pages = content.scrollHeight / PAGE_STRIDE_PX;
  const pageCount = Math.max(1, Math.ceil(pages));
  const status: PageFitStatus =
    pages < 0.9 ? "ok" : pages <= 1.0 ? "tight" : "overflow";
  return { pageCount, pages, status };
}

// Owns an off-screen measuring node so the SaveBar reflects the real
// rendered height even while the preview is closed. (The always-rendered
// <ResumePrint> from the page is display:none on screen → scrollHeight 0,
// so it can't be measured in place.)
function usePrintPageFit(resume: Resume): {
  fit: PrintPageFit;
  measureRef: RefObject<HTMLDivElement | null>;
} {
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<PrintPageFit>({
    pageCount: 1,
    pages: 0,
    status: "ok",
  });
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const run = () => {
      const next = measurePrintPages(el);
      setFit((prev) =>
        prev.pageCount === next.pageCount &&
        prev.status === next.status &&
        Math.abs(prev.pages - next.pages) < 0.001
          ? prev
          : next
      );
    };
    run();
    const observer = new ResizeObserver(run);
    observer.observe(el);
    return () => observer.disconnect();
  }, [resume]);
  return { fit, measureRef };
}

// The hidden measuring render. visibility:hidden keeps full layout (so
// scrollHeight is real) while staying invisible and non-interactive;
// position:absolute takes it out of the editor's flow. Width + classes
// mirror the visible preview exactly, so wrapping — and therefore measured
// height — matches the preview and the printed PDF.
function PrintMeasureProbe({
  resume,
  innerRef,
}: {
  resume: Resume;
  innerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      aria-hidden
      className="resume-print-preview"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "8.5in",
        visibility: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <div ref={innerRef} className="resume-print-preview__content">
        <ResumePrint resume={resume} />
      </div>
    </div>
  );
}

function PrintPreview({ resume }: { resume: Resume }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const run = () => {
      const { pageCount: n } = measurePrintPages(el);
      setPageCount((prev) => (prev === n ? prev : n));
    };
    run();
    const observer = new ResizeObserver(run);
    observer.observe(el);
    return () => observer.disconnect();
  }, [resume]);

  return (
    <div
      className="resume-print-preview"
      style={{
        minHeight: `calc(${pageCount * PAGE_HEIGHT_IN}in + ${
          (pageCount - 1) * PAGE_GAP_PX
        }px)`,
      }}
    >
      {/* Background: one Letter-proportioned sheet per measured page. */}
      {Array.from({ length: pageCount }).map((_, i) => (
        <div
          key={i}
          className="resume-print-preview__page-frame"
          style={{
            top: `calc(${i * PAGE_HEIGHT_IN}in + ${i * PAGE_GAP_PX}px)`,
          }}
          aria-hidden
        >
          <span
            style={{
              position: "absolute",
              bottom: "0.2in",
              right: "0.4in",
              fontFamily:
                "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#c97c5d",
              pointerEvents: "none",
            }}
          >
            page {i + 1} of {pageCount}
          </span>
        </div>
      ))}

      {/* Foreground: continuous content flow across the page frames. */}
      <div ref={contentRef} className="resume-print-preview__content">
        <ResumePrint resume={resume} />
      </div>
    </div>
  );
}
