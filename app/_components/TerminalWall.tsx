"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import "./terminal-wall.css";
import { renderBio } from "../_lib/render-bio";
import { useDock } from "./DockProvider";
import { useAuth } from "./AuthProvider";
import {
  login,
  logout,
  updateAvatar,
  updateBio,
  updateResumeData,
} from "../_lib/auth-action";
import { RESUME, type Resume } from "../resume/data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlickrPhoto {
  id: string;
  title: string;
  src: string;
  srcSmall: string;
}

interface TerminalWallProps {
  photos: FlickrPhoto[];
  bio: string | null;
  avatar: string | null;
  resume: Resume | null;
}

// A file open in the inline nano editor — its title-bar name, seed buffer, and
// the persist action run on ^O (throws to surface an error in the status line).
type NanoFile = {
  name: string;
  initial: string;
  save: (text: string) => Promise<void>;
};

type TermTheme = "light" | "dark" | "matrix";

interface CmdResult {
  body?: ReactNode;
  sideEffectOnly?: boolean;
}

interface CmdCtx {
  photos: FlickrPhoto[];
  cols: number;
  bio: string;
  avatar: string | null;
  isAuthenticated: boolean;
  // When true, the command is being re-run to rebuild persisted output on
  // restore: render the body, but skip the one-shot side effects.
  replay?: boolean;
  openPhoto: (index: number) => void;
  openLogin: () => void;
  doLogout: () => void;
  openBioEditor: () => void;
  openResumeEditor: () => void;
  openExternal: (url: string) => void;
  composeEmail: () => void;
  setTheme: (t: TermTheme) => void;
  setCols: (c: number) => void;
  clear: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BIO =
  "Master's student in CS at UCSC, graduating 2026. I build platform infrastructure — CI/CD pipelines, deploy automation, self-hosted k3s clusters. Currently at [Flyer](https://joinflyer.com). Based in Santa Clara, looking for what's next.";

const ALBUM_ID = "72177720317181217";
const ALBUM_NAME = "Some Random Shots";
const FLICKR_ALBUM_URL = `https://www.flickr.com/photos/yuan-jia/albums/${ALBUM_ID}`;

// The four commands that type out on load. Stored as plain strings so the
// typing hook can read their lengths without re-running on every render.
const INITIAL_CMDS = [
  "whoami",
  "cat ~/about.md",
  "ls -la ~/links",
  `flickr fetch --album "${ALBUM_NAME}" --limit 20`,
] as const;

const LINKS = [
  {
    name: "github",
    target: "→ /yuan0-0jia",
    href: "https://github.com/yuan0-0jia",
    external: true,
    perms: "lrwxrwxrwx",
    permClass: "yjt-blue",
  },
  {
    name: "linkedin",
    target: "→ /in/yuanjia1",
    href: "https://www.linkedin.com/in/yuanjia1/",
    external: true,
    perms: "lrwxrwxrwx",
    permClass: "yjt-blue",
  },
  {
    name: "email",
    target: "→ hello.yuanjia@gmail.com",
    href: "mailto:hello.yuanjia@gmail.com",
    external: false,
    perms: "lrwxrwxrwx",
    permClass: "yjt-blue",
  },
] as const;

// Options / REPL command catalogue.
const COMMANDS = [
  { name: "options", desc: "show this list" },
  { name: "whoami", desc: "who is yuan" },
  { name: "about", desc: "cat ~/about.md" },
  { name: "ls", desc: "list links" },
  { name: "ls photos", desc: "list photo grid" },
  { name: "open N", desc: "open photo N (1–20)" },
  { name: "github", desc: "open github ↗" },
  { name: "linkedin", desc: "open linkedin ↗" },
  { name: "email", desc: "compose email" },
  { name: "theme", desc: "light | dark | matrix" },
  { name: "cols", desc: "4 | 5 | 6" },
  { name: "clear", desc: "clear screen" },
];

// Tab-completion vocabulary: public commands only (owner commands and aliases
// still work when typed, they're just not suggested), plus the argument options
// for the commands that take one.
const COMPLETIONS = [
  "options", "whoami", "about", "ls", "open",
  "github", "linkedin", "email", "theme", "cols", "clear",
];
const ARG_OPTIONS: Record<string, string[]> = {
  theme: ["light", "dark", "matrix"],
  cols: ["4", "5", "6"],
  ls: ["photos"],
};

// Play the boot sequence only once per browsing session. The module flag covers
// SPA navigations (it survives client-side route changes); sessionStorage covers
// full-page returns (login redirect, reload). An explicit `restart` overrides it.
const INTRO_SEEN_KEY = "yjt-intro-seen";
const REPL_KEY = "yjt-repl"; // persisted REPL state (command strings, not bodies)
const SCROLL_KEY = "yjt-scroll"; // persisted window scroll position
let introSeenThisSession = false;

// Layout effect on the client (so the skip lands before paint — no flash),
// harmless no-op effect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// The photo's filename — its real Flickr title (often the camera name, e.g.
// "_DSC2864"), lowercased for the terminal aesthetic. Falls back to "untitled"
// only when a photo has no title on Flickr; titling a shot there surfaces here
// on the next revalidate.
function photoName(title: string): string {
  return title.trim().toLowerCase() || "untitled";
}

const pad3 = (n: number) => String(n).padStart(3, "0");

const lineCount = (s: string) => (s ? s.split("\n").length : 0);

// Fisher-Yates shuffle into a new array (doesn't mutate the input).
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Typing-sequence hook ────────────────────────────────────────────────────
// Drives the multi-block intro. Each block types its command char-by-char, then
// reveals its body, then advances. `runId` bumps to restart the whole sequence.

function useTypingSequence(
  cmdLengths: number[],
  animate: boolean,
  runId: number
) {
  const blockCount = cmdLengths.length;
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState<"typing" | "body" | "done">("typing");
  const [cmdProgress, setCmdProgress] = useState(0);

  // Reset whenever runId changes (restart button / shutdown overlay).
  useEffect(() => {
    setStage(0);
    setPhase("typing");
    setCmdProgress(0);
  }, [runId]);

  const finishAll = useCallback(() => {
    setStage(blockCount);
    setPhase("done");
  }, [blockCount]);

  useEffect(() => {
    if (!animate) finishAll();
  }, [animate, finishAll]);

  // Advance the sequence.
  useEffect(() => {
    if (!animate || stage >= blockCount) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      const len = cmdLengths[stage] ?? 0;
      if (cmdProgress < len) {
        t = setTimeout(() => setCmdProgress((p) => p + 1), 24 + Math.random() * 30);
      } else {
        t = setTimeout(() => setPhase("body"), 200);
      }
    } else if (phase === "body") {
      t = setTimeout(() => {
        setStage((s) => s + 1);
        setCmdProgress(0);
        setPhase("typing");
      }, 380);
    }
    return () => clearTimeout(t);
  }, [animate, stage, blockCount, phase, cmdProgress, cmdLengths]);

