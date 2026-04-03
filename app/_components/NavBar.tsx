"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaRegUser, FaPencil, FaArrowRightFromBracket } from "react-icons/fa6";
import ThemeSwitch from "./ThemeSwitch";
import { useAuth } from "./AuthProvider";
import { logout } from "../_lib/auth-action";

export default function Navigation() {
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);
  const { isAuthenticated, isEditMode, toggleEditMode } = useAuth();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 80 && y > lastY);
      setLastY(y);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <header
      className={`border-b border-sepia-200 dark:border-sepia-800 px-4 py-4 sticky top-0 z-20 bg-cream/95 dark:bg-warmGray-900/95 backdrop-blur-sm transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <Link
          href="/"
          className="font-typewriter text-lg tracking-wider text-sepia-700 dark:text-sepia-400 hover:text-sepia-500 dark:hover:text-sepia-300 transition-colors"
        >
          yuanjia.page
        </Link>

        <nav className="z-10 font-typewriter text-sm tracking-wider">
          <ul className="flex gap-6 md:gap-8 items-center">
            <li>
              <ThemeSwitch />
            </li>
            <li>
              <Link
                href="/about"
                className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300 transition-colors"
              >
                About
              </Link>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <button
                    onClick={toggleEditMode}
                    className={`p-2 transition-colors ${
                      isEditMode
                        ? "text-sepia-800 dark:text-cream bg-sepia-200 dark:bg-sepia-700 rounded-sm"
                        : "text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300"
                    }`}
                    aria-label="Toggle edit mode"
                  >
                    <FaPencil className="w-4 h-4" />
                  </button>
                </li>
                <li>
                  <form action={logout}>
                    <button
                      className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300 transition-colors p-2"
                      aria-label="Sign out"
                    >
                      <FaArrowRightFromBracket className="w-4 h-4" />
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300 transition-colors p-2"
                >
                  <FaRegUser className="w-4 h-4" />
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
