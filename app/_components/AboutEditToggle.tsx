"use client";

import dynamic from "next/dynamic";
import { useAuth } from "./AuthProvider";

const AboutEditor = dynamic(() => import("./AboutEditor"), {
  ssr: false,
  loading: () => (
    <div className="py-20 text-center">
      <p className="font-typewriter text-sepia-500 dark:text-sepia-400 tracking-wider">
        Loading editor...
      </p>
    </div>
  ),
});

export default function AboutEditToggle({
  content,
  renderedHtml,
  children,
}: {
  content: unknown;
  renderedHtml: string | null;
  children: React.ReactNode;
}) {
  const { isEditMode } = useAuth();

  if (isEditMode) {
    return <AboutEditor content={content} />;
  }

  // In view mode, render the server-provided children as-is (no layout shift)
  return <>{children}</>;
}
