import { Newsreader } from "next/font/google";

// Loaded here (not in the root layout) so anonymous visitors who never open
// the resume don't pay for it. The variable scopes to this subtree, which
// is enough for .resume-display (the only --font-serif consumer on the
// /resume route) to pick it up. The in-terminal `less ~/resume.md` pager
// is mono-only, so it doesn't need this font load.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  weight: "variable",
  variable: "--font-serif",
  display: "swap",
});

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={newsreader.variable}>{children}</div>;
}
