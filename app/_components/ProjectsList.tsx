"use client";

import dynamic from "next/dynamic";
import Project from "./Project";
import ScrollReveal from "./ScrollReveal";
import { useAuth } from "./AuthProvider";

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
}

export default function ProjectsList({
  projects,
}: {
  projects: ProjectData[];
}) {
  const { isEditMode } = useAuth();

  const sorted = [...projects].sort(
    (a, b) => Number(a.id) - Number(b.id)
  );

  return (
    <>
      {sorted.map((project, i) => {
        const reverse = Number(project.id) % 2 === 0;
        return isEditMode ? (
          <EditableProject key={project.id} data={project} reverse={reverse} />
        ) : (
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

      {isEditMode && (
        <div className="flex justify-center mt-8">
          <AddProjectModal />
        </div>
      )}
    </>
  );
}
