"use client";

import { useState } from "react";
import { createParagraph } from "../_lib/auth-action";
import SubmitButton from "./SubmitButton";

export default function AddParagraphModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      await createParagraph(formData);
      setIsOpen(false);
      // Reset form would happen automatically on close
    } catch (error) {
      console.error("Error creating paragraph:", error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="font-typewriter text-sm uppercase tracking-wider border-2 border-sepia-600 dark:border-sepia-300 text-sepia-600 dark:text-sepia-300 px-4 py-2 rounded-sm hover:bg-sepia-100 dark:hover:bg-sepia-800 transition-colors"
      >
        Add Paragraph
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-warmGray-900/60 dark:bg-black/70 z-40 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-cream dark:bg-warmGray-900 vintage-border rounded-sm shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-typewriter text-2xl text-warmGray-800 dark:text-cream tracking-wide">
                    Add New Paragraph
                  </h2>
                  <div className="mt-2 h-px w-24 bg-sepia-300 dark:bg-sepia-700" />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sepia-500 hover:text-sepia-700 dark:text-sepia-400 dark:hover:text-sepia-200 text-2xl leading-none transition-colors"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <form action={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="desc"
                      className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                    >
                      Paragraph Content *
                    </label>
                    <textarea
                      id="desc"
                      name="desc"
                      required
                      rows={6}
                      className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500 text-warmGray-800 dark:text-warmGray-100 tracking-wide"
                      placeholder="Enter your paragraph content here..."
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="photo"
                      className="block font-typewriter text-sm text-warmGray-700 dark:text-warmGray-200 mb-1 tracking-wide"
                    >
                      Image
                    </label>
                    <input
                      type="file"
                      id="photo"
                      name="photo"
                      accept="image/*"
                      className="w-full rounded-sm border border-sepia-200 dark:border-sepia-700 bg-parchment dark:bg-warmGray-800 px-3 py-2 font-typewriter text-sm shadow-sm transition-colors file:border-0 file:bg-sepia-100 dark:file:bg-sepia-800 file:text-sepia-700 dark:file:text-sepia-200 file:text-sm file:font-typewriter file:mr-3 file:px-2 file:py-1 file:rounded-sm placeholder:text-warmGray-400 dark:placeholder:text-warmGray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sepia-500"
                    />
                    <p className="font-typewriter text-xs text-sepia-500 dark:text-sepia-400 mt-1 tracking-wider">
                      Optional: Upload an image to accompany the paragraph
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-sepia-200 dark:border-sepia-700">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="font-typewriter text-sm uppercase tracking-wider px-4 py-2 text-warmGray-600 dark:text-warmGray-300 hover:bg-sepia-100 dark:hover:bg-warmGray-800 rounded-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <SubmitButton>Create Paragraph</SubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