  // Click anywhere (outside interactive things) to skip the rest.
  useEffect(() => {
    if (!animate || stage >= blockCount) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("a, button, input, .yjt-cell")) return;
      finishAll();
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [animate, stage, blockCount, finishAll]);

  return { stage, phase, cmdProgress, finishAll };
}

// ─── Presentational pieces ───────────────────────────────────────────────────

function PromptSpans() {
  return (
    <>
      <span className="yjt-prompt">yuan</span>
      <span className="yjt-at">@</span>
      <span className="yjt-host">page</span>
      <span className="yjt-sep">:</span>
      <span className="yjt-cwd">~</span>
      <span className="yjt-dollar">$</span>
    </>
  );
}

// Traffic-light hover glyph as an SVG so it sits perfectly centred (font
// characters can't, since they render on their baseline).
function LightGlyph({ d }: { d: string }) {
  return (
    <span className="yjt-light-glyph" aria-hidden="true">
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  );
}

function CmdLine({
  cmd,
  progress,
  isCurrent,
  done,
}: {
  cmd: string;
  progress: number;
  isCurrent: boolean;
  done: boolean;
}) {
  const shown = done ? cmd : cmd.slice(0, progress);
  return (
    <div className="yjt-cmd">
      <PromptSpans />
      <span className="yjt-cmd-text">{shown}</span>
      {isCurrent && !done && <span className="yjt-cursor yjt-cursor-inline" aria-hidden="true" />}
    </div>
  );
}

// Auth-gated avatar with an inline "replace" uploader (hover/tap → file
// picker → server action → reload). Renders in place of the static portrait.
function AvatarUpload({ src }: { src: string }) {
  const [busy, setBusy] = useState(false);
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await updateAvatar(fd);
      window.location.reload(); // re-fetch the row so the new portrait shows
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };
  return (
    <label
      className={`yjt-whoami-avatar yjt-avatar-edit${busy ? " is-busy" : ""}`}
      title="Replace avatar"
      aria-label="Replace avatar"
    >
      <Image src={src} alt="Yuan Jia" width={96} height={96} draggable={false} />
      <span className="yjt-avatar-edit-hint">{busy ? "uploading…" : "↑ replace"}</span>
      <input type="file" accept="image/*" onChange={onChange} disabled={busy} hidden />
    </label>
  );
}

function BodyWhoami({
  avatar,
  isAuthenticated,
}: {
  avatar?: string | null;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="yjt-body yjt-whoami">
      {avatar &&
        // neofetch-style: portrait beside the "system info" key-values.
        (isAuthenticated ? (
          <AvatarUpload src={avatar} />
        ) : (
          <div className="yjt-whoami-avatar">
            <Image src={avatar} alt="Yuan Jia" width={96} height={96} draggable={false} />
          </div>
        ))}
      <div className="yjt-whoami-info">
        <div className="yjt-kv">
          <span className="yjt-kv-k">name</span>
          <span className="yjt-kv-v yjt-green">Yuan Jia</span>
        </div>
        <div className="yjt-kv">
          <span className="yjt-kv-k">role</span>
          <span className="yjt-kv-v">software engineer &amp; photographer</span>
        </div>
        <div className="yjt-kv">
          <span className="yjt-kv-k">loc</span>
          <span className="yjt-kv-v yjt-blue">Santa Clara, CA</span>
        </div>
        <div className="yjt-kv">
          <span className="yjt-kv-k">status</span>
          <span className="yjt-kv-v yjt-yellow">open to work</span>
        </div>
      </div>
    </div>
  );
}

