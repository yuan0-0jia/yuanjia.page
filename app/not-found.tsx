import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col flex-auto items-center justify-center px-4 font-mono text-[--ink]">
      <p className="text-sm md:text-base text-[--ink] mb-4">
        No such file or directory
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
