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
}: {
  content: unknown;
  renderedHtml: string | null;
}) {
  const { isEditMode } = useAuth();

  if (isEditMode) {
    return <AboutEditor content={content} />;
  }

  if (!renderedHtml) {
    return (
      <div className="text-center py-20">
        <p className="font-typewriter text-sepia-500 dark:text-sepia-400 tracking-wider">
          No content yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="about-content font-typewriter tracking-wide leading-loose"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
