export const metadata = {
  title: "Privacy",
  alternates: {
    canonical: "/privacy",
  },
};

export const dynamic = "force-static";

export default async function Page() {
  return (
    <main className="mx-4 md:mx-12 lg:mx-20 my-12 md:my-20 flex flex-col items-center px-4 font-mono text-[--ink]">
      <article className="max-w-3xl w-full text-sm md:text-base leading-relaxed">
        <header className="mb-10">
          <h1 className="text-xl md:text-2xl text-[--ink] mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs md:text-sm text-[--soft]">
            Effective Date:{" "}
            <span className="text-[--ink]">Oct 29, 2024</span>
          </p>
        </header>

        <section className="mb-8">
          <p>
            yuanjia.page is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, and share information when you
            use our services and integrate your Google account via Google
            OAuth.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            1. Information We Collect
          </h2>
          <p>
            When you log in to yuanjia.page using your Google account, we
            receive the following information, depending on the permissions you
            grant:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>
              Basic profile information (e.g., name, email address, profile
              picture)
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            2. How We Use Your Information
          </h2>
          <p>
            We use the information collected via Google OAuth solely for the
            purposes of providing and enhancing our services:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>To authenticate your account</li>
            <li>To personalize your experience</li>
            <li>To provide specific app functionality</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            3. How We Share Your Information
          </h2>
          <p>
            We do not sell, rent, or trade your information to third parties.
            We may share information with trusted third-party services only to
            the extent necessary to provide our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            4. Data Retention
          </h2>
          <p>
            We retain the information collected via Google OAuth for as long as
            it is needed to provide our services, comply with our legal
            obligations, resolve disputes, or enforce our agreements. When no
            longer necessary, we securely delete or anonymize the data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            5. Data Security
          </h2>
          <p>
            We implement industry-standard security measures to protect your
            information from unauthorized access, alteration, disclosure, or
            destruction. However, please note that no method of electronic
            storage or transmission is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            6. Your Choices and Controls
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>
              Revoke our access to your Google account at any time via your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-[--accent] hover:underline underline-offset-4"
              >
                Google Account Settings
              </a>
              .
            </li>
            <li>
              Request access to, correction, or deletion of any personal data
              we have stored.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            7. Children&apos;s Privacy
          </h2>
          <p>
            Our services are not intended for children under the age of 13, and
            we do not knowingly collect personal information from children
            under 13. If we become aware that we have collected personal
            information from a child under 13, we will take steps to delete it
            as soon as possible.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            8. Changes to This Privacy Policy
          </h2>
          <p>
            We may update our Privacy Policy from time to time. When we do, we
            will notify you by updating the &quot;Effective Date&quot; at the
            top of this policy. We encourage you to review this policy
            periodically.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-lg text-[--ink] mb-3">
            9. Contact Us
          </h2>
          <p>
            If you have any questions about this Privacy Policy or our
            practices, please contact us at:
            <br />
            <a
              href="mailto:hello.yuanjia@gmail.com"
              className="text-[--accent] hover:underline underline-offset-4"
            >
              hello.yuanjia@gmail.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
