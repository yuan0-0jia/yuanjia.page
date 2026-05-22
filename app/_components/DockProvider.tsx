"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** A window that has been minimized into the dock. */
export interface MinimizedWindow {
  /** Stable key for the dock chip. */
  id: string;
  /** Label shown in the dock chip / tooltip. */
  label: string;
  /** Bring the window back. */
  onRestore: () => void;
}

interface DockContextValue {
  minimized: MinimizedWindow | null;
  setMinimized: (w: MinimizedWindow | null) => void;
}

const DockContext = createContext<DockContextValue | null>(null);

/**
 * Lets a window living in `children` (the terminal) coordinate with the dock
 * rendered alongside it in the layout — registering a chip when minimized and
 * restoring on click. `setMinimized` is stable (from useState), so consumers
 * can depend on it without re-running effects.
 */
export function DockProvider({ children }: { children: React.ReactNode }) {
  const [minimized, setMinimized] = useState<MinimizedWindow | null>(null);
  const value = useMemo(() => ({ minimized, setMinimized }), [minimized]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useDock() {
  return useContext(DockContext);
}
