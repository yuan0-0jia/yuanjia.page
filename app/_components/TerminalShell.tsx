"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./terminal-wall.css";

const COMMAND = "cd ~";
const TYPE_MS = 90;

export default function TerminalShell({ message }: { message: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (progress >= COMMAND.length) return;
    const t = window.setTimeout(() => setProgress((p) => p + 1), TYPE_MS);
    return () => window.clearTimeout(t);
  }, [visible, progress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const typed = COMMAND.slice(0, progress);
  const done = progress >= COMMAND.length;

  return (
    <main className="flex flex-col flex-auto items-center justify-center px-4 gap-4 font-mono">
      <p className="text-sm md:text-base text-[--ink]">{message}</p>

      {/* yjt-root provides --t-* CSS vars for theme-aware prompt color */}
      <div className="yjt-root" style={{ padding: 0, minHeight: 0 }}>
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
        className="flex flex-col gap-2"
      >
        <Link
          href="/"
          aria-label="Return home (press Enter or click)"
          className="flex items-center gap-0 text-sm md:text-base no-underline"
          style={{ color: "inherit" }}
        >
          <span className="yjt-prompt">yuan</span>
          <span className="yjt-at">@</span>
          <span className="yjt-host">page</span>
          <span className="yjt-dollar">$</span>
          <span className="text-[--ink]">{typed}</span>
          <span
            aria-hidden
            className="yjt-cursor yjt-cursor-inline"
            style={{ background: "var(--t-ink)" }}
          />
        </Link>
        {/* Always rendered to prevent layout shift; invisible until typing done */}
        <p
          className="text-xs text-[--soft]"
          style={{
            opacity: done ? 1 : 0,
            transition: "opacity 0.5s ease-out",
          }}
        >
          press <kbd className="text-[--ink]">↵</kbd> or click to return home
        </p>
      </div>
      </div>
    </main>
  );
}
