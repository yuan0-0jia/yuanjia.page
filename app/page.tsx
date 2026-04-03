import type { Metadata } from "next";
import Link from "next/link";
import EditableAvatar from "./_components/EditableAvatar";
import {
  FaArrowUpRightFromSquare,
  FaLinkedin,
  FaGithub,
  FaEnvelope,
} from "react-icons/fa6";
import FlickrPhotos from "./_components/FlickrPhotos";
import Projects from "./_components/Projects";
import ScrollReveal from "./_components/ScrollReveal";
import { getAvatar, getFlickrPhotos } from "./_lib/data-service";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const avatar = await getAvatar();
  const avatarUrl = avatar?.find((photo) => photo.id === 1)?.image;

  return {
    openGraph: avatarUrl
      ? {
          images: [
            { url: avatarUrl, width: 400, height: 400, alt: "Yuan Jia" },
          ],
        }
      : undefined,
  };
}

export default async function Home() {
  const [avatar, flickrPhotos] = await Promise.all([
    getAvatar(),
    getFlickrPhotos(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 lg:py-36 px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 max-w-4xl mx-auto">
          <div className="relative shrink-0">
            <div className="absolute -inset-2 border border-sepia-300/60 dark:border-sepia-700/60 rounded-full" />
            <EditableAvatar avatar={avatar?.find((photo) => photo.id === 1)} />
          </div>

          <div className="text-center md:text-left">
            <h1 className="font-typewriter text-3xl md:text-4xl lg:text-5xl text-warmGray-800 dark:text-cream mb-3 animate-fade-in-up opacity-0 stagger-1">
              Yuan Jia
            </h1>
            <p className="font-typewriter text-sm md:text-base text-sepia-600 dark:text-sepia-400 mb-6 animate-fade-in-up opacity-0 stagger-2 tracking-wider leading-relaxed">
              Software engineer &amp; photographer
            </p>
            <div className="flex items-center gap-5 justify-center md:justify-start animate-fade-in-up opacity-0 stagger-3">
              <Link
                href="/about"
                className="font-typewriter text-sm tracking-wider text-sepia-600 dark:text-sepia-400 underline decoration-sepia-500/50 decoration-1 underline-offset-4 hover:decoration-sepia-500 dark:hover:decoration-sepia-400 transition-colors"
              >
                More about me
              </Link>
              <span className="text-sepia-300 dark:text-sepia-700">|</span>
              <ul className="flex items-center gap-5">
                <li>
                  <a
                    href="https://www.linkedin.com/in/yuanjia1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sepia-500 dark:text-sepia-400 hover:text-sepia-700 dark:hover:text-sepia-300 transition-colors"
                  >
                    <FaLinkedin className="w-4 h-4" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/yuan0-0jia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sepia-500 dark:text-sepia-400 hover:text-sepia-700 dark:hover:text-sepia-300 transition-colors"
                  >
                    <FaGithub className="w-4 h-4" />
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello.yuanjia@gmail.com"
                    className="text-sepia-500 dark:text-sepia-400 hover:text-sepia-700 dark:hover:text-sepia-300 transition-colors"
                  >
                    <FaEnvelope className="w-4 h-4" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="bg-sepia-800 dark:bg-sepia-900 px-4 py-20 md:py-28 lg:py-36 tracking-wide">
        <ScrollReveal animation="fade-up">
          <div className="text-center max-w-4xl mx-auto">
            <header className="mb-12">
              <div className="vintage-divider mb-8">
                <span className="text-sepia-500">✦</span>
              </div>
              <h2 className="font-typewriter text-2xl md:text-3xl text-cream tracking-wide">
                Projects
              </h2>
              <p className="font-typewriter text-sm mt-4 text-sepia-200 dark:text-sepia-400 tracking-wider">
                A few things I&apos;ve built.
              </p>
            </header>
          </div>
        </ScrollReveal>

        <Projects />
      </section>

      {/* Photos */}
      <section className="px-4 py-20 md:py-28 lg:py-36 tracking-wide">
        <div className="max-w-7xl w-full mx-auto">
          <ScrollReveal animation="fade-up">
            <header className="mb-10 text-center">
              <div className="vintage-divider mb-8">
                <span className="text-sepia-500 dark:text-sepia-400">✦</span>
              </div>
              <h2 className="font-typewriter text-2xl md:text-3xl text-warmGray-800 dark:text-cream tracking-wide">
                Photos
              </h2>
              <p className="font-typewriter text-sm mt-4 text-sepia-500 dark:text-sepia-400 tracking-wider">
                What I photographed.
              </p>
            </header>
          </ScrollReveal>

          <FlickrPhotos photos={flickrPhotos} count={6} />

          <ScrollReveal animation="fade-up" delay={400}>
            <div className="mt-10 text-center">
              <p className="font-typewriter text-base md:text-lg text-warmGray-700 dark:text-warmGray-200 tracking-wide leading-loose">
                More on{" "}
                <Link
                  href="https://www.flickr.com/photos/yuan-jia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sepia-600 dark:text-sepia-400 underline decoration-sepia-500/50 decoration-1 underline-offset-4 hover:decoration-sepia-500 transition-colors"
                >
                  Flickr
                  <FaArrowUpRightFromSquare className="w-3 h-3" />
                </Link>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
