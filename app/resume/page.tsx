import type { Metadata } from "next";
import { getResumeData } from "@/app/_lib/data-service";
import { RESUME, type Resume } from "./data";
import ResumeScreen from "./_components/ResumeScreen";
import ResumePrint from "./_components/ResumePrint";
import ResumeEditToggle from "./_components/ResumeEditToggle";
import "./resume.css";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Resume of Yuan Jia — platform / infrastructure engineer. Print-friendly; Letter-sized PDF export via the browser print dialog.",
  alternates: { canonical: "/resume" },
  openGraph: {
    title: "Resume — Yuan Jia",
    description:
      "Platform / infrastructure engineer. Production deploy pipelines, security hardening, self-hosted CI on k3s.",
    url: "https://yuanjia.page/resume",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume — Yuan Jia",
    description:
      "Platform / infrastructure engineer. Production deploy pipelines, security hardening, self-hosted CI on k3s.",
  },
};

export default async function Page() {
  const fromDb = await getResumeData();
  const resume = fromDb ?? RESUME;

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        // Schema.org Person — helps recruiter tools (and Google's knowledge
        // panel) parse who this resume belongs to. Built from the same
        // resume data the page renders, so it stays accurate as content
        // changes through the editor.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPersonJsonLd(resume)),
        }}
      />
      <ResumeEditToggle resume={resume}>
        <ResumeScreen resume={resume} />
      </ResumeEditToggle>
      <ResumePrint resume={resume} />
    </>
  );
}

function buildPersonJsonLd(resume: Resume) {
  const emailItem = resume.contact.find((c) =>
    /mail/i.test(c.label) || /^mailto:/i.test(c.href ?? "")
  );
  const phoneItem = resume.contact.find((c) =>
    /(phone|tel|cell)/i.test(c.label) || /^tel:/i.test(c.href ?? "")
  );

  const linkLabels = ["linkedin", "github", "site", "portfolio", "web", "page"];
  const sameAs = resume.contact
    .filter((c) => linkLabels.some((l) => c.label.toLowerCase().includes(l)))
    .map((c) => c.href)
    .filter((u): u is string => Boolean(u && /^https?:\/\//.test(u)));

  const alumniOf = resume.education.map((e) => ({
    "@type": "CollegeOrUniversity",
    name: e.school,
  }));

  const knowsAbout = resume.skills.flatMap((s) => s.items);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: resume.name,
    jobTitle: resume.tagline,
    url: "https://yuanjia.page",
    ...(resume.location && {
      address: {
        "@type": "PostalAddress",
        addressLocality: resume.location,
      },
    }),
    ...(emailItem?.value && { email: emailItem.value }),
    ...(phoneItem?.value && { telephone: phoneItem.value }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(alumniOf.length > 0 && { alumniOf }),
    ...(knowsAbout.length > 0 && { knowsAbout }),
  };
}
