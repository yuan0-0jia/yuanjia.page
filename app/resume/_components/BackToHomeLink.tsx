"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Only offer "back to home" to visitors who arrived from the terminal (our
// links carry ?from=home); cold/external hits get no home link. Read client-
// side via useSearchParams so /resume stays statically prerenderable (ISR)
// rather than being forced dynamic by reading searchParams on the server.
function BackToHomeLinkInner() {
  const from = useSearchParams().get("from");
  if (from !== "home") return null;

  return (
    <Link
      href="/"
      className="group resume-meta text-soft inline-flex items-center gap-2 mb-6 md:mb-8 transition-colors hover:text-accent"
    >
      <span aria-hidden>←</span>
      <span className="underline-offset-4 group-hover:underline">back to home</span>
    </Link>
  );
}

export default function BackToHomeLink() {
  // useSearchParams requires a Suspense boundary to keep the route static.
  return (
    <Suspense fallback={null}>
      <BackToHomeLinkInner />
    </Suspense>
  );
}
