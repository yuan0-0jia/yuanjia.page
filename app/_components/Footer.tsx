import { FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa6";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 py-6 sm:px-6 border-t border-sepia-200 dark:border-sepia-800">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-typewriter text-xs text-sepia-600 dark:text-sepia-400 tracking-wider">
          &copy; {new Date().getFullYear()} Yuan Jia.{" "}
          <Link
            href="/privacy"
            className="hover:text-sepia-600 dark:hover:text-sepia-400 transition-colors"
          >
            Privacy
          </Link>
        </p>

        <ul className="flex items-center gap-4">
          <li>
            <a href="https://www.linkedin.com/in/yuanjia1/" target="_blank" rel="noopener noreferrer" className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-600 dark:hover:text-sepia-400 transition-colors">
              <FaLinkedin className="w-4 h-4" />
            </a>
          </li>
          <li>
            <a href="https://github.com/yuan0-0jia" target="_blank" rel="noopener noreferrer" className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-600 dark:hover:text-sepia-400 transition-colors">
              <FaGithub className="w-4 h-4" />
            </a>
          </li>
          <li>
            <a href="mailto:hello.yuanjia@gmail.com" className="text-sepia-600 dark:text-sepia-400 hover:text-sepia-600 dark:hover:text-sepia-400 transition-colors">
              <FaEnvelope className="w-4 h-4" />
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
