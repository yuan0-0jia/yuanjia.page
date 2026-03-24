import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import Button from "./_components/Button";
import FlickrPhotos from "./_components/FlickrPhotos";
import Projects from "./_components/Projects";
import Spinner from "./_components/Spinner";
import { getAvatar, getFlickrPhotos } from "./_lib/data-service";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const avatar = await getAvatar();
  const avatarUrl = avatar?.find((photo) => photo.id === 1)?.image;

  return {
    openGraph: avatarUrl
      ? {
          images: [{ url: avatarUrl, width: 400, height: 400, alt: "Yuan Jia" }],
        }
      : undefined,
  };
}

export default async function Home() {
  const [avatar, flickrPhotos] = await Promise.all([getAvatar(), getFlickrPhotos()]);

  return (
    <>
      {/* Hero */}
      <section className="py-24 md:py-32 lg:py-40 px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-3 border border-sepia-300 dark:border-sepia-700 rounded-full" />
            <div className="absolute -inset-1.5 border border-sepia-200 dark:border-sepia-800 rounded-full" />
            <div className="relative h-52 w-52 md:h-72 md:w-72 lg:h-80 lg:w-80 rounded-full overflow-hidden">
              <Image
                alt="Yuan"
                src={avatar?.find((photo) => photo.id === 1).image}
                fill
                priority={true}
                quality={75}
                sizes="(max-width: 768px) 208px, (max-width: 1024px) 288px, 320px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="text-center md:text-left">
            <h1 className="font-typewriter text-3xl md:text-4xl lg:text-5xl text-warmGray-800 dark:text-cream mb-4 animate-fade-in-up opacity-0 stagger-1">
              Hi, I&apos;m Yuan
            </h1>
            <p className="font-typewriter text-base md:text-lg text-sepia-500 dark:text-sepia-400 mb-8 animate-fade-in-up opacity-0 stagger-2 tracking-wider">
              Thank you for visiting my site!
            </p>
            <div className="animate-fade-in-up opacity-0 stagger-3">
              <Button type="primary" to="/about">
                About me
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="bg-parchment dark:bg-warmGray-800/50 px-4 py-16 md:py-24 tracking-wide">
        <div className="text-center max-w-4xl mx-auto">
          <header className="mb-12">
            <div className="vintage-divider mb-8">
              <span className="text-sepia-400 dark:text-sepia-500">✦</span>
            </div>
            <h2 className="font-typewriter text-2xl md:text-3xl text-warmGray-800 dark:text-cream tracking-wide">
              Projects
            </h2>
            <p className="font-typewriter text-sm mt-4 text-sepia-500 dark:text-sepia-400 tracking-wider">
              Here are some projects I did over the years.
            </p>
          </header>
        </div>

        <Suspense
          fallback={
            <div className="py-10">
              <Spinner />
            </div>
          }
        >
          <Projects />
        </Suspense>
      </section>

      {/* Photos */}
      <section className="px-4 py-16 md:py-24 tracking-wide">
        <div className="max-w-7xl w-full mx-auto">
          <header className="mb-10 text-center">
            <div className="vintage-divider mb-8">
              <span className="text-sepia-400 dark:text-sepia-500">✦</span>
            </div>
            <h2 className="font-typewriter text-2xl md:text-3xl text-warmGray-800 dark:text-cream tracking-wide">
              Photos
            </h2>
            <p className="font-typewriter text-sm mt-4 text-sepia-500 dark:text-sepia-400 tracking-wider">
              What I photographed.
            </p>
          </header>

          <FlickrPhotos photos={flickrPhotos} count={6} />

          <div className="mt-10 text-center">
            <p className="font-typewriter text-base md:text-lg text-warmGray-700 dark:text-warmGray-200 tracking-wide leading-loose">
              More on{" "}
              <Link
                href="https://www.flickr.com/photos/yuan-jia/"
                className="text-sepia-600 dark:text-sepia-400 underline decoration-sepia-400/50 decoration-1 underline-offset-4 hover:decoration-sepia-500 transition-colors"
              >
                Flickr
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
