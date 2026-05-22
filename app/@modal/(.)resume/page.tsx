import { getResumeData } from "@/app/_lib/data-service";
import { RESUME } from "@/app/resume/data";
import ResumeModal from "./ResumeModal";

export default async function Page() {
  const fromDb = await getResumeData();
  const resume = fromDb ?? RESUME;
  return <ResumeModal resume={resume} />;
}
