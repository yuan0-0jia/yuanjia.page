"use client";

import { useEffect, useRef, useState } from "react";

// A file open in the inline nano editor — its title-bar name, seed buffer, and
// the persist action run on ^O (throws to surface an error in the status line).
export type NanoFile = {
  name: string;
  initial: string;
  save: (text: string) => Promise<void>;
};

const lineCount = (s: string) => (s ? s.split("\n").length : 0);

// Inline nano editor for ~/about.md and resume.json. A nano-style takeover of
// the terminal body: title bar, editable buffer, status line, and the ^O Write
// Out / ^X Exit chords (keyboard + clickable). Auth is enforced upstream (the
// nano command) and again in the action that backs `file.save`.
export default function NanoEditor({
  file,
  onClose,
}: {
  file: NanoFile;
  onClose: () => void;
}) {
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
