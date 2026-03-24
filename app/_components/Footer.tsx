import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 py-6 sm:px-6 border-t border-sepia-200 dark:border-sepia-800">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="font-typewriter text-xs text-sepia-500 dark:text-sepia-400 tracking-wider">
          &copy; {new Date().getFullYear()} Yuan Jia.{" "}
          <Link
            href="/privacy"
            className="hover:text-sepia-700 dark:hover:text-sepia-300 transition-colors"
          >
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
