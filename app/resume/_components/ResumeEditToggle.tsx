"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/app/_components/AuthProvider";
import type { Resume } from "../data";

const ResumeEditor = dynamic(() => import("./ResumeEditor"), {
  ssr: false,
  loading: () => (
    <div className="py-20 text-center">
      <p className="font-typewriter text-sepia-500 dark:text-sepia-400 tracking-wider">
        Loading editor…
      </p>
    </div>
  ),
});

/**
 * Wraps the read-only ResumeScreen. When the authenticated user has
 * toggled edit mode in the NavBar, swap in the editor instead.
 * Print layout is rendered separately by the page and not affected.
 */
export default function ResumeEditToggle({
  resume,
  children,
}: {
  resume: Resume;
  children: React.ReactNode;
}) {
  const { isEditMode } = useAuth();

  if (isEditMode) {
    return <ResumeEditor initialResume={resume} />;
  }

  return <>{children}</>;
}
