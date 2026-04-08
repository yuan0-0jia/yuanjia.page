"use client";

import { useCallback, useState } from "react";
import Button from "./Button";

function getMicrolinkScreenshot(url: string) {
  return `https://api.microlink.io/?url=${encodeURIComponent(
    url
  )}&screenshot=true&meta=false&embed=screenshot.url`;
}

function isExternalUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

export default function Project({
  header,
  desc,
  to,
  image,
  previewUrl,
  reverse,
  button,
  priority = false,
}: {
  header: string;
  desc: string;
  to: string;
  image: string;
  previewUrl?: string;
  reverse: boolean;
  button: string;
  priority?: boolean;
}) {
  const hasUploadedImage = image && image.length > 0;
  const canUseMicrolink =
    !hasUploadedImage && !!previewUrl && isExternalUrl(previewUrl);
  const imageSrc = hasUploadedImage
    ? image
    : canUseMicrolink
    ? getMicrolinkScreenshot(previewUrl)
    : null;

  const [imgLoaded, setImgLoaded] = useState(false);

  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) setImgLoaded(true);
  }, []);

  const ready = imageSrc ? imgLoaded : true;

  return (
    <section
      className={`flex flex-col ${
        reverse ? "md:flex-row-reverse" : "md:flex-row"
      } my-8 md:my-12 justify-center items-center gap-6 md:gap-10 lg:gap-14 max-w-6xl mx-auto px-4 md:px-12 card-hover p-6 md:p-8 bg-sepia-700/40 dark:bg-sepia-800/50 border border-sepia-600/30 dark:border-sepia-700/30 rounded-sm transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      {/* Content */}
      <div className="max-w-md text-center md:text-left">
        <header className="relative">
          <div className="w-12 h-px bg-sepia-500 mb-4 mx-auto md:mx-0" />
          <h3 className="font-typewriter text-xl md:text-2xl text-cream tracking-wide">
            {header}
          </h3>
        </header>
        <p className="mt-4 mb-6 font-typewriter text-sm md:text-base text-sepia-200 leading-loose tracking-wide">
          {desc}
        </p>
        <Button type="secondary" to={to} external={isExternalUrl(to)}>
          {button}
        </Button>
      </div>

      {/* Image */}
      {imageSrc ? (
        <div className="w-full md:w-auto md:max-w-[500px] aspect-video img-vintage rounded-sm overflow-hidden border border-sepia-600/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            alt={header}
            src={imageSrc}
            onLoad={() => setImgLoaded(true)}
            className="w-full h-full object-cover"
            fetchPriority={priority ? "high" : undefined}
          />
        </div>
      ) : (
        <div className="w-full md:w-96 aspect-video flex items-center justify-center bg-sepia-700/30 rounded-sm border border-sepia-600/30">
          <span className="font-typewriter text-sepia-500">
            No image available
          </span>
        </div>
      )}
    </section>
  );
}
