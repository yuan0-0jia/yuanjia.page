"use client";

import { useState } from "react";
import { updateProject } from "../_lib/auth-action";
import SubmitButton from "./SubmitButton";
import ProjectImageInput from "./ProjectImageInput";

interface ProjectData {
  id: string;
  project: string;
  desc: string;
  to: string;
  button: string;
  thumbnail: string | null;
  preview_url: string | null;
}

export default function EditProjectModal({
  project,
  isOpen,
  onClose,
}: {
  project: ProjectData;
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleSubmit = async (formData: FormData) => {
    try {
      await updateProject(formData);
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-warmGray-900/60 dark:bg-black/70 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream dark:bg-warmGray-900 vintage-border rounded-sm shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-typewriter text-2xl text-warmGray-800 dark:text-cream tracking-wide">
                Edit Project
              </h2>
              <div className="mt-2 h-px w-24 bg-sepia-300 dark:bg-sepia-700" />
            </div>
            <button
              onClick={onClose}
              className="text-sepia-500 hover:text-sepia-700 dark:text-sepia-400 dark:hover:text-sepia-200 text-2xl leading-none transition-colors"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <form action={handleSubmit} className="space-y-6">
            <input type="hidden" name="id" value={project.id} />
            <input
              type="hidden"
              name="currentImage"
              value={project.thumbnail || ""}
            />

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`edit-project-${project.id}`}
                    className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                  >
                    Project Title *
                  </label>
                  <input
                    type="text"
                    id={`edit-project-${project.id}`}
                    name="project"
                    defaultValue={project.project}
                    required
                    className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-desc-${project.id}`}
                    className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                  >
                    Description *
                  </label>
                  <textarea
                    id={`edit-desc-${project.id}`}
                    name="desc"
                    defaultValue={project.desc}
                    required
                    rows={4}
                    className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-to-${project.id}`}
                    className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                  >
                    Button Link *
                  </label>
                  <input
                    type="text"
                    id={`edit-to-${project.id}`}
                    name="to"
                    defaultValue={project.to}
                    required
                    className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                    placeholder="https://example.com or /internal-path"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-button-${project.id}`}
                    className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                  >
                    Button Text *
                  </label>
                  <input
                    type="text"
                    id={`edit-button-${project.id}`}
                    name="button"
                    defaultValue={project.button}
                    required
                    className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`edit-preview_url-${project.id}`}
                    className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                  >
                    Screenshot URL
                  </label>
                  <input
                    type="text"
                    id={`edit-preview_url-${project.id}`}
                    name="preview_url"
                    defaultValue={project.preview_url || ""}
                    className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                    placeholder="https://example.com"
                  />
                  <p className="font-typewriter text-xs text-sepia-500 dark:text-sepia-400 mt-1 tracking-wider">
                    Auto-generates a screenshot from this URL (if no image
                    uploaded)
                  </p>
                </div>

                <ProjectImageInput
                  currentThumbnail={project.thumbnail}
                  projectName={project.project}
                  projectId={project.id}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sepia-200 dark:border-sepia-700">
              <button
                type="button"
                onClick={onClose}
                className="font-typewriter text-sm uppercase tracking-wider px-4 py-2 text-warmGray-600 dark:text-warmGray-300 hover:bg-sepia-100 dark:hover:bg-warmGray-800 rounded-sm transition-colors"
              >
                Cancel
              </button>
              <SubmitButton>Update Project</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
