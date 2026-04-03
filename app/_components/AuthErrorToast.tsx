"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "access_denied") {
      setShow(true);
      // Clean up the URL
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-warmGray-900/50 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-cream dark:bg-warmGray-900 vintage-border rounded-sm shadow-xl max-w-sm mx-4 p-10 text-center">
        <p className="text-4xl mb-4">&#x1F62C;</p>
        <h2 className="font-typewriter text-2xl text-warmGray-800 dark:text-cream mb-4 tracking-wide">
          Nice try!
        </h2>
        <p className="font-typewriter text-sm text-sepia-600 dark:text-sepia-400 mb-2 tracking-wider leading-relaxed">
          This door only opens for one person,
          <br />
          and it&apos;s not you.
        </p>
        <p className="font-typewriter text-xs text-sepia-500 dark:text-sepia-500 mb-8 tracking-wider leading-relaxed">
          But hey, the rest of the site is all yours.
        </p>
        <button
          onClick={() => setShow(false)}
          className="font-typewriter text-sm uppercase tracking-wider px-6 py-2.5 border-2 border-sepia-600 dark:border-sepia-400 text-sepia-600 dark:text-sepia-400 hover:bg-sepia-100 dark:hover:bg-sepia-800 transition-colors rounded-sm"
        >
          Fair enough
        </button>
      </div>
    </div>
  );
}
