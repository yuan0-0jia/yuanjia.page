import { Newsreader, Kalam } from "next/font/google";

// Serif (display name + print) and hand (design-system accent) are only used
// on /resume. Loading them here — instead of the root layout — keeps their
// ~120KB of font files (and their render-blocking <head> preloads) off the
// homepage, where no serif/hand text renders. The --font-serif / --font-hand
// vars resolve for the whole /resume subtree via the wrapper below.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
});

export default function ResumeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${newsreader.variable} ${kalam.variable}`}>{children}</div>
  );
}