function BodyAbout({ bio }: { bio: string }) {
  return (
    <div className="yjt-body yjt-prose">
      <p>{renderBio(bio)}</p>
      <p className="yjt-prose-note yjt-dim"># this site lives at yuanjia.page</p>
    </div>
  );
}

// ─── Inline nano editor for ~/about.md ───────────────────────────────────────
// A nano-style takeover of the terminal body: title bar, editable buffer, a
// status line, and the ^O Write Out / ^X Exit chords (keyboard + clickable).
// Auth is enforced upstream (the nano command) and again in updateBio.
function NanoEditor({ file, onClose }: { file: NanoFile; onClose: () => void }) {
  const [text, setText] = useState(file.initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(`[ Read ${lineCount(file.initial)} lines ]`);
  const [confirmExit, setConfirmExit] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, []);

  const write = async (): Promise<boolean> => {
    setBusy(true);
    try {
      await file.save(text);
      setDirty(false);
      setStatus(`[ Wrote ${lineCount(text)} lines ]`);
      return true;
    } catch (err) {
      console.error(err);
      setStatus(`[ ${err instanceof Error ? err.message : `Error writing ${file.name}`} ]`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey;

    if (confirmExit) {
      const k = e.key.toLowerCase();
      if (k === "y") {
        e.preventDefault();
        if (await write()) onClose();
        else setConfirmExit(false);
      } else if (k === "n") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Escape" || (mod && k === "c")) {
        e.preventDefault();
        setConfirmExit(false);
        setStatus("[ Cancelled ]");
      } else {
        e.preventDefault(); // swallow keys while the prompt is up
      }
      return;
    }

    if (mod && e.key.toLowerCase() === "o") {
      e.preventDefault();
      await write();
    } else if (mod && e.key.toLowerCase() === "x") {
      e.preventDefault();
      if (dirty) {
        setConfirmExit(true);
        setStatus("");
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="yjt-nano" role="region" aria-label="nano editor">
      <div className="yjt-nano-bar">
        <span className="yjt-nano-ver">GNU nano 7.2</span>
        <span className="yjt-nano-file">{file.name}{dirty ? " *" : ""}</span>
        <span className="yjt-nano-mod">{dirty ? "Modified" : ""}</span>
      </div>

      <textarea
        ref={taRef}
        className="yjt-nano-text"
        value={text}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
          if (status) setStatus("");
        }}
        onKeyDown={handleKeyDown}
        aria-label="about.md contents"
      />

      <div className="yjt-nano-status" aria-live="polite">
        {confirmExit ? (
          <span className="yjt-nano-msg">
            Save modified buffer?{" "}
            <button
              className="yjt-nano-inline"
              onClick={async () => {
                if (await write()) onClose();
              }}
            >
              Y
            </button>{" "}
            <button className="yjt-nano-inline" onClick={onClose}>
              N
            </button>{" "}
            <button
              className="yjt-nano-inline"
              onClick={() => {
                setConfirmExit(false);
                setStatus("[ Cancelled ]");
                taRef.current?.focus();
              }}
            >
              ^C
            </button>
          </span>
        ) : busy ? (
          <span className="yjt-nano-msg">Writing…</span>
        ) : status ? (
          <span className="yjt-nano-msg">{status}</span>
        ) : null}
      </div>

      <div className="yjt-nano-keys">
        <button className="yjt-nano-key" onClick={() => void write()} disabled={busy}>
          <span className="yjt-nano-chord">^O</span> Write Out
        </button>
        <button
          className="yjt-nano-key"
          onClick={() => {
            if (dirty) {
              setConfirmExit(true);
              setStatus("");
              taRef.current?.focus();
            } else {
              onClose();
            }
          }}
        >
          <span className="yjt-nano-chord">^X</span> Exit
        </button>
      </div>
    </div>
  );
}

function BodyLinks() {
  return (
    <div className="yjt-body">
      <div className="yjt-ls-head">
        <span>type</span>
        <span>name</span>
        <span>target</span>
      </div>
      {LINKS.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          className="yjt-ls-row"
        >
          <span className={`yjt-ls-type ${link.permClass}`}>{link.perms}</span>
          <span className="yjt-ls-name">{link.name}</span>
          <span className="yjt-ls-target">
            {link.target} {link.external && <span className="yjt-faint">↗</span>}
          </span>
        </a>
      ))}
    </div>
  );
}

function PhotoCell({
  photo,
  idx,
  onOpen,
}: {
  photo: FlickrPhoto;
  idx: number;
  onOpen: (index: number) => void;
}) {
  const name = photoName(photo.title);
  return (
    <button
      className="yjt-cell"
      onClick={() => onOpen(idx)}
      aria-label={`Open ${name}.jpg`}
    >
      <div className="yjt-cell-img">
        <img
          src={photo.srcSmall}
          alt={name}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="yjt-cell-overlay" aria-hidden="true">
          <span className="yjt-cell-zoom">⌖</span>
        </div>
      </div>
      <div className="yjt-cell-row">
        <span className="yjt-cell-perms">-rw-r--r--</span>
        <span className="yjt-cell-name">{name}.jpg</span>
      </div>
    </button>
  );
}

