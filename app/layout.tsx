import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import AuthProvider from "./_components/AuthProvider";
import { StatusBar } from "./_components/StatusBar";
import { DockProvider } from "./_components/DockProvider";
import { ThemeProviders } from "./_components/ThemeProvider";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yuanjia.page"),
  title: { template: "%s - Yuan Jia", default: "Yuan Jia" },
  description:
    "Personal site of Yuan Jia — software engineer, photographer, and creative based in Santa Cruz.",
  openGraph: {
    title: "Yuan Jia",
    description:
      "Personal site of Yuan Jia — software engineer, photographer, and creative based in Santa Cruz.",
    url: "https://yuanjia.page",
    siteName: "Yuan Jia",
    locale: "en_US",
    type: "website",
  },
  verification: {
    google: [
      "GLWAOr9Q8E8GyyWHIs-vZDuiYE9Q0bm_vxO2avsFZQI",
      "LrlN2UweX8hNw3Wcrx7HVdFy3KEUtYl1PbJasrI2-No",
    ],
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://yltbxotlxxqixuyxsrxm.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://yltbxotlxxqixuyxsrxm.supabase.co"
        />
        <link rel="preconnect" href="https://live.staticflickr.com" />
        <link rel="dns-prefetch" href="https://live.staticflickr.com" />
      </head>
      <body
        className={`antialiased flex flex-col relative min-h-screen bg-[--paper] text-[--ink] font-sans pb-20`}
      >
        <ThemeProviders>
          <AuthProvider>
            <DockProvider>
              {children}
              {modal}
              <StatusBar />
              {/* Privacy lives here (not the status bar) — unobtrusive, but
                  present on every page for Google OAuth brand verification. */}
              <Link href="/privacy" className="site-privacy">
                privacy
              </Link>
            </DockProvider>
          </AuthProvider>
        </ThemeProviders>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
