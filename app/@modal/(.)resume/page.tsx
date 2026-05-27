import { Newsreader, Kalam } from "next/font/google";
import { getResumeData } from "@/app/_lib/data-service";
import { RESUME } from "@/app/resume/data";
import ResumeModal from "./ResumeModal";

// Loaded here (not in the root layout) so anonymous visitors don't download
// the resume-only typefaces unless they open the modal. The variables are
// scoped to the wrapper div, which is enough for resume.css to pick
// them up via var(--font-serif) / var(--font-hand).
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  weight: "variable",
  variable: "--font-serif",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
});

export default async function Page() {
  const fromDb = await getResumeData();
  const resume = fromDb ?? RESUME;
  return (
    <div className={`${newsreader.variable} ${kalam.variable}`}>
      <ResumeModal resume={resume} />
    </div>
  );
}
