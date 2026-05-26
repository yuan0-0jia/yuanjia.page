"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Generic terminal-style error page. Surfaces server / OAuth failures that
// aren't routed elsewhere (the access_denied case is handled inline in the
// terminal status line on home — see the OAuth callback route).
function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("error") ?? "unexpected_error";

  return (
    <main className="flex flex-col flex-auto items-center justify-center px-4 font-mono text-[--ink]">
      <p className="text-sm md:text-base text-[--ink] mb-4">
        Something went wrong
        {code !== "unexpected_error" && (
          <span className="text-[--soft]">: {code}</span>
        )}
      </p>
      <Link
        href="/"
        className="text-sm text-[--accent] hover:underline underline-offset-4"
      >
        ← cd ~
      </Link>
    </main>
  );
}

export default function Error() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
