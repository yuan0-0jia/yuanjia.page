"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Project from "./Project";
import ScrollReveal from "./ScrollReveal";
import { useAuth } from "./AuthProvider";
import { reorderProjects } from "../_lib/auth-action";

const EditableProject = dynamic(() => import("./EditableProject"), {
  ssr: false,
});
const AddProjectModal = dynamic(() => import("./AddProjectModal"), {
  ssr: false,
});

interface ProjectData {
  id: string;
  project: string;
  desc: string;
  to: string;
  button: string;
  thumbnail: string;
  preview_url: string | null;
  sort_order?: number;
}

export default function ProjectsList({
  projects,
}: {
  projects: ProjectData[];
}) {
  const { isEditMode } = useAuth();

  const sorted = [...projects].sort(
    (a, b) => (a.sort_order ?? Number(a.id)) - (b.sort_order ?? Number(b.id))
  );

  const [items, setItems] = useState(sorted);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasReordered = useRef(false);

  // Sync when projects prop changes (after server revalidation)
  const prevIds = useRef(projects.map((p) => p.id).join(","));
  const currentIds = projects.map((p) => p.id).join(",");
  if (currentIds !== prevIds.current) {
    prevIds.current = currentIds;
    const newSorted = [...projects].sort(
      (a, b) => (a.sort_order ?? Number(a.id)) - (b.sort_order ?? Number(b.id))
    );
    setItems(newSorted);
    hasReordered.current = false;
  }

  const handleDragStart = useCallback((i: number) => {
    setDragIndex(i);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, i: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === i) return;
      setOverIndex(i);
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) return;

      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });

      hasReordered.current = true;
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      await reorderProjects(items.map((p) => p.id));
      hasReordered.current = false;
    } catch (error) {
      console.error("Error saving order:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditMode) {
    return (
      <>
        {sorted.map((project, i) => {
          const reverse = i % 2 !== 0;
          return (
            <ScrollReveal
              key={project.id}
              animation={reverse ? "slide-right" : "slide-left"}
              delay={i * 100}
            >
              <Project
                header={project.project}
                desc={project.desc}
                to={project.to}
                image={project.thumbnail}
                previewUrl={project.preview_url ?? undefined}
                reverse={reverse}
                button={project.button}
              />
            </ScrollReveal>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map((project, i) => {
        const reverse = i % 2 !== 0;
        return (
          <div
            key={project.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 ${
              dragIndex === i
                ? "opacity-40 scale-95"
                : overIndex === i
                ? "border-t-2 border-sepia-400 dark:border-sepia-500"
                : ""
            } cursor-grab active:cursor-grabbing`}
          >
            <EditableProject data={project} reverse={reverse} />
          </div>
        );
      })}

      <div className="flex justify-center gap-3 mt-8">
        {hasReordered.current && (
          <button
            onClick={handleSaveOrder}
            disabled={isSaving}
            className={`font-typewriter text-sm uppercase tracking-wider px-6 py-2 rounded-sm shadow-lg transition-colors ${
              isSaving
                ? "bg-sepia-400 text-cream opacity-50"
                : "bg-sepia-700 text-cream hover:bg-sepia-800 dark:bg-sepia-600 dark:hover:bg-sepia-500"
            }`}
          >
            {isSaving ? "Saving..." : "Save Order"}
          </button>
        )}
        <AddProjectModal />
      </div>
    </>
  );
}
