"use client";

import { FaTerminal } from "react-icons/fa6";
import { useAuth } from "./AuthProvider";
import { useDock } from "./DockProvider";
import "./statusbar.css";

/**
 * Ambient status bar pinned to the bottom of every page. Reflects real session
 * state — a warm greeting when signed out, an active `yuan@page` (live dot) when
 * signed in, so you can tell at a glance whether editing is available — and
 * hosts the slot a minimized terminal docks into. Replaces the app-launcher dock.
 */
export function StatusBar() {
  const dock = useDock();
  const minimized = dock?.minimized ?? null;
  const { isAuthenticated } = useAuth();

  return (
    <aside className="statusbar" aria-label="Status">
      <span className="statusbar-seg">
        {isAuthenticated && <span className="statusbar-dot" aria-hidden="true" />}
        {isAuthenticated ? "yuan@page" : "welcome, friend"}
      </span>

      {minimized && (
        <>
          <span className="statusbar-sep" aria-hidden="true" />
          <button
            className="statusbar-restore"
            onClick={minimized.onRestore}
            aria-label={`Restore ${minimized.label}`}
            title={`${minimized.label} — restore`}
          >
            <FaTerminal aria-hidden="true" />
            <span>restore</span>
          </button>
        </>
      )}
    </aside>
  );
}
