"use client";

import { FaDownload } from "react-icons/fa6";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      aria-label="Download resume as PDF"
      title="Download PDF"
      className="text-[--soft] hover:text-[--accent] transition-all duration-300 p-2 -mb-1 hover:-translate-y-0.5"
    >
      <FaDownload className="w-4 h-4 md:w-5 md:h-5" />
    </button>
  );
}