function BodyPhotos({
  photos,
  cols,
  onOpen,
}: {
  photos: FlickrPhoto[];
  cols: number;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="yjt-body">
      <div className="yjt-photos-meta">
        <span className="yjt-dim">total {photos.length}</span>{" "}
        {photos.length > 0 ? (
          <>
            <span className="yjt-green">· flickr live</span>{" "}
            <span className="yjt-dim">·</span>{" "}
            <a
              href={FLICKR_ALBUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="yjt-link-inline"
            >
              view album <span className="yjt-faint">↗</span>
            </a>
          </>
        ) : (
          <span className="yjt-dim">· loading…</span>
        )}
      </div>
      <div
        className="yjt-grid"
        style={{ ["--yjt-cols" as string]: cols }}
      >
        {photos.map((p, i) => (
          <PhotoCell key={p.id} photo={p} idx={i} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function BodyOptions() {
  return (
    <div className="yjt-body">
      <div className="yjt-dim" style={{ marginBottom: 6 }}>
        available commands
      </div>
      <div className="yjt-help">
        {COMMANDS.map((c) => (
          <div className="yjt-help-row" key={c.name}>
            <span className="yjt-help-cmd">{c.name}</span>
            <span className="yjt-help-desc">— {c.desc}</span>
          </div>
        ))}
      </div>
      <div className="yjt-dim" style={{ marginTop: 10, fontSize: 11 }}>
        ↑/↓ history · Tab completes
      </div>
    </div>
  );
}

function BodyNote({
  children,
  tone = "dim",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className="yjt-body">
      <span className={`yjt-${tone}`}>{children}</span>
    </div>
  );
}

// Interpret a command and return body JSX (or a side-effect sentinel).
function runCommand(input: string, ctx: CmdCtx): CmdResult {
  const trimmed = input.trim();
  if (!trimmed) return { body: null };
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "options":
      return { body: <BodyOptions /> };

    case "whoami":
      return {
        body: <BodyWhoami avatar={ctx.avatar} isAuthenticated={ctx.isAuthenticated} />,
      };

    case "about":
    case "cat":
      return { body: <BodyAbout bio={ctx.bio} /> };

    case "ls": {
      if (args[0]?.toLowerCase().startsWith("photo")) {
        return {
          body: <BodyPhotos photos={ctx.photos} cols={ctx.cols} onOpen={ctx.openPhoto} />,
        };
      }
      return { body: <BodyLinks /> };
    }

    case "flickr":
    case "photos":
      return {
        body: <BodyPhotos photos={ctx.photos} cols={ctx.cols} onOpen={ctx.openPhoto} />,
      };

    case "open":
    case "o": {
      const n = parseInt(args[0], 10);
      if (Number.isFinite(n) && n >= 1 && n <= ctx.photos.length) {
        if (!ctx.replay) ctx.openPhoto(n - 1);
        return { body: <BodyNote>opening photo {pad3(n)}.jpg …</BodyNote> };
      }
      return {
        body: (
          <BodyNote tone="prompt-c">
            open: photo &quot;{args[0] ?? ""}&quot; not found · range 1–{ctx.photos.length}
          </BodyNote>
        ),
      };
    }

    case "github":
      if (!ctx.replay) ctx.openExternal("https://github.com/yuan0-0jia");
      return {
        body: (
          <BodyNote>
            → github.com/yuan0-0jia <span className="yjt-faint">↗</span>
          </BodyNote>
        ),
      };

    case "linkedin":
      if (!ctx.replay) ctx.openExternal("https://www.linkedin.com/in/yuanjia1/");
      return {
        body: (
          <BodyNote>
            → linkedin.com/in/yuanjia1 <span className="yjt-faint">↗</span>
          </BodyNote>
        ),
      };

    case "email":
    case "mail":
      if (!ctx.replay) ctx.composeEmail();
      return { body: <BodyNote>→ hello.yuanjia@gmail.com</BodyNote> };

    case "login":
    case "signin":
      if (!ctx.replay) ctx.openLogin();
      return { body: <BodyNote>→ redirecting to google sign-in…</BodyNote> };

    case "logout":
    case "signout":
      if (!ctx.replay) ctx.doLogout();
      return { body: <BodyNote>signing out…</BodyNote> };

    case "nano":
    case "edit": {
      if (!ctx.isAuthenticated) {
        return {
          body: (
            <BodyNote tone="prompt-c">
              nano: permission denied — run &apos;login&apos; first
            </BodyNote>
          ),
        };
      }
      const file = (args[0] || "").toLowerCase();
      if (!file) {
        return { body: <BodyNote tone="prompt-c">usage: nano about.md | resume.json</BodyNote> };
      }
      if (["about", "about.md", "~/about.md", "bio"].includes(file)) {
        if (!ctx.replay) ctx.openBioEditor();
        return { body: <BodyNote>GNU nano — editing ~/about.md…</BodyNote> };
      }
      if (["resume", "cv", "resume.json", "~/resume"].includes(file)) {
        if (!ctx.replay) ctx.openResumeEditor();
        return { body: <BodyNote>GNU nano — editing resume.json…</BodyNote> };
      }
      return {
        body: (
          <BodyNote tone="prompt-c">
            nano: cannot edit &apos;{args[0]}&apos; — try about.md or resume
          </BodyNote>
        ),
      };
    }

    case "theme": {
      const t = (args[0] || "").toLowerCase();
      if (t === "light" || t === "dark" || t === "matrix") {
        if (!ctx.replay) ctx.setTheme(t);
        return { body: <BodyNote>theme → {t}</BodyNote> };
      }
      return { body: <BodyNote tone="prompt-c">usage: theme light | dark | matrix</BodyNote> };
    }

    case "cols": {
      const c = parseInt(args[0], 10);
      if ([4, 5, 6].includes(c)) {
        if (!ctx.replay) ctx.setCols(c);
        return { body: <BodyNote>grid → {c} cols</BodyNote> };
      }
      return { body: <BodyNote tone="prompt-c">usage: cols 4 | 5 | 6</BodyNote> };
    }

    case "clear":
    case "cls":
      if (!ctx.replay) ctx.clear();
      return { sideEffectOnly: true };

    default:
      return {
        body: (
          <div className="yjt-body">
            <span className="yjt-prompt-c">{cmd}: command not found</span>
            <span className="yjt-dim"> · type &apos;options&apos; for the list</span>
          </div>
        ),
      };
  }
}

// ─── Interactive prompt (REPL input) ─────────────────────────────────────────

function Prompt({
  value,
  onChange,
  onSubmit,
  onHistory,
  onTab,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onHistory: (dir: -1 | 1) => void;
  onTab: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const refocus = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, button, a, textarea, .yjt-cell, .yjt-lb")) return;
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("click", refocus);
    return () => window.removeEventListener("click", refocus);
  }, []);

  return (
    <div className="yjt-block yjt-prompt-block">
      <div className="yjt-cmd">
        <PromptSpans />
        {/* type="search" → Safari treats this as a search box, not a credential
            field, so its iCloud Keychain password-key icon never appears
            (it ignores autocomplete="off" on domains with saved logins). The
            search clear/decoration pseudo-elements are hidden in CSS. */}
        <input
          ref={inputRef}
          className="yjt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              onHistory(1); // ↑ = previous (older) command
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onHistory(-1); // ↓ = next (newer) command
            } else if (e.key === "Tab") {
              e.preventDefault();
              onTab();
            }
          }}
          type="search"
          name="terminal"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore=""
          data-lpignore="true"
          data-form-type="other"
          placeholder={placeholder}
          aria-label="terminal input"
        />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TerminalWall({ photos, bio, avatar, resume }: TerminalWallProps) {
  const { resolvedTheme, setTheme: setSiteTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  // Shuffle once per load — a random arrangement (and a random selection when
  // the album has more than 20).
  const displayPhotos = useMemo(() => shuffle(photos).slice(0, 20), [photos]);
  // Bio is stateful so the inline `nano about.md` editor can reflect a save
  // without a full reload.
  const [bioText, setBioText] = useState(bio ?? DEFAULT_BIO);
  // The file open in the inline nano editor (about.md or resume.json), or null
  // when not editing. Auth-gated via the nano command.
  const [nanoFile, setNanoFile] = useState<NanoFile | null>(null);

  // Theme is unified with the rest of the site (next-themes) — the in-terminal
  // `theme` command is the single control. Mirror the site theme as the
  // terminal palette (light/dark/matrix, matching next-themes' values).
  const theme: TermTheme =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "matrix"
        ? "matrix"
        : "light";
  const [cols, setCols] = useState(5);

  // Window chrome state (mac traffic-light behaviour). Maximized (widened) and
  // minimized are independent, so a maximized window stays widened after it's
  // minimized to the dock and restored.
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  // Minimize scales the window down into the global dock, which shows a
  // restore chip. The scale-down/up is a CSS transition (see .is-minimized).
  const dock = useDock();
  const registerDockWindow = dock?.setMinimized;
  useEffect(() => {
    if (!registerDockWindow) return;
    if (minimized) {
      registerDockWindow({
        id: "terminal",
        label: "yuan@page — zsh",
        onRestore: () => setMinimized(false),
      });
    } else {
      registerDockWindow(null);
    }
    return () => registerDockWindow(null);
  }, [minimized, registerDockWindow]);

  // Lightbox.
  const [lbFrame, setLbFrame] = useState<number | null>(null);

  // REPL state.
  const [sessionBlocks, setSessionBlocks] = useState<
    { id: number; cmd: string; body: ReactNode }[]
  >([]);
  const [hideInitial, setHideInitial] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [runId, setRunId] = useState(0);
  const sessionIdRef = useRef(0);

  // Reduced-motion → skip the type-out animation.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Skip the intro if it has already played this session. The module flag is
  // read synchronously (instant skip on SPA revisits); the layout effect adds
  // the sessionStorage check for full-page returns, before the first paint.
  const [skipIntro, setSkipIntro] = useState(introSeenThisSession);
  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY) === "1") {
        introSeenThisSession = true;
        setSkipIntro(true);
      }
    } catch {}
  }, []);

  const animate = !reduced && !skipIntro;

  const cmdLengths = useMemo(() => INITIAL_CMDS.map((c) => c.length), []);
  const { stage, phase, cmdProgress, finishAll } = useTypingSequence(
    cmdLengths,
    animate,
    runId
  );
  const blockCount = INITIAL_CMDS.length;
  // With animation off, render straight in the finished state (no typing frame).
  const effStage = animate ? stage : blockCount;
  const effPhase = animate ? phase : "done";

  // Once the intro finishes (or is skipped), remember it so we don't replay.
  useEffect(() => {
    if (effStage >= blockCount) {
      introSeenThisSession = true;
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {}
    }
  }, [effStage, blockCount]);

  // ── Restart whole session ────────────────────────────────────────
  // Explicit restart always replays the intro, even if already seen this session.
  const restartSession = useCallback(() => {
    setClosed(false);
    setSessionBlocks([]);
    setHideInitial(false);
    setInputValue("");
    setHistory([]);
    setHistIdx(-1);
    setSkipIntro(false);
    setRunId((r) => r + 1);
  }, []);

  // ── Lightbox keyboard nav ────────────────────────────────────────
  const navPhoto = useCallback(
    (dir: -1 | 1) => {
      setLbFrame((f) =>
        f === null
          ? null
          : (f + dir + displayPhotos.length) % displayPhotos.length
      );
    },
    [displayPhotos.length]
  );

  useEffect(() => {
    if (lbFrame === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLbFrame(null);
      if (e.key === "ArrowLeft") navPhoto(-1);
      if (e.key === "ArrowRight") navPhoto(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lbFrame, navPhoto]);

  // ── REPL helpers ─────────────────────────────────────────────────
  // Builds the command context. `replay` rebuilds persisted output on restore —
  // it renders bodies but skips one-shot side effects; `colsValue` lets restore
  // pass the saved column count before the cols state has caught up.
  const makeCtx = useCallback(
    (replay: boolean, colsValue: number = cols): CmdCtx => ({
      photos: displayPhotos,
      cols: colsValue,
      bio: bioText,
      avatar,
      isAuthenticated,
      replay,
      openPhoto: (i: number) => setLbFrame(i),
      openLogin: () => void login(),
      doLogout: () =>
        void logout().then(() => {
          window.location.href = "/?auth=out";
        }),
      openBioEditor: () => {
        setNanoFile({
          name: "~/about.md",
          initial: bioText,
          save: async (t) => {
            await updateBio(t);
            setBioText(t);
          },
        });
        window.scrollTo({ top: 0 });
      },
      openResumeEditor: () => {
        setNanoFile({
          name: "resume.json",
          initial: JSON.stringify(resume ?? RESUME, null, 2),
          save: async (t) => {
            let parsed: Resume;
            try {
              parsed = JSON.parse(t) as Resume;
            } catch {
              throw new Error("invalid JSON — fix the syntax and retry");
            }
            await updateResumeData(parsed);
          },
        });
        window.scrollTo({ top: 0 });
      },
      openExternal: (url) => window.open(url, "_blank", "noopener"),
      composeEmail: () => {
        window.location.href = "mailto:hello.yuanjia@gmail.com";
      },
      setTheme: (t) => setSiteTheme(t),
      setCols: (c) => setCols(c),
      clear: () => {
        setSessionBlocks([]);
        setHideInitial(true);
        window.scrollTo({ top: 0 });
      },
    }),
    [displayPhotos, cols, bioText, avatar, resume, isAuthenticated, setSiteTheme]
  );

  const submitCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      const result = runCommand(cmd, makeCtx(false));
      if (!result.sideEffectOnly) {
        sessionIdRef.current += 1;
        setSessionBlocks((prev) => [
          ...prev,
          { id: sessionIdRef.current, cmd, body: result.body },
        ]);
        // Live command: scroll its output + the prompt into view.
        requestAnimationFrame(() =>
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
        );
      }
      setHistory((prev) => (prev[prev.length - 1] === cmd ? prev : [...prev, cmd]));
      setHistIdx(-1);
      setInputValue("");
    },
    [makeCtx]
  );

  // Restore REPL state saved earlier this session (commands, cleared flag,
  // cols, history) so leaving and returning keeps the terminal as you left it.
  const hasRestoredRef = useRef(false);
  const [restored, setRestored] = useState(false);
  // Sign-in / sign-out / sign-in-failed indicator: the OAuth callback and
  // logout redirect with ?auth=in, ?auth=out, or ?auth_error=access_denied;
  // surface each as a one-off terminal status line.
  const [authNotice, setAuthNotice] = useState<"in" | "out" | "denied" | null>(null);
  useIsoLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem(REPL_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          cmds?: string[];
          hideInitial?: boolean;
          cols?: number;
          history?: string[];
        };
        if (typeof saved.cols === "number") setCols(saved.cols);
        if (Array.isArray(saved.history)) setHistory(saved.history);
        if (saved.hideInitial) setHideInitial(true);
        if (Array.isArray(saved.cmds) && saved.cmds.length) {
          const ctx = makeCtx(true, saved.cols ?? cols);
          setSessionBlocks(
            saved.cmds.map((c) => {
              sessionIdRef.current += 1;
              return { id: sessionIdRef.current, cmd: c, body: runCommand(c, ctx).body };
            })
          );
        }
      }
    } catch {}
    hasRestoredRef.current = true;
    setRestored(true);
    // Runs once on mount; intentionally captures mount-time makeCtx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist REPL state (command strings only — bodies are rebuilt on restore).
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      sessionStorage.setItem(
        REPL_KEY,
        JSON.stringify({
          cmds: sessionBlocks.map((b) => b.cmd),
          hideInitial,
          cols,
          history,
        })
      );
    } catch {}
  }, [sessionBlocks, hideInitial, cols, history]);

  // Detect a fresh sign-in/sign-out/denied once on mount, then strip the param.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const authError = params.get("auth_error");
    let next: "in" | "out" | "denied" | null = null;
    let stripKey: string | null = null;
    if (auth === "in" || auth === "out") {
      next = auth;
      stripKey = "auth";
    } else if (authError === "access_denied") {
      next = "denied";
      stripKey = "auth_error";
    }
    if (!next) return;
    setAuthNotice(next);
    const url = new URL(window.location.href);
    if (stripKey) url.searchParams.delete(stripKey);
    window.history.replaceState({}, "", url.pathname + url.search);
    requestAnimationFrame(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
    );
  }, []);

  const navigateHistory = useCallback(
    (dir: -1 | 1) => {
      if (history.length === 0) return;
      setHistIdx((cur) => {
        let next = cur + dir;
        if (next < -1) next = -1;
        if (next >= history.length) next = history.length - 1;
        setInputValue(next === -1 ? "" : history[history.length - 1 - next]);
        return next;
      });
    },
    [history]
  );

  // The `options` hint shows until they've run it (history persists and resets
  // on restart, so the hint returns on a fresh session).
  const optionsSeen = history.some((h) => h.trim().toLowerCase() === "options");

  // Tab completion: completes the command, or its argument once a command +
  // space is typed. Extends to the longest common prefix first; if that adds
  // nothing, repeated Tab cycles through the candidates (zsh-style).
  const tabCycleRef = useRef<{ head: string; candidates: string[]; index: number } | null>(null);
  const tabComplete = useCallback(() => {
    const val = inputValue;

    // Mid-cycle and the input is unchanged → advance to the next candidate.
    const cyc = tabCycleRef.current;
    if (cyc && val === cyc.head + cyc.candidates[cyc.index]) {
      cyc.index = (cyc.index + 1) % cyc.candidates.length;
      setInputValue(cyc.head + cyc.candidates[cyc.index]);
      return;
    }
    tabCycleRef.current = null;

    // Completing the command (no space yet) or its argument (after a space)?
    const text = val.replace(/^\s+/, "");
    const sp = text.indexOf(" ");
    let head: string;
    let partial: string;
    let pool: string[];
    if (sp === -1) {
      head = "";
      partial = text.toLowerCase();
      pool = COMPLETIONS;
    } else {
      const cmd = text.slice(0, sp).toLowerCase();
      head = cmd + " ";
      partial = text.slice(sp + 1).replace(/^\s+/, "").toLowerCase();
      pool = ARG_OPTIONS[cmd] ?? [];
    }

    if (head === "" && partial === "") {
      // Empty input: Tab accepts the visible `options` hint.
      if (!optionsSeen) setInputValue("options ");
      return;
    }

    const candidates = pool.filter((c) => c.startsWith(partial));
    if (candidates.length === 0) return;

    if (candidates.length === 1) {
      // Commands get a trailing space (ready for an argument); args are final.
      setInputValue(head + candidates[0] + (head === "" ? " " : ""));
      return;
    }

    let prefix = candidates[0];
    for (const c of candidates) {
      while (!c.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    if (prefix.length > partial.length) {
      setInputValue(head + prefix);
    } else {
      // Can't extend further → start cycling through the candidates.
      tabCycleRef.current = { head, candidates, index: 0 };
      setInputValue(head + candidates[0]);
    }
  }, [inputValue, optionsSeen]);

  // Persist the scroll position (rAF-throttled) so returning to the page can
  // restore it instead of jumping.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
        } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Restore the saved scroll position once the restored content is laid out,
  // before paint, so there's no visible jump.
  useIsoLayoutEffect(() => {
    if (!restored) return;
    try {
      const y = sessionStorage.getItem(SCROLL_KEY);
      if (y != null) window.scrollTo(0, parseInt(y, 10) || 0);
    } catch {}
  }, [restored]);

  const sequenceDone = effStage >= blockCount;

  // Render the body for an initial block by index.
  const renderInitialBody = (i: number): ReactNode => {
    switch (i) {
      case 0:
        return <BodyWhoami avatar={avatar} isAuthenticated={isAuthenticated} />;
      case 1:
        return <BodyAbout bio={bioText} />;
      case 2:
        return <BodyLinks />;
      case 3:
        return (
          <BodyPhotos photos={displayPhotos} cols={cols} onOpen={(idx) => setLbFrame(idx)} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="yjt-root"
      data-yjt-theme={theme}
      data-static={animate ? undefined : ""}
      data-minimized={minimized ? "" : undefined}
      suppressHydrationWarning
    >
      <div
        className={[
          "yjt-window",
          closed ? "is-closing" : "",
          minimized ? "is-minimized" : "",
          maximized ? "is-maximized" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ── macOS chrome ─────────────────────────────────────────── */}
        <header className="yjt-chrome">
          <div className="yjt-lights">
            <button
              className="yjt-light yjt-light-r"
              title="close"
              aria-label="close session"
              onClick={() => setClosed(true)}
            >
              <LightGlyph d="M4 4 L10 10 M10 4 L4 10" />
            </button>
            <button
              className="yjt-light yjt-light-y"
              title="minimize"
              aria-label="minimize"
              onClick={() => setMinimized((m) => !m)}
            >
              <LightGlyph d="M3.5 7 H10.5" />
            </button>
            <button
              className="yjt-light yjt-light-g"
              title={maximized ? "restore" : "maximize"}
              aria-label={maximized ? "restore" : "maximize"}
              onClick={() => setMaximized((m) => !m)}
            >
              <LightGlyph
                d={
                  maximized
                    ? "M5.5 3 V5.5 H3 M8.5 11 V8.5 H11"
                    : "M5.5 3 H3 V5.5 M8.5 11 H11 V8.5"
                }
              />
            </button>
          </div>
          <div className="yjt-title">yuan@page : ~ — zsh</div>
          <div className="yjt-chrome-right">
            <button
              className="yjt-chrome-skip"
              onClick={sequenceDone ? restartSession : finishAll}
              title={sequenceDone ? "restart session" : "skip animation"}
              aria-label={sequenceDone ? "restart session" : "skip animation"}
            >
              {sequenceDone ? "⟳ restart" : "⏭ skip"}
            </button>
          </div>
        </header>

        {/* ── Terminal body ────────────────────────────────────────── */}
        <main className="yjt-body-pane">
          {nanoFile ? (
            <NanoEditor file={nanoFile} onClose={() => setNanoFile(null)} />
          ) : (
            <>
          {!hideInitial &&
            INITIAL_CMDS.map((cmd, i) => {
              const isPast = i < effStage;
              const isCurrent = i === effStage;
              if (!isPast && !isCurrent) return null;
              const cmdDone = isPast || (isCurrent && effPhase !== "typing");
              return (
                <section key={i} className="yjt-block">
                  <CmdLine
                    cmd={cmd}
                    progress={cmdProgress}
                    isCurrent={isCurrent}
                    done={cmdDone}
                  />
                  {cmdDone && <div className="yjt-body-wrap">{renderInitialBody(i)}</div>}
                </section>
              );
            })}

          {/* REPL session output */}
          {sessionBlocks.map((s) => (
            <section key={s.id} className="yjt-block">
              <CmdLine cmd={s.cmd} progress={0} isCurrent={false} done />
              {s.body && <div className="yjt-body-wrap">{s.body}</div>}
            </section>
          ))}

          {/* Sign-in / sign-out / sign-in-failed status line (one-off) */}
          {authNotice && (
            <section className="yjt-block" role="status" aria-live="polite">
              <div className="yjt-body">
                {authNotice === "denied" ? (
                  <>
                    <span className="yjt-prompt-c">✗</span>{" "}
                    sign-in denied · this door only opens for one person, friend 😅
                  </>
                ) : authNotice === "in" ? (
                  <>
                    <span className="yjt-green">✓</span>{" "}
                    authenticated · welcome back, yuan
                  </>
                ) : (
                  <>
                    <span className="yjt-green">✓</span>{" "}
                    signed out · session ended
                  </>
                )}
              </div>
            </section>
          )}

          {/* Interactive prompt — once the intro finishes */}
          {sequenceDone && (
            <Prompt
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => submitCommand(inputValue)}
              onHistory={navigateHistory}
              onTab={tabComplete}
              placeholder={optionsSeen ? undefined : "options"}
            />
          )}
            </>
          )}
        </main>
      </div>

      {/* While minimized, the empty desktop shows a placeholder note (a real
          scene is coming later). */}
      {minimized && (
        <p className="yjt-idle">[ working on putting something funny here… ]</p>
      )}

      {/* ── Lightbox ───────────────────────────────────────────────── */}
      {lbFrame !== null && displayPhotos[lbFrame] && (
        <div className="yjt-lb" onClick={() => setLbFrame(null)}>
          <button
            className="yjt-lb-nav yjt-lb-prev"
            onClick={(e) => {
              e.stopPropagation();
              navPhoto(-1);
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>

          <figure className="yjt-lb-card" onClick={(e) => e.stopPropagation()}>
            <div className="yjt-lb-head">
              <span className="yjt-prompt-c">$</span> open{" "}
              <span className="yjt-link-inline">
                ./photos/{photoName(displayPhotos[lbFrame].title)}.jpg
              </span>
            </div>
            <div className="yjt-lb-photo">
              <img
                src={displayPhotos[lbFrame].src}
                alt={photoName(displayPhotos[lbFrame].title)}
              />
            </div>
            <figcaption className="yjt-lb-caption">
              <span className="yjt-lb-counter">
                {pad3(lbFrame + 1)}/{pad3(displayPhotos.length)}
              </span>
            </figcaption>
          </figure>

          <button
            className="yjt-lb-nav yjt-lb-next"
            onClick={(e) => {
              e.stopPropagation();
              navPhoto(1);
            }}
            aria-label="Next photo"
          >
            ›
          </button>

          <button
            className="yjt-lb-close"
            onClick={() => setLbFrame(null)}
            aria-label="Close lightbox"
          >
            esc
          </button>
        </div>
      )}

      {/* ── Shutdown overlay (red ×) ───────────────────────────────── */}
      {closed && (
        <div className="yjt-shutdown" role="dialog" aria-modal="true" aria-label="connection closed">
          <span className="yjt-shutdown-dot" aria-hidden="true" />
          <span className="yjt-shutdown-text">
            [ connection closed —{" "}
            <button type="button" className="yjt-shutdown-restart" onClick={restartSession}>
              click to restart
            </button>{" "}
            ]
          </span>
        </div>
      )}

    </div>
  );
}
