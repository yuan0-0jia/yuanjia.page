"use client";

import { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "./about-editor.css";
import { renderBlocksToHtml } from "../_lib/blocknote-renderer";
import { updateAboutContent, uploadAboutImage } from "../_lib/auth-action";

export default function AboutEditor({ content }: { content: unknown }) {
  const { resolvedTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = await uploadAboutImage(formData);
    return url;
  }, []);

  const editor = useCreateBlockNote({
    initialContent: content ? (content as any) : undefined,
    uploadFile,
  });

  const handlePreviewToggle = () => {
    if (!isPreviewing) {
      const html = renderBlocksToHtml(editor.document as any);
      setPreviewHtml(html);
    }
    setIsPreviewing(!isPreviewing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const blocks = editor.document;
      await updateAboutContent(blocks);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <div className="sticky top-16 z-30 flex justify-end gap-3 mb-4">
        <button
          onClick={handlePreviewToggle}
          className={`font-typewriter text-sm uppercase tracking-wider px-6 py-2 rounded-sm transition-colors border-2 ${
            isPreviewing
              ? "border-sepia-600 dark:border-sepia-400 bg-sepia-600 dark:bg-sepia-500 text-cream"
              : "border-sepia-600 dark:border-sepia-400 text-sepia-600 dark:text-sepia-400 hover:bg-sepia-100 dark:hover:bg-sepia-800"
          }`}
        >
          {isPreviewing ? "Edit" : "Preview"}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`font-typewriter text-sm uppercase tracking-wider px-6 py-2 rounded-sm shadow-lg transition-colors ${
            saveStatus === "saved"
              ? "bg-green-600 text-white"
              : saveStatus === "error"
              ? "bg-red-600 text-white"
              : "bg-sepia-700 text-cream hover:bg-sepia-800 dark:bg-sepia-600 dark:hover:bg-sepia-500"
          } disabled:opacity-50`}
        >
          {isSaving
            ? "Saving..."
            : saveStatus === "saved"
            ? "Saved!"
            : saveStatus === "error"
            ? "Error"
            : "Save"}
        </button>
      </div>

      {isPreviewing ? (
        <div
          className="about-content font-typewriter tracking-wide leading-loose"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <div className="vintage-border rounded-sm overflow-hidden bg-cream dark:bg-warmGray-800">
          <BlockNoteView
            editor={editor}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
          />
        </div>
      )}
    </div>
  );
}
