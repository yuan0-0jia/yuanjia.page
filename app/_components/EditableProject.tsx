"use client";

import { useState } from "react";
import { FaPencil, FaXmark } from "react-icons/fa6";
import Project from "./Project";
import EditProjectModal from "./EditProjectModal";
import { deleteProject } from "../_lib/auth-action";
import SpinnerMini from "./SpinnerMini";

interface ProjectData {
  id: string;
  project: string;
  desc: string;
  to: string;
  button: string;
  thumbnail: string;
  preview_url: string | null;
}

export default function EditableProject({
  data,
  reverse,
}: {
  data: ProjectData;
  reverse: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("id", data.id);
      await deleteProject(formData);
    } catch (error) {
      console.error("Error deleting project:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative group">
      {/* Edit/Delete controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="bg-cream/90 dark:bg-warmGray-800/90 backdrop-blur-sm border border-sepia-300 dark:border-sepia-700 rounded-sm p-2 text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-200 transition-colors"
          aria-label="Edit project"
        >
          <FaPencil className="w-3.5 h-3.5" />
        </button>
        {showConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white rounded-sm px-3 py-1.5 font-typewriter text-xs tracking-wide hover:bg-red-700 disabled:bg-red-400 transition-colors"
            >
              {isDeleting ? <SpinnerMini /> : "Delete"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="bg-cream/90 dark:bg-warmGray-800/90 border border-sepia-300 dark:border-sepia-700 rounded-sm px-3 py-1.5 font-typewriter text-xs tracking-wide hover:bg-sepia-100 dark:hover:bg-warmGray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-cream/90 dark:bg-warmGray-800/90 backdrop-blur-sm border border-sepia-300 dark:border-sepia-700 rounded-sm p-2 text-sepia-600 dark:text-sepia-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label="Delete project"
          >
            <FaXmark className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Project
        header={data.project}
        desc={data.desc}
        to={data.to}
        image={data.thumbnail}
        previewUrl={data.preview_url ?? undefined}
        reverse={reverse}
        button={data.button}
      />

      <EditProjectModal
        project={data}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </div>
  );
}
